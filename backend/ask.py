import os
import chromadb
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Setting the environment for the vector db
DATA_PATH = r"/home/varooney/Projects/basicrag/backend/data"
CHROMA_PATH = r"/home/varooney/Projects/basicrag//backend/chroma_db"

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

    results = collection.query(
    query_texts=[user_query],
    n_results=10
    )

    system_prompt = """
    You are a helpful assistant. You answer questions about the PDF file data provided. 
    You only answer based on knowledge I'm providing you. You don't use your internal 
    knowledge and you don't make things up.
    If you don't know the answer, just say: I don't know
    --------------------
    The data:
    """ + str(results['documents']) + """
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

