import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import './styles/QuestionViewer.css';

const QuestionViewer = React.memo(function QuestionViewer({
  question,
  currentIndex,
  answer,
  reviewMarked,
  onOptionClick,
  onToggleReview,
  injectImageSources,
  hasMath,
  isDarkMode,
  isBoldMode,
  swipeHandlers,
  practiceMode = false,
  onClear,
  fiftyFiftyUsed,
  onFiftyFiftyUse
}) {
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [sectionsReady, setSectionsReady] = React.useState(!!window.sections);
  const hiddenOptions = fiftyFiftyUsed || [];
  const isFiftyFiftyUsed = hiddenOptions.length > 0;

  // Reset showAnswer when question changes
  React.useEffect(() => {
    setShowAnswer(false);
  }, [currentIndex]);

  // Handle clear from parent component
  React.useEffect(() => {
    if (onClear) {
      const clearStates = () => {
        setShowAnswer(false);
      };
      window.clearQuestionStates = clearStates;
    }
  }, [onClear]);

  // Check for sections availability
  React.useEffect(() => {
    const checkSections = () => {
      if (window.sections && !sectionsReady) {
        setSectionsReady(true);
      }
    };

    // Check immediately
    checkSections();

    // Set up interval to check periodically
    const interval = setInterval(checkSections, 100);

    // Clean up after 2 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [sectionsReady]);

  const handleShowAnswer = useCallback(() => {
    setShowAnswer(!showAnswer);
  }, [showAnswer]);

  const handleFiftyFifty = useCallback(() => {
    if (isFiftyFiftyUsed || !question.options || question.options.length !== 4 || !onFiftyFiftyUse) return;

    const correctAnswer = question.answer;
    const incorrectOptions = [];

    // Find all incorrect options
    question.options.forEach((_, index) => {
      if (index !== correctAnswer) {
        incorrectOptions.push(index);
      }
    });

    // Randomly select 2 incorrect options to hide
    const shuffled = [...incorrectOptions].sort(() => Math.random() - 0.5);
    const optionsToHide = shuffled.slice(0, 2);

    // Check if user's current answer will be hidden by 50/50
    if (answer !== undefined && optionsToHide.includes(answer)) {
      // Clear the user's answer if it will be hidden
      onOptionClick(undefined); // This will clear the selection
    }

    onFiftyFiftyUse(optionsToHide);
  }, [isFiftyFiftyUsed, question, onFiftyFiftyUse, answer, onOptionClick]);

  // Make toggleShowAnswer available globally for keyboard shortcut
  React.useEffect(() => {
    if (practiceMode) {
      window.toggleShowAnswer = handleShowAnswer;
    }
    return () => {
      if (window.toggleShowAnswer) {
        delete window.toggleShowAnswer;
      }
    };
  }, [handleShowAnswer, practiceMode]);

  // Make 50/50 function available globally for keyboard shortcut
  React.useEffect(() => {
    if (!practiceMode) {
      window.triggerFiftyFifty = handleFiftyFifty;
    }
    return () => {
      if (window.triggerFiftyFifty) {
        delete window.triggerFiftyFifty;
      }
    };
  }, [handleFiftyFifty, practiceMode]);

  // Function to render text with both KaTeX math and HTML - memoized for performance
  const renderMathAndHTML = useCallback((text) => {
    if (!text) return null;

    // Process the text with image sources first
    const processedText = injectImageSources(text);

    // Split by $ for inline math and $$ for display math
    const parts = [];
    let currentText = processedText;
    let key = 0;

    // Handle display math ($$...$$) first
    while (currentText.includes('$$')) {
      const startIndex = currentText.indexOf('$$');
      const endIndex = currentText.indexOf('$$', startIndex + 2);

      if (endIndex === -1) break;

      // Add text before math
      if (startIndex > 0) {
        const beforeMath = currentText.substring(0, startIndex);
        parts.push(
          <span key={key++} dangerouslySetInnerHTML={{ __html: beforeMath }} />
        );
      }

      // Add display math
      const mathContent = currentText.substring(startIndex + 2, endIndex);
      parts.push(
        <BlockMath key={key++} math={mathContent} />
      );

      // Continue with remaining text
      currentText = currentText.substring(endIndex + 2);
    }

    // Handle inline math ($...$)
    while (currentText.includes('$')) {
      const startIndex = currentText.indexOf('$');
      const endIndex = currentText.indexOf('$', startIndex + 1);

      if (endIndex === -1) break;

      // Add text before math
      if (startIndex > 0) {
        const beforeMath = currentText.substring(0, startIndex);
        parts.push(
          <span key={key++} dangerouslySetInnerHTML={{ __html: beforeMath }} />
        );
      }

      // Add inline math
      const mathContent = currentText.substring(startIndex + 1, endIndex);
      parts.push(
        <InlineMath key={key++} math={mathContent} />
      );

      // Continue with remaining text
      currentText = currentText.substring(endIndex + 1);
    }

    // Add any remaining text
    if (currentText) {
      parts.push(
        <span key={key++} dangerouslySetInnerHTML={{ __html: currentText }} />
      );
    }

    return parts.length > 0 ? parts : <span dangerouslySetInnerHTML={{ __html: processedText }} />;
  }, [injectImageSources]);

  // Get current section - using 1-based indexing for proper boundaries - memoized
  const getCurrentSection = useCallback(() => {
    const currentQuestionNumber = currentIndex + 1; // Convert to 1-based
    return window.sections?.find(section => {
      const startQuestion = section.startIndex + 1; // Convert to 1-based
      const endQuestion = section.endIndex + 1; // Convert to 1-based
      return currentQuestionNumber >= startQuestion && currentQuestionNumber <= endQuestion;
    }) || window.sections?.[0];
  }, [currentIndex]);

  return (
    <div className={`question-box ${isBoldMode ? 'bold-mode' : ''}`}>
      <div className="section-name-display">
        <div className="section-placeholder"></div>
        <div className="section-navigation-horizontal">
          {sectionsReady && window.sections && window.sections.length > 0 ? window.sections.map((section, index) => {
            const currentSection = window.getCurrentSection && window.getCurrentSection();
            const isActive = currentSection && currentSection.name === section.name;
            const startNum = section.startIndex + 1;
            const endNum = section.endIndex + 1;

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
          }) : (
            <div className="loading-sections">Loading sections...</div>
          )}
        </div>
      </div>

      <div className="question-scroll" {...swipeHandlers}>
        <div className="q-header">
          <div className="q-number">Q{currentIndex + 1}</div>
          <div className="header-actions">
            {practiceMode && (
              <div className="show-answer" onClick={handleShowAnswer} title="Show/Hide Answer">
                {showAnswer ? '🙈' : '👁️'}
              </div>
            )}
            {!practiceMode && (
              <div 
                className={`fifty-fifty ${isFiftyFiftyUsed ? 'used' : ''}`} 
                onClick={handleFiftyFifty} 
                title="50/50 Lifeline - Remove 2 wrong answers"
              >
                {isFiftyFiftyUsed ? '❌' : '50/50'}
              </div>
            )}
            <div className="mark-review" onClick={onToggleReview}>
              Mark for Review: {reviewMarked ? '⭐' : '☆'}
            </div>
          </div>
        </div>

        <div className="q-text">
          {renderMathAndHTML(question.question)}
        </div>

        <div className="options">
          {question.options?.map((opt, idx) => {
            const isUserAnswer = answer === idx;
            const isCorrectAnswer = showAnswer && question.answer === idx;
            const isHidden = hiddenOptions.includes(idx);
            const optionClass = `option ${isUserAnswer ? 'active' : ''} ${isCorrectAnswer ? 'correct-answer' : ''} ${isHidden ? 'option-fifty-fifty-hidden' : ''}`;

            return (
              <div
                key={idx}
                className={optionClass}
                onClick={() => !showAnswer && !isHidden && onOptionClick(idx)}
                aria-label={`Option ${String.fromCharCode(65 + idx)}`}
              >
                <strong>{String.fromCharCode(65 + idx)}.</strong>{' '}
                <span>
                  {renderMathAndHTML(opt)}
                </span>
                {isHidden && <span className="red-fifty">❌</span>}
                {isCorrectAnswer && <span className="correct-indicator">✅</span>}
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
              {renderMathAndHTML(question.explanation)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

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
  isBoldMode: PropTypes.bool,
  swipeHandlers: PropTypes.object,
  onClear: PropTypes.func,
  fiftyFiftyUsed: PropTypes.array,
  onFiftyFiftyUse: PropTypes.func
};

export default QuestionViewer;