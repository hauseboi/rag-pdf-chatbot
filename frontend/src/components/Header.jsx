import React from 'react';

export default function Header({ fileTitle }) {
  const hasFile = fileTitle && fileTitle !== 'No Document Uploaded';

  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 truncate">
        {hasFile ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {fileTitle}
          </span>
        ) : (
          <span className="text-gray-400">No Document Uploaded</span>
        )}
      </h1>
    </div>
  );
}