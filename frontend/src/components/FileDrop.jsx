import React, { useState } from 'react';
import toast from 'react-hot-toast';

function FileDrop({ onFileSelected, isUploading, fileTitle }) {
  const [isHovering, setIsHovering] = useState(false);
  const hasFile = fileTitle && fileTitle !== 'No Document Uploaded';

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHovering(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type === "application/pdf") {
        onFileSelected(selectedFile);
      } else {
        toast.error('Invalid file type: please provide PDFs only !');
      }
    }
  };

  const handleManualSelection = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
        ${isHovering ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}
        ${hasFile && !isHovering ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}
      `}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleManualSelection}
        disabled={isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        title=""
      />
      <div className="pointer-events-none">
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Processing Document...</span>
          </div>
        ) : hasFile ? (
          <div>
            <div className="text-green-600 dark:text-green-400 font-semibold mb-1">Document Ready</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{fileTitle}</div>
            <div className="text-xs text-gray-400 mt-1">(Click or drag another PDF here to replace)</div>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400">Drag & drop your PDF here</p>
            {/* <p className="text-gray-500 dark:text-gray-400">check online using the search bar below<p> */}
            <p className="text-xs text-gray-400 mt-1">Supports .pdf files only</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileDrop;