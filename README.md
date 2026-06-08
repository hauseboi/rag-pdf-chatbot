# Multimodal RAG Agent

RAG application that allows users to upload PDF documents (text and/or image),  and interact with them using a conversational AI agent. The system is designed to provide accurate answers by employing a hybrid query-routing architecture and computer vision to extract and describe figures within the text context.

---

## Features

- **Drag-and-Drop PDF Upload**

- **Hybrid RAG Routing**: Automatically switches between:

  - **- Focused Mode**: Vanilla RAG retrieval for factual queries using ChromaDB.

  - **- Exhaustive/Summary Mode**: Full document context scans for tasks like listing or summarization; reduced precision & recall. 

- **Vision-Augmented Context**: Leverages vision model to extract, render, and exhaustively describe figures, floor plans, and diagrams in uploaded PDFs to ground visual questions.

- **Persistent Chat History**: Session management integrated into sidebar to resume previous document conversations.



## Tech Stack Used:

| **Part** | **Tools** |
|-----|------|
| Frontend : | ReactJS, Vite, TailwindCSS |
| Backend : | `Python (FastAPI)` |
| PDF Processing : | PyMuPDF(specifically 'fitz'), Langchain |
| Database : | ChromaDB (Vector Database) |
| LLM API : | Groq |
| Models used: |  llama-3.3-70b-versatile (text), llama-4-scout-17b (image)|




## Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.10 or higher)
- A [Groq API Key](https://console.groq.com/keys)

### Environment Variables

Create a `.env` file in the `backend/` directory and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 1. Backend Setup

Open a terminal and navigate to the project root, then to the `backend` directory:

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```
The backend will run on `http://127.0.0.1:8000`.

### 2. Frontend Setup

Open a new terminal window, navigate to the `frontend` directory:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend will typically run on `http://localhost:5173`.

## 📂 Project Structure

```
basicrag/
├── backend/
│   ├── main.py             # FastAPI entry point & API endpoints
│   ├── ask.py              # RAG logic, query routing, and LLM prompting
│   ├── requirements.txt    # Python dependencies
│   ├── data/               # Persistent storage for PDFs and history.json
│   └── chroma_db/          # ChromaDB vector storage (generated on run)
├── frontend/
│   ├── src/                # React components, UI features, and API clients
│   ├── package.json        # Node dependencies and scripts
│   └── vite.config.ts      # Vite configuration
└── README.md
```

## Usage

1. Open the frontend URL (`http://localhost:5173`) in your browser.
2. Drag and drop a `.pdf` file into the upload zone.
3. The system will process the text and concurrently analyze any figures using the vision model.
4. Ask questions! Due to it being a RAG application, queries on specific details work best, however you can also request summaries ("Summarize this document") or exhaustive lists ("Find all mentions of X").


