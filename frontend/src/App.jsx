import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Header from './components/Header';
import FileDrop from './components/FileDrop';
import QueryBar from './components/QueryBar';
import Sidebar from './components/Sidebar';

const BASE_URL = "http://127.0.0.1:8000";

function AnswerWithFigures({ text }) {
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
    <div className="space-y-4">
      {parts.map((part, i) =>
        part.type === "text" ? (
          <div key={i} className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{part.content}</ReactMarkdown>
          </div>
        ) : (
          <div key={i} className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            <img
              src={`${BASE_URL}/figures/${part.filename}`}
              alt={part.filename}
              className="w-full object-contain max-h-96 bg-gray-50"
            />
            <p className="text-xs font-mono text-gray-400 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
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

  const handlePDFUpload = async (rawFile) => {
    setIsUploading(true);
    const dataForm = new FormData();
    dataForm.append('file', rawFile);

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
    setMessages(session.messages.map(m => ({ question: m.question, answer: m.answer })));
  };

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
      setMessages(prev => [...prev, { question: userQuestion, answer: data.answer }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { question: userQuestion, answer: 'Failed to retrieve response from the vector database.' }]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - fixed width */}
      <Sidebar
        key={historyKey}
        onSessionSelect={handleSessionSelect}
        activeSessionId={sessionId}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with file drop zone */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <Header fileTitle={fileTitle} />
          <div className="mt-3">
            <FileDrop onFileSelected={handlePDFUpload} isUploading={isUploading} fileTitle={fileTitle} />
          </div>
        </div>

        {/* Chat messages - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <p className="text-center">Upload a PDF and start asking questions</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-blue-500 text-white rounded-2xl rounded-br-none px-4 py-2 shadow-sm">
                    <p className="text-sm font-medium">You</p>
                    <p className="text-sm">{msg.question}</p>
                  </div>
                </div>
                {/* Bot message */}
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">RAG Bot</p>
                    <AnswerWithFigures text={msg.answer} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Query bar - sticky bottom */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <QueryBar
            onSubmitQuestion={handleQuestionSubmit}
            isReady={!!collectionName}
            isLoading={isSearching}
          />
        </div>
      </div>
    </div>
  );
}

export default App;