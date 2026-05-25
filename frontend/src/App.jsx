// import React, { useState } from 'react';

// import Header from "./components/Header"
// import FileDrop from "./components/FileDrop"


// function App() {
//   //all statehooks
//   const [fileTitle, setFileTitle] = useState('No Document Uploaded');
//   const [collectionName, setCollectionName] = useState('');
//   const [answer, setAnswer] = useState('');
//   const [isUploading, setIsUploading] = useState(false);
//   const [isSearching, setIsSearching] = useState(false);



//   const handlePDFUpload = (incomingFile) =>{
//       setFileTitle(incomingFile.name);
//   };

//   return (

//         <div>
//           <Header fileTitle={fileTitle} />


//           <FileDrop onFileSelected={handlePDFUpload}  isUploading={isUploading}/>
//         </div>

//   );
// }


// export default App;



import React, { useState } from 'react';
import Header from './components/Header';
import FileDrop from './components/FileDrop';
import QueryBar from './components/QueryBar';

function App() {
  const [fileTitle, setFileTitle] = useState('No Document Uploaded');
  const [collectionName, setCollectionName] = useState('');
  const [answer, setAnswer] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // pipeline send raw PDF to FastAPI filerouter
  const handlePDFUpload = async (rawFile) => {
    setIsUploading(true);
    setAnswer(''); // Clear answers

    const dataForm = new FormData();
    dataForm.append('file', rawFile); // "file" matches FastAPI arg

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: dataForm 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Network error during file parsing.' }));
        throw new Error(errorData.detail || 'Network error during file parsing.');
      }

      const data = await response.json();
      
      setCollectionName(data.collection_name);
      setFileTitle(data.display_title);
    } catch (err) {
      console.error(err);
      alert('Failed to process and index your PDF file: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // pipeline send query to the correct vector db
  const handleQuestionSubmit = async (userQuestion) => {
    setIsSearching(true);
    setAnswer('');

    try {
      const response = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQuestion,
          collection_name: collectionName // Targets the unique vector collection we built
        })
      });

      if (!response.ok) throw new Error('Vector database lookup query failed.');

      const data = await response.json();
      setAnswer(data.answer);
    } catch (err) {
      console.error(err);
      setAnswer('Failed to retrieve response from the vector database.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      <Header fileTitle={fileTitle} />

      <FileDrop onFileSelected={handlePDFUpload} isUploading={isUploading} fileTitle={fileTitle} />

      <QueryBar 
        onSubmitQuestion={handleQuestionSubmit} 
        isReady={!!collectionName} 
        isLoading={isSearching} 
      />

      {/* Basic vanilla output layer to render the AI reply */}
      {answer && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#e2e8f0' }}>
          <strong>RESPONSE:</strong>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default App;