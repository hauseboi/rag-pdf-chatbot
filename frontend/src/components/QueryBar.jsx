import React, { useState } from 'react';

export default function QueryBar({ onSubmitQuestion, isReady, isLoading }) {
  const [typedText, setTypedText] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!typedText.trim()) return;
    onSubmitQuestion(typedText);
    setTypedText('');
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex gap-2 items-end">
      <div className="flex-1">
        <textarea
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleFormSubmit(e);
            }
          }}
          placeholder={isReady ? "Ask a question about this file..." : "Upload a PDF to begin"}
          disabled={!isReady || isLoading}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!isReady || isLoading || !typedText.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Sending</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Send</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTypedText('')}
          disabled={!isReady || !typedText}
          className="px-3 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
    </form>
  );
}