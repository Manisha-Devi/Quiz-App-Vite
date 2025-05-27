import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './styles/QuestionNavigator.css';

function QuestionNavigator({ totalQuestions, current, answers, review, onJump }) {
  const [filter, setFilter] = useState('all');

  const getStatus = (i) => {
    if (i === current) return 'active';
    if (review[i] && answers[i] !== undefined) return 'review-answered';
    if (review[i]) return 'review';
    if (answers[i] !== undefined) return 'answered';
    return 'not-visited';
  };

  const countStatus = () => {
    let answered = 0, reviewOnly = 0, reviewAnswered = 0;

    for (let i = 0; i < totalQuestions; i++) {
      const isAnswered = answers[i] !== undefined;
      const isReviewed = review[i];

      if (isReviewed && isAnswered) reviewAnswered++;
      else if (isReviewed) reviewOnly++;
      else if (isAnswered) answered++;
    }

    const notVisited = totalQuestions - (answered + reviewOnly + reviewAnswered);

    return {
      answered,
      reviewOnly,
      reviewAnswered,
      notVisited,
      active: 1
    };
  };

  const counts = countStatus();

  const filteredIndexes = Array.from({ length: totalQuestions }, (_, i) => i).filter(i => {
    const status = getStatus(i);
    if (filter === 'all') return true;
    if (filter === 'review') return status === 'review' || status === 'review-answered';
    if (filter === 'unanswered') return status === 'not-visited';
    return true;
  });

  return (
    <div className="question-navigator">
      <div className="navigator-filters">
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'active-filter' : ''}
        >
          All
        </button>
        <button
          onClick={() => setFilter('review')}
          className={filter === 'review' ? 'active-filter' : ''}
        >
          Review
        </button>
        <button
          onClick={() => setFilter('unanswered')}
          className={filter === 'unanswered' ? 'active-filter' : ''}
        >
          Unanswered
        </button>
      </div>

      <div className="navigator-grid">
        {filteredIndexes.map(i => (
          <button
            key={i}
            className={`nav-dot ${getStatus(i)}`}
            onClick={() => onJump(i)}
            aria-label={`Question ${i + 1}`}
            title={`Q${i + 1} - ${getStatus(i).replace('-', ' ')}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="legend">
        <span className="legend-pill active">🎯 Current</span>
        <span className="legend-pill answered">✅ Answered ({counts.answered})</span>
        <span className="legend-pill review">⭐ Review ({counts.reviewOnly})</span>
        <span className="legend-pill review-answered">⭐✅ Review + Answered ({counts.reviewAnswered})</span>
        <span className="legend-pill not-visited">Not Visited ({counts.notVisited})</span>
      </div>
    </div>
  );
}

QuestionNavigator.propTypes = {
  totalQuestions: PropTypes.number.isRequired,
  current: PropTypes.number.isRequired,
  answers: PropTypes.object.isRequired,
  review: PropTypes.object.isRequired,
  onJump: PropTypes.func.isRequired
};

export default QuestionNavigator;
