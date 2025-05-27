import React from 'react';
import PropTypes from 'prop-types';

function QuestionCard({ question, index, userAnswer, reviewMarked }) {
  const isCorrect = userAnswer === question.answer;

  const getBadge = () => {
    if (isCorrect) return <span className="badge correct" aria-label="Correct">✅ Correct</span>;
    if (userAnswer !== undefined) return <span className="badge wrong" aria-label="Incorrect">❌ Incorrect</span>;
    return <span className="badge skip" aria-label="Skipped">⏭️ Skipped</span>;
  };

  return (
    <div className="result-card" role="region" aria-labelledby={`question-${index}`}>
      <div className="result-header">
        <div id={`question-${index}`}>
          <strong>Q{index + 1}:</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: question.question }} />
        </div>
        <div>{getBadge()}</div>
      </div>

      <div className="result-options">
        {question.options.map((opt, i) => {
          const isUser = i === userAnswer;
          const isCorrectOpt = i === question.answer;
          const className = isCorrectOpt
            ? 'option correct-opt'
            : isUser
            ? 'option wrong-opt'
            : 'option';

          return (
            <div key={i} className={className} aria-label={`Option ${String.fromCharCode(65 + i)}`}>
              <strong>{String.fromCharCode(65 + i)}.</strong> {opt}
            </div>
          );
        })}
      </div>

      {/* Redesigned explanation section */}
      {question.explanation && (
        <div className="explanation-container">
          <div className="explanation-header">
            <strong>Explanation:</strong>
          </div>
          <div className="explanation-body">
            <p>{question.explanation}</p>
          </div>
        </div>
      )}

      {reviewMarked && <p className="marked" aria-label="Marked for Review">⭐ Marked for Review</p>}
    </div>
  );
}

QuestionCard.propTypes = {
  question: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  userAnswer: PropTypes.number,
  reviewMarked: PropTypes.bool
};

export default QuestionCard;
