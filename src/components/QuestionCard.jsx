import React, { useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

function QuestionCard({ question, index, userAnswer, reviewMarked, retryMode, retryAnswer, onRetryAnswer }) {
  const renderMathAndHTML = useCallback((text) => {
    if (!text) return '';

    const parts = [];
    let currentText = String(text);
    let key = 0;

    // Process display math ($$...$$) first
    while (currentText.includes('$$')) {
      const startIndex = currentText.indexOf('$$');
      const endIndex = currentText.indexOf('$$', startIndex + 2);

      if (endIndex === -1) break;

      // Add text before math
      if (startIndex > 0) {
        const beforeText = currentText.substring(0, startIndex);
        if (beforeText.trim()) {
          parts.push(
            <span key={key++} dangerouslySetInnerHTML={{ __html: beforeText }} />
          );
        }
      }

      // Add math content
      const mathContent = currentText.substring(startIndex + 2, endIndex);
      try {
        parts.push(<BlockMath key={key++} math={mathContent} />);
      } catch (error) {
        parts.push(<span key={key++}>{`$$${mathContent}$$`}</span>);
      }

      // Continue with remaining text
      currentText = currentText.substring(endIndex + 2);
    }

    // Process inline math ($...$)
    while (currentText.includes('$')) {
      const startIndex = currentText.indexOf('$');
      const endIndex = currentText.indexOf('$', startIndex + 1);

      if (endIndex === -1) break;

      // Add text before math
      if (startIndex > 0) {
        const beforeText = currentText.substring(0, startIndex);
        if (beforeText.trim()) {
          parts.push(
            <span key={key++} dangerouslySetInnerHTML={{ __html: beforeText }} />
          );
        }
      }

      // Add math content
      const mathContent = currentText.substring(startIndex + 1, endIndex);
      try {
        parts.push(<InlineMath key={key++} math={mathContent} />);
      } catch (error) {
        parts.push(<span key={key++}>{`$${mathContent}$`}</span>);
      }

      // Continue with remaining text
      currentText = currentText.substring(endIndex + 1);
    }

    // Add any remaining text
    if (currentText.trim()) {
      parts.push(
        <span key={key++} dangerouslySetInnerHTML={{ __html: currentText }} />
      );
    }

    return parts.length > 0 ? parts : text;
  }, []);

  const getStatusInfo = () => {
    // In retry mode, don't show status initially
    if (retryMode && retryAnswer === undefined) {
      return { status: 'retry', label: 'Retry', className: 'retry' };
    }
    
    if (userAnswer === undefined) {
      return { status: 'skipped', label: 'Skipped', className: 'skipped' };
    }
    if (userAnswer === question.answer) {
      return { status: 'correct', label: 'Correct', className: 'correct' };
    }
    return { status: 'incorrect', label: 'Incorrect', className: 'incorrect' };
  };

  const statusInfo = getStatusInfo();

  const getOptionClass = (optionIndex) => {
    const correctAnswer = question.answer;

    // Retry mode logic
    if (retryMode) {
      if (retryAnswer === undefined) {
        // Before clicking any option in retry mode - show normal options
        return 'option';
      } else {
        // After clicking an option in retry mode - show comparison
        if (optionIndex === correctAnswer) {
          return 'option correct-option';
        }
        if (optionIndex === retryAnswer && optionIndex !== correctAnswer) {
          return 'option wrong-option';
        }
        if (optionIndex === userAnswer && optionIndex !== retryAnswer) {
          return 'option previous-answer';
        }
        return 'option';
      }
    }

    // Normal mode
    if (optionIndex === correctAnswer) {
      return 'option correct-option';
    }

    if (userAnswer !== undefined && optionIndex === userAnswer && optionIndex !== correctAnswer) {
      return 'option wrong-option';
    }

    return 'option';
  };

  const handleOptionClick = (optionIndex) => {
    if (retryMode && onRetryAnswer) {
      onRetryAnswer(index, optionIndex);
    }
  };


  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-number">Q{index + 1}</div>
        <div className={`status-badge ${statusInfo.className}`}>
          {statusInfo.label}
        </div>
      </div>

      {reviewMarked && (
        <div className="review-note">
          📝 Marked for Review
        </div>
      )}

      <div className="question-text">
        {renderMathAndHTML(question.question)}
      </div>

      <div className="options-grid">
        {question.options?.map((option, optionIndex) => {
          const isCorrectOption = optionIndex === question.answer;
          const isUserSelected = optionIndex === userAnswer;
          const isRetrySelected = optionIndex === retryAnswer;

          return (
            <div 
              key={optionIndex} 
              className={getOptionClass(optionIndex)}
              onClick={() => handleOptionClick(optionIndex)}
              style={{ cursor: retryMode ? 'pointer' : 'default' }}
            >
              <div className="option-label">{String.fromCharCode(65 + optionIndex)}</div>
              <div className="option-text">
                {renderMathAndHTML(option)}
              </div>
              
              {/* Show marks only in normal mode or after retry answer is selected */}
              {!retryMode && isUserSelected && (
                <div className="user-mark">
                  {isCorrectOption ? '✅' : '❌'}
                </div>
              )}
              {!retryMode && isCorrectOption && !isUserSelected && (
                <div className="correct-mark">✅</div>
              )}
              
              {/* Show marks in retry mode only after an answer is selected */}
              {retryMode && retryAnswer !== undefined && (
                <>
                  {isRetrySelected && (
                    <div className="user-mark">
                      {isCorrectOption ? '✅' : '❌'}
                    </div>
                  )}
                  {isCorrectOption && !isRetrySelected && (
                    <div className="correct-mark">✅</div>
                  )}
                  {isUserSelected && !isRetrySelected && optionIndex !== isCorrectOption && (
                    <div className="previous-mark">
                      ⚪ {/* Previous answer mark */}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {question.explanation && (!retryMode || retryAnswer !== undefined) && (
        <div className="explanation">
          <div className="explanation-header">💡 Explanation</div>
          <div className="explanation-text">
            {renderMathAndHTML(question.explanation)}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;