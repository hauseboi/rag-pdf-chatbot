
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Header from './components/Header';
import FileDrop from './components/FileDrop';
import QueryBar from './components/QueryBar';
import Sidebar from './components/Sidebar';

const BASE_URL = "http://127.0.0.1:8000";

function AnswerWithFigures({ text }) {
  // split answer on ref:filename.png occurrences
  const parts = [];
  const refRegex = /ref:([^\s\]]+\.png)/g;
  let lastIndex = 0;
  let match;

  while ((match = refRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "image", filename: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return (
    <div className="flex flex-col gap-4">
      {parts.map((part, i) =>
        part.type === "text" ? (
          <div key={i} className="prose-cyber">
            <ReactMarkdown components={{p: ({node, ...props}) => <p style = {{textAlign: "left"}} {...props} />,
                              li: ({node, ...props}) => <li style = {{textAlign: "left"}} {...props} />
                              }}>{part.content}
            </ReactMarkdown>
          </div>
        ) : (
          <div key={i} className="rounded-xl overflow-hidden border border-cyber-border shadow-card">
            <img
              src={`${BASE_URL}/figures/${part.filename}`}
              alt={part.filename}
              className="w-full object-contain max-h-96"
            />
            <p className="text-[11px] font-mono text-cyber-dim/40 px-3 py-2 bg-pearl/60 border-t border-cyber-border">
              {part.filename.replace(/_/g, " ").replace(".png", "")}
            </p>
          </div>
        )
      )}
    </div>
  );
}

function App() {
  const [fileTitle, setFileTitle] = useState('No Document Uploaded');
  const [collectionName, setCollectionName] = useState('');
  
  const [historyKey, setHistoryKey] = useState(0);

  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // pipeline send raw PDF to FastAPI filerouter
  const handlePDFUpload = async (rawFile) => {
    setIsUploading(true);

    const dataForm = new FormData();
    dataForm.append('file', rawFile); // "file" matches FastAPI arg

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: dataForm 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Network error during file parsing.' }));
        throw new Error(errorData.detail || 'Network error during file parsing.');
      }

      const data = await response.json();
      
      setSessionId(data.session_id);
      setCollectionName(data.collection_name);
      setFileTitle(data.display_title);
      setMessages([]);
      setHistoryKey(k => k + 1);

    } catch (err) {
      console.error(err);
      alert('Failed to process and index your PDF file: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };


  const handleSessionSelect = (session) => {
  setSessionId(session.id);
  setCollectionName(session.collection_name);
  setFileTitle(session.pdf_name);
  setMessages(session.messages.map(m => ({
    question: m.question,
    answer: m.answer
  })));
  };

  // pipeline send query to the correct vector db
  const handleQuestionSubmit = async (userQuestion) => {
    setIsSearching(true);

    
    try {
      const response = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQuestion,
          session_id: sessionId,
          collection_name: collectionName,
          pdf_name: fileTitle
        })
      });

      if (!response.ok) throw new Error('Vector database lookup query failed.');

      const data = await response.json();
      
      setMessages(prev => [
        ...prev, {
        question: userQuestion,
        answer: data.answer
    }]);


    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev, {
        question: userQuestion,
        answer: 'Failed to retrieve response from the vector database.'
      }]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style ={{ display: "flex", padding:"20px", marginLeft:"20px"}}>
    <div style ={{ alignSelf: 'flex-start', background: 'violet', color: '#1e293b', padding: '10px 15px', borderRadius: '15px', width: '25%' }}>
        <Sidebar
        key={historyKey}
        onSessionSelect={handleSessionSelect}
        activeSessionId={sessionId}
      />
    </div>
    <div style ={{ alignSelf: 'flex-end', background: '#4b0756ff', color: '#1e293b', padding: '10px 15px', borderRadius: '15px', maxWidth: '100%' }}>
      <Header fileTitle={fileTitle}/>

      <FileDrop onFileSelected={handlePDFUpload} isUploading={isUploading} fileTitle={fileTitle} />

      <QueryBar 
        onSubmitQuestion={handleQuestionSubmit} 
        isReady={!!collectionName} 
        isLoading={isSearching} 
      />



      

      {/*render AI reply */}
      {messages.length > 0 && (
        <div style={{ marginTop: '20px', padding: '20px', background: '#e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ alignSelf: 'flex-start', background: 'lightblue', color: '#1e293b', padding: '10px 15px', borderRadius: '15px', maxWidth: '75%' }}>
                <p style={{ margin: 0 }}><strong>You:</strong> {msg.question}</p>
              </div>

              <div style={{ alignSelf: 'flex-end', background: 'lightgreen', color: '#1e293b', padding: '10px 15px', borderRadius: '15px', maxWidth: '75%' }}>
                <div style={{ margin: 0 }}><strong>RAG Bot:</strong>
                   <AnswerWithFigures text={msg.answer} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
   </div>
  );
}

export default App;