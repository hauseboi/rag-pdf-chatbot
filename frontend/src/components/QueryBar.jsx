import React, { useState } from 'react';

export default function QueryBar({ onSubmitQuestion, isReady, isLoading }) {
  const [typedText, setTypedText] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!typedText.trim()) return;
    onSubmitQuestion(typedText);
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      className="rounded-2xl bg-white border border-cyber-border shadow-card overflow-hidden transition-shadow duration-200 focus-within:shadow-glow-violet"
    >
      <textarea
        value={typedText}
        onChange={(e) => setTypedText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); }
        }}
        placeholder={isReady ? 'Ask a question about this document…' : 'Upload a PDF to begin'}
        disabled={!isReady || isLoading}
        rows={3}
        className="w-full px-5 pt-4 pb-2 text-cyber-dark font-body text-sm leading-relaxed resize-none outline-none bg-transparent placeholder:text-cyber-dim/35 disabled:opacity-40 disabled:cursor-not-allowed"
      />

      <div className="flex items-center justify-between px-4 py-3 border-t border-cyber-border/50 bg-pearl/50">
        <p className="hidden sm:block text-[11px] font-mono text-cyber-dim/30">
        
        </p>
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={() => setTypedText('')}
            disabled={!typedText}
            className="px-3 py-1.5 items-center rounded-lg text-xs font-body font-medium text-cyber-dim/55 border border-cyber-border hover:border-cyber-violet/30 hover:text-cyber-violet transition-all disabled:opacity-25 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={!isReady || isLoading || !typedText.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-display font-semibold tracking-wide bg-cyber-violet text-white hover:brightness-110 hover:shadow-glow-violet transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin-slow" />
                Searching…
              </>
            ) : (
              <>Query <span className="opacity-50 ml-0.5">→</span></>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}