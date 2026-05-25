from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
import os

# setting the environment for the chromadb

DATA_PATH = r"/home/varooney/Projects/basicrag//backend/data"
CHROMA_PATH = r"/home/varooney/Projects/basicrag//backend/chroma_db"


chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

collection = chroma_client.get_or_create_collection(name="growing_trees")

# loading the document

loader = PyPDFDirectoryLoader(DATA_PATH)
#always ensure the path actually exists using the os package:  os.listdir(DATA_PATH),,, os.path.abspath(DATA_PATH)


raw_documents = loader.load()


# define ts - split rawdoc into chunks of langchain doc-objs consisting of {page-content="", metadata=..}
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,
    chunk_overlap=100,
    length_function=len,
    is_separator_regex=False,
)

chunks = text_splitter.split_documents(raw_documents)

# addin chromadb

documents = []
metadata = []
ids = []

i = 0

for chunk in chunks:
    # Only add if the chunk actually contains text
    if chunk.page_content.strip(): 
        documents.append(chunk.page_content)
        ids.append("ID"+str(i))
        metadata.append(chunk.metadata)
        i += 1

# adding to chromadb

collection.upsert(
    documents=documents,
    metadatas=metadata,
    ids=ids
)