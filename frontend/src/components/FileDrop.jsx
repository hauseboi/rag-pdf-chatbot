import React, {useState} from 'react';

function FileDrop({onFileSelected, isUploading}){

    const [isHovering, setIsHovering] = useState(false);

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
      style={{ border: isHovering ? '2px solid blue' : '2px dashed grey', padding: '20px' }}
    >
      <label style={{ cursor: 'pointer', display: 'block' }}>
        {isUploading ? ("Processing ...") : ("Drag & Drop your PDF here, or click to browse local files")}
        
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