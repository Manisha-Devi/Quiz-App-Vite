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
  storeText,
  clearDatabase,
  deleteDatabase,
} from "../utils/indexedDB";

function UploadPage() {
  const [files, setFiles] = useState([]);
  const [fileImageMap, setFileImageMap] = useState({});
  const [quizTime, setQuizTime] = useState(0);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const [showLocalJSON, setShowLocalJSON] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { isOnline } = useOfflineStorage();

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
    // Initialize data manager and load settings
    const initializeData = async () => {
      await dataManager.checkMigrationStatus();
      const darkModeValue = await dataManager.getUserSetting('darkMode', false);
      setIsDarkMode(darkModeValue);
      
      // Clear exam-related data for fresh start
      const examKeysToDelete = [
        'quizData', 'quizTime', 'finalQuiz', 'examState', 'examMeta', 
        'examAnswers', 'reviewMarks', 'fileImageMap', 'practiceMode', 
        'enableDrawing', 'retryMode', 'retryAnswers', 'retryCompleted'
      ];
      
      for (const key of examKeysToDelete) {
        await dataManager.deleteExamData(key);
        await dataManager.deleteExamResults(key);
      }
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
      await dataManager.setExamData('quizData', allData);
      await dataManager.setUserSetting('quizTime', quizTime);
      await dataManager.setFileImageMap(fileImageMap);

      // Store individual quiz texts and images
      const db = await openDb();
      allData.forEach((item) => {
        storeText(item.questions, item.name);
      });

      for (const [filename, images] of Object.entries(fileImageMap)) {
        images.forEach((image) => storeImage(image.data, filename));
      }

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
    await dataManager.setFileImageMap({});
    navigate("/sections");
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

      // Clear cache storage
      if (caches) {
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
      if (e.key.toLowerCase() === 'l') {
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
  }, [toggleDarkMode]);


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
            className="refresh-btn"
            onClick={async () => {
              try {
                // Clear JSON files cache first
                await clearDatabase();
                // Force reload the page
                window.location.reload(true);
              } catch (error) {
                console.error('Error during refresh:', error);
                window.location.reload();
              }
            }}
            title="Refresh Page"
          >
            🔄
          </button>
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
            title="Local JSON Files"
          >
            {showLocalJSON ? "📁" : "📄"}
          </button>
          
          <button
            className={`clear-database-btn ${loading ? 'loading' : ''}`}
            onClick={async (e) => {
              // Prevent multiple clicks
              if (loading) return;

              const confirmed = window.confirm(
                "⚠️ Are you sure you want to clear ALL app data? This will delete IndexedDB, localStorage, sessionStorage, caches, and cookies. This action cannot be undone."
              );

              if (confirmed) {
                setLoading(true);
                e.target.disabled = true;

                try {
                  console.log("Starting data clearing process...");

                  // Step 1: Close any existing IndexedDB connections
                  console.log("Closing IndexedDB connections...");

                  // Force close any existing database connections
                  const dbClosePromise = new Promise((resolve) => {
                    const request = indexedDB.open("quizDatabase");
                    request.onsuccess = (event) => {
                      const db = event.target.result;
                      db.close();
                      console.log("Database connection closed");
                      resolve();
                    };
                    request.onerror = () => {
                      console.log("No existing database to close");
                      resolve();
                    };
                  });

                  await dbClosePromise;

                  // Step 2: Wait a bit for connections to properly close
                  await new Promise(resolve => setTimeout(resolve, 100));

                  // Step 3: Clear IndexedDB with retry mechanism
                  console.log("Clearing IndexedDB...");
                  let deleteAttempts = 0;
                  const maxAttempts = 3;

                  while (deleteAttempts < maxAttempts) {
                    try {
                      await deleteDatabase();
                      console.log("IndexedDB deleted successfully");
                      break;
                    } catch (dbError) {
                      deleteAttempts++;
                      console.log(`IndexedDB deletion attempt ${deleteAttempts} failed:`, dbError);

                      if (deleteAttempts >= maxAttempts) {
                        throw new Error("Failed to delete IndexedDB after multiple attempts");
                      }

                      // Wait longer between retries
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                  }

                  // Step 4: Clear other storage types
                  console.log("Clearing localStorage...");
                  localStorage.clear();

                  console.log("Clearing sessionStorage...");
                  sessionStorage.clear();

                  // Clear cookies
                  console.log("Clearing cookies...");
                  const cookies = document.cookie.split(";");
                  for (let cookie of cookies) {
                    const eqPos = cookie.indexOf("=");
                    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                    if (name) {
                      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    }
                  }

                  // Clear cache storage
                  if ('caches' in window) {
                    console.log("Clearing cache storage...");
                    const cacheKeys = await caches.keys();
                    await Promise.all(cacheKeys.map(key => caches.delete(key)));
                  }

                  console.log("All data cleared successfully!");
                  alert("✅ All app data cleared successfully! Page will reload now.");

                  // Force reload with cache bypass
                  setTimeout(() => {
                    window.location.href = window.location.href;
                  }, 1000);

                } catch (error) {
                  console.error('Error clearing all data:', error);
                  alert(`❌ Failed to clear all data: ${error.message}. Please try again.`);
                  setLoading(false);
                  e.target.disabled = false;
                }
              }
            }}
            disabled={loading}
            title="Clear All Data"
          >
            {loading ? "🔄" : "🗑️"}
          </button>
        </div>
      </header>

      <div className="upload-content">
        {!showLocalJSON ? (
          <div className="library-section">
            {/* <div className="section-header">
              <h2>📁 Local JSON Files</h2>
              <p>Select from JSON files automatically loaded from your project</p>
            </div> */}
            <div className="upload-instructions">
              <h3>📁 Select Quiz Files</h3>
              <p>Select from blow files to load your Quiz</p>
            </div>
            <LocalJSONLibrary onFileSelect={handleLocalJSONSelect} />
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

      {/* Footer with CacheCleaner */}
      <div className="upload-footer">
        <CacheCleaner />
      </div>

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