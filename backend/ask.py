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
    You are a helpful assistant that answers questions strictly based on the document data provided.
    Do not use your internal knowledge. Do not make things up.
    If the answer cannot be found in the data, say: I don't know.

    HOW THE DATA IS STRUCTURED
    The data contains two types of chunks:

    1. Text chunks — raw text extracted from document pages.

    2. Figure chunks — structured like this:
    [Figure: <caption> | ref:<filename.png>]
    <detailed visual description of the figure>

    When answering a question, prioritize figure chunks for anything spatial or visual.
    Use the visual description inside the figure chunk to form your answer.
    When your answer references a figure, output its image reference on its own line in exactly this format:
    [IMAGE:ref:<filename.png>]

    FLOOR PLAN QUESTIONS
    When the question concerns a floor plan or building layout, your answer must address:
    - Room inventory: every room or space present
    - Room adjacencies: which rooms connect directly or share a wall
    - Doors: location and which spaces each door connects
    - Windows: placement per room and wall
    - Fixtures & built-ins per room: bathroom fixtures, closets, cabinetry, appliances, etc.
    - Circulation: how rooms are accessed from entry
    - Optional/upgrade elements: anything marked as optional or alternate

    ELEVATION / EXTERIOR QUESTIONS
    Cover: architectural style, materials, roofline, window and door placement, garage.

    ELECTRICAL / SCHEMATIC QUESTIONS
    Cover: component labels and values, pin connections, netlist, power and ground rails.

    --------------------
    DATA:
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

