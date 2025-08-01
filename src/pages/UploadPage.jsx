import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { storeImage } from "../utils/indexedDB";
import useOfflineStorage from "../hooks/useOfflineStorage";
import LocalJSONLibrary from "../components/LocalJSONLibrary";
import CacheCleaner from "../components/CacheCleaner";
import dataManager from "../utils/dataManager";
import "../styles/UploadPage.css";
import {
  openDb,
  clearDatabase,
  deleteDatabase,
} from "../utils/indexedDB";

function UploadPage() {
  const [showLocalJSON, setShowLocalJSON] = useState(true);
  const [files, setFiles] = useState([]);
  const [fileImageMap, setFileImageMap] = useState({});
  const [quizTime, setQuizTime] = useState(0);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const { isOnline } = useOfflineStorage();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', message: '', type: 'info' });
  
  // Confirmation dialog state
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationData, setConfirmationData] = useState({ 
    title: '', 
    message: '', 
    onConfirm: null, 
    onCancel: null 
  });

  const KEYS_TO_CLEAR = [
    "quizData",
    "quizTime",
    "finalQuiz",
    "examState",
    "examMeta",
    "examAnswers",
    "reviewMarks",
    "fileImageMap",
    "practiceMode",
    "enableDrawing",
    "retryMode",
    "retryAnswers",
    "retryCompleted",
    "retryQuestions",
    "currentRetryIndex",
    "retryStats",
    "quizSetupConfig",
  ];

  useEffect(() => {
    // Initialize data manager and auto-clear exam data
    const initializeData = async () => {
      console.log('Initializing UploadPage - auto-clearing exam data...');

      // Auto-clear examData and examResults stores
      try {
        const examDataKeys = [
          'quizData', 'finalQuiz', 'examState', 'examMeta', 
          'fileImageMap', 'quizSetup'
        ];
        
        const examResultsKeys = [
          'examAnswers', 'reviewMarks', 'retryAnswers', 
          'retryCompleted', 'retryQuestions', 'currentRetryIndex', 'retryStats'
        ];

        // Clear examData store
        for (const key of examDataKeys) {
          await dataManager.deleteExamData(key);
        }

        // Clear examResults store  
        for (const key of examResultsKeys) {
          await dataManager.deleteExamResults(key);
        }

        console.log('✅ Auto-cleared examData and examResults stores');
      } catch (error) {
        console.error('Error auto-clearing exam data:', error);
      }

      // Load only user settings from IndexedDB (keep user preferences)
      const darkModeValue = await dataManager.getUserSetting('darkMode', false);
      setIsDarkMode(darkModeValue);
      console.log('Dark mode loaded:', darkModeValue);

      console.log('UploadPage initialization completed - exam data cleared, ready for fresh start');
      console.log('📌 Images will only be fetched when user clicks Fetch button - no automatic loading');
    };

    initializeData();
  }, []);

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await dataManager.setUserSetting('darkMode', newDarkMode);
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files);
    const newErrors = [];

    // Validate file types and sizes
    const valid = selected.filter((file) => {
      if (file.type !== "application/json") {
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
    const existingNames = new Set(files.map((f) => f.name));
    const newFiles = valid.filter((file) => {
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
      setFiles((prev) => [...prev, ...newFiles]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const removeFile = (filename) => {
    setFiles((prev) => prev.filter((f) => f.name !== filename));
    setFileImageMap((prev) => {
      const updated = { ...prev };
      if (updated[filename]) {
        delete updated[filename];
        dataManager.setFileImageMap(updated);
      }
      return updated;
    });
  };

  const handleImageUpload = (filename, selectedFiles) => {
    const validTypes = ["image/png", "image/jpeg"];
    const filtered = Array.from(selectedFiles).filter((file) =>
      validTypes.includes(file.type),
    );

    if (filtered.length < selectedFiles.length) {
      setErrors((prev) => [
        ...prev,
        "❌ Only PNG and JPEG images are allowed.",
      ]);
    }

    const imagePromises = filtered.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const nameWithoutExt = file.name.replace(/\.(png|jpg|jpeg)$/i, "");
          resolve({ name: nameWithoutExt, data: reader.result });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(async (images) => {
      const updated = {
        ...fileImageMap,
        [filename]: [...(fileImageMap[filename] || []), ...images],
      };
      setFileImageMap(updated);
      await dataManager.setFileImageMap(updated);
    });
  };

  const handleNext = async () => {
    if (files.length === 0) {
      setErrors(["⚠️ Please upload at least one JSON file."]);
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
          setErrors((prev) => [
            ...prev,
            `❌ Invalid JSON format in: ${file.name}`,
          ]);
          setLoading(false);
          return;
        }

        // Detailed validation
        if (!Array.isArray(data)) {
          setErrors((prev) => [
            ...prev,
            `❌ ${file.name} must contain an array of questions`,
          ]);
          setLoading(false);
          return;
        }

        if (data.length === 0) {
          setErrors((prev) => [...prev, `❌ ${file.name} is empty`]);
          setLoading(false);
          return;
        }

        // Validate each question
        const invalidQuestions = [];
        data.forEach((q, index) => {
          if (typeof q.question !== "string" || q.question.trim() === "") {
            invalidQuestions.push(
              `Question ${index + 1}: Missing or invalid question text`,
            );
          }
          if (!Array.isArray(q.options) || q.options.length !== 4) {
            invalidQuestions.push(
              `Question ${index + 1}: Must have exactly 4 options`,
            );
          }
          if (typeof q.answer === "undefined" || q.answer < 0 || q.answer > 3) {
            invalidQuestions.push(
              `Question ${index + 1}: Invalid answer (must be 0-3)`,
            );
          }
          if (typeof q.level === "undefined" || ![0, 1, 2].includes(q.level)) {
            invalidQuestions.push(
              `Question ${index + 1}: Invalid level (must be 0, 1, or 2)`,
            );
          }
        });

        if (invalidQuestions.length > 0) {
          setErrors((prev) => [
            ...prev,
            `❌ ${file.name} has issues:`,
            ...invalidQuestions.slice(0, 5),
          ]);
          if (invalidQuestions.length > 5) {
            setErrors((prev) => [
              ...prev,
              `... and ${invalidQuestions.length - 5} more issues`,
            ]);
          }
          setLoading(false);
          return;
        }

        allData.push({
          name: file.name.replace(/\.json$/i, ""),
          questions: data,
        });
      }

      // Store data in IndexedDB
      console.log('Storing quiz data:', allData);
      await dataManager.setExamData('quizData', allData);
      await dataManager.setUserSetting('quizTime', quizTime);

      // Store file image map if it exists
      if (Object.keys(fileImageMap).length > 0) {
        await dataManager.setFileImageMap(fileImageMap);
        console.log('Stored file image map:', fileImageMap);
      }

      // Store individual quiz texts and images in IndexedDB
      const db = await openDb();

      // Store texts for each quiz file
      for (const item of allData) {
        const { storeJSONFile } = await import('../utils/indexedDB');
        await storeJSONFile(item.name + '.json', item.questions);
        console.log(`Stored text data for ${item.name}`);
      }

      // Store images if they exist
      for (const [filename, images] of Object.entries(fileImageMap)) {
        for (const image of images) {
          await storeImage(image.data, image.name, filename);
          console.log(`Stored image ${image.name} for ${filename}`);
        }
      }

      console.log('All data stored successfully, navigating to sections page');
      navigate("/sections");
    } catch (err) {
      console.error(err);
      setErrors(["❌ Unexpected error while processing files."]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocalJSONSelect = async (jsonData, selectedTime) => {
    await dataManager.setExamData('quizData', jsonData);
    await dataManager.setUserSetting('quizTime', selectedTime || quizTime);
    
    // Don't clear fileImageMap here - it's already set by LocalJSONLibrary
    // await dataManager.setFileImageMap({});
    
    navigate("/sections");
  };

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1); // Increment to trigger refresh
  };

  const handleDialogAlert = (title, message, type = 'info') => {
    setDialogContent({ title, message, type });
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
  };

  // Confirmation dialog functions
  const handleConfirmDialog = (title, message, onConfirm, onCancel = null) => {
    setConfirmationData({ 
      title, 
      message, 
      onConfirm, 
      onCancel: onCancel || (() => setConfirmationVisible(false))
    });
    setConfirmationVisible(true);
  };

  const handleConfirm = () => {
    if (confirmationData.onConfirm) {
      confirmationData.onConfirm();
    }
    setConfirmationVisible(false);
  };

  const handleCancel = () => {
    if (confirmationData.onCancel) {
      confirmationData.onCancel();
    }
    setConfirmationVisible(false);
  };


  // Function to clear all data
  const clearAllData = async () => {
    try {
      // Clear localStorage
      localStorage.clear();

      // Clear IndexedDB
      await clearDatabase();

      // Clear sessionStorage
      sessionStorage.clear();

      // Clear cookies (if you are using them)
      document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Clear cache storage if available
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }

      return true;
    } catch (error) {
      console.error("Error clearing all data:", error);
      return false;
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'u') {
        setShowLocalJSON(prev => !prev);
      }
      if (e.key.toLowerCase() === 'm') {
        toggleDarkMode();
      }
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);


  return (
    <div className={`upload-page ${isDarkMode ? "dark-mode" : ""}`}>
      {/* Header similar to exam page */}
      <header className="upload-header">
        <div className="page-title">
          <span className="title-icon">📂</span>
          <span className="title-text">Upload</span>
        </div>
        <div className="header-controls">
          <div className="connection-indicator">
            <div
              className={`status-dot ${isOnline ? "online" : "offline"}`}
            ></div>
            <span className="status-text">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            title="Toggle Dark Mode"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button
            className={`library-toggle-btn ${showLocalJSON ? "active" : ""}`}
            onClick={() => setShowLocalJSON(!showLocalJSON)}
            title="Toggle Upload Mode"
          >
            {showLocalJSON ? "📁" : "📤"}
          </button>
        </div>
      </header>

      <div className="upload-content">
        {showLocalJSON ? (
          <div className="library-section">
            <LocalJSONLibrary onFileSelect={handleLocalJSONSelect} refreshTrigger={refreshTrigger}/>
          </div>
        ) : (
          <div className="upload-section">
            {/* <div className="section-header">
              <h2>📁 Upload Quiz Files</h2>
              <p>Upload JSON files and configure your quiz settings</p>
            </div> */}

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
                    e.currentTarget.classList.add("drag-over");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("drag-over");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("drag-over");
                    const files = Array.from(e.dataTransfer.files);
                    const event = { target: { files } };
                    handleFileChange(event);
                  }}
                >
                  <div className="file-input-icon">📄</div>
                  <div className="file-input-text">
                    <span className="primary-text">Choose JSON Files</span>
                    <span className="secondary-text">
                      Tap here to browse or drag files
                    </span>
                    <span className="helper-text">
                      Supports multiple files (max 2MB each)
                    </span>
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
                            <div className="file-size">
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                        <div className="file-actions">
                          <label
                            className="image-upload-btn"
                            title="Add images for this file"
                          >
                            🖼️
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              style={{ display: "none" }}
                              onChange={(e) =>
                                handleImageUpload(file.name, e.target.files)
                              }
                            />
                          </label>
                          {fileImageMap[file.name] && (
                            <span className="image-count">
                              {fileImageMap[file.name].length}
                            </span>
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

            {/* Success Message */}
            {showSuccess && (
              <div className="success-section">
                <div className="success-message">
                  <span className="success-icon">✅</span>
                  <span className="success-text">
                    Files uploaded successfully!
                  </span>
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
                className={`next-btn ${loading ? "loading" : ""}`}
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

      {/* Fixed Footer with Developer Tools */}
      <div className="fixed-developer-footer">
        <div className="developer-tools-compact">
          <div className="developer-tools-title">
            <span className="tools-icon">🔧</span>
            <span className="tools-text">Developer Tools</span>
          </div>
          <div className="developer-tools-row">
            <CacheCleaner onDataChange={handleDataChange} onAlert={handleDialogAlert} onConfirm={handleConfirmDialog} />
          </div>
        </div>
      </div>

      {/* Custom Dialog Box */}
      {dialogVisible && (
        <div className="custom-dialog-overlay" onClick={closeDialog}>
          <div className="custom-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">
                <span className="dialog-icon">
                  {dialogContent.type === 'success' ? '✅' : 
                   dialogContent.type === 'error' ? '❌' : 
                   dialogContent.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                {dialogContent.title}
              </h3>
              <button className="dialog-close-btn" onClick={closeDialog}>✕</button>
            </div>
            <div className="dialog-content">
              <p className="dialog-message">{dialogContent.message}</p>
            </div>
            <div className="dialog-actions">
              <button className="dialog-ok-btn" onClick={closeDialog}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Box */}
      {confirmationVisible && (
        <div className="custom-dialog-overlay" onClick={handleCancel}>
          <div className="custom-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">
                <span className="dialog-icon">⚠️</span>
                {confirmationData.title}
              </h3>
              <button className="dialog-close-btn" onClick={handleCancel}>✕</button>
            </div>
            <div className="dialog-content">
              <p className="dialog-message" style={{ whiteSpace: 'pre-line' }}>{confirmationData.message}</p>
            </div>
            <div className="dialog-actions">
              <button className="dialog-ok-btn" onClick={handleCancel} style={{ marginRight: '10px', background: '#6c757d' }}>
                Cancel
              </button>
              <button className="dialog-ok-btn" onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Button Container */}
      <div className="fullscreen-btn-container">
        <button className="fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
          <span className="fullscreen-icon">{isFullscreen ? "⤲" : "⛶"}</span>
        </button>
      </div>
    </div>
  );
}

export default UploadPage;