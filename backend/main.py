# import os
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from ask import rag_response

# app = FastAPI(title="Urban Tree Planting RAG JSON API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins = ["http://localhost:5173", "http://127.0.0.1:8000"],
#     allow_credentials = True,
#     allow_headers = ["*"],
#     allow_methods = ["*"]
# )

# class queryreq(BaseModel):
#     question:str

# @app.post("/api/ask")
# async def ask_rag(payload: queryreq):
    
#     answer = rag_response(payload.question)
    
#     # Return JSON object
#     return {"answer": answer}




import os
import shutil
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ask import rag_response, chroma_client
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

app = FastAPI(title="RAG JSON API")

# Target folder where uploaded PDFs will physically land
UPLOAD_DIR = "./data"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"]
)


#creating a template for incoming JSON data
class queryreq(BaseModel):
    question: str
    collection_name: str # React sends this along with the text query

# ROUTE 1: Accepts binary PDF data forms
@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFs only.")
    
    target_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        # pdf data from RAM and store locally
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        safe_filename = re.sub(r'[^a-zA-Z0-9]', '_', file.filename)
        collection_name = f"collection_{safe_filename}"
        
        # Load and chunk pdf
        loader = PyPDFLoader(target_path)
        raw_documents = loader.load()
        
        full_text = "\n\n".join([doc.page_content for doc in raw_documents])
        


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
            
        # confirmation back down to React
        return {
            "collection_name": collection_name,
            "display_title": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
    finally:
        file.file.close()

#query & pdf sent by client
@app.post("/api/ask")
async def ask_rag(payload: queryreq):
    try:
        # Process qn via rag_response
        answer = rag_response(payload.question, payload.collection_name)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))