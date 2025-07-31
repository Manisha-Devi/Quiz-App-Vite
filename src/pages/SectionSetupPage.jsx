import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllJSONImages } from '../utils/indexedDB';
import dataManager from '../utils/dataManager';
import '../styles/SectionSetupPage.css';

function SectionSetupPage() {
  const [quizData, setQuizData] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({});
  const [fileImageMap, setFileImageMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quizTime, setQuizTime] = useState(0);
  const [practiceMode, setPracticeMode] = useState(false);
  const [enableDrawing, setEnableDrawing] = useState(false);
  const [retryMode, setRetryMode] = useState(false);
  const [questionRanges, setQuestionRanges] = useState({});
  const [sectionShuffleSettings, setSectionShuffleSettings] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // Clear future pages data when entering Section Setup
    const FUTURE_PAGES_KEYS = [
      'finalQuiz',
      'examState',
      'examMeta',
      'examAnswers',
      'reviewMarks',
      'retryAnswers',
      'retryCompleted',
      'retryQuestions',
      'currentRetryIndex',
      'retryStats'
    ];

    FUTURE_PAGES_KEYS.forEach((key) => localStorage.removeItem(key));

    const loadData = async () => {
      // Load user settings
      const settings = await dataManager.getUserSettings();
      setIsDarkMode(settings.darkMode || false);
      setQuizTime(settings.quizTime || 0);
      setPracticeMode(settings.practiceMode || false);
      setEnableDrawing(settings.enableDrawing !== false);
      setRetryMode(settings.retryMode || false);

      // Load quiz data
      const data = await dataManager.getExamData('quizData');
      if (!data) {
        alert("⚠️ No data found. Please upload files first.");
        navigate('/');
        return;
      }

      setQuizData(data);

      // Load images from IndexedDB for each JSON file
      const imageMap = {};
      for (const file of data) {
        try {
          const images = await getAllJSONImages(file.name);
          if (images && images.length > 0) {
            imageMap[`${file.name}.json`] = images.map(img => ({
              name: img.imageName,
              data: img.imageData
            }));
          }
        } catch (error) {
          console.log(`No images found for ${file.name}:`, error);
        }
      }

      setFileImageMap(imageMap);

      const initialCounts = {};
      const initialRanges = {};
      const initialShuffleSettings = {};
      data.forEach((file, index) => {
        initialCounts[index] = { 0: 0, 1: 0, 2: 0 };
        initialRanges[index] = { 
          startIndex: 1, 
          endIndex: file.questions.length,
          maxQuestions: file.questions.length
        };
        initialShuffleSettings[index] = false; // Default: shuffle enabled (false means no-shuffle is off)
      });
      setQuestionCounts(initialCounts);
      setQuestionRanges(initialRanges);
      setSectionShuffleSettings(initialShuffleSettings);
    };

    loadData();
  }, [navigate]);

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

  const handleInputChange = (fileIndex, level, value) => {
    const updated = { ...questionCounts };
    const max = quizData[fileIndex].questions.filter(q => q.level === level).length;
    updated[fileIndex][level] = Math.min(parseInt(value) || 0, max);
    setQuestionCounts(updated);

    // Auto-calculate quiz time based on total selected questions (1 minute per question)
    const totalSelected = Object.values(updated).reduce((total, counts) => 
      total + Object.values(counts).reduce((sum, count) => sum + count, 0), 0
    );

    // Only set quiz time if questions are selected, otherwise keep it as is
    if (totalSelected > 0) {
      setQuizTime(totalSelected);
    } else if (totalSelected === 0) {
      // When no questions selected, reset to 0 or keep previous value
      setQuizTime(0);
    }
  };

  const handleRangeChange = (fileIndex, type, value) => {
    const updated = { ...questionRanges };
    const maxQuestions = quizData[fileIndex].questions.length;
    
    if (type === 'start') {
      const newStart = Math.max(1, Math.min(parseInt(value) || 1, updated[fileIndex].endIndex));
      updated[fileIndex].startIndex = newStart;
    } else if (type === 'end') {
      const newEnd = Math.max(updated[fileIndex].startIndex, Math.min(parseInt(value) || maxQuestions, maxQuestions));
      updated[fileIndex].endIndex = newEnd;
    }
    
    setQuestionRanges(updated);

    // Auto-calculate total selected questions across all sections
    const totalSelected = quizData.reduce((total, file, index) => {
      if (sectionShuffleSettings[index]) {
        // No shuffle mode - use range
        const range = index === fileIndex ? updated[index] : questionRanges[index];
        return total + (range ? range.endIndex - range.startIndex + 1 : 0);
      } else {
        // Shuffle mode - use difficulty counts
        const counts = questionCounts[index] || {};
        return total + Object.values(counts).reduce((sum, count) => sum + count, 0);
      }
    }, 0);

    if (totalSelected > 0) {
      setQuizTime(totalSelected);
    }
  };

  const handleSectionShuffleToggle = (fileIndex, noShuffle) => {
    const updated = { ...sectionShuffleSettings };
    updated[fileIndex] = noShuffle;
    setSectionShuffleSettings(updated);

    // Recalculate quiz time based on mixed modes
    const totalSelected = quizData.reduce((total, file, index) => {
      if (updated[index]) {
        // No shuffle mode - use range
        const range = questionRanges[index];
        return total + (range ? range.endIndex - range.startIndex + 1 : 0);
      } else {
        // Shuffle mode - use difficulty counts
        const counts = questionCounts[index] || {};
        return total + Object.values(counts).reduce((sum, count) => sum + count, 0);
      }
    }, 0);

    if (totalSelected > 0) {
      setQuizTime(totalSelected);
    }
  };

  const handleStartExam = () => {
    const selectedQuestions = [];

    quizData.forEach((file, fileIndex) => {
      const isNoShuffle = sectionShuffleSettings[fileIndex] || false;
      
      if (isNoShuffle) {
        // No shuffle mode for this section - select questions by range in original order
        const range = questionRanges[fileIndex];
        if (range && range.startIndex && range.endIndex) {
          const startIdx = range.startIndex - 1; // Convert to 0-based index
          const endIdx = range.endIndex - 1;     // Convert to 0-based index
          
          const rangeQuestions = file.questions
            .slice(startIdx, endIdx + 1)
            .map(q => ({ ...q, section: file.name }));
          
          selectedQuestions.push(...rangeQuestions);
        }
      } else {
        // Shuffle mode for this section
        const sectionQuestions = [];

        [0, 1, 2].forEach(level => {
          const count = questionCounts[fileIndex][level] || 0;
          const filtered = file.questions.filter(q => q.level === level);
          shuffleArray(filtered);
          const picked = filtered.slice(0, count).map(q => ({ ...q, section: file.name }));
          sectionQuestions.push(...picked);
        });

        // Shuffle within section only
        shuffleArray(sectionQuestions);
        selectedQuestions.push(...sectionQuestions);
      }
    });

    if (selectedQuestions.length === 0) {
      alert("⚠️ Please select at least one question before starting the exam.");
      return;
    }

    // Save quiz settings with validation
    const validQuizTime = Math.max(1, parseInt(quizTime) || 60); // Ensure at least 1 minute
    await dataManager.setUserSetting('quizTime', validQuizTime);
    await dataManager.setUserSetting('practiceMode', practiceMode);
    await dataManager.setUserSetting('enableDrawing', enableDrawing);
    await dataManager.setUserSetting('retryMode', retryMode);
    
    console.log('Quiz settings saved:', {
      quizTime: validQuizTime,
      practiceMode,
      enableDrawing,
      retryMode
    });

    await dataManager.setExamData('finalQuiz', selectedQuestions);
    navigate('/exam');
  };

  const openImageModal = (images) => {
    setModalImages(images);
    setModalIndex(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalImages([]);
    setModalIndex(0);
  };

  const getTotalSelected = () => {
    return quizData.reduce((total, file, fileIndex) => {
      const isNoShuffle = sectionShuffleSettings[fileIndex] || false;
      
      if (isNoShuffle) {
        const range = questionRanges[fileIndex];
        return total + (range ? range.endIndex - range.startIndex + 1 : 0);
      } else {
        const counts = questionCounts[fileIndex] || {};
        return total + Object.values(counts).reduce((sum, count) => sum + count, 0);
      }
    }, 0);
  };

  const getTotalAvailable = () => {
    return quizData.reduce((total, file) => total + file.questions.length, 0);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        setSelectedQuestionIndex(null);
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
    <div className={`section-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header className="section-header">
        <div className="page-title">
          <span className="title-icon">🎯</span>
          <span className="title-text">Setup</span>
        </div>
        <div className="header-controls">
          <div className="selection-summary">
            <span className="summary-text">{getTotalSelected()}/{getTotalAvailable()}</span>
            <span className="summary-label">Questions</span>
          </div>
          <button className="theme-toggle-btn" onClick={toggleDarkMode}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="section-content">
        {/* Sections Grid */}
        <div className="sections-grid">
          {quizData.map((file, fileIndex) => {
            const levelCounts = { 0: 0, 1: 0, 2: 0 };
            file.questions.forEach(q => levelCounts[q.level]++);

            const selectedTotal = sectionShuffleSettings[fileIndex] 
              ? (questionRanges[fileIndex] ? questionRanges[fileIndex].endIndex - questionRanges[fileIndex].startIndex + 1 : 0)
              : Object.values(questionCounts[fileIndex] || {}).reduce((a, b) => a + b, 0);
            const fileName = `${file.name}.json`;
            const images = fileImageMap[fileName] || [];

            return (
              <div key={fileIndex} className="section-card">
                <div className="section-card-header">
                  <div className="section-name-row">
                    <h3 className="section-name">{file.name}</h3>
                    {images.length > 0 && (
                      <button
                        className="preview-images-btn"
                        onClick={() => openImageModal(images)}
                      >
                        🖼️ {images.length}
                      </button>
                    )}
                  </div>
                  
                  <div className="section-controls-row">
                    <div className="section-stats">
                      <span className="total-questions">{file.questions.length} Total</span>
                      <span className="selected-count">{selectedTotal} Selected</span>
                    </div>
                    
                    <div className="section-shuffle-toggle">
                      <label className="shuffle-checkbox">
                        <input
                          type="checkbox"
                          checked={sectionShuffleSettings[fileIndex] || false}
                          onChange={(e) => handleSectionShuffleToggle(fileIndex, e.target.checked)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="shuffle-label">📐 No Shuffle</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="difficulty-controls">
                  {!sectionShuffleSettings[fileIndex] ? (
                    // Original difficulty-based selection
                    [0, 1, 2].map(level => {
                      const labels = ['Easy', 'Medium', 'Hard'];
                      const icons = ['🟢', '🟠', '🔴'];
                      const maxAvailable = levelCounts[level];
                      const currentValue = questionCounts[fileIndex]?.[level] || 0;

                      return (
                        <div className="difficulty-group" key={level}>
                          <div className="difficulty-header">
                            <span className="difficulty-icon">{icons[level]}</span>
                            <div className="difficulty-info">
                              <span className="difficulty-name">{labels[level]}</span>
                            </div>
                            <span className="difficulty-counter">{currentValue || 0}/{maxAvailable}</span>
                          </div>

                          <div className="slider-container">
                            <button 
                              className="control-button"
                              onClick={() => handleInputChange(fileIndex, level, Math.max(0, currentValue - 1))}
                              disabled={currentValue <= 0}
                              title="Decrease"
                            >
                              −
                            </button>
                            <input
                              type="range"
                              min="0"
                              max={maxAvailable}
                              value={currentValue || 0}
                              onChange={(e) => handleInputChange(fileIndex, level, e.target.value)}
                              className="question-slider"
                            />
                            <button 
                              className="control-button"
                              onClick={() => handleInputChange(fileIndex, level, Math.min(maxAvailable, currentValue + 1))}
                              disabled={currentValue >= maxAvailable}
                              title="Increase"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Range-based selection for this section's no-shuffle mode
                    <div className="range-selection">
                      <div className="range-header">
                        <span className="range-icon">📋</span>
                        <div className="range-info">
                          <span className="range-name">Question Range</span>
                          <span className="range-counter">
                            Q{questionRanges[fileIndex]?.startIndex || 1} - Q{questionRanges[fileIndex]?.endIndex || file.questions.length}
                            ({(questionRanges[fileIndex]?.endIndex || file.questions.length) - (questionRanges[fileIndex]?.startIndex || 1) + 1} questions)
                          </span>
                        </div>
                      </div>

                      <div className="range-controls">
                        <div className="range-group">
                          <label className="range-label">Start Question:</label>
                          <div className="slider-container">
                            <button 
                              className="control-button"
                              onClick={() => handleRangeChange(fileIndex, 'start', (questionRanges[fileIndex]?.startIndex || 1) - 1)}
                              disabled={(questionRanges[fileIndex]?.startIndex || 1) <= 1}
                              title="Decrease Start"
                            >
                              −
                            </button>
                            <input
                              type="range"
                              min="1"
                              max={questionRanges[fileIndex]?.endIndex || file.questions.length}
                              value={questionRanges[fileIndex]?.startIndex || 1}
                              onChange={(e) => handleRangeChange(fileIndex, 'start', e.target.value)}
                              className="question-slider"
                            />
                            <button 
                              className="control-button"
                              onClick={() => handleRangeChange(fileIndex, 'start', (questionRanges[fileIndex]?.startIndex || 1) + 1)}
                              disabled={(questionRanges[fileIndex]?.startIndex || 1) >= (questionRanges[fileIndex]?.endIndex || file.questions.length)}
                              title="Increase Start"
                            >
                              +
                            </button>
                          </div>
                          <span className="range-value">Q{questionRanges[fileIndex]?.startIndex || 1}</span>
                        </div>

                        <div className="range-group">
                          <label className="range-label">End Question:</label>
                          <div className="slider-container">
                            <button 
                              className="control-button"
                              onClick={() => handleRangeChange(fileIndex, 'end', (questionRanges[fileIndex]?.endIndex || file.questions.length) - 1)}
                              disabled={(questionRanges[fileIndex]?.endIndex || file.questions.length) <= (questionRanges[fileIndex]?.startIndex || 1)}
                              title="Decrease End"
                            >
                              −
                            </button>
                            <input
                              type="range"
                              min={questionRanges[fileIndex]?.startIndex || 1}
                              max={file.questions.length}
                              value={questionRanges[fileIndex]?.endIndex || file.questions.length}
                              onChange={(e) => handleRangeChange(fileIndex, 'end', e.target.value)}
                              className="question-slider"
                            />
                            <button 
                              className="control-button"
                              onClick={() => handleRangeChange(fileIndex, 'end', (questionRanges[fileIndex]?.endIndex || file.questions.length) + 1)}
                              disabled={(questionRanges[fileIndex]?.endIndex || file.questions.length) >= file.questions.length}
                              title="Increase End"
                            >
                              +
                            </button>
                          </div>
                          <span className="range-value">Q{questionRanges[fileIndex]?.endIndex || file.questions.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quiz Configuration */}
        <div className="quiz-config-bar">
          <div className="config-title">
            <span>⚙️</span>
            <span>Configuration</span>
          </div>

          <div className="config-controls">
            <div className="config-item">
              <span className="config-icon">⏱️</span>
              <input
                type="number"
                min="1"
                max="300"
                value={quizTime}
                onChange={(e) => setQuizTime(Number(e.target.value))}
                className="time-input-mini"
              />
              <span className="config-unit">min</span>
            </div>

            <div className="config-item">
              <span className="config-icon">🎯</span>
              <label className="config-checkbox">
                <input
                  type="checkbox"
                  checked={practiceMode}
                  onChange={(e) => setPracticeMode(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span className="config-label">Practice</span>
              </label>
            </div>

            <div className="config-item">
              <span className="config-icon">✏️</span>
              <label className="config-checkbox">
                <input
                  type="checkbox"
                  checked={enableDrawing}
                  onChange={(e) => setEnableDrawing(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span className="config-label">Drawing</span>
              </label>
            </div>

            <div className="config-item">
              <span className="config-icon">🔄</span>
              <label className="config-checkbox">
                <input
                  type="checkbox"
                  checked={retryMode}
                  onChange={(e) => setRetryMode(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span className="config-label">Retry</span>
              </label>
            </div>
          </div>
        </div>

        {/* Start Quiz Button at Bottom */}
        <div className="action-section">
          <button
            className="start-exam-btn"
            onClick={handleStartExam}
            disabled={getTotalSelected() === 0}
          >
            <span className="btn-text">Start Quiz</span>
            <span className="btn-icon">🚀</span>
          </button>
        </div>
      </div>

      {/* Image Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modalImages[modalIndex]?.name}</h3>
              <button className="modal-close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <img
                src={modalImages[modalIndex]?.data}
                alt={modalImages[modalIndex]?.name}
                className="modal-image"
              />
            </div>

            <div className="modal-footer">
              <div className="image-navigation">
                <button 
                  className="nav-btn prev-btn"
                  onClick={() => setModalIndex(i => Math.max(0, i - 1))} 
                  disabled={modalIndex === 0}
                >
                  ⬅️ Previous
                </button>

                <span className="image-counter">
                  {modalIndex + 1} of {modalImages.length}
                </span>

                <button
                  className="nav-btn next-btn"
                  onClick={() => setModalIndex(i => Math.min(modalImages.length - 1, i + 1))}
                  disabled={modalIndex === modalImages.length - 1}
                >
                  Next ➡️
                </button>
              </div>
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

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export default SectionSetupPage;