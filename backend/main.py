import os
import shutil
import re
import json
import uuid
import base64
import fitz
from datetime import datetime
from io import BytesIO
from openai import OpenAI
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ask import rag_response, chroma_client
from langchain_text_splitters import RecursiveCharacterTextSplitter

#to render the image in rag response by saving local copy
from fastapi.staticfiles import StaticFiles

# from google import genai
# from google.genai import types

# gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="RAG JSON API")

UPLOAD_DIR = "./data"
os.makedirs(UPLOAD_DIR, exist_ok=True)

FIGURES_DIR = "./data/figures"
os.makedirs(FIGURES_DIR, exist_ok=True)



HISTORY_FILE = "./data/history.json"

# called here - used for vision on images in pages
groq_vision_client =OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)

VISION_PROMPT = """You are analyzing a figure from a technical or engineering document.
Describe it exhaustively and precisely:
- Figure type (schematic, flowchart, graph, chart, map, table, blueprint, diagram etc.)
- Every visible label, axis title, axis value, legend entry, annotation, and unit
- All data points, measurements, or quantitative values shown
- Relationships, flows, or connections between components
- Spatial layout and hierarchy of elements
- Any patterns, trends, anomalies, or highlights
- Materials, processes, or systems depicted if identifiable

Be thorough — this description is the only way a user can query this figure.
Do not summarize. Describe everything you see."""

CAPTION_MARGIN = 60  # points below image bottom to scan for caption



#for sidebar conversation history
def read_history():
    if not os.path.exists(HISTORY_FILE):
        return {"sessions": []}
    with open(HISTORY_FILE, "r") as f:
        return json.load(f)


def write_history(data):
    with open(HISTORY_FILE, "w") as f:
        json.dump(data, f, indent=2)




#get text below the image into which VISION-PROMPT answer is injected 
def get_caption(fitz_page, img_rect):
    blocks = fitz_page.get_text("blocks")
    candidates = []
    for block in blocks:
        bx0, by0, bx1, by1, text, _, btype = block
        if btype != 0:
            continue
        if (img_rect.y1 <= by0 <= img_rect.y1 + CAPTION_MARGIN) or (img_rect.y0>= by1 >= img_rect.y0 - CAPTION_MARGIN):
                candidates.append((by0, text.strip()))

    if not candidates:
        return ""
    candidates.sort(key=lambda x: x[0])
    return candidates[0][1]


def describe_crop(png_bytes):
    img_b64 = base64.b64encode(png_bytes).decode("utf-8")
    response = groq_vision_client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{img_b64}"}
                },
                {
                    "type": "text",
                    "text": VISION_PROMPT
                }
            ]
        }],
        max_tokens=1000
    )
    return response.choices[0].message.content



# def describe_crop(png_bytes):
#     response = gemini_client.models.generate_content(
#         model="gemini-2.0-flash",
#         contents=[
#             types.Part.from_bytes(data=png_bytes, mime_type="image/png"),
#             VISION_PROMPT
#         ]
#     )
#     return response.text


def find_vector_figure_regions(fitz_page):
    """Find figures by locating caption text like 'Figure X:' and rendering above them."""
    blocks = fitz_page.get_text("blocks")
    page_height = fitz_page.rect.height
    page_width = fitz_page.rect.width
    regions = []

    for block in blocks:
        x0, y0, x1, y1, text, _, btype = block
        if btype != 0:
            continue
        t = text.strip().lower()
        if t.startswith("figure") or t.startswith("fig."):
            # render the region above this caption — that's where the figure sits
            margin = 10
            clip = fitz.Rect(0, max(0, y0 - 400), page_width, y0 - margin)
            if clip.height > 50:  # skip if region is too small
                regions.append((clip, text.strip()))

    return regions

def process_pdf_text(file_path):
    doc = fitz.open(file_path)
    page_texts = [page.get_text("text").strip() for page in doc]
    doc.close()
    return "\n\n".join(page_texts)


def process_pdf_vision(file_path, collection_name):
    """only for image pages, upserts into figures folder."""
    doc = fitz.open(file_path)
    collection = chroma_client.get_or_create_collection(name=collection_name)

    for page_num in range(len(doc)):
        page = doc[page_num]
        images = page.get_images(full=True)
        if not images:
            continue

        injections = []  # (y_position, block_text) — preserves reading order

        for img_info in images:
            xref = img_info[0]
            rects = page.get_image_rects(xref)
            if not rects:
                continue
            img_rect = rects[0]

            if img_rect.width < 80 or img_rect.height < 80:
                continue

            try:
                pix = fitz.Pixmap(doc, xref)
                if pix.colorspace and pix.colorspace.n > 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                png_bytes = pix.tobytes("png")

                fig_idx = len(injections)  # per-page figure numbering
                img_filename = f"{os.path.basename(file_path).replace('.pdf', '')}_p{page_num}_fig{fig_idx}.png"
                with open(os.path.join(FIGURES_DIR, img_filename), "wb") as f:
                    f.write(png_bytes)

                caption = get_caption(page, img_rect)
                print(f"Page {page_num + 1} — describing figure: '{caption or 'untitled'}'")

                description = describe_crop(png_bytes)
                block = f"\n[Figure: {caption or f'Untitled figure, page {page_num + 1}'} | ref:{img_filename}]\n{description}\n"
                injections.append((img_rect.y1, block))

            except Exception as e:
                print(f"Could not extract image on page {page_num + 1}: {e}")
                continue

        


        # also handle vector figures
        figure_regions = find_vector_figure_regions(page)
        for clip_rect, caption in figure_regions:
            try:
                # render just that region of the page at 2x resolution
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=mat, clip=clip_rect)
                png_bytes = pix.tobytes("png")

                if len(png_bytes) > 3.5 * 1024 * 1024:
                    print(f"Vector figure too large on page {page_num+1}, skipping")
                    continue

                fig_idx = len(injections)
                img_filename = f"{os.path.basename(file_path).replace('.pdf','')}_p{page_num}_fig{fig_idx}.png"
                with open(os.path.join(FIGURES_DIR, img_filename), "wb") as f:
                    f.write(png_bytes)

                print(f"Page {page_num+1} — vector figure: '{caption}'")
                description = describe_crop(png_bytes)
                block = f"\n[Figure: {caption} | ref:{img_filename}]\n{description}\n"
                injections.append((clip_rect.y1, block))

            except Exception as e:
                print(f"Could not render vector figure on page {page_num+1}: {e}")
                continue

        if injections:
            injections.sort(key=lambda x: x[0])  # top-to-bottom reading order
            for i, (_, block) in enumerate(injections):
                chunk_id = f"vision_p{page_num}_f{i}"
                collection.upsert(
                    documents=[block],
                    metadatas=[{"source": os.path.basename(file_path), "type": "figure", "page": page_num}],
                    ids=[chunk_id]
                )
                print(f"Vision chunk upserted — {chunk_id}")


    doc.close()
    print(f"Vision processing complete — {os.path.basename(file_path)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"]
)


app.mount("/figures", StaticFiles(directory=FIGURES_DIR), name="figures")

class queryreq(BaseModel):
    question: str
    collection_name: str
    session_id: str | None = None
    pdf_name: str | None = None


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFs only.")

    target_path = os.path.join(UPLOAD_DIR, file.filename)

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        safe_filename = re.sub(r'[^a-zA-Z0-9]', '_', file.filename)
        collection_name = f"collection_{safe_filename}"

        # process pdf — text + vision for figures
        full_text = process_pdf_text(target_path)
        background_tasks.add_task(process_pdf_vision, target_path, collection_name)

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=300,
            length_function=len,
            is_separator_regex=False,
        )
        chunks = text_splitter.split_text(full_text)

        documents = []
        metadatas = []
        ids = []

        for i, chunk in enumerate(chunks):
            if chunk.strip():
                documents.append(chunk)
                ids.append(f"ID{i}")
                metadatas.append({"source": file.filename, "chunk_index": i})

        if documents:
            collection = chroma_client.get_or_create_collection(name=collection_name)
            collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )

        history = read_history()
        existing_session = next((s for s in history["sessions"] if s["collection_name"] == collection_name), None)

        if existing_session:
            session_id = existing_session["id"]
        else:
            session_id = str(uuid.uuid4())
            # Do not append empty session to history.json yet

        return {
            "collection_name": collection_name,
            "display_title": file.filename,
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        file.file.close()


@app.post("/api/ask")
async def ask_rag(payload: queryreq):
    try:
        answer = rag_response(payload.question, payload.collection_name)

        if payload.session_id:
            history = read_history()
            session = next((s for s in history["sessions"] if s["id"] == payload.session_id), None)
            
            if not session:
                session = {
                    "id": payload.session_id,
                    "pdf_name": payload.pdf_name or payload.collection_name.replace("collection_", ""),
                    "collection_name": payload.collection_name,
                    "created_at": datetime.now().isoformat(),
                    "messages": []
                }
                history["sessions"].append(session)

            session["messages"].append({
                "question": payload.question,
                "answer": answer,
                "timestamp": datetime.now().isoformat()
            })
            write_history(history)

        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
def get_history():
    return read_history()