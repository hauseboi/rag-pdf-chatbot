// src/components/ManualSearch.jsx
import React, { useState } from 'react';

export default function ManualSearch({ onResults, onSelect, isProcessing }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
      onResults(data); // sync with parent
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (url, title) => {
    if (isProcessing) return; // prevent double clicks
    // Clear results immediately (both local and parent)
    setResults([]);
    onResults([]);
    // Start download + ingestion
    onSelect(url, title);
  };

  return (
    <div className="mb-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a product manual (e.g., Dell XPS 13 9360)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
          disabled={loading || isProcessing}
        />
        <button
          type="submit"
          disabled={loading || isProcessing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {results.length > 0 && (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm max-w-4xl mx-auto mt-3">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Found Verified Manual Resources
            </h3>
            {/* No Clear button — auto‑clears on click */}
          </div>
          <ul className="space-y-2">
            {results.map((item, idx) => (
              <li
                key={idx}
                onClick={() => handleResultClick(item.url, item.title)}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-100 dark:hover:border-gray-700 cursor-pointer'}`}
              >
                <span className="text-green-500 bg-green-50 dark:bg-green-900/30 p-1 rounded-md text-xs">
                  {isProcessing ? '⏳' : '✓ PDF'}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium text-sm hover:underline line-clamp-1 flex-1">
                  {item.title}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                  {item.domain}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}