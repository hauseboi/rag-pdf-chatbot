import React from 'react';

export default function Header({ fileTitle }) {

  const hasFile = fileTitle && fileTitle !== 'No Document Uploaded';

  return (
    <div>
      <span>
        {hasFile ? 'CONTEXT ATTACHED' : 'SYSTEM IDLE'}
      </span>



      <h1>{fileTitle}</h1>  {/*this is wat we are getting from the main app.jsx*/}




      <p>Drag or choose a PDF below to query with the RAG agent</p>
    </div>
  );
}
