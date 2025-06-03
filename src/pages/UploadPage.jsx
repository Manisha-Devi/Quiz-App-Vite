import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeImage } from '../utils/indexedDB';
import useOfflineStorage from '../hooks/useOfflineStorage';
import LocalQuizLibrary from '../components/LocalQuizLibrary';
import '../styles/UploadPage.css';
import { openDb, storeText, clearDatabase ,deleteDatabase } from '../utils/indexedDB';  // Import the functions

function UploadPage() {
  const [files, setFiles] = useState([]);
  const [fileImageMap, setFileImageMap] = useState({});
  const [quizTime, setQuizTime] = useState(60);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showLocalLibrary, setShowLocalLibrary] = useState(false);
  const { isOnline } = useOfflineStorage();

  const KEYS_TO_CLEAR = [
    'quizData',
    'quizTime',
    'finalQuiz',
    'examState',
    'examMeta',
    'examAnswers',
    'reviewMarks',
    'fileImageMap'
  ];


  useEffect(() => {
    KEYS_TO_CLEAR.forEach(key => localStorage.removeItem(key));
  }, []);

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files);
    const valid = selected.filter(file =>
      file.type === 'application/json' && file.size <= 2 * 1024 * 1024
    );

    const newFileNames = new Set(files.map(f => f.name));
    const newFiles = valid.filter(f => !newFileNames.has(f.name));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (filename) => {
    setFiles(prev => prev.filter(f => f.name !== filename));
    setFileImageMap(prev => {
      const updated = { ...prev };
      if (updated[filename]) {
        delete updated[filename];
        localStorage.setItem('fileImageMap', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleImageUpload = (filename, selectedFiles) => {
    const validTypes = ['image/png', 'image/jpeg'];

    const filtered = Array.from(selectedFiles).filter(file =>
      validTypes.includes(file.type)
    );

    if (filtered.length < selectedFiles.length) {
      alert('❌ Only PNG and JPEG images are allowed.');
    }

    const imagePromises = filtered.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => {
          const nameWithoutExt = file.name.replace(/\.(png|jpg|jpeg)$/i, '');
          resolve({ name: nameWithoutExt, data: reader.result });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(images => {
      const updated = {
        ...fileImageMap,
        [filename]: [...(fileImageMap[filename] || []), ...images]
      };
      setFileImageMap(updated);
      localStorage.setItem('fileImageMap', JSON.stringify(updated));
    });
  };




  const handleNext = async () => {
    if (files.length === 0) {
      alert('⚠️ Please upload at least one JSON file.');
      return;
    }

    setLoading(true);
    const allData = [];

    try {
      for (const file of files) {
        const text = await file.text();
        const data = JSON.parse(text);

        if (
          !Array.isArray(data) ||
          !data.every(q =>
            typeof q.question === 'string' &&
            Array.isArray(q.options) &&
            q.options.length === 4 &&
            typeof q.answer !== 'undefined' &&
            typeof q.level !== 'undefined'
          )
        ) {
          setErrors(prev => [...prev, `❌ Invalid structure in file: ${file.name}`]);
          setLoading(false);
          return;
        }

        allData.push({
          name: file.name.replace(/\.json$/i, ''),
          questions: data
        });
      }

      // Open the IndexedDB and store the parsed JSON data
      const db = await openDb();
      const transaction = db.transaction("texts", "readwrite");
      const store = transaction.objectStore("texts");

      // Store `quizData` (JSON content) in IndexedDB
      allData.forEach(item => {
        storeText(item.questions, item.name);  // Store JSON data (questions)
      });

      // Store `quizTime` (as a string) in IndexedDB
      storeText(String(quizTime), "quizTime");  // Store quizTime as text

      // Store `fileImageMap` (as a string) in IndexedDB
      storeText(JSON.stringify(fileImageMap), "fileImageMap");  // Store image map as text

      // Store images related to each file in IndexedDB
      for (const [filename, images] of Object.entries(fileImageMap)) {
        images.forEach(image => storeImage(image.data, filename));  // Store image data
      }

      localStorage.setItem('quizData', JSON.stringify(allData));
      localStorage.setItem('quizTime', String(quizTime));
      localStorage.setItem('fileImageMap', JSON.stringify(fileImageMap));

      navigate('/sections');
    } catch (err) {
      console.error(err);
      setErrors(prev => [...prev, '❌ Unexpected error while processing files.']);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalQuizSelect = (quiz) => {
    localStorage.setItem('quizData', JSON.stringify(quiz.data));
    localStorage.setItem('quizTime', String(quizTime));
    localStorage.setItem('fileImageMap', JSON.stringify({}));
    navigate('/sections');
  };

  return (
    <div className="page">
      <div className="upload-header">
        <h1>📂 Upload Your Quiz Files</h1>
        <div className="header-controls">
          <div className="status-info">
            <span className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
              {isOnline ? '🟢 Online' : '🔴 Offline Mode'}
            </span>
          </div>
          <button 
            className="toggle-library-btn"
            onClick={() => setShowLocalLibrary(!showLocalLibrary)}
          >
            {showLocalLibrary ? '📁 Upload New' : '📚 Saved Quizzes'}
          </button>
        </div>
      </div>

      {showLocalLibrary ? (
        <LocalQuizLibrary onQuizSelect={handleLocalQuizSelect} />
      ) : (
        <div className="upload-section">

      <div className="form-group">
        <label>Select JSON Files:</label>
        <input type="file" multiple accept=".json" onChange={handleFileChange} />
        {files.length > 0 && (
          <ul>
            {files.map((file, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>{file.name}</span>
                <button
                  onClick={() => removeFile(file.name)}
                  title="Remove this file"
                  style={{
                    background: 'transparent',
                    color: 'red',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer'
                  }}
                >❌</button>
                <label title="Upload images for this file" style={{ cursor: 'pointer' }}>
                  🖼️
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageUpload(file.name, e.target.files)}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="form-group">
        <label>Total Quiz Time (in minutes):</label>
        <input
          type="number"
          min="1"
          value={quizTime}
          onChange={e => setQuizTime(Number(e.target.value))}
        />
      </div>

      <button className="primary-button" onClick={handleNext} disabled={loading}>
        {loading ? 'Processing…' : 'Next ➡️'}
      </button>

      {errors.map((err, idx) => (
        <p key={idx} style={{ color: 'red' }}>{err}</p>
      ))}
    </div>
      )}
    </div>
  );
}

export default UploadPage;