import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storeImage } from '../utils/indexedDB';
import useOfflineStorage from '../hooks/useOfflineStorage';
import LocalJSONLibrary from '../components/LocalJSONLibrary';
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
  const [showLocalJSON, setShowLocalJSON] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
    const newErrors = [];

    // Validate file types and sizes
    const valid = selected.filter(file => {
      if (file.type !== 'application/json') {
        newErrors.push(`❌ ${file.name} is not a JSON file`);
        return false;
      }
      if (file.size > 2 * 1024 * 1024) {
        newErrors.push(`❌ ${file.name} is too large (max 2MB)`);
        return false;
      }
      return true;
    });

    // Check for duplicates
    const existingNames = new Set(files.map(f => f.name));
    const newFiles = valid.filter(file => {
      if (existingNames.has(file.name)) {
        newErrors.push(`⚠️ ${file.name} already uploaded`);
        return false;
      }
      return true;
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    } else {
      setErrors([]);
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
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
        let data;

        try {
          data = JSON.parse(text);
        } catch (parseError) {
          setErrors(prev => [...prev, `❌ Invalid JSON format in: ${file.name}`]);
          setLoading(false);
          return;
        }

        // Detailed validation
        if (!Array.isArray(data)) {
          setErrors(prev => [...prev, `❌ ${file.name} must contain an array of questions`]);
          setLoading(false);
          return;
        }

        if (data.length === 0) {
          setErrors(prev => [...prev, `❌ ${file.name} is empty`]);
          setLoading(false);
          return;
        }

        // Validate each question
        const invalidQuestions = [];
        data.forEach((q, index) => {
          if (typeof q.question !== 'string' || q.question.trim() === '') {
            invalidQuestions.push(`Question ${index + 1}: Missing or invalid question text`);
          }
          if (!Array.isArray(q.options) || q.options.length !== 4) {
            invalidQuestions.push(`Question ${index + 1}: Must have exactly 4 options`);
          }
          if (typeof q.answer === 'undefined' || q.answer < 0 || q.answer > 3) {
            invalidQuestions.push(`Question ${index + 1}: Invalid answer (must be 0-3)`);
          }
          if (typeof q.level === 'undefined' || ![0, 1, 2].includes(q.level)) {
            invalidQuestions.push(`Question ${index + 1}: Invalid level (must be 0, 1, or 2)`);
          }
        });

        if (invalidQuestions.length > 0) {
          setErrors(prev => [...prev, `❌ ${file.name} has issues:`, ...invalidQuestions.slice(0, 5)]);
          if (invalidQuestions.length > 5) {
            setErrors(prev => [...prev, `... and ${invalidQuestions.length - 5} more issues`]);
          }
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

  const handleLocalJSONSelect = (jsonData, selectedTime) => {
    localStorage.setItem('quizData', JSON.stringify(jsonData));
    localStorage.setItem('quizTime', String(selectedTime || quizTime));
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
            className={`library-toggle-btn ${showLocalJSON ? 'active' : ''}`}
            onClick={() => setShowLocalJSON(!showLocalJSON)}
            title="Local JSON Files"
          >
            {showLocalJSON ? '📄' : '📁'}
          </button>
        </div>
      </header>

      <div className="upload-content">
        {showLocalJSON ? (
          <div className="library-section">
            <div className="section-header">
              <h2>📁 Local JSON Files</h2>
              <p>Select from JSON files automatically loaded from your project</p>
            </div>
            <LocalJSONLibrary onFileSelect={handleLocalJSONSelect} />
          </div>
        ) : (
          <div className="upload-section">
            <div className="section-header">
              <h2>📁 Upload Quiz Files</h2>
              <p>Upload JSON files and configure your quiz settings</p>
            </div>

            {/* File Upload Area */}
            <div className="upload-area">
              <div className="upload-instructions">
                <h3>📁 Upload Quiz Files</h3>
                <p>Select or drag your JSON quiz files to get started</p>
              </div>

              <div className="file-input-container">
                <label 
                  className="file-input-label"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('drag-over');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('drag-over');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-over');
                    const files = Array.from(e.dataTransfer.files);
                    const event = { target: { files } };
                    handleFileChange(event);
                  }}
                >
                  <div className="file-input-icon">📄</div>
                  <div className="file-input-text">
                    <span className="primary-text">Choose JSON Files</span>
                    <span className="secondary-text">Tap here to browse or drag files</span>
                    <span className="helper-text">Supports multiple files (max 2MB each)</span>
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    accept=".json" 
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />
                  {files.length > 0 && (
                    <div className="file-count-badge">
                      <span className="count-number">{files.length}</span>
                      <span className="count-text">files ready</span>
                    </div>
                  )}
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
              <div className="settings-header">
                <h3>⚙️ Quiz Configuration</h3>
                <p>Set up your quiz preferences</p>
              </div>

              <div className="settings-grid">
                <div className="setting-item">
                  <label className="setting-label">
                    <span className="label-icon">⏱️</span>
                    <div className="label-content">
                      <span className="label-title">Quiz Duration</span>
                      <span className="label-subtitle">Time limit for the entire quiz</span>
                    </div>
                  </label>
                  <div className="time-input-container">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={quizTime}
                      onChange={e => setQuizTime(Number(e.target.value))}
                      className="time-input"
                      placeholder="60"
                    />
                    <div className="time-unit">minutes</div>
                  </div>
                </div>

                <div className="setting-info">
                  <div className="info-card">
                    <span className="info-icon">💡</span>
                    <div className="info-content">
                      <strong>Tip:</strong> Recommended 1-2 minutes per question
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {showSuccess && (
              <div className="success-section">
                <div className="success-message">
                  <span className="success-icon">✅</span>
                  <span className="success-text">Files uploaded successfully!</span>
                </div>
              </div>
            )}

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