import os
import shutil
import re
import json
import uuid
import tempfile
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

from typing import List 
import requests
import tldextract

from firecrawl import Firecrawl

firecrawl = Firecrawl(api_key=os.getenv("FIRECRAWL_API_KEY"))


#to render the image in rag response by saving local copy
# from fastapi.staticfiles import StaticFiles
# from google import genai
# from google.genai import types
# gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))



app = FastAPI(title="RAG JSON API")

UPLOAD_DIR = "./data"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# FIGURES_DIR = "./data/figures"
# os.makedirs(FIGURES_DIR, exist_ok=True)



HISTORY_FILE = "./data/history.json"

# called here - used for vision on images in pages
groq_vision_client =OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)



VISION_PROMPT = """You are analyzing a figure extracted from an architectural or technical document.

First state the figure type (floor plan, elevation rendering, schematic, diagram, etc.).

If this is a FLOOR PLAN or ARCHITECTURAL LAYOUT, describe exhaustively:
- Every labeled room and space, with its approximate position on the page (top-left, center-right, etc.)
- Every door symbol: which two spaces it connects, and swing direction if shown
- Every window symbol: which wall it sits in and its approximate position along that wall
- All built-in fixtures visible per room: toilets, sinks, bathtubs, showers, kitchen counters,
  islands, cabinets, pantry shelving, laundry appliances, stairs, columns
- Room adjacency map: which rooms share a wall or have a direct doorway connection
- Any dimensions or measurements labeled on the drawing
- Circulation paths: how you would walk from the entry through the home
- Any elements marked as optional, alternate, or upgrade (dashed lines, "OPT." labels, etc.)
- Garage bays, porch, patio, mud room, utility areas

If this is a RENDERED ELEVATION or EXTERIOR VIEW, describe:
- Architectural style, roofline shape, number of visible stories
- Exterior materials (stucco, siding, brick, etc.)
- Window count, shape, and placement per facade
- Garage doors: count and width
- Entry features: porch columns, steps, door style

For ALL figure types also note:
- Every text label, annotation, legend entry, and title visible
- Any north arrow, scale bar, or grid references

Be exhaustive. This description is the only representation of this figure in the knowledge base."""

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
    page_texts = []
    page_offsets = []  # cumulative character count before each page
    total_chars = 0
    for page in doc:
        text = page.get_text("text")
        page_texts.append(text)
        page_offsets.append(total_chars)
        total_chars += len(text)
    doc.close()
    return page_texts #, page_offsets, total_chars


def process_pdf_vision(file_path, collection_name):
    """only for image pages, upserts into figures folder."""
    doc = fitz.open(file_path)
    collection = chroma_client.get_or_create_collection(name=collection_name)

    for page_num in range(len(doc)):
        page = doc[page_num]
        images = page.get_images(full=True)
        # FIX 1: removed early exit — was skipping pages with no raster images

        injections = []

        # --- Raster image pass ---
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

                fig_idx = len(injections)
                img_filename = f"{os.path.basename(file_path).replace('.pdf', '')}_p{page_num+1}_fig{fig_idx}.png"
                # with open(os.path.join(FIGURES_DIR, img_filename), "wb") as f:
                #     f.write(png_bytes)

                caption = get_caption(page, img_rect)
                print(f"Page {page_num + 1} — describing figure: '{caption or 'untitled'}'")

                description = describe_crop(png_bytes)
                block = f"\n[Figure on page {page_num + 1}: {caption or 'Untitled figure'}]\n{description}\n"
                injections.append((img_rect.y1, block))

            except Exception as e:
                print(f"Could not extract image on page {page_num + 1}: {e}")
                continue

        # --- Vector figure pass (caption-based) ---
        figure_regions = find_vector_figure_regions(page)
        for clip_rect, caption in figure_regions:
            try:
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=mat, clip=clip_rect)
                png_bytes = pix.tobytes("png")

                if len(png_bytes) > 3.5 * 1024 * 1024:
                    print(f"Vector figure too large on page {page_num + 1}, skipping")
                    continue

                fig_idx = len(injections)
                img_filename = f"{os.path.basename(file_path).replace('.pdf', '')}_p{page_num+1}_fig{fig_idx}.png"
                # with open(os.path.join(FIGURES_DIR, img_filename), "wb") as f:
                #     f.write(png_bytes)

                print(f"Page {page_num + 1} — vector figure: '{caption}'")
                description = describe_crop(png_bytes)
                block = f"\n[Figure on page {page_num + 1}: {caption}]\n{description}\n"
                injections.append((clip_rect.y1, block))

            except Exception as e:
                print(f"Could not render vector figure on page {page_num + 1}: {e}")
                continue

        # --- Upsert all found injections ---
        if injections:
            injections.sort(key=lambda x: x[0])
            for i, (_, block) in enumerate(injections):
                chunk_id = f"vision_p{page_num+1}_f{i}"
                collection.upsert(
                    documents=[block],
                    metadatas=[{"source": os.path.basename(file_path), "type": "figure", "page": page_num}],
                    ids=[chunk_id]
                )
                print(f"Vision chunk upserted — {chunk_id}")

        # FIX 2: full-page fallback — fires when vector drawings exist but caption
        # matching found nothing. Catches pages like floor plans / option diagrams
        # that have no "Figure X:" style captions regardless of whether a raster
        # image was also present on the same page (the old `if not injections`
        # condition broke on page 3 because the garage photo populated injections).
        #PROBLEM ANND FIXED: PAGES W TOO MANY SEPARATING/STYLING LINES TAKEN AS FULLPAGECAPTURE AND SLOWING TIMES....

        page_text = page.get_text("text").strip()

        drawings = page.get_drawings()
        if not figure_regions and len(drawings) > 80 and len(page_text)<300:
            try:
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=mat)
                png_bytes = pix.tobytes("png")

                if len(png_bytes) > 3.5 * 1024 * 1024:
                    mat = fitz.Matrix(1.5, 1.5)
                    pix = page.get_pixmap(matrix=mat)
                    png_bytes = pix.tobytes("png")

                img_filename = f"{os.path.basename(file_path).replace('.pdf', '')}_p{page_num+1}_fullpage.png"
                # with open(os.path.join(FIGURES_DIR, img_filename), "wb") as f:
                #     f.write(png_bytes)

                print(f"Page {page_num + 1} — vector content without captions, rendering full page")
                description = describe_crop(png_bytes)
                block = f"\n[Full page render, page {page_num + 1}]\n{description}\n"
                collection.upsert(
                    documents=[block],
                    metadatas=[{"source": os.path.basename(file_path), "type": "figure", "page": page_num}],
                    ids=[f"vision_p{page_num+1}_fullpage"]
                )
                print(f"Vision chunk upserted — vision_p{page_num+1}_fullpage")

            except Exception as e:
                print(f"Full-page fallback failed on page {page_num + 1}: {e}")

    doc.close()
    print(f"Vision processing complete — {os.path.basename(file_path)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"]
)


#app.mount("/figures", StaticFiles(directory=FIGURES_DIR), name="figures")

#--------------------------------------------------------#
# section for handling the client searching for usrmanual online
#--------------------------------------------------------#
def is_legit(url: str , user_query: str):
    url= url.lower()
    extract = tldextract.extract(url)
    domain = extract.domain
    tld = extract.suffix
    host = extract.registered_domain

    BANNED_TLDS = {
        'xyz', 'cc', 'top', 'click', 'download', 'space', 'biz', 'info', 
        'online', 'site', 'tech', 'live', 'zip', 'mov'
    }
    if tld in BANNED_TLDS:
        return False

    if any(hub in host for hub in TRUSTED_HUBS):
        return True

    irrelevant_keywords = {'manual', 'guide', 'user', 'pdf', 'owners', 'download', 'support'}

    #strip user query into usable words to search for relevant urls.
    query_words = [word.strip(".,!?()-_") 
                    for word in user_query.lower().split() 
                    if len(word) > 2 and word not in irrelevant_keywords
                    and domain not in word.lower()]
 
    if domain in query_words and '-' not in domain:
        return True
    
    for brand in query_words:
        if brand in domain:
            # If the domain contains the brand BUT also contains words like "manual", it's a sketchy third-party site
            if any(ext in domain for ext in irrelevant_keywords):
                print(f"Blocked brand-jacking attempt: {url}")
                return False

    return False


# Fallback dummy results (used when no API key or search fails)
def dummy_results(query: str) -> List[dict]:
    return [
        {
            "title": "Dell XPS 13 9360 Setup Guide",
            "url": "https://dl.dell.com/topicspdf/xps-13-9360-laptop_setup-guide_en-us.pdf",
            "domain": "dl.dell.com"
        },
        {
            "title": "Dell XPS 13 9360 Service Manual",
            "url": "https://dl.dell.com/topicspdf/xps-13-9360-laptop_service-manual_en-us.pdf",
            "domain": "support.dell.com"
        },
    ]

# Extract items from Firecrawl response
def search_firecrawl(query: str) -> List[dict]:
    if not firecrawl:
        return dummy_results(query)

    try:
        raw = firecrawl.search(
            query=f"{query} filetype:pdf manual OR guide",
            limit=10
        )

        # Debug: print raw.web structure
        print(f"raw.web type: {type(raw.web)}")
        print(f"raw.web dir: {dir(raw.web)}")
        print(f"raw.web: {raw.web}")

        # Access web results correctly
        items = []
        if hasattr(raw, 'web'):
            web_data = raw.web
            # Check if web_data has a 'results' attribute (likely a SearchWebData object)
            if hasattr(web_data, 'results'):
                items = web_data.results
            elif isinstance(web_data, list):
                items = web_data
            else:
                # If web_data is a dict, try to get 'results' key
                if isinstance(web_data, dict):
                    items = web_data.get('results', [])

        # Fallback to 'data' if web is empty
        if not items and hasattr(raw, 'data'):
            data_attr = raw.data
            if hasattr(data_attr, 'results'):
                items = data_attr.results
            elif isinstance(data_attr, list):
                items = data_attr
            elif isinstance(data_attr, dict):
                items = data_attr.get('results', [])

        if not items:
            print("No items found in web or data – returning dummy")
            return dummy_results(query)

        filtered = []
        for item in items:
            # Extract url and title (works for dict or object)
            if hasattr(item, 'get'):
                link = item.get('url')
                title = item.get('title', 'Unknown')
            else:
                link = getattr(item, 'url', None)
                title = getattr(item, 'title', 'Unknown')

            if not link:
                continue

            domain = tldextract.extract(link).registered_domain

            # TEMPORARILY COMMENT OUT is_legit to see all results
            # if is_legit(link, query):
            filtered.append({
                "title": title,
                "url": link,
                "domain": domain
            })

        print(f"Returning {len(filtered)} results")
        return filtered

    except Exception as e:
        print(f"Error: {e}")
        return dummy_results(query)

def get_page_texts(file_path):
    #Returns a list of strings, one per page.
    import fitz
    doc = fitz.open(file_path)
    page_texts = []
    for page in doc:
        text = page.get_text("text")
        page_texts.append(text)
    doc.close()
    return page_texts   


class SearchManual(BaseModel):
    title: str
    url: str
    domain: str


class queryreq(BaseModel):
    question: str
    collection_name: str
    session_id: str | None = None
    pdf_name: str | None = None


#download the file to backend to then process and upload to chromadb. LATER MUST DELETE FILE....TBD
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

        #Get page texts (list of strings, one per page)
        page_texts = get_page_texts(target_path)

        # async vision processing
        background_tasks.add_task(process_pdf_vision, target_path, collection_name)

        #Splitter now used per page instead of overall text blob
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )

        documents = []
        metadatas = []
        ids = []
        chunk_counter = 0

        #Loop over each page
        for page_num, page_text in enumerate(page_texts, start=1):
            if not page_text.strip():
                continue
            page_chunks = text_splitter.split_text(page_text)
            for chunk in page_chunks:
                if chunk.strip():
                    documents.append(chunk)
                    ids.append(f"ID{chunk_counter}")
                    metadatas.append({
                        "source": file.filename,
                        "page": page_num          #Page number store for citation
                    })
                    chunk_counter += 1

        #Upsert into ChromaDB
        if documents:
            collection = chroma_client.get_or_create_collection(name=collection_name)
            collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )

        # Session logic
        history = read_history()
        existing_session = next((s for s in history["sessions"] if s["collection_name"] == collection_name), None)

        if existing_session:
            session_id = existing_session["id"]
        else:
            session_id = str(uuid.uuid4())

        return {
            "collection_name": collection_name,
            "display_title": file.filename,
            "session_id": session_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        file.file.close()


#similar to upload endpoint but for pdf links
@app.get("/api/download")
async def download_and_ingest(url: str, background_tasks: BackgroundTasks):
    # download PDF
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Download failed: {str(e)}")

    # determine the filename
    filename = url.split("/")[-1]
    if not filename.endswith(".pdf"):
        filename = f"manual_{uuid.uuid4().hex[:8]}.pdf"

    # save to UPLOAD_DIR
    target_path = os.path.join(UPLOAD_DIR, filename)
    with open(target_path, "wb") as f:
        f.write(response.content)

    # process the PDF (same as upload)
    try:
        safe_filename = re.sub(r'[^a-zA-Z0-9]', '_', filename)
        collection_name = f"collection_{safe_filename}"

        # Get page texts
        page_texts = get_page_texts(target_path)

        # async vision processing
        background_tasks.add_task(process_pdf_vision, target_path, collection_name)

        #Splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )

        documents = []
        metadatas = []
        ids = []
        chunk_counter = 0

        #Loop over each page
        for page_num, page_text in enumerate(page_texts, start=1):
            if not page_text.strip():
                continue
            page_chunks = text_splitter.split_text(page_text)
            for chunk in page_chunks:
                if chunk.strip():
                    documents.append(chunk)
                    ids.append(f"ID{chunk_counter}")
                    metadatas.append({
                        "source": filename,
                        "page": page_num
                    })
                    chunk_counter += 1

        #Upsert into ChromaDB
        if documents:
            collection = chroma_client.get_or_create_collection(name=collection_name)
            collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )

        # Generate session ID
        session_id = str(uuid.uuid4())

        return {
            "collection_name": collection_name,
            "display_title": filename,
            "session_id": session_id
        }

    except Exception as e:
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(status_code=500, detail=str(e))
    


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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/history")
def get_history():
    return read_history()


@app.get("/api/search", response_model=List[SearchManual])
async def search_manuals(q: str):
    return search_firecrawl(q)