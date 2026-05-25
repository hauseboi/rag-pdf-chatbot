import React from 'react';

export default function Header({ fileTitle }) {

  const hasFile = fileTitle && fileTitle !== 'No Document Uploaded';

  return (
    <div>
      

      <h1>{fileTitle}</h1>  {/*this is wat we are getting from the main app.jsx*/}


    </div>
  );
}
