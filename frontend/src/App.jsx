import React, { useState,useEffect } from 'react';
import './index.css'
import ReactMarkdown from 'react-markdown';
import ReactDOM from 'react-dom/client';
import Header from './components/Header';
import FileDrop from './components/FileDrop';
import QueryBar from './components/QueryBar';
import Sidebar from './components/Sidebar';
import ManualSearch from './components/ManualSearch';
import toast from 'react-hot-toast';

import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const BASE_URL = "http://127.0.0.1:8000";

function AnswerWithFigures({ text }) {
  const parts = [];
  
  // 2. State to track which image is currently maximized (null if none)
  const [selectedImage, setSelectedImage] = useState(null);

  // Robust Regex Pattern (from previous step)
  const refRegex = /\[[^\]]*?ref:([^\]]+\.png)\]/g;

  let lastIndex = 0;
  let match;

  while ((match = refRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    const extractedFilename = match[1].trim();
    parts.push({ type: "image", filename: extractedFilename });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return (
    <div className="relative space-y-4">
      {parts.map((part, i) =>
        part.type === "text" ? (
          <div key={`text-${i}`} className="prose prose-sm max-w-none dark:prose-invert leading-relaxed">
            <ReactMarkdown>{part.content}</ReactMarkdown>
          </div>
        ) : (
          <div key={`img-${i}`} className="group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm my-2 bg-gray-50 dark:bg-gray-900">
            {/* 3. Wrap image in a container to add the zoom cue on hover */}
            <div className="relative overflow-hidden cursor-zoom-in" onClick={() => setSelectedImage(part.filename)}>
              <img
                src={`${BASE_URL}/figures/${encodeURIComponent(part.filename)}`}
                alt={part.filename}
                className="w-full object-contain max-h-96 transition-transform duration-300 ease-in-out group-hover:scale-[1.02]"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = "https://placehold.co/600x400?text=Image+Asset+Missing";
                }}
              />
              {/* "Click to maximize" */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                <span className="text-xs bg-black/60 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to Expand
                </span>
              </div>
            </div>
            
            <div className="text-xs font-mono text-gray-500 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
               {part.filename.replace(".png", "")}
            </div>
          </div>
        )
      )}

      {/* ============================================================ */}
      {/* 4. THE MODAL (Lightbox) - Conditional Rendering */}
      {/* ============================================================ */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedImage(null)} // Close when clicking background
        >
          {/* Close Button (Top Right) */}
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white text-3xl font-bold transition p-2"
            onClick={() => setSelectedImage(null)}
          >
            &times;
          </button>

          {/* Maximized Image (uses max-h for screen fitting) */}
          <img
            src={`${BASE_URL}/figures/${encodeURIComponent(selectedImage)}`}
            alt={selectedImage}
            className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
          />
        </div>
         
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
  const [searchResults, setSearchResults] = useState([]);

  //for downloading pdf links off the net
  const handleManualSelect = async (url, title) => {
  setIsUploading(true);
  const toastId = toast.loading('📥 Downloading manual...');

  try {
    const response = await fetch(`http://localhost:8000/api/download?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Download failed');
    }
    const data = await response.json();
    
    setSessionId(data.session_id);
    setCollectionName(data.collection_name);
    setFileTitle(data.display_title);
    setMessages([]);
    setHistoryKey(k => k + 1);
    setSearchResults([]);
    
    toast.success(`${data.display_title} ready!`, { id: toastId });
  } catch (err) {
    console.error(err);
    toast.error('❌ ' + err.message, { id: toastId });
  } finally {
    setIsUploading(false);
  }
};


const handlePDFUpload = async (rawFile) => {
  setIsUploading(true);
  const toastId = toast.loading('Uploading and indexing...');

  try {
    // ... existing code
    const data = await response.json();
    // ... set state
    toast.success(`${data.display_title} indexed!`, { id: toastId });
  } catch (err) {
    console.error(err);
    toast.error(err.message, { id: toastId });
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
  const toastId = toast.loading('🔍 Searching manual...');

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

    if (!response.ok) {
      throw new Error('Vector database lookup query failed.');
    }

    const data = await response.json();
    toast.success('✅ Answer ready!', { id: toastId });

    setMessages(prev => [...prev, {
      question: userQuestion,
      answer: String(data.answer || 'No answer returned.')
    }]);

  } catch (err) {
    console.error(err);
    toast.error('❌ ' + err.message, { id: toastId });
    setMessages(prev => [...prev, {
      question: userQuestion,
      answer: String(err.message || 'Failed to retrieve response from the vector database.')
    }]);
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
        
          {/* Download Button - only show if a file is loaded */}
          {fileTitle !== 'No Document Uploaded' && (
            <a
              href={`http://localhost:8000/api/pdf/${encodeURIComponent(fileTitle)}`}
              download
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex-shrink-0"
            >
              {/* Simple Download Icon (SVG) */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </a>
          )}
          
        <ManualSearch onResults={setSearchResults} onSelect={handleManualSelect} isDownloading={isUploading}/>
      </div>




      {/* Main viewport - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Chat messages layout streams seamlessly right below the search cards */}



        {isUploading ? (
            // Show processing skeleton
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Skeleton circle width={64} height={64} />
              <Skeleton width={200} height={24} />
              <Skeleton width={300} height={16} />
              <div className="flex flex-col w-full max-w-md space-y-2">
                <Skeleton height={80} />
                <Skeleton height={80} />
              </div>
            </div>
        ):messages.length === 0 ? (
          /* Show this prompt placeholder only if there are no search cards either */
          searchResults.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <p className="text-center">Ready? Ask away!</p>
            </div>
          )
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
                  <ReactMarkdown>{msg.answer}</ReactMarkdown>  
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