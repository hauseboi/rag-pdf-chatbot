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
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ask import rag_response

app = FastAPI(title="Urban Tree Planting RAG JSON API")

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

# Schema defining what incoming JSON query requests must look like
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
        # Stream raw incoming chunks out of RAM and write them to the hard drive
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Send a receipt validation dictionary back down to React
        return {
            "collection_name": f"collection_{file.filename.replace('.', '_')}",
            "display_title": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        file.file.close()

# ROUTE 2: Accepts JSON text blocks matching our queryreq class schema
@app.post("/api/ask")
async def ask_rag(payload: queryreq):
    try:
        # Process the question string through your custom RAG script
        answer = rag_response(payload.question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))