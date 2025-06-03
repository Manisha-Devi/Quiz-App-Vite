
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ResultPage.css';

function ResultPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [reviewMarks, setReviewMarks] = useState({});
  const [currentFilter, setCurrentFilter] = useState('all');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const navigate = useNavigate();

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
    <div className="result-page">
      {/* Fixed Header Section */}
      <div className="fixed-header">
        <div className="header-top">
          <h1>📊 Quiz Results</h1>
          <div className="header-controls">
            <div className="score-compact">
              <span className="score-percentage">{stats.percentage}%</span>
              <span className="score-text">Score</span>
            </div>
            
          </div>
        </div>
        
        
      </div>

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

      {/* Results Counter */}
      <div className="results-counter">
        Showing {filteredQuestions.length} of {stats.total} questions
      </div>

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
  );
}

export default ResultPage;
