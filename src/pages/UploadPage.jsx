
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeImage } from '../utils/indexedDB';
import useOfflineStorage from '../hooks/useOfflineStorage';
import LocalQuizLibrary from '../components/LocalQuizLibrary';
import '../styles/UploadPage.css';
import { openDb, storeText, clearDatabase, deleteDatabase } from '../utils/indexedDB';

function UploadPage() {
  const [files, setFiles] = useState([]);
  const [fileImageMap, setFileImageMap] = useState({});
  const [quizTime, setQuizTime] = useState(60);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
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

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files);
    const valid = selected.filter(file =>
      file.type === 'application/json' && file.size <= 2 * 1024 * 1024
    );

    const newFileNames = new Set(files.map(f => f.name));
    const newFiles = valid.filter(f => !newFileNames.has(f.name));
    setFiles(prev => [...prev, ...newFiles]);
    setErrors([]);
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
      setErrors(prev => [...prev, '❌ Only PNG and JPEG images are allowed.']);
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
      setErrors(['⚠️ Please upload at least one JSON file.']);
      return;
    }

    setLoading(true);
    setErrors([]);
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

      const db = await openDb();
      allData.forEach(item => {
        storeText(item.questions, item.name);
      });

      storeText(String(quizTime), "quizTime");
      storeText(JSON.stringify(fileImageMap), "fileImageMap");

      for (const [filename, images] of Object.entries(fileImageMap)) {
        images.forEach(image => storeImage(image.data, filename));
      }

      localStorage.setItem('quizData', JSON.stringify(allData));
      localStorage.setItem('quizTime', String(quizTime));
      localStorage.setItem('fileImageMap', JSON.stringify(fileImageMap));

      navigate('/sections');
    } catch (err) {
      console.error(err);
      setErrors(['❌ Unexpected error while processing files.']);
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
    <div className={`upload-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header similar to exam page */}
      <header className="upload-header">
        <div className="page-title">
          <span className="title-icon">📂</span>
          <span className="title-text">Quiz Setup</span>
        </div>
        <div className="header-controls">
          <div className="connection-indicator">
            <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
            <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button 
            className={`library-toggle-btn ${showLocalLibrary ? 'active' : ''}`}
            onClick={() => setShowLocalLibrary(!showLocalLibrary)}
          >
            {showLocalLibrary ? '📁' : '📚'}
          </button>
        </div>
      </header>

      <div className="upload-content">
        {showLocalLibrary ? (
          <div className="library-section">
            <div className="section-header">
              <h2>📚 Saved Quiz Library</h2>
              <p>Select from your previously saved quizzes</p>
            </div>
            <LocalQuizLibrary onQuizSelect={handleLocalQuizSelect} />
          </div>
        ) : (
          <div className="upload-section">
            <div className="section-header">
              <h2>📁 Upload Quiz Files</h2>
              <p>Upload JSON files and configure your quiz settings</p>
            </div>

            {/* File Upload Area */}
            <div className="upload-area">
              <div className="file-input-container">
                <label className="file-input-label">
                  <div className="file-input-icon">📄</div>
                  <div className="file-input-text">
                    <span className="primary-text">Choose JSON Files</span>
                    <span className="secondary-text">or drag and drop here</span>
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    accept=".json" 
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />
                </label>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="file-list">
                  <h3>📋 Uploaded Files ({files.length})</h3>
                  <div className="file-items">
                    {files.map((file, idx) => (
                      <div key={idx} className="file-item">
                        <div className="file-info">
                          <div className="file-icon">📄</div>
                          <div className="file-details">
                            <div className="file-name">{file.name}</div>
                            <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
                          </div>
                        </div>
                        <div className="file-actions">
                          <label className="image-upload-btn" title="Add images for this file">
                            🖼️
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              style={{ display: 'none' }}
                              onChange={(e) => handleImageUpload(file.name, e.target.files)}
                            />
                          </label>
                          {fileImageMap[file.name] && (
                            <span className="image-count">{fileImageMap[file.name].length}</span>
                          )}
                          <button
                            onClick={() => removeFile(file.name)}
                            className="remove-file-btn"
                            title="Remove this file"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quiz Settings */}
            <div className="settings-section">
              <h3>⚙️ Quiz Settings</h3>
              <div className="time-setting">
                <label className="time-label">
                  <span className="label-icon">⏱️</span>
                  <span className="label-text">Quiz Duration (minutes)</span>
                </label>
                <div className="time-input-container">
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={quizTime}
                    onChange={e => setQuizTime(Number(e.target.value))}
                    className="time-input"
                  />
                  <div className="time-display">{quizTime} min</div>
                </div>
              </div>
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="error-section">
                {errors.map((err, idx) => (
                  <div key={idx} className="error-message">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{err}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Button */}
            <div className="action-section">
              <button 
                className={`next-btn ${loading ? 'loading' : ''}`} 
                onClick={handleNext} 
                disabled={loading || files.length === 0}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <span className="btn-icon">➡️</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadPage;
