import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

function QuestionCard({ question, index, userAnswer, reviewMarked }) {
  // Function to render text with KaTeX math
  const renderMathAndHTML = useCallback((text) => {
    if (!text) return null;

    const parts = [];
    let currentText = text;
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

    return parts.length > 0 ? parts : <span dangerouslySetInnerHTML={{ __html: text }} />;
  }, []);
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
          <span>{renderMathAndHTML(question.question)}</span>
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
              <strong>{String.fromCharCode(65 + i)}.</strong> {renderMathAndHTML(opt)}
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
            <p>{renderMathAndHTML(question.explanation)}</p>
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
