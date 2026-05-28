import React, { useEffect, useState } from 'react';

export default function Sidebar({ onSessionSelect, activeSessionId }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/history')
      .then(r => r.json())
      .then(data => setSessions(data.sessions.slice().reverse())) // newest first
      .catch(err => console.error('Failed to load history:', err));
  }, []);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <div>
        <span>History</span>
      </div>

      {/* Session list */}
      <div className="width:100% display:flex">
        {sessions.length === 0 ? (
          <p>No sessions yet</p>
        ) : (
          sessions.map(session => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(session)}
              className={`w-full width:100% text-left px-4 py-3 flex flex-col gap-0.5 transition-colors hover:bg-pearl border-b border-cyber-border/40 last:border-0
                ${activeSessionId === session.id ? 'bg-cyber-violet/5 border-l-2 border-l-cyber-violet' : ''}`}
            >
              <span className="text-xs font-medium text-cyber-dark truncate">{session.pdf_name}</span>
              <br />
              <span className="text-[10px] font-mono text-cyber-dim/40">{formatDate(session.created_at)}</span>
              <br />
              <span className="text-[10px] text-cyber-dim/40">{session.messages.length} message{session.messages.length !== 1 ? 's' : ''}</span>
            </button>
          )))
        }
      </div>
    </>
  );
}