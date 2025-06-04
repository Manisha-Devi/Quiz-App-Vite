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
  isDarkMode,
  allQuestions,
  onJumpToSection
}) {
  const [showAnswer, setShowAnswer] = React.useState(false);

  // Reset showAnswer when question changes
  React.useEffect(() => {
    setShowAnswer(false);
  }, [currentIndex]);

  const handleShowAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  // Get all unique sections with their question ranges
  const getSections = () => {
    if (!allQuestions || allQuestions.length === 0) return [];
    
    const sections = [];
    let currentSection = null;
    let startIndex = 0;
    
    allQuestions.forEach((q, index) => {
      const sectionName = q.section || 'General Section';
      
      if (currentSection !== sectionName) {
        if (currentSection !== null) {
          sections.push({
            name: currentSection,
            startIndex,
            endIndex: index - 1,
            questionCount: index - startIndex
          });
        }
        currentSection = sectionName;
        startIndex = index;
      }
      
      // Last section
      if (index === allQuestions.length - 1) {
        sections.push({
          name: currentSection,
          startIndex,
          endIndex: index,
          questionCount: index - startIndex + 1
        });
      }
    });
    
    return sections;
  };

  const sections = getSections();
  const currentSection = question.section || 'General Section';

  return (
    <div className="question-box">
      {sections.length > 1 && (
        <div className="sections-navigation">
          <div className="sections-scroll">
            {sections.map((section, index) => {
              const isActive = section.name === currentSection;
              return (
                <div
                  key={index}
                  className={`section-tab ${isActive ? 'active' : ''}`}
                  onClick={() => onJumpToSection && onJumpToSection(section.startIndex)}
                  title={`${section.name} (Q${section.startIndex + 1}-Q${section.endIndex + 1})`}
                >
                  <span className="section-tab-name">{section.name}</span>
                  <span className="section-tab-count">
                    Q{section.startIndex + 1}-{section.endIndex + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="section-name-display">
        <span className="current-section-name">
          📚 {question.section || 'General Section'}
        </span>
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
  isDarkMode: PropTypes.bool,
  allQuestions: PropTypes.array,
  onJumpToSection: PropTypes.func
};

export default QuestionViewer;