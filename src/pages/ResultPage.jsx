
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import QuestionCard from '../components/QuestionCard';
import dataManager from '../utils/dataManager';
import '../styles/ResultPage.css';

function ResultPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [reviewMarks, setReviewMarks] = useState({});
  const [currentFilter, setCurrentFilter] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isBoldMode, setIsBoldMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPerformanceChart, setShowPerformanceChart] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [retryMode, setRetryMode] = useState(false);
  const [retryAnswers, setRetryAnswers] = useState({});
  const [retryCompleted, setRetryCompleted] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadResultData = async () => {
      const [
        questions,
        answers,
        reviewMarks,
        retryMode,
        retryAnswers,
        retryCompleted,
        darkMode,
        boldMode
      ] = await Promise.all([
        dataManager.getExamData('finalQuiz'),
        dataManager.getExamResults('examAnswers'),
        dataManager.getExamResults('reviewMarks'),
        dataManager.getUserSetting('retryMode', false),
        dataManager.getExamResults('retryAnswers'),
        dataManager.getExamResults('retryCompleted'),
        dataManager.getUserSetting('darkMode', false),
        dataManager.getUserSetting('boldMode', false)
      ]);

      setQuestions(questions || []);
      setAnswers(answers || {});
      setReviewMarks(reviewMarks || {});
      setRetryMode(retryMode);
      setRetryAnswers(retryAnswers || {});
      setRetryCompleted(retryCompleted || {});
      setIsDarkMode(darkMode);
      setIsBoldMode(boldMode);
    };

    loadResultData();
  }, []);

  // Prevent browser back button and redirect to UploadPage
  useEffect(() => {
    // Push current state to prevent back navigation
    window.history.pushState(null, null, window.location.pathname);
    
    const handlePopState = (event) => {
      event.preventDefault();
      
      // Always redirect to UploadPage when back is pressed
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // Sync bold mode with document classes
  useEffect(() => {
    if (isBoldMode) {
      document.documentElement.classList.add('bold-mode');
      document.body.classList.add('bold-mode');
    } else {
      document.documentElement.classList.remove('bold-mode');
      document.body.classList.remove('bold-mode');
    }
  }, [isBoldMode]);

  const toggleDarkMode = useCallback(async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await dataManager.setUserSetting('darkMode', newDarkMode);
  }, [isDarkMode]);

  const toggleBoldMode = useCallback(async () => {
    const newBoldMode = !isBoldMode;
    setIsBoldMode(newBoldMode);
    await dataManager.setUserSetting('boldMode', newBoldMode);

    // Force re-render by updating document class
    if (newBoldMode) {
      document.documentElement.classList.add('bold-mode');
      document.body.classList.add('bold-mode');
    } else {
      document.documentElement.classList.remove('bold-mode');
      document.body.classList.remove('bold-mode');
    }
  }, [isBoldMode]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'm') {
        toggleDarkMode();
      }
      if (e.key.toLowerCase() === 'b') {
        toggleBoldMode();
      }
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleDarkMode, toggleBoldMode, toggleFullscreen]);

  const handlePerformanceToggle = useCallback(() => {
    setShowPerformanceChart(prev => !prev);
  }, []);

  const calculateStats = () => {
    let correct = 0, incorrect = 0, skipped = 0, total = questions.length;
    
    questions.forEach((q, idx) => {
      const userAnswer = answers[idx];
      if (userAnswer === undefined) {
        skipped++;
      } else if (userAnswer === q.answer) {
        correct++;
      } else {
        incorrect++;
      }
    });

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, incorrect, skipped, total, percentage };
  };

  const getQuestionStatus = (idx) => {
    const userAnswer = answers[idx];
    if (userAnswer === undefined) return 'skipped';
    return userAnswer === questions[idx].answer ? 'correct' : 'incorrect';
  };

  const handleRetryAnswer = async (questionIndex, selectedOption) => {
    const newRetryAnswers = { ...retryAnswers, [questionIndex]: selectedOption };
    const newRetryCompleted = { ...retryCompleted, [questionIndex]: true };
    setRetryAnswers(newRetryAnswers);
    setRetryCompleted(newRetryCompleted);
    await Promise.all([
      dataManager.setExamResults('retryAnswers', newRetryAnswers),
      dataManager.setExamResults('retryCompleted', newRetryCompleted)
    ]);
  };

  const filteredQuestions = questions.filter((q, idx) => {
    const status = getQuestionStatus(idx);
    
    // If filter is 'all', show all questions
    if (currentFilter === 'all') return true;
    
    // For other filters, only show questions that match the current filter
    return status === currentFilter;
  });

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, filteredQuestions.length]);

  const goToPrevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNextQuestion,
    onSwipedRight: goToPrevQuestion,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        goToPrevQuestion();
      } else if (e.key === 'ArrowRight') {
        goToNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToPrevQuestion, goToNextQuestion]);

  // Reset current question index when filter changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [currentFilter]);

  const stats = calculateStats();

  const PerformanceChart = () => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (stats.percentage / 100) * circumference;

    return (
      <div className="performance-dashboard">
        <div className="performance-charts">
          {/* Circular Progress Chart */}
          <div className="circular-progress-container">
            <div className="circular-progress">
              <svg width="140" height="140" className="progress-ring">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="#e0e0e0"
                  strokeWidth="8"
                  fill="transparent"
                  className="progress-ring-background"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  stroke="#4CAF50"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="progress-ring-progress"
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div className="progress-text">
                <span className="progress-percentage">{stats.percentage}%</span>
                <span className="progress-label">Score</span>
              </div>
            </div>
            <div className="progress-title">Overall Performance</div>
          </div>

          {/* Performance Statistics */}
          <div className="performance-stats">
            <div className="stat-item correct-stat">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">{stats.correct}</div>
                <div className="stat-label">Correct</div>
              </div>
            </div>
            <div className="stat-item incorrect-stat">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <div className="stat-number">{stats.incorrect}</div>
                <div className="stat-label">Incorrect</div>
              </div>
            </div>
            <div className="stat-item skipped-stat">
              <div className="stat-icon">⏭️</div>
              <div className="stat-content">
                <div className="stat-number">{stats.skipped}</div>
                <div className="stat-label">Skipped</div>
              </div>
            </div>
            <div className="stat-item total-stat">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
          </div>

          {/* Visual Breakdown Bar */}
          <div className="breakdown-bar-container">
            <div className="breakdown-title">Question Breakdown</div>
            <div className="breakdown-bar">
              <div 
                className="breakdown-segment correct-segment" 
                style={{ width: `${(stats.correct / stats.total) * 100}%` }}
                title={`${stats.correct} Correct (${Math.round((stats.correct / stats.total) * 100)}%)`}
              ></div>
              <div 
                className="breakdown-segment incorrect-segment" 
                style={{ width: `${(stats.incorrect / stats.total) * 100}%` }}
                title={`${stats.incorrect} Incorrect (${Math.round((stats.incorrect / stats.total) * 100)}%)`}
              ></div>
              <div 
                className="breakdown-segment skipped-segment" 
                style={{ width: `${(stats.skipped / stats.total) * 100}%` }}
                title={`${stats.skipped} Skipped (${Math.round((stats.skipped / stats.total) * 100)}%)`}
              ></div>
            </div>
            <div className="breakdown-legend">
              <div className="legend-item">
                <div className="legend-color correct-color"></div>
                <span>Correct ({Math.round((stats.correct / stats.total) * 100)}%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color incorrect-color"></div>
                <span>Incorrect ({Math.round((stats.incorrect / stats.total) * 100)}%)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color skipped-color"></div>
                <span>Skipped ({Math.round((stats.skipped / stats.total) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  

  return (
    <div className={`result-page ${isDarkMode ? 'dark-mode' : ''} ${isBoldMode ? 'bold-mode' : ''}`}>
      {/* Top Header Bar similar to ExamPage */}
      <header className="result-header">
        <div className="page-title">
          <span className="title-icon">📊</span>
          <span className="title-text">Result</span>
        </div>
        <div className="header-controls">
          <div className="score-box">
            <span className="score-percentage">{stats.percentage}%</span>
            <span className="score-text">Score</span>
          </div>
          <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button className={`bold-toggle-btn ${isBoldMode ? 'active' : ''}`} onClick={toggleBoldMode} title="Toggle Bold Mode">
            <strong>B</strong>
          </button>
        </div>
      </header>

      {/* Fixed Controls Section */}
      <div className="fixed-controls">
        <div className="filter-tabs">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'correct', label: 'Correct', count: stats.correct },
            { key: 'incorrect', label: 'Incorrect', count: stats.incorrect },
            { key: 'skipped', label: 'Skipped', count: stats.skipped }
          ].map(filter => (
            <button
              key={filter.key}
              className={`filter-tab ${currentFilter === filter.key ? 'active' : ''}`}
              onClick={() => setCurrentFilter(filter.key)}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Single Question Card View */}
        <div className="single-question-container" {...swipeHandlers}>
          {filteredQuestions.length > 0 ? (
            <>
              <div className="question-navigation-header">
                <button 
                  className="nav-arrow prev" 
                  onClick={goToPrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  title="Previous Question (Left Arrow)"
                >
                  ← Previous
                </button>
                <div className="question-counter">
                  {currentQuestionIndex + 1} of {filteredQuestions.length}
                </div>
                <button 
                  className="nav-arrow next" 
                  onClick={goToNextQuestion}
                  disabled={currentQuestionIndex === filteredQuestions.length - 1}
                  title="Next Question (Right Arrow)"
                >
                  Next →
                </button>
              </div>
              
              <div className="current-question-wrapper">
                {(() => {
                  const currentQuestion = filteredQuestions[currentQuestionIndex];
                  const actualIndex = questions.findIndex(question => question === currentQuestion);
                  
                  if (actualIndex === -1) {
                    return (
                      <div className="no-results">
                        <div className="no-results-icon">🔍</div>
                        <div className="no-results-text">Question not found</div>
                      </div>
                    );
                  }
                  
                  return (
                    <QuestionCard
                      key={`${actualIndex}-${currentFilter}`}
                      question={currentQuestion}
                      index={actualIndex}
                      userAnswer={answers[actualIndex]}
                      reviewMarked={reviewMarks[actualIndex]}
                      retryMode={retryMode}
                      retryAnswer={retryAnswers[actualIndex]}
                      retryCompleted={retryCompleted[actualIndex]}
                      onRetryAnswer={handleRetryAnswer}
                    />
                  );
                })()}
              </div>
            </>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-text">No questions found matching your criteria</div>
            </div>
          )}
        </div>

        {/* Performance Chart Toggle Slider */}
        <div className="performance-chart-toggle">
          <div className="toggle-slider-container">
            <span className="toggle-label">📊 Performance Analytics</span>
            <div className="slider-toggle" onClick={handlePerformanceToggle}>
              <div className={`slider-thumb ${showPerformanceChart ? 'active' : ''}`}>
                <span className="slider-icon">{showPerformanceChart ? '📈' : '📊'}</span>
              </div>
            </div>
            <span className="toggle-status">{showPerformanceChart ? 'Hide' : 'Show'}</span>
          </div>
        </div>

        {/* Performance Dashboard - Conditional */}
        {showPerformanceChart && (
          <div className="performance-dashboard-wrapper">
            <PerformanceChart />
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            🏠 Home
          </button>
          <button className="btn-primary" onClick={async () => {
            await dataManager.clearAllAppData();
            navigate('/');
          }}>
            🔄 Retake Quiz
          </button>
        </div>
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

export default ResultPage;
