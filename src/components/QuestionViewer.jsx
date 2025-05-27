import React from 'react';
import PropTypes from 'prop-types';
import { MathJax } from 'better-react-mathjax';
import './styles/QuestionViewer.css';

function QuestionViewer({
  question,
  currentIndex,
  answer,
  reviewMarked,
  onOptionClick,
  onToggleReview,
  injectImageSources,
  hasMath
}) {
  return (
    <div className="question-box">
      <div className="question-scroll">
        <div className="q-header">
          <div className="q-number">Q{currentIndex + 1}</div>
          <div className="mark-review" onClick={onToggleReview}>
            Mark for Review: {reviewMarked ? '⭐' : '☆'}
          </div>
        </div>

        <div className="q-text">
          {hasMath(question.question) ? (
            <MathJax dynamic inline>
              <div dangerouslySetInnerHTML={{ __html: injectImageSources(question.question) }} />
            </MathJax>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: injectImageSources(question.question) }} />
          )}
        </div>

        <div className="options">
          {question.options?.map((opt, idx) => (
            <div
              key={idx}
              className={`option ${answer === idx ? 'active' : ''}`}
              onClick={() => onOptionClick(idx)}
              aria-label={`Option ${String.fromCharCode(65 + idx)}`}
            >
              <strong>{String.fromCharCode(65 + idx)}.</strong>{' '}
              {hasMath(opt) ? (
                <MathJax dynamic inline>
                  <span dangerouslySetInnerHTML={{ __html: injectImageSources(opt) }} />
                </MathJax>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: injectImageSources(opt) }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

QuestionViewer.propTypes = {
  question: PropTypes.object.isRequired,
  currentIndex: PropTypes.number.isRequired,
  answer: PropTypes.number,
  reviewMarked: PropTypes.bool,
  onOptionClick: PropTypes.func.isRequired,
  onToggleReview: PropTypes.func.isRequired,
  injectImageSources: PropTypes.func.isRequired,
  hasMath: PropTypes.func.isRequired
};

export default QuestionViewer;
