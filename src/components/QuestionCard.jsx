import React, { useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

function QuestionCard({ question, index, userAnswer, reviewMarked, retryMode, retryAnswer, retryCompleted, onRetryAnswer }) {
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
    if (userAnswer === undefined) {
      return { status: 'skipped', label: 'Skipped', className: 'skipped' };
    }
    if (userAnswer === question.answer) {
      return { status: 'correct', label: 'Correct', className: 'correct' };
    }
    return { status: 'incorrect', label: 'Incorrect', className: 'incorrect' };
  };

  const getRetryStatus = () => {
    if (!retryMode) return null;
    
    const questionStatus = getStatusInfo().status;
    
    // Only show retry for incorrect and skipped questions
    if (questionStatus !== 'incorrect' && questionStatus !== 'skipped') {
      return null;
    }
    
    if (retryCompleted) {
      return { icon: '✓', text: 'Retry Complete', spinning: false };
    }
    
    return { icon: '🔄', text: 'Click to Retry', spinning: true };
  };

  const statusInfo = getStatusInfo();

  const getOptionClass = (optionIndex) => {
    const correctAnswer = question.answer;

    // Retry mode logic
    if (retryMode) {
      // For correct questions (showing explanation), show proper coloring
      if (getStatusInfo().status === 'correct') {
        if (optionIndex === correctAnswer) {
          return 'option correct-option';
        }
        if (optionIndex === userAnswer && optionIndex !== correctAnswer) {
          return 'option wrong-option';
        }
        return 'option';
      }
      
      // For incorrect/skipped questions
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
    if (retryMode && onRetryAnswer && !retryCompleted) {
      const questionStatus = getStatusInfo().status;
      // Only allow retry for incorrect and skipped questions
      if (questionStatus === 'incorrect' || questionStatus === 'skipped') {
        onRetryAnswer(index, optionIndex);
      }
    }
  };


  const retryStatus = getRetryStatus();

  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-number">Q{index + 1}</div>
        <div className="status-badges">
          <div className={`status-badge ${statusInfo.className}`}>
            {statusInfo.label}
          </div>
          {retryStatus && (
            <div className={`retry-badge ${retryStatus.spinning ? 'spinning' : 'completed'}`}>
              <span className="retry-icon">{retryStatus.icon}</span>
              <span className="retry-text">{retryStatus.text}</span>
            </div>
          )}
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
              style={{ 
                cursor: (retryMode && !retryCompleted && (getStatusInfo().status === 'incorrect' || getStatusInfo().status === 'skipped')) ? 'pointer' : 'default' 
              }}
            >
              <div className="option-label">{String.fromCharCode(65 + optionIndex)}</div>
              <div className="option-text">
                {renderMathAndHTML(option)}
              </div>
              
              {/* Show marks in normal mode */}
              {!retryMode && (
                <>
                  {isUserSelected && (
                    <div className="user-mark">
                      {isCorrectOption ? '✅' : '❌'}
                    </div>
                  )}
                  {isCorrectOption && !isUserSelected && (
                    <div className="correct-mark">✅</div>
                  )}
                </>
              )}
              
              {/* Show marks in retry mode */}
              {retryMode && (
                <>
                  {/* For correct questions that haven't been retried - show original marks */}
                  {getStatusInfo().status === 'correct' && retryAnswer === undefined && (
                    <>
                      {isUserSelected && (
                        <div className="user-mark">
                          {isCorrectOption ? '✅' : '❌'}
                        </div>
                      )}
                      {isCorrectOption && !isUserSelected && (
                        <div className="correct-mark">✅</div>
                      )}
                    </>
                  )}
                  
                  {/* For incorrect/skipped questions after retry answer */}
                  {getStatusInfo().status !== 'correct' && retryAnswer !== undefined && (
                    <>
                      {isRetrySelected && (
                        <div className="user-mark">
                          {isCorrectOption ? '✅' : '❌'}
                        </div>
                      )}
                      {isCorrectOption && !isRetrySelected && (
                        <div className="correct-mark">✅</div>
                      )}
                      {isUserSelected && !isRetrySelected && !isCorrectOption && (
                        <div className="previous-mark">
                          ⚪ {/* Previous answer mark */}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {question.explanation && (!retryMode || retryAnswer !== undefined || getStatusInfo().status === 'correct') && (
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