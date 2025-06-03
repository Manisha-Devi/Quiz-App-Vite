
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ResultPage.css';

function ResultPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [reviewMarks, setReviewMarks] = useState({});
  const [currentFilter, setCurrentFilter] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  useEffect(() => {
    const q = JSON.parse(localStorage.getItem('finalQuiz') || '[]');
    const a = JSON.parse(localStorage.getItem('examAnswers') || '{}');
    const r = JSON.parse(localStorage.getItem('reviewMarks') || '{}');

    setQuestions(q);
    setAnswers(a);
    setReviewMarks(r);
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

  const filteredQuestions = questions.filter((q, idx) => {
    // Filter by status
    const status = getQuestionStatus(idx);
    if (currentFilter !== 'all' && status !== currentFilter) return false;
    
    return true;
  });

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

  const QuestionCard = ({ question, index, userAnswer, reviewMarked }) => {
    const isCorrect = userAnswer === question.answer;
    const isSkipped = userAnswer === undefined;

    return (
      <div className="question-card">
        <div className="question-header">
          <div className="question-number">Q{index + 1}</div>
          <div className={`status-badge ${isSkipped ? 'skipped' : isCorrect ? 'correct' : 'incorrect'}`}>
            {isSkipped ? '⏭️ Skipped' : isCorrect ? '✅ Correct' : '❌ Incorrect'}
          </div>
        </div>
        
        <div className="question-text" dangerouslySetInnerHTML={{ __html: question.question }} />
        
        <div className="options-grid">
          {question.options.map((option, i) => {
            const isUserChoice = i === userAnswer;
            const isCorrectOption = i === question.answer;
            
            let className = 'option';
            if (isCorrectOption) className += ' correct-option';
            else if (isUserChoice) className += ' wrong-option';
            
            return (
              <div key={i} className={className}>
                <span className="option-label">{String.fromCharCode(65 + i)}.</span>
                <span className="option-text">{option}</span>
                {isUserChoice && !isCorrectOption && <span className="user-mark">👤</span>}
                {isCorrectOption && <span className="correct-mark">✓</span>}
              </div>
            );
          })}
        </div>

        {reviewMarked && (
          <div className="review-note">
            📌 Marked for review
          </div>
        )}

        {question.explanation && (
          <div className="explanation">
            <div className="explanation-header">💡 Explanation</div>
            <div className="explanation-text">{question.explanation}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`result-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Top Header Bar similar to ExamPage */}
      <header className="result-header">
        <div className="section-name">📊 Quiz Results</div>
        <div className="d-flex align-items-center gap-2">
          <div className="score-box">
            <span className="score-percentage">{stats.percentage}%</span>
            <span className="score-text">Score</span>
          </div>
          <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
            {isDarkMode ? '☀️' : '🌙'}
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
        {/* Performance Dashboard */}
        <PerformanceChart />

        {/* Questions List */}
        <div className="questions-container">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, originalIdx) => {
              const actualIndex = questions.findIndex(question => question === q);
              return (
                <QuestionCard
                  key={actualIndex}
                  question={q}
                  index={actualIndex}
                  userAnswer={answers[actualIndex]}
                  reviewMarked={reviewMarks[actualIndex]}
                />
              );
            })
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <div className="no-results-text">No questions found matching your criteria</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => navigate('/')}>
            🏠 Home
          </button>
          <button className="btn-primary" onClick={() => {
            localStorage.clear();
            navigate('/');
          }}>
            🔄 Retake Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultPage;
