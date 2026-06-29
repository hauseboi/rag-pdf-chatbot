import os
import chromadb
from openai import OpenAI
from dotenv import load_dotenv
import re

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


# --- Query classifier ---
# Determines retrieval strategy based on question type:
#   'focused'    → vector search, top-k chunks (fast, cheap)
#   'exhaustive' → full document scan (list all X, find every Y)
#   'summary'    → full document scan with summary-oriented prompt

EXHAUSTIVE_PATTERNS = [
    'list all', 'find all', 'find every', 'all the', 'all of the',
    'all mentions', 'all instances', 'how many', 'count all',
    'enumerate', 'what are all', 'complete list', 'every instance',
    'comprehensive list', 'everything about', 'entire document'
]

SUMMARY_PATTERNS = [
    'summarize this document', 'document summary', 'overview of this document',
    'what is this document about', 'what does this document', 'main topics of this document',
    'table of contents', 'what does this cover', 'high level overview',
    'brief description of this pdf', 'what is this pdf'
]

def classify_query(query):
    q = query.lower()
    for pattern in EXHAUSTIVE_PATTERNS:
        if pattern in q:
            return 'exhaustive'
    for pattern in SUMMARY_PATTERNS:
        if pattern in q:
            return 'summary'
    return 'focused'


def rag_response(user_query, collection_name)->str:

    collection = chroma_client.get_or_create_collection(name=collection_name)

    TOTAL = collection.count()

    if TOTAL == 0:
        return "I couldn't find relevant information."

    query_type = classify_query(user_query)
    print(f"\n=== Query type: {query_type} | Collection: {collection_name} | Total chunks: {TOTAL} ===")

    # --- Retrieval strategy based on query type ---
    if query_type == 'focused':
        # Vector search — only the most relevant chunks
        results = collection.query(
            query_texts=[user_query],
            n_results=min(TOTAL, 20)
        )
        docs = results['documents'][0] #type: ignore
        metas = results['metadatas'][0] #type: ignore

        if not docs:
            return "Relevant information could not be found"
        
        raw_chunks = []
        for doc,meta in zip(docs,metas):
            page = meta.get('page', '?')  #if page not found then returns ?
            raw_chunks.append(f"[Page {page}] {doc}")

        chunks = list(dict.fromkeys(raw_chunks))
        MAX_CHARS = 22000

    else:
        # Exhaustive / Summary — pull ALL chunks from the collection
        # No vector search needed; the LLM scans the full document
        all_data = collection.get(include=["documents","metadatas"])
        if not all_data['documents']:
            return "I couldn't find relevant information."
        
        chunks = []
        docs = results['documents'][0] #type: ignore
        metas = results['metadatas'][0] #type: ignore

        for doc,meta in zip(docs,metas):
            page = meta.get('page', '?')  #if page not found then returns ?
            chunks.append(f"[Page {page}] {doc}")
        MAX_CHARS = 35000


    # Clean image reference artifacts from chunks
    chunks = [re.sub(r'\| ref:[^\]]+\.png', '', chunk) for chunk in chunks]
    chunks = [re.sub(r'ref:[^\s\]]+\.png', '', chunk) for chunk in chunks]

    # Trim to fit context window
    combined = ""
    trimmed_chunks = []

    print(f"Total chars available: {sum(len(c) for c in chunks)}")

    for chunk in chunks:
        if len(combined) + len(chunk) > MAX_CHARS:
            break
        combined += chunk
        trimmed_chunks.append(chunk)

    chunks = trimmed_chunks

    print(f"Sending {len(chunks)} chunks ({len(combined)} chars) to LLM")


    # --- Build system prompt based on query type ---
    base_rules = """
    You are a precise assistant that answers questions strictly based on the document excerpts provided.
    You are only seeing a partial subset of the full document due to context limits.
    Do not use your internal knowledge. Do not make things up.
    
    CRITICAL RULES:
    - If the answer cannot be found in the provided data, you MUST say: "The excerpts that I have retrieved do not contain information about this." 
    - NEVER claim that the document as a whole lacks instructions or information, because you are only seeing a limited portion of it.
    - Be EXHAUSTIVE: scan ALL provided chunks before answering. Do not stop early.
    - Be PRECISE: only state what the data explicitly says. Do not infer or guess.
    - Pay close attention to symbols: ™ and TM denote trademarks, ® denotes registered trademarks.
      and † denotes footnotes (NOT trademarks). Do NOT confuse these.
    - When listing items, cross-check every chunk to ensure nothing is missed.
    - Ensure that each answer is supplied with citations in the format of [Page X] 
    """

    data_structure = """
    HOW THE DATA IS STRUCTURED
    The data contains two types of chunks:

    1. Text chunks — raw text extracted from document pages.

    2. Figure chunks — structured like this:
    [Figure on page <page_num>: <caption>] or [Full page render, page <page_num>]
    <detailed visual description of the figure>

    When answering a question, prioritize figure chunks for anything spatial or visual.
    Use the visual description inside the figure chunk to form your answer.
    If your answer relies on a figure, cite it by its page number (e.g., "According to the figure on page X...").
    Do not attempt to generate image links, filenames, or metadata tags.
    """

    domain_rules = """
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
    """

    if query_type == 'summary':
        task_instruction = """
    YOUR TASK: Provide a comprehensive summary of this document.
    Cover the main topics, key features, and important details.
    Organize your response with clear sections.
    """
        system_prompt = base_rules + task_instruction + data_structure
    elif query_type == 'exhaustive':
        task_instruction = """
    YOUR TASK: The user is asking you to find ALL instances of something in the document.
    You MUST scan every single chunk provided. Do not skip any.
    Only include items that are explicitly present in the data — do not infer or guess.
    If listing items, number them and include where in the document each was found.
    """
        system_prompt = base_rules + task_instruction + data_structure
    else:
        system_prompt = base_rules + data_structure + domain_rules

    system_prompt += """
    --------------------
    DATA:
    """ + str(chunks) + """
    """

    #changed openai api model to a free Groq api key
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]
    )
    print("\n\n---------------------\n\n")
    return response.choices[0].message.content or ""

