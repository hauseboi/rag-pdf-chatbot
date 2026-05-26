import React from 'react';

export default function Header({ fileTitle }) {
  const hasFile = fileTitle && fileTitle !== 'No Document Uploaded';

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 border-b border-cyber-border bg-white/80 backdrop-blur-md">

      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyber-violet/10 border border-cyber-violet/25 flex items-center justify-center shadow-glow-violet">
          <svg className="w-4 h-4 text-cyber-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <span className="font-display font-semibold text-cyber-dark tracking-tight">basicrag</span>
        <span className="hidden sm:inline-flex text-[10px] font-mono text-cyber-dim/40 tracking-widest border border-cyber-border rounded px-1.5 py-0.5">
          v1.0
        </span>
      </div>

      {/* Document status badge */}
      {hasFile ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-mint/10 border border-cyber-mint/30 shadow-glow-mint">
          <svg className="w-3 h-3 text-cyber-mint flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-mono text-cyber-dim font-medium max-w-[200px] truncate">
            {fileTitle}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyber-border/60 border border-cyber-border">
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-dim/25" />
          <span className="text-xs font-mono text-cyber-dim/40">No document</span>
        </div>
      )}
    </header>
  );
}