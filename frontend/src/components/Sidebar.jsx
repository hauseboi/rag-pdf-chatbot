import React, { useEffect, useState } from 'react';

export default function Sidebar({ onSessionSelect, activeSessionId }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/history')
      .then(r => r.json())
      .then(data => setSessions(data.sessions.slice().reverse()))
      .catch(err => console.error('Failed to load history:', err));
  }, []);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <aside className="w-72 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span className="font-semibold text-gray-800 dark:text-gray-200">Conversations</span>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-8 px-4">No sessions yet</p>
        ) : (
          sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(session)}
              className={`w-full text-left rounded-lg px-3 py-2.5 transition-all duration-150 ${
                activeSessionId === session.id
                  ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
              }`}
            >
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                📄 {session.pdf_name}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">{formatDate(session.created_at)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSessionId === session.id
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                }`}>
                  {session.messages.length} Q
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 text-center">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </p>
      </div>
    </aside>
  );
}