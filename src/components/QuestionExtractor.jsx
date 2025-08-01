
import React, { useState, useRef } from 'react';
import './styles/QuestionExtractor.css';

const QuestionExtractor = ({ onExtractedQuestions, onAlert, isStandalone = false }) => {
  const [isOpen, setIsOpen] = useState(isStandalone);
  const [extractedText, setExtractedText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [questions, setQuestions] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessing(true);
    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        // For PDF files, we'll need to manually extract text
        text = await extractTextFromPDF(file);
      } else if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        // For Word files, we'll need to manually extract text
        text = await extractTextFromWord(file);
      } else if (file.type === 'text/plain') {
        // For text files
        text = await file.text();
      } else {
        onAlert('Error', 'Unsupported file type. Please upload PDF, Word, or Text files.', 'error');
        setProcessing(false);
        return;
      }

      setExtractedText(text);
      const extractedQuestions = parseQuestions(text);
      setQuestions(extractedQuestions);
      
      if (extractedQuestions.length === 0) {
        onAlert('No Questions Found', 'No questions were found in the uploaded file. Please check the format.', 'warning');
      } else {
        onAlert('Success', `Extracted ${extractedQuestions.length} questions successfully!`, 'success');
      }
    } catch (error) {
      onAlert('Error', 'Error processing file: ' + error.message, 'error');
    }
    setProcessing(false);
  };

  // Placeholder function for PDF text extraction
  const extractTextFromPDF = async (file) => {
    // Since we can't use external libraries, we'll prompt user to copy-paste
    onAlert('PDF Processing', 'Please copy the text from your PDF and paste it in the text area below.', 'info');
    return '';
  };

  // Placeholder function for Word text extraction
  const extractTextFromWord = async (file) => {
    // Since we can't use external libraries, we'll prompt user to copy-paste
    onAlert('Word Processing', 'Please copy the text from your Word document and paste it in the text area below.', 'info');
    return '';
  };

  const parseQuestions = (text) => {
    if (!text.trim()) return [];

    const questions = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentQuestion = null;
    let questionCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line starts with a number followed by a dot and question mark
      const questionMatch = line.match(/^(\d+)\.\s*(.+?\?)\s*$/);
      if (questionMatch) {
        // Save previous question if exists
        if (currentQuestion && currentQuestion.options.length === 4) {
          questions.push(currentQuestion);
        }
        
        // Start new question
        currentQuestion = {
          id: questionCounter++,
          question: formatKaTeX(questionMatch[2]),
          options: [],
          answer: null,
          level: 0,
          explanation: ''
        };
        continue;
      }

      if (currentQuestion) {
        // Check for options (A), B), C), D))
        const optionMatch = line.match(/^([A-D])\)\s*(.+)$/);
        if (optionMatch && currentQuestion.options.length < 4) {
          currentQuestion.options.push(formatKaTeX(optionMatch[2]));
          continue;
        }

        // Check for answer
        const answerMatch = line.match(/^Answer:\s*([A-D])/i);
        if (answerMatch) {
          const answerLetter = answerMatch[1].toUpperCase();
          currentQuestion.answer = answerLetter.charCodeAt(0) - 65; // Convert A=0, B=1, C=2, D=3
          continue;
        }

        // Check for explanation
        const explanationMatch = line.match(/^Explanation:\s*(.+)$/i);
        if (explanationMatch) {
          currentQuestion.explanation = formatKaTeX(explanationMatch[1]);
          continue;
        }
      }
    }

    // Add the last question if valid
    if (currentQuestion && currentQuestion.options.length === 4) {
      questions.push(currentQuestion);
    }

    return questions;
  };

  const formatKaTeX = (text) => {
    if (!text) return text;
    
    // Convert common mathematical expressions to KaTeX format
    let formatted = text
      // Fractions: 1/2 -> \frac{1}{2}
      .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}')
      // Powers: x^2 -> x^{2}
      .replace(/([a-zA-Z])(\^)(\d+)/g, '$1^{$3}')
      // Square roots: sqrt(x) -> \sqrt{x}
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
      // Percentages
      .replace(/(\d+)%/g, '$1\\%')
      // Mathematical operators
      .replace(/\*\*/g, '^')
      .replace(/\+\-/g, '\\pm')
      .replace(/\-\+/g, '\\mp')
      // Greek letters
      .replace(/\balpha\b/g, '\\alpha')
      .replace(/\bbeta\b/g, '\\beta')
      .replace(/\bgamma\b/g, '\\gamma')
      .replace(/\bdelta\b/g, '\\delta')
      .replace(/\bpi\b/g, '\\pi')
      .replace(/\btheta\b/g, '\\theta')
      .replace(/\bomega\b/g, '\\omega');

    return formatted;
  };

  const handleManualExtraction = () => {
    if (!extractedText.trim()) {
      onAlert('Error', 'Please enter text to extract questions from.', 'error');
      return;
    }

    const extractedQuestions = parseQuestions(extractedText);
    setQuestions(extractedQuestions);
    
    if (extractedQuestions.length === 0) {
      onAlert('No Questions Found', 'No questions were found in the text. Please check the format.', 'warning');
    } else {
      onAlert('Success', `Extracted ${extractedQuestions.length} questions successfully!`, 'success');
    }
  };

  const handleSaveQuestions = () => {
    if (questions.length === 0) {
      onAlert('Error', 'No questions to save. Please extract questions first.', 'error');
      return;
    }

    const fileName = `extracted_questions_${new Date().toISOString().split('T')[0]}.json`;
    const jsonData = JSON.stringify(questions, null, 2);
    
    // Create download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onAlert('Success', `Saved ${questions.length} questions as ${fileName}`, 'success');
    
    // Also pass to parent component
    if (onExtractedQuestions) {
      onExtractedQuestions(questions);
    }
  };

  const clearAll = () => {
    setExtractedText('');
    setQuestions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Tool Icon in Header - only show if not standalone */}
      {!isStandalone && (
        <button
          className={`extractor-icon-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Extract Questions from Word/PDF"
        >
          🔍
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div className={`extractor-modal-overlay ${isStandalone ? 'standalone' : ''}`}>
          <div className={`extractor-modal ${isStandalone ? 'standalone' : ''}`}>
            {!isStandalone && (
              <div className="extractor-header">
                <h2>📄 Question Extractor</h2>
                <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
              </div>
            )}

            <div className="extractor-content">
              {/* File Upload Section */}
              <div className="upload-section">
                <h3>📁 Upload File</h3>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                <p className="file-help">
                  Supported formats: PDF, Word (.doc, .docx), Text (.txt)
                </p>
              </div>

              {/* Manual Text Input */}
              <div className="text-section">
                <h3>📝 Or Paste Text Here</h3>
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder={`Paste your questions here in this format:

1. What is the capital of France?
A) London
B) Berlin
C) Paris
D) Madrid
Answer: C
Explanation: Paris is the capital city of France.

2. What is 2 + 2?
A) 3
B) 4
C) 5
D) 6
Answer: B`}
                  className="text-input"
                  rows={10}
                />
                <button
                  onClick={handleManualExtraction}
                  className="extract-btn"
                  disabled={processing}
                >
                  {processing ? '⏳ Processing...' : '🔍 Extract Questions'}
                </button>
              </div>

              {/* Questions Preview */}
              {questions.length > 0 && (
                <div className="questions-section">
                  <h3>📋 Extracted Questions ({questions.length})</h3>
                  <div className="questions-preview">
                    {questions.slice(0, 3).map((q, idx) => (
                      <div key={idx} className="question-preview">
                        <p className="question-text">{q.question}</p>
                        <div className="options-preview">
                          {q.options.map((option, optIdx) => (
                            <span
                              key={optIdx}
                              className={`option-preview ${optIdx === q.answer ? 'correct' : ''}`}
                            >
                              {String.fromCharCode(65 + optIdx)}) {option}
                            </span>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="explanation-preview">💡 {q.explanation}</p>
                        )}
                      </div>
                    ))}
                    {questions.length > 3 && (
                      <p className="more-questions">... and {questions.length - 3} more questions</p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                <button onClick={clearAll} className="clear-btn">
                  🗑️ Clear All
                </button>
                <button
                  onClick={handleSaveQuestions}
                  className="save-btn"
                  disabled={questions.length === 0}
                >
                  💾 Save as JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionExtractor;
