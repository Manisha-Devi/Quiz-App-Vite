
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import dataManager from "../utils/dataManager";
import "../styles/QuestionExtractorPage.css";

function QuestionExtractorPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [files, setFiles] = useState([]);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeData = async () => {
      const darkModeValue = await dataManager.getUserSetting('darkMode', false);
      setIsDarkMode(darkModeValue);
    };
    initializeData();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await dataManager.setUserSetting('darkMode', newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const newErrors = [];

    const valid = selected.filter((file) => {
      const isWordFile = file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                        file.type === "application/msword";
      const isPdfFile = file.type === "application/pdf";
      
      if (!isWordFile && !isPdfFile) {
        newErrors.push(`❌ ${file.name} is not a Word or PDF file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        newErrors.push(`❌ ${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    const existingNames = new Set(files.map((f) => f.name));
    const newFiles = valid.filter((file) => {
      if (existingNames.has(file.name)) {
        newErrors.push(`⚠️ ${file.name} already uploaded`);
        return false;
      }
      return true;
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    } else {
      setErrors([]);
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const removeFile = (filename) => {
    setFiles((prev) => prev.filter((f) => f.name !== filename));
  };

  const extractQuestionsFromText = (text) => {
    const questions = [];
    
    // Enhanced regex patterns for question extraction
    const questionPatterns = [
      // Pattern 1: "1. Question text?\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\nAnswer: A"
      /(\d+)\.\s*(.+?)\?\s*\n\s*A\)\s*(.+?)\s*\n\s*B\)\s*(.+?)\s*\n\s*C\)\s*(.+?)\s*\n\s*D\)\s*(.+?)\s*\n\s*Answer:\s*([A-D])\s*(?:\n\s*Explanation:\s*(.+?))?(?=\n\d+\.|$)/gi,
      
      // Pattern 2: "Q1. Question text?\na) Option 1\nb) Option 2\nc) Option 3\nd) Option 4\nAns: a"
      /Q(\d+)\.\s*(.+?)\?\s*\n\s*a\)\s*(.+?)\s*\n\s*b\)\s*(.+?)\s*\n\s*c\)\s*(.+?)\s*\n\s*d\)\s*(.+?)\s*\n\s*Ans:\s*([a-d])\s*(?:\n\s*Explanation:\s*(.+?))?(?=\nQ\d+\.|$)/gi,
      
      // Pattern 3: More flexible pattern
      /(\d+)\.\s*(.+?)\?\s*[\n\r\s]*[A-Da-d]\)\s*(.+?)[\n\r\s]*[B-Db-d]\)\s*(.+?)[\n\r\s]*[C-Dc-d]\)\s*(.+?)[\n\r\s]*[D-Dd-d]\)\s*(.+?)[\n\r\s]*(?:Answer|Ans):\s*([A-Da-d])\s*(?:[\n\r\s]*(?:Explanation|Explination):\s*(.+?))?(?=\d+\.|$)/gi
    ];

    for (const pattern of questionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const questionNum = match[1];
        const questionText = match[2].trim();
        const optionA = match[3].trim();
        const optionB = match[4].trim();
        const optionC = match[5].trim();
        const optionD = match[6].trim();
        const answer = match[7].toUpperCase();
        const explanation = match[8] ? match[8].trim() : null;

        // Convert answer letter to index
        const answerIndex = answer === 'A' ? 0 : answer === 'B' ? 1 : answer === 'C' ? 2 : 3;

        const questionObj = {
          id: parseInt(questionNum),
          question: questionText,
          options: [optionA, optionB, optionC, optionD],
          answer: answerIndex,
          level: 0 // Default level
        };

        if (explanation) {
          questionObj.explanation = explanation;
        }

        questions.push(questionObj);
      }
    }

    return questions;
  };

  const handleExtraction = async () => {
    if (files.length === 0) {
      setErrors(["⚠️ Please upload at least one Word or PDF file."]);
      return;
    }

    setLoading(true);
    setErrors([]);
    const allExtractedQuestions = [];

    try {
      for (const file of files) {
        let text = "";
        
        if (file.type.includes("pdf")) {
          // For PDF files, we'll need a PDF parsing library
          // For now, show a message that PDF extraction needs additional setup
          setErrors(prev => [...prev, `❌ PDF extraction for ${file.name} requires additional setup. Please convert to Word format.`]);
          continue;
        } else {
          // For Word files, we'll use a simple text extraction approach
          // Note: This is a basic implementation. For production, you'd want to use a proper library like mammoth.js
          try {
            const arrayBuffer = await file.arrayBuffer();
            const decoder = new TextDecoder('utf-8');
            text = decoder.decode(arrayBuffer);
          } catch (error) {
            setErrors(prev => [...prev, `❌ Could not read ${file.name}. Please ensure it's a valid Word document.`]);
            continue;
          }
        }

        if (text) {
          const questions = extractQuestionsFromText(text);
          if (questions.length > 0) {
            allExtractedQuestions.push({
              filename: file.name.replace(/\.(docx?|pdf)$/i, ''),
              questions: questions,
              originalFile: file.name
            });
          } else {
            setErrors(prev => [...prev, `⚠️ No questions found in ${file.name}. Please check the format.`]);
          }
        }
      }

      if (allExtractedQuestions.length > 0) {
        setExtractedQuestions(allExtractedQuestions);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        setErrors(prev => [...prev, "❌ No questions could be extracted from any file."]);
      }

    } catch (err) {
      console.error(err);
      setErrors(["❌ Unexpected error while processing files."]);
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = (extractedData) => {
    const jsonContent = JSON.stringify(extractedData.questions, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${extractedData.filename}_questions.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllJSON = () => {
    if (extractedQuestions.length === 1) {
      downloadJSON(extractedQuestions[0]);
    } else {
      const allQuestions = extractedQuestions.flatMap(item => item.questions);
      const jsonContent = JSON.stringify(allQuestions, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'extracted_questions.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'm') {
        toggleDarkMode();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleDarkMode]);

  return (
    <div className={`extractor-page ${isDarkMode ? "dark-mode" : ""}`}>
      <header className="extractor-header">
        <div className="page-title">
          <button 
            className="back-btn"
            onClick={() => navigate('/')}
            title="Back to Upload"
          >
            ← 
          </button>
          <span className="title-icon">🔍</span>
          <span className="title-text">Question Extractor</span>
        </div>
        <div className="header-controls">
          <button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            title="Toggle Dark Mode (M)"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <div className="extractor-content">
        <div className="instructions-section">
          <h2>📋 Extract Questions from Word/PDF Files</h2>
          <p>Upload Word (.docx) or PDF files containing questions in the following format:</p>
          <div className="format-example">
            <code>
              1. Question text?<br/>
              A) Option 1<br/>
              B) Option 2<br/>
              C) Option 3<br/>
              D) Option 4<br/>
              Answer: A<br/>
              Explanation: Optional explanation text
            </code>
          </div>
        </div>

        <div className="upload-section">
          <div className="file-input-container">
            <label className="file-input-label">
              <div className="file-input-icon">📄</div>
              <div className="file-input-text">
                <span className="primary-text">Choose Word/PDF Files</span>
                <span className="secondary-text">Supports .docx, .doc, .pdf files</span>
              </div>
              <input
                type="file"
                multiple
                accept=".docx,.doc,.pdf"
                onChange={handleFileChange}
                className="file-input-hidden"
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="file-list">
              <h3>📋 Selected Files ({files.length})</h3>
              <div className="file-items">
                {files.map((file, idx) => (
                  <div key={idx} className="file-item">
                    <div className="file-info">
                      <div className="file-icon">
                        {file.type.includes('pdf') ? '📕' : '📄'}
                      </div>
                      <div className="file-details">
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(file.name)}
                      className="remove-file-btn"
                      title="Remove this file"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="action-section">
            <button
              className={`extract-btn ${loading ? "loading" : ""}`}
              onClick={handleExtraction}
              disabled={loading || files.length === 0}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <span>🔍 Extract Questions</span>
                </>
              )}
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="success-section">
            <div className="success-message">
              <span className="success-icon">✅</span>
              <span className="success-text">
                Questions extracted successfully!
              </span>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="error-section">
            {errors.map((err, idx) => (
              <div key={idx} className="error-message">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{err}</span>
              </div>
            ))}
          </div>
        )}

        {extractedQuestions.length > 0 && (
          <div className="results-section">
            <div className="results-header">
              <h3>📊 Extracted Questions</h3>
              <button 
                className="download-all-btn"
                onClick={downloadAllJSON}
                title="Download all questions as JSON"
              >
                📥 Download All JSON
              </button>
            </div>
            
            {extractedQuestions.map((item, idx) => (
              <div key={idx} className="result-item">
                <div className="result-header">
                  <h4>📄 {item.filename}</h4>
                  <div className="result-actions">
                    <span className="question-count">
                      {item.questions.length} questions
                    </span>
                    <button 
                      className="download-btn"
                      onClick={() => downloadJSON(item)}
                      title="Download as JSON"
                    >
                      📥 JSON
                    </button>
                  </div>
                </div>
                
                <div className="questions-preview">
                  {item.questions.slice(0, 3).map((question, qIdx) => (
                    <div key={qIdx} className="question-preview">
                      <div className="question-text">
                        <strong>Q{question.id}:</strong> {question.question}
                      </div>
                      <div className="options-preview">
                        {question.options.map((option, oIdx) => (
                          <div 
                            key={oIdx} 
                            className={`option ${question.answer === oIdx ? 'correct' : ''}`}
                          >
                            {String.fromCharCode(65 + oIdx)}) {option}
                          </div>
                        ))}
                      </div>
                      {question.explanation && (
                        <div className="explanation-preview">
                          <strong>Explanation:</strong> {question.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                  {item.questions.length > 3 && (
                    <div className="more-questions">
                      ... and {item.questions.length - 3} more questions
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionExtractorPage;
