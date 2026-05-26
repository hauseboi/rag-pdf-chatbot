import React, { useState } from 'react';

function FileDrop({ onFileSelected, isUploading, fileTitle }) {
  const [isHovering, setIsHovering] = useState(false);
  const hasFile = fileTitle && fileTitle !== 'No Document Uploaded';

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf') onFileSelected(file);
    else alert('Invalid file format. Please drop a valid PDF.');
  };

  const handleManualSelection = (e) => {
    if (e.target.files?.[0]) onFileSelected(e.target.files[0]);
  };

  // Border + background state classes
  const stateClass = isUploading
    ? 'border-solid border-cyber-blue bg-cyber-blue/5 shadow-glow-violet'
    : isHovering
    ? 'border-solid border-cyber-pink bg-cyber-pink/5 shadow-glow-pink scale-[1.015]'
    : hasFile
    ? 'border-solid border-cyber-mint bg-cyber-mint/5 shadow-glow-mint'
    : 'border-dashed border-cyber-violet/30 bg-white hover:border-cyber-violet/60 hover:shadow-glow-violet';

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragOver}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 transition-all duration-300 shadow-card ${stateClass}`}
    >
      <label className={`flex flex-col items-center justify-center gap-3 py-9 px-6 ${isUploading ? 'cursor-wait' : 'cursor-pointer'}`}>

        {isUploading ? (
          <>
            <div className="w-11 h-11 rounded-full border-2 border-cyber-blue/20 border-t-cyber-blue animate-spin-slow" />
            <div className="text-center">
              <p className="font-display font-medium text-cyber-blue text-sm">Processing document</p>
              <p className="text-xs text-cyber-dim/45 mt-1 font-mono">Embedding & indexing…</p>
            </div>
          </>
        ) : hasFile ? (
          <>
            <div className="w-11 h-11 rounded-full bg-cyber-mint/15 border border-cyber-mint/35 flex items-center justify-center shadow-glow-mint">
              <svg className="w-5 h-5 text-cyber-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-cyber-dark text-sm">Document ready</p>
              <p className="font-mono text-xs text-cyber-dim mt-1 max-w-xs truncate">{fileTitle}</p>
              <p className="text-[11px] text-cyber-dim/40 mt-1">Drop another PDF to replace</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-11 h-11 rounded-full bg-cyber-violet/10 border border-cyber-violet/25 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyber-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm text-cyber-dim">
                <span className="font-semibold text-cyber-violet">Drop your PDF here</span>
                {' '}or click to browse
              </p>
              <p className="text-[11px] text-cyber-dim/40 mt-1 font-mono">PDF files only</p>
            </div>
          </>
        )}

        <input
          type="file"
          accept=".pdf"
          onChange={handleManualSelection}
          disabled={isUploading}
          className="hidden"
        />
      </label>
    </div>
  );
}

export default FileDrop;