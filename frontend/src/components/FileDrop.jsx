import React, {useState} from 'react';

function FileDrop({onFileSelected, isUploading, fileTitle}){

    const [isHovering, setIsHovering] = useState(false);
    const hasFile = fileTitle && fileTitle !== 'No Document Uploaded';

    //handle browser from opening the pdf once it is hovering over this component
    //#1
    const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (e.type === "dragover"){
                setIsHovering(true);
            }
            else{
                setIsHovering(false);
            }
    }


    //#2
    const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsHovering(false);

            //extract the file make sure its a pdf

            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const selectedFile = e.dataTransfer.files[0];
      
                if (selectedFile.type === "application/pdf") {
                        // Pass the raw file back up to the master App.jsx file controller
                        onFileSelected(selectedFile);
                } 
                else {
                    alert("Invalid file format. Please drop a valid PDF.");
                }
            }
    };


    //#3
    const handleManualSelection = (e) => {
        if (e.target.files && e.target.files[0])   {onFileSelected(e.target.files[0]);}
    };


    return(
        <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragOver}
      onDrop={handleDrop}
      style={{ 
        border: isHovering ? '2px solid blue' : (hasFile ? '2px solid green' : '2px dashed grey'), 
        backgroundColor: hasFile && !isHovering ? '#f0fdf4' : 'transparent',
        padding: '20px',
        textAlign: 'center',
        borderRadius: '8px',
        transition: 'all 0.3s ease'
      }}
    >
      <label style={{ cursor: 'pointer', display: 'block', margin: 0 }}>
        {isUploading ? (
          <span style={{ color: '#0284c7' }}>Processing Document...</span>
        ) : hasFile ? (
          <div>
            <div style={{ color: '#166534', fontWeight: 'bold', marginBottom: '8px' }}>
              Document Ready
            </div>
            <div style={{ color: '#4b5563', fontSize: '0.9em' }}>
              {fileTitle}
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.8em', marginTop: '4px' }}>
              (Click or drag another PDF here to replace)
            </div>
          </div>
        ) : (
          <span style={{ color: '#4b5563' }}>Drag & Drop your PDF here, or click to browse local files</span>
        )}
        
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleManualSelection} 
          disabled={isUploading}
          style={{ display: 'none' }} // Hide the ugly default button
        />
      </label>
    </div>
    );

}

export default FileDrop;