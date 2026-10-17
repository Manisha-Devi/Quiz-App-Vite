import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllImagesForJSONFile } from '../utils/indexedDB';
import ServerDataNavLink from '../components/ServerDataNavLink';
import dataManager from '../utils/dataManager';
import '../styles/SectionSetupPage.css';

const getFileQuestionCount = (file) =>
  Number.isInteger(file?.questionCount)
    ? file.questionCount
    : Array.isArray(file?.questions)
      ? file.questions.length
      : 0;

const getFileLevelCounts = (file) => {
  if (file?.levelCounts) return file.levelCounts;

  return (file?.questions || []).reduce(
    (counts, question) => {
      if ([0, 1, 2].includes(question?.level)) {
        counts[question.level] += 1;
      }
      return counts;
    },
    { 0: 0, 1: 0, 2: 0 },
  );
};

function SectionSetupPage() {
  const [quizData, setQuizData] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({});
  const [fileImageMap, setFileImageMap] = useState({});
  const [isServerQuiz, setIsServerQuiz] = useState(false);
  const [isStartingExam, setIsStartingExam] = useState(false);
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
    // Clear future pages data when entering Section Setup using dataManager
    const clearFutureData = async () => {
      const examKeysToDelete = [
        'finalQuiz', 'examState', 'examMeta'
      ];

      const resultKeysToDelete = [
        'examAnswers', 'reviewMarks', 'retryAnswers', 'retryCompleted',
        'retryQuestions', 'currentRetryIndex', 'retryStats'
      ];

      // Clear exam data
      for (const key of examKeysToDelete) {
        await dataManager.deleteExamData(key);
      }

      // Clear exam results
      for (const key of resultKeysToDelete) {
        await dataManager.deleteExamResults(key);
      }
    };

    clearFutureData();

    const loadData = async () => {
      try {
        console.log('Loading data in SectionSetupPage...');

        // Load user settings
        const settings = await dataManager.getUserSettings();
        console.log('Loaded settings:', settings);

        setIsDarkMode(settings.darkMode || false);
        setQuizTime(settings.quizTime || 0);
        setPracticeMode(false); // Always start unchecked
        setEnableDrawing(false); // Always start unchecked
        setRetryMode(false); // Always start unchecked

        // Load quiz data with retry mechanism
        let data = await dataManager.getExamData('quizData');
        console.log('Loaded quiz data:', data);

        // If no data found, try with a small delay (for async operations)
        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log('No data found, retrying...');
          await new Promise(resolve => setTimeout(resolve, 100));
          data = await dataManager.getExamData('quizData');
          console.log('Retry result:', data);
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
          console.error('No valid quiz data found');
          alert("⚠️ No data found. Please upload files first.");
          navigate('/');
          return;
        }

        const serverSourceFlags = data.map((file) => file.serverSource === true);
        if (serverSourceFlags.some(Boolean) && !serverSourceFlags.every(Boolean)) {
          throw new Error('Local and server question files cannot be mixed in one quiz.');
        }
        const serverSource = serverSourceFlags.every(Boolean);

        for (const file of data) {
          if (
            !file.name ||
            getFileQuestionCount(file) < 1 ||
            (!serverSource &&
              (!Array.isArray(file.questions) || file.questions.length === 0))
          ) {
            throw new Error(`Invalid question data for ${file.name || 'a selected file'}.`);
          }
        }

        setIsServerQuiz(serverSource);
        setQuizData(data);
        console.log('Quiz setup files loaded:', data.length);

        if (serverSource) {
          // Server setup stores only small summaries here, never the full bank.
          setFileImageMap({});
        } else {
          const imageMap = {};
          for (const file of data) {
            try {
              const images = await getAllImagesForJSONFile(file.name);
              if (images && images.length > 0) {
                imageMap[`${file.name}.json`] = images.map(img => ({
                  name: img.imageName,
                  data: img.data
                }));
              }
            } catch (error) {
              console.log(`No images found for ${file.name}:`, error);
            }
          }
          setFileImageMap(imageMap);
        }

        const initialCounts = {};
        const initialRanges = {};
        const initialShuffleSettings = {};

        data.forEach((file, index) => {
          const questionCount = getFileQuestionCount(file);
          initialCounts[index] = { 0: 0, 1: 0, 2: 0 };
          initialRanges[index] = {
            startIndex: 1,
            endIndex: questionCount,
            maxQuestions: questionCount
          };
          initialShuffleSettings[index] = false; // Default: shuffle enabled (false means no-shuffle is off)
          console.log(`Initialized settings for ${file.name}: ${questionCount} questions`);
        });

        setQuestionCounts(initialCounts);
        setQuestionRanges(initialRanges);
        setSectionShuffleSettings(initialShuffleSettings);

        console.log('Section setup completed successfully');
      } catch (error) {
        console.error('Error loading data in SectionSetupPage:', error);
        alert(`⚠️ Error loading data: ${error.message}. Please try uploading files again.`);
        navigate('/');
      }
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
    const max = getFileLevelCounts(quizData[fileIndex])[level] || 0;
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
    const maxQuestions = getFileQuestionCount(quizData[fileIndex]);

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

  const handleStartExam = async () => {
    setIsStartingExam(true);
    try {
      let selectedQuestions = [];

      if (isServerQuiz) {
        const files = quizData.map((file, fileIndex) => {
          if (sectionShuffleSettings[fileIndex]) {
            const range = questionRanges[fileIndex];
            return {
              filename: file.name,
              mode: 'range',
              startIndex: range?.startIndex,
              endIndex: range?.endIndex
            };
          }

          return {
            filename: file.name,
            mode: 'difficulty',
            counts: questionCounts[fileIndex] || { 0: 0, 1: 0, 2: 0 }
          };
        });

        const response = await fetch('/api/question-bank/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Could not fetch selected questions from the server.');
        }

        selectedQuestions = result.questions || [];
        const imagesSaved = await dataManager.setFileImageMap(result.fileImageMap || {});
        if (!imagesSaved) {
          throw new Error('Could not save the selected quiz images in this browser.');
        }
      } else {
        quizData.forEach((file, fileIndex) => {
          const isNoShuffle = sectionShuffleSettings[fileIndex] || false;

          if (isNoShuffle) {
            const range = questionRanges[fileIndex];
            if (range && range.startIndex && range.endIndex) {
              const startIdx = range.startIndex - 1;
              const endIdx = range.endIndex - 1;
              const rangeQuestions = file.questions
                .slice(startIdx, endIdx + 1)
                .map(q => ({ ...q, section: file.name }));
              selectedQuestions.push(...rangeQuestions);
            }
          } else {
            const sectionQuestions = [];
            [0, 1, 2].forEach(level => {
              const count = questionCounts[fileIndex]?.[level] || 0;
              const filtered = file.questions.filter(q => q.level === level);
              shuffleArray(filtered);
              const picked = filtered.slice(0, count).map(q => ({ ...q, section: file.name }));
              sectionQuestions.push(...picked);
            });
            shuffleArray(sectionQuestions);
            selectedQuestions.push(...sectionQuestions);
          }
        });
      }

      if (selectedQuestions.length === 0) {
        alert("⚠️ Please select at least one question before starting the exam.");
        return;
      }

      const validQuizTime = Math.max(1, parseInt(quizTime) || 60);
      await dataManager.setUserSetting('quizTime', validQuizTime);
      await dataManager.setUserSetting('practiceMode', practiceMode);
      await dataManager.setUserSetting('enableDrawing', enableDrawing);
      await dataManager.setUserSetting('retryMode', retryMode);

      const saved = await dataManager.setExamData('finalQuiz', selectedQuestions);
      if (!saved) throw new Error('Could not save the selected quiz in this browser.');
      navigate('/exam');
    } catch (error) {
      console.error('Could not start quiz:', error);
      alert(`⚠️ Could not start the quiz: ${error.message}`);
    } finally {
      setIsStartingExam(false);
    }
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
    return quizData.reduce((total, file) => total + getFileQuestionCount(file), 0);
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

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        // Ensure IndexedDB-only operations
        await dataManager.enforceIndexedDBOnly();

        const [
          storedQuizSetup,
          storedDarkMode,
          storedBoldMode,
          storedQuizTime,
          storedPracticeMode
        ] = await Promise.all([
          dataManager.getQuizSetup(),
          dataManager.getUserSetting('darkMode', false),
          dataManager.getUserSetting('boldMode', false),
          dataManager.getUserSetting('quizTime', 60),
          dataManager.getUserSetting('practiceMode', false)
        ]);

        console.log('Loaded stored data successfully');
      } catch (error) {
        console.error('Error loading stored data:', error);
      }
    };

    loadStoredData();
  }, []);

    return (
    <div className={`section-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header className="section-header">
        <div className="page-title">
          <span className="title-icon">🎯</span>
          <span className="title-text">Setup</span>
        </div>
        <div className="header-controls">
          <ServerDataNavLink />
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
            const levelCounts = getFileLevelCounts(file);
            const totalQuestions = getFileQuestionCount(file);

            const selectedTotal = sectionShuffleSettings[fileIndex] 
              ? (questionRanges[fileIndex] ? questionRanges[fileIndex].endIndex - questionRanges[fileIndex].startIndex + 1 : 0)
              : Object.values(questionCounts[fileIndex] || {}).reduce((a, b) => a + b, 0);
            const fileName = `${file.name}.json`;
            const images = fileImageMap[fileName] || [];
            const imageCount = isServerQuiz ? file.imageCount || 0 : images.length;

            return (
              <div key={fileIndex} className="section-card">
                <div className="section-card-header">
                  <div className="section-name-row">
                    <h3 className="section-name">{file.name}</h3>
                    {imageCount > 0 && (isServerQuiz ? (
                      <span className="preview-images-btn">🖼️ {imageCount}</span>
                    ) : (
                      <button
                        className="preview-images-btn"
                        onClick={() => openImageModal(images)}
                      >
                        🖼️ {imageCount}
                      </button>
                    ))}
                  </div>

                  <div className="section-controls-row">
                    <div className="section-stats">
                      <span className="total-questions">{totalQuestions} Total</span>
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
                            Q{questionRanges[fileIndex]?.startIndex || 1} - Q{questionRanges[fileIndex]?.endIndex || totalQuestions}
                            ({(questionRanges[fileIndex]?.endIndex || totalQuestions) - (questionRanges[fileIndex]?.startIndex || 1) + 1} questions)
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
                              max={questionRanges[fileIndex]?.endIndex || totalQuestions}
                              value={questionRanges[fileIndex]?.startIndex || 1}
                              onChange={(e) => handleRangeChange(fileIndex, 'start', e.target.value)}
                              className="question-slider"
                            />
                            <button 
                              className="control-button"
                              onClick={() => handleRangeChange(fileIndex, 'start', (questionRanges[fileIndex]?.startIndex || 1) + 1)}
                              disabled={(questionRanges[fileIndex]?.startIndex || 1) >= (questionRanges[fileIndex]?.endIndex || totalQuestions)}
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
                              onClick={() => handleRangeChange(fileIndex, 'end', (questionRanges[fileIndex]?.endIndex || totalQuestions) - 1)}
                              disabled={(questionRanges[fileIndex]?.endIndex || totalQuestions) <= (questionRanges[fileIndex]?.startIndex || 1)}
                              title="Decrease End"
                            >
                              −
                            </button>
                            <input
                              type="range"
                              min={questionRanges[fileIndex]?.startIndex || 1}
                              max={totalQuestions}
                              value={questionRanges[fileIndex]?.endIndex || totalQuestions}
                              onChange={(e) => handleRangeChange(fileIndex, 'end', e.target.value)}
                              className="question-slider"
                            />
                            <button 
                              className="control-button"
                              onClick={() => handleRangeChange(fileIndex, 'end', (questionRanges[fileIndex]?.endIndex || totalQuestions) + 1)}
                              disabled={(questionRanges[fileIndex]?.endIndex || totalQuestions) >= totalQuestions}
                              title="Increase End"
                            >
                              +
                            </button>
                          </div>
                          <span className="range-value">Q{questionRanges[fileIndex]?.endIndex || totalQuestions}</span>
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
            disabled={getTotalSelected() === 0 || isStartingExam}
          >
            <span className="btn-text">
              {isStartingExam ? 'Loading selected questions…' : 'Start Quiz'}
            </span>
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