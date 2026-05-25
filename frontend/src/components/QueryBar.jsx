import React, { useState } from 'react';

export default function QueryBar({ onSubmitQuestion, isReady, isLoading }) {
  // Local state to keep track of what the user is typing line-by-line
  const [typedText, setTypedText] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault(); // Stop the page from doing a hard refresh reload
    
    if (!typedText.trim()) return; // Exit early if the field is empty strings
    
    // Pass the text string up to the master App.jsx container
    onSubmitQuestion(typedText);
    
    // Clear the input box out back to an empty string
    setTypedText('');
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <textarea
        value={typedText}
        onChange={(e) => setTypedText(e.target.value)}
        placeholder={isReady ? "Ask a question about this file..." : "⚠️ Upload a PDF to unlock question terminal"}
        disabled={!isReady || isLoading}
        required
      />
      <button type="submit" disabled={!isReady || isLoading}>
        {isLoading ? 'Searching Document...' : 'Submit Query'}
      </button>
    </form>
  );
}