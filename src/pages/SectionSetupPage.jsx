
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllJSONImages } from '../utils/indexedDB';
import '../styles/SectionSetupPage.css';

function SectionSetupPage() {
  const [quizData, setQuizData] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({});
  const [fileImageMap, setFileImageMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [quizTime, setQuizTime] = useState(() => {
    return Number(localStorage.getItem('quizTime')) || 60;
  });
  const [practiceMode, setPracticeMode] = useState(false);
  const [enableDrawing, setEnableDrawing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      const data = JSON.parse(localStorage.getItem('quizData'));

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
            // Convert to the expected format
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
      data.forEach((file, index) => {
        initialCounts[index] = { 0: 0, 1: 0, 2: 0 };
      });
      setQuestionCounts(initialCounts);
    };

    loadData();
  }, [navigate]);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const handleInputChange = (fileIndex, level, value) => {
    const updated = { ...questionCounts };
    const max = quizData[fileIndex].questions.filter(q => q.level === level).length;
    updated[fileIndex][level] = Math.min(parseInt(value) || 0, max);
    setQuestionCounts(updated);
  };

  const handleStartExam = () => {
    const selectedQuestions = [];

    // Group questions by section to maintain section integrity
    quizData.forEach((file, fileIndex) => {
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
    });

    if (selectedQuestions.length === 0) {
      alert("⚠️ Please select at least one question before starting the exam.");
      return;
    }

    // Save quiz settings
    localStorage.setItem('quizTime', String(quizTime));
    localStorage.setItem('practiceMode', String(practiceMode));
    localStorage.setItem('enableDrawing', String(enableDrawing));
    
    // Don't shuffle the final array to maintain section grouping
    localStorage.setItem('finalQuiz', JSON.stringify(selectedQuestions));
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
    return Object.values(questionCounts).reduce((total, counts) => 
      total + Object.values(counts).reduce((sum, count) => sum + count, 0), 0
    );
  };

  const getTotalAvailable = () => {
    return quizData.reduce((total, file) => total + file.questions.length, 0);
  };

  return (
    <div className={`section-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header className="section-header">
        <div className="page-title">
          <span className="title-icon">🎯</span>
          <span className="title-text">Question Selection</span>
        </div>
        <div className="header-controls">
          <div className="selection-summary">
            <span className="summary-text">{getTotalSelected()}/{getTotalAvailable()}</span>
            <span className="summary-label">Selected</span>
          </div>
          <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="section-content">
        <div className="content-header">
          <h2>📚 Configure Your Quiz Sections</h2>
          <p>Select the number of questions from each difficulty level for every section</p>
        </div>

        <div className="sections-grid">
          {quizData.map((file, fileIndex) => {
            const levelCounts = { 0: 0, 1: 0, 2: 0 };
            file.questions.forEach(q => levelCounts[q.level]++);

            const selectedTotal = Object.values(questionCounts[fileIndex] || {}).reduce((a, b) => a + b, 0);
            const fileName = `${file.name}.json`;
            const images = fileImageMap[fileName] || [];

            return (
              <div key={fileIndex} className="section-card">
                <div className="section-card-header">
                  <div className="section-info">
                    <h3 className="section-name">{file.name}</h3>
                    <div className="section-stats">
                      <span className="total-questions">{file.questions.length} total</span>
                      <span className="selected-count">{selectedTotal} selected</span>
                      <div className="level-breakdown">
                        <span className="level-stat easy">🟢 {levelCounts[0]}</span>
                        <span className="level-stat medium">🟠 {levelCounts[1]}</span>
                        <span className="level-stat hard">🔴 {levelCounts[2]}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="section-actions">
                    {images.length > 0 && (
                      <button
                        className="preview-images-btn"
                        onClick={() => openImageModal(images)}
                        title={`Preview ${images.length} images`}
                      >
                        🖼️ {images.length}
                      </button>
                    )}
                  </div>
                </div>

                <div className="difficulty-controls">
                  {[0, 1, 2].map(level => {
                    const labels = ['Easy', 'Medium', 'Hard'];
                    const icons = ['🟢', '🟠', '🔴'];
                    const maxAvailable = levelCounts[level];
                    const currentValue = questionCounts[fileIndex]?.[level] || 0;
                    
                    return (
                      <div className="difficulty-group" key={level}>
                        <div className="difficulty-header">
                          <span className="difficulty-icon">{icons[level]}</span>
                          <span className="difficulty-name">{labels[level]}</span>
                        </div>
                        
                        <div className="slider-container">
                          <button 
                            className="slider-btn left"
                            onClick={() => handleInputChange(fileIndex, level, Math.max(0, currentValue - 1))}
                            disabled={currentValue <= 0}
                            title="Decrease"
                          >
                            ◀
                          </button>
                          
                          <input
                            type="range"
                            min="0"
                            max={maxAvailable}
                            value={currentValue || 0}
                            onChange={(e) => handleInputChange(fileIndex, level, e.target.value)}
                            className="question-slider"
                          />
                          
                          <div className="slider-value">{currentValue || 0}</div>
                          
                          <button 
                            className="slider-btn right"
                            onClick={() => handleInputChange(fileIndex, level, Math.min(maxAvailable, currentValue + 1))}
                            disabled={currentValue >= maxAvailable}
                            title="Increase"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quiz Settings */}
        <div className="quiz-settings-panel">
          <div className="panel-header">
            <div className="header-content">
              <h3>⚙️ Quiz Configuration</h3>
              <p>Customize your quiz experience</p>
            </div>
          </div>
          
          <div className="settings-grid">
            <div className="setting-card time-setting">
              <div className="card-icon">
                <span>⏱️</span>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h4>Quiz Duration</h4>
                  <p>Set time limit for the entire quiz</p>
                </div>
                <div className="time-control">
                  <button 
                    className="time-btn decrease"
                    onClick={() => setQuizTime(Math.max(1, quizTime - 5))}
                  >
                    −
                  </button>
                  <div className="time-display">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={quizTime}
                      onChange={(e) => setQuizTime(Number(e.target.value))}
                      className="time-input"
                    />
                    <span className="time-unit">min</span>
                  </div>
                  <button 
                    className="time-btn increase"
                    onClick={() => setQuizTime(Math.min(300, quizTime + 5))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            
            <div className="setting-card mode-setting">
              <div className="card-icon">
                <span>🎯</span>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h4>Practice Mode</h4>
                  <p>Show answers immediately after each question</p>
                </div>
                <div className="toggle-control">
                  <label className="modern-toggle">
                    <input
                      type="checkbox"
                      checked={practiceMode}
                      onChange={(e) => setPracticeMode(e.target.checked)}
                    />
                    <span className="toggle-track">
                      <span className="toggle-thumb"></span>
                      <span className="toggle-labels">
                        <span className="label-off">OFF</span>
                        <span className="label-on">ON</span>
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="setting-card drawing-setting">
              <div className="card-icon">
                <span>✏️</span>
              </div>
              <div className="card-content">
                <div className="card-header">
                  <h4>Drawing Tools</h4>
                  <p>Enable sketching and note-taking during quiz</p>
                </div>
                <div className="toggle-control">
                  <label className="modern-toggle">
                    <input
                      type="checkbox"
                      checked={enableDrawing}
                      onChange={(e) => setEnableDrawing(e.target.checked)}
                    />
                    <span className="toggle-track">
                      <span className="toggle-thumb"></span>
                      <span className="toggle-labels">
                        <span className="label-off">OFF</span>
                        <span className="label-on">ON</span>
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="settings-summary">
            <div className="summary-items">
              <div className="summary-item">
                <span className="summary-icon">⏱️</span>
                <span className="summary-text">{quizTime} minutes</span>
              </div>
              <div className="summary-item">
                <span className="summary-icon">🎯</span>
                <span className="summary-text">{practiceMode ? 'Practice' : 'Exam'} mode</span>
              </div>
              <div className="summary-item">
                <span className="summary-icon">✏️</span>
                <span className="summary-text">Drawing {enableDrawing ? 'enabled' : 'disabled'}</span>
              </div>
            </div>
          </div>
        </div>

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
