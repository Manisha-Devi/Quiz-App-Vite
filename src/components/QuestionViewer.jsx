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
  hasMath,
  isDarkMode
}) {
  const [showAnswer, setShowAnswer] = React.useState(false);

  // Reset showAnswer when question changes
  React.useEffect(() => {
    setShowAnswer(false);
  }, [currentIndex]);

  const handleShowAnswer = () => {
    setShowAnswer(!showAnswer);
  };
  return (
    <div className="question-box">
      <div className="section-name-display">
        <span className="current-section-name">
          📚 {question.section || 'General Section'}
        </span>
        <div className="section-navigation-horizontal">
          {window.sections && window.sections.map((section, index) => {
            const isActive = window.getCurrentSection && window.getCurrentSection()?.name === section.name;
            const startNum = section.questions.length > 0 ? section.questions[0] + 1 : 1;
            const endNum = section.questions.length > 0 ? section.questions[section.questions.length - 1] + 1 : 1;
            
            return (
              <button
                key={index}
                className={`section-nav-item-horizontal ${isActive ? 'active' : ''}`}
                onClick={() => window.jumpToSection && window.jumpToSection(index)}
                title={`${section.name} (Q${startNum}-${endNum})`}
              >
                <span className="section-nav-name">{section.name}</span>
                <span className="section-nav-range">{startNum}-{endNum}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="question-scroll">
        <div className="q-header">
          <div className="q-number">Q{currentIndex + 1}</div>
          <div className="header-actions">
            <div className="show-answer" onClick={handleShowAnswer} title="Show/Hide Answer">
              {showAnswer ? '🙈' : '👁️'}
            </div>
            <div className="mark-review" onClick={onToggleReview}>
              Mark for Review: {reviewMarked ? '⭐' : '☆'}
            </div>
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
          {question.options?.map((opt, idx) => {
            const isUserAnswer = answer === idx;
            const isCorrectAnswer = showAnswer && question.answer === idx;
            const optionClass = `option ${isUserAnswer ? 'active' : ''} ${isCorrectAnswer ? 'correct-answer' : ''}`;

            return (
              <div
                key={idx}
                className={optionClass}
                onClick={() => !showAnswer && onOptionClick(idx)}
                aria-label={`Option ${String.fromCharCode(65 + idx)}`}
                style={{ cursor: showAnswer ? 'not-allowed' : 'pointer' }}
              >
                <strong>{String.fromCharCode(65 + idx)}.</strong>{' '}
                {hasMath(opt) ? (
                  <MathJax dynamic inline>
                    <span dangerouslySetInnerHTML={{ __html: injectImageSources(opt) }} />
                  </MathJax>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: injectImageSources(opt) }} />
                )}
                {isCorrectAnswer && <span className="correct-indicator"> ✅ Correct Answer</span>}
              </div>
            );
          })}
        </div>

        {showAnswer && question.explanation && (
          <div className="explanation-section">
            <div className="explanation-header">
              <strong>Explanation:</strong>
            </div>
            <div className="explanation-content">
              {hasMath(question.explanation) ? (
                <MathJax dynamic inline>
                  <div dangerouslySetInnerHTML={{ __html: injectImageSources(question.explanation) }} />
                </MathJax>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: injectImageSources(question.explanation) }} />
              )}
            </div>
          </div>
        )}
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
  hasMath: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool
};

export default QuestionViewer;