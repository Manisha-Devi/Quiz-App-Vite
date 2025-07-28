
import React, { useCallback } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const QuestionCard = ({ question, index, userAnswer, reviewMarked }) => {
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

  const statusInfo = getStatusInfo();

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
          
          let optionClassName = 'option';
          if (isCorrectOption) {
            optionClassName += ' correct-option';
          } else if (isUserSelected && !isCorrectOption) {
            optionClassName += ' wrong-option';
          }

          const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C, D

          return (
            <div key={optionIndex} className={optionClassName}>
              <div className="option-label">{optionLabel}</div>
              <div className="option-text">
                {renderMathAndHTML(option)}
              </div>
              {isUserSelected && (
                <div className="user-mark">
                  {isCorrectOption ? '✅' : '❌'}
                </div>
              )}
              {isCorrectOption && !isUserSelected && (
                <div className="correct-mark">✅</div>
              )}
            </div>
          );
        })}
      </div>

      {question.explanation && (
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
