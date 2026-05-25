import React, { useState } from 'react';

export default function QueryBar({ onSubmitQuestion, isReady, isLoading }) {

  const [typedText, setTypedText] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault(); 
    
    if (!typedText.trim()) return; 
    
    // pass to App.jsx
    onSubmitQuestion(typedText);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <textarea
        value={typedText}
        onChange={(e) => setTypedText(e.target.value)}
        placeholder={isReady ? "Ask a question about this file..." : " Upload a PDF to begin"}
        disabled={!isReady || isLoading}
        required
      />
      <button type="submit" disabled={!isReady || isLoading}>
        {isLoading ? 'Searching Document...' : 'Submit Query'}
      </button>

      <button type="button" onClick={() => setTypedText('')} disabled={!isReady || !typedText}>Clear</button>
    </form>
  );

}