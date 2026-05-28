import os
import chromadb
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Setting the environment for the vector db
DATA_PATH = r"/home/varooney/Projects/basicrag/backend/data"
CHROMA_PATH = r"/home/varooney/Projects/basicrag/backend/chroma_db"

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)



if __name__=="__main__":

    user_query = input("What do you want to know about your file?\n\n")



#Point openai client at groq servers ---
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY")
)




def rag_response(user_query, collection_name)->str:

    collection = chroma_client.get_or_create_collection(name=collection_name)

    TOTAL = collection.count()

    results = collection.query(
    query_texts=[user_query],
    n_results=TOTAL
    )

    documents = results['documents']
    if not documents or not documents[0]:
        return "I couldn't find relevant information."

    MAX_CHARS = 20000  # safe limit for 8k token model

    chunks = list(dict.fromkeys(documents[0]))
    combined = ""
    trimmed_chunks = []
    for chunk in chunks:
        if len(combined) + len(chunk) > MAX_CHARS:
            break
        combined += chunk
        trimmed_chunks.append(chunk)

    chunks = trimmed_chunks

    print(f"Retrieved {len(chunks)} chunks")
    for i, doc in enumerate(chunks):
        print(f"\n--- Chunk {i+1} ---\n{doc[:200]}")

    system_prompt = """
    You are a helpful assistant. You answer questions about the PDF file data provided. 
    You only answer based on knowledge I'm providing you. You don't use your internal 
    knowledge and you don't make things up.
    If you don't know the answer, just say: I don't know.

    When your answer references a figure or diagram, include its ref tag exactly as it 
    appears in the data, for example: ref:filename.png — this renders the image for the user.
    --------------------
    The data:
    """ + str(chunks) + """
    """


    #changed openai api model to a free Groq api key
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # text to text model
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}    
        ]
    )
    print("\n\n---------------------\n\n")
    return response.choices[0].message.content or ""

