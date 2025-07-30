import React from 'react';
import PropTypes from 'prop-types';
import './styles/QuestionNavigator.css';

const QuestionNavigator = React.memo(function QuestionNavigator({
  totalQuestions,
  current,
  answers,
  review,
  onJump,
}) {
  const [selectedTypes, setSelectedTypes] = React.useState([]);

  const getStatus = (i) => {
    if (i === current) return "active";
    if (review[i] && answers[i] !== undefined) return "review-answered";
    if (review[i]) return "review";
    if (answers[i] !== undefined) return "answered";
    return "not-visited";
  };

  const countStatus = () => {
    let answered = 0,
      reviewOnly = 0,
      reviewAnswered = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const isAnswered = answers[i] !== undefined;
      const isReviewed = review[i];

      if (isReviewed && isAnswered) reviewAnswered++;
      else if (isReviewed) reviewOnly++;
      else if (isAnswered) answered++;
    }

    const notVisited =
      totalQuestions - (answered + reviewOnly + reviewAnswered);

    return {
      answered,
      reviewOnly,
      reviewAnswered,
      notVisited,
      active: 1,
    };
  };

  const counts = countStatus();

  const handleTypeToggle = (type) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const filteredIndexes = Array.from(
    { length: totalQuestions },
    (_, i) => i,
  ).filter((i) => {
    const status = getStatus(i);

    if (selectedTypes.length === 0) return true;

    if (selectedTypes.includes("answered") && status === "answered")
      return true;
    if (selectedTypes.includes("review") && status === "review") return true;
    if (
      selectedTypes.includes("review-answered") &&
      status === "review-answered"
    )
      return true;
    if (selectedTypes.includes("not-visited") && status === "not-visited")
      return true;

    return false;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'answered': return '✓';
      case 'review': return '👁️';
      case 'review-answered': return '✓👁️';
      case 'active': return '🎯';
      default: return '';
    }
  };

  return (
    <div className="question-navigator">
      {/* Header Section */}
      <div className="navigator-header">
        <h3 className="navigator-title">Question Navigator</h3>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{width: `${((Object.keys(answers).length / totalQuestions) * 100)}%`}}
          ></div>
        </div>
        <div className="progress-text">
          {Object.keys(answers).length}/{totalQuestions} Completed
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card answered">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-number">{counts.answered}</div>
            <div className="stat-label">Answered</div>
          </div>
        </div>

        <div className="stat-card review">
          <div className="stat-icon">👁️</div>
          <div className="stat-info">
            <div className="stat-number">{counts.reviewOnly}</div>
            <div className="stat-label">Review</div>
          </div>
        </div>

        <div className="stat-card review-answered">
          <div className="stat-icon">✓👁️</div>
          <div className="stat-info">
            <div className="stat-number">{counts.reviewAnswered}</div>
            <div className="stat-label">Both</div>
          </div>
        </div>

        <div className="stat-card not-visited">
          <div className="stat-icon">○</div>
          <div className="stat-info">
            <div className="stat-number">{counts.notVisited}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-title">Filter Questions:</div>
        <div className="filter-chips">
          {[
            { type: 'answered', label: 'Answered', icon: '✓' },
            { type: 'review', label: 'Review', icon: '👁️' },
            { type: 'review-answered', label: 'Both', icon: '✓👁️' },
            { type: 'not-visited', label: 'Pending', icon: '○' }
          ].map(({type, label, icon}) => (
            <button
              key={type}
              className={`filter-chip ${type} ${selectedTypes.includes(type) ? 'active' : ''}`}
              onClick={() => handleTypeToggle(type)}
            >
              <span className="chip-icon">{icon}</span>
              <span className="chip-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Questions Grid */}
      <div className="questions-container">
        <div className="questions-grid">
          {Array.from({ length: totalQuestions }, (_, i) => i).map((i) => {
            const status = getStatus(i);
            const isVisible = selectedTypes.length === 0 || filteredIndexes.includes(i);

            if (!isVisible) return null;

            return (
              <button
                key={i}
                className={`question-card ${status}`}
                onClick={() => onJump(i)}
                title={`Question ${i + 1} - ${status.replace('-', ' ')}`}
              >
                <div className="question-number">{i + 1}</div>
                <div className="question-status-icon">
                  {getStatusIcon(status)}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

QuestionNavigator.propTypes = {
  totalQuestions: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  answers: PropTypes.object.isRequired,
  review: PropTypes.object.isRequired,
  onJump: PropTypes.func.isRequired,
};

export default QuestionNavigator;