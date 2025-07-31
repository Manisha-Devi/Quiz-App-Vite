import React, { useCallback, useState, useEffect } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { getImageFromStore } from '../utils/indexedDB';
import 'katex/dist/katex.min.css';

function QuestionCard({ question, index, userAnswer, reviewMarked, retryMode, retryAnswer, retryCompleted, onRetryAnswer }) {
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState([]);

  const renderMathAndHTML = useCallback(async (text) => {
    if (!text) return null;

    // Function to inject image sources into HTML content
    const injectImageSources = async (htmlContent) => {
      if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;

      // Find all img tags with id attributes
      const imgRegex = /<img[^>]+id=['"]([^'"]+)['"][^>]*>/g;
      let processedContent = htmlContent;
      let match;

      while ((match = imgRegex.exec(htmlContent)) !== null) {
        const fullImgTag = match[0];
        const imageId = match[1];

        try {
          // Get image from IndexedDB
          const imageData = await getImageFromStore('Image_Demo', imageId);

          if (imageData && imageData.data) {
            // Replace the img tag with one that has the blob URL as src
            const newImgTag = fullImgTag.replace(
              /(<img[^>]+)>/,
              `$1 src="${imageData.data}">`
            );
            processedContent = processedContent.replace(fullImgTag, newImgTag);
          } else {
            console.warn(`Image not found in store: ${imageId}`);
            // Add a placeholder or keep original
            const newImgTag = fullImgTag.replace(
              /(<img[^>]+)>/,
              `$1 src="" style="background: #f0f0f0; border: 2px dashed #ccc; padding: 20px; text-align: center; display: block;">`
            );
            processedContent = processedContent.replace(fullImgTag, newImgTag);
          }
        } catch (error) {
          console.error(`Error loading image ${imageId}:`, error);
        }
      }

      return processedContent;
    };
  
    // Process the text with image sources first
    const processedText = await injectImageSources(text);

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
  }, []);

  // State to store rendered content
  const [renderedQuestionText, setRenderedQuestionText] = useState(null);
  const [renderedOptions, setRenderedOptions] = useState([]);
  const [renderedExplanation, setRenderedExplanation] = useState(null);

  // Process content when component mounts or question changes
  useEffect(() => {
    const processContent = async () => {
      // Process question text
      const questionContent = await renderMathAndHTML(question.question);
      setRenderedQuestionText(questionContent);

      // Process options
      if (question.options) {
        const optionContents = await Promise.all(
          question.options.map(option => renderMathAndHTML(option))
        );
        setRenderedOptions(optionContents);
      }

      // Process explanation if exists
      if (question.explanation) {
        const explanationContent = await renderMathAndHTML(question.explanation);
        setRenderedExplanation(explanationContent);
      }
    };

    processContent();
  }, [question, renderMathAndHTML]);

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

    return { icon: '🔄', spinning: !retryCompleted };
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

  const handleFiftyFifty = () => {
    if (!fiftyFiftyUsed) {
      // Determine two incorrect options to hide
      let incorrectOptions = [];
      for (let i = 0; i < question.options.length; i++) {
        if (i !== question.answer) {
          incorrectOptions.push(i);
        }
      }

      // Shuffle incorrect options and pick the first two
      incorrectOptions = incorrectOptions.sort(() => Math.random() - 0.5);
      const optionsToHide = incorrectOptions.slice(0, 2);

      setHiddenOptions(optionsToHide);
      setFiftyFiftyUsed(true);
    }
  };


  const retryStatus = getRetryStatus();

  return (
    <div className="question-card">
      <div className="question-header">
        <div className="question-number">Q{index + 1}</div>
        <div className="status-badges">
          {/* 50/50 Button - leftmost */}
          {retryMode && retryStatus && !fiftyFiftyUsed && retryAnswer === undefined && (
            <button className="fifty-fifty-btn" onClick={handleFiftyFifty} title="50/50 Lifeline">
              50/50
            </button>
          )}
          {retryMode && retryStatus && fiftyFiftyUsed && (
            <div className="fifty-fifty-used">
              ✓ 50/50
            </div>
          )}
          {/* Retry Badge - middle */}
          {retryStatus && (
            <div className={`retry-badge ${retryStatus.spinning ? 'spinning' : 'completed'}`}>
              <span className="retry-icon">{retryStatus.icon}</span>
            </div>
          )}
          {/* Status Badge - rightmost */}
          <div className={`status-badge ${statusInfo.className}`}>
            {statusInfo.label}
          </div>
        </div>
      </div>

      {reviewMarked && (
        <div className="review-note">
          📝 Marked for Review
        </div>
      )}

      <div className="question-text">
          {renderedQuestionText}
        </div>



      <div className="options-grid">
        {question.options?.map((option, optionIndex) => {
          // Hide option if 50/50 is used and this option should be hidden
          if (fiftyFiftyUsed && hiddenOptions.includes(optionIndex)) {
            return (
              <div key={optionIndex} className="option option-fifty-fifty-hidden">
                <div className="option-label">{String.fromCharCode(65 + optionIndex)}</div>
                <div className="option-text">
                  {renderMathAndHTML(option)}
                </div>
                <span className="red-fifty">50</span>
              </div>
            );
          }

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
                {renderedOptions[optionIndex] || option}
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
                      {/* Correct answer indicator (when not retry selected) */}
                      {isCorrectOption && !isRetrySelected && (
                        <div className="correct-mark">✅</div>
                      )}

                      {/* Retry answer selected - check if same as original */}
                      {isRetrySelected && (
                        <div className="user-mark retry-mark">
                          {isCorrectOption ? (
                            <>🔄 ✅</>  // Retry correct
                          ) : userAnswer === retryAnswer ? (
                            <>🔄 ❌</>  // Same wrong answer - retry + cross
                          ) : (
                            <>🔄</>     // Different wrong retry - only retry icon
                          )}
                        </div>
                      )}

                      {/* Previous wrong answer (when different from retry) */}
                      {isUserSelected && !isRetrySelected && !isCorrectOption && userAnswer !== retryAnswer && (
                        <div className="user-mark">
                          ❌ {/* Previous wrong answer mark */}
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
              {renderedExplanation}
            </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;