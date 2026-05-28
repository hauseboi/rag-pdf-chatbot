import React from 'react';

export default function Header({ fileTitle }) {

  const hasFile = fileTitle && fileTitle !== 'No Document Uploaded';

  return (
    <div style ={{ textAlign: 'center'}}>
      

      <h1 className="text-5xl whitespace-nowrap overflow-hidden text-ellipsis">
        {fileTitle}
      </h1>  {/*this is wat we are getting from the main app.jsx*/}


    </div>
  );
}
