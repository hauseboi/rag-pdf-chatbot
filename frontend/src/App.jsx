import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Header from './components/Header';
import FileDrop from './components/FileDrop';
import QueryBar from './components/QueryBar';

function App() {
  const [fileTitle, setFileTitle] = useState('No Document Uploaded');
  const [collectionName, setCollectionName] = useState('');
  const [answer, setAnswer] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handlePDFUpload = async (rawFile) => {
    setIsUploading(true);
    setAnswer('');
    const dataForm = new FormData();
    dataForm.append('file', rawFile);
    try {
      const response = await fetch('http://localhost:8000/api/upload', { method: 'POST', body: dataForm });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Network error during file parsing.' }));
        throw new Error(errorData.detail || 'Network error during file parsing.');
      }
      const data = await response.json();
      setCollectionName(data.collection_name);
      setFileTitle(data.display_title);
    } catch (err) {
      console.error(err);
      alert('Failed to process and index your PDF file: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuestionSubmit = async (userQuestion) => {
    setIsSearching(true);
    setAnswer('');
    try {
      const response = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion, collection_name: collectionName }),
      });
      if (!response.ok) throw new Error('Vector database lookup query failed.');
      const data = await response.json();
      setAnswer(data.answer);
    } catch (err) {
      console.error(err);
      setAnswer('Failed to retrieve response from the vector database.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-pearl">
      {/* Centered page shell with side borders */}
      <div className="max-w-[1126px] mx-auto min-h-screen flex flex-col border-x border-cyber-border bg-white/55 backdrop-blur-sm">

        <Header fileTitle={fileTitle} />

        <main className="flex-1 w-full max-w-2xl mx-auto px-6 py-10 flex flex-col gap-5">
          <FileDrop
            onFileSelected={handlePDFUpload}
            isUploading={isUploading}
            fileTitle={fileTitle}
          />

          <QueryBar
            onSubmitQuestion={handleQuestionSubmit}
            isReady={!!collectionName}
            isLoading={isSearching}
          />

          {answer && (
            <div className="animate-fade-up rounded-2xl bg-white border border-cyber-border shadow-card overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center gap-2.5 px-5 py-3 border-b border-cyber-border/60 bg-pearl/70">
                <span className="w-2 h-2 rounded-full bg-cyber-mint animate-pulse-soft" />
                <span className="text-[10px] font-display font-semibold tracking-[0.18em] text-cyber-dim/70 uppercase">
                  AI Response
                </span>
                <div className="ml-auto flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyber-violet/25 animate-pulse-soft" style={{ animationDelay: '0.3s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyber-pink/25 animate-pulse-soft"   style={{ animationDelay: '0.7s' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyber-mint/25 animate-pulse-soft"   style={{ animationDelay: '1.1s' }} />
                </div>
              </div>
              {/* Content */}
              <div className="px-6 py-5 text-left prose-cyber">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;