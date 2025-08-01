
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ExtractPage.css';

function ExtractPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    );
    
    if (validFiles.length !== files.length) {
      alert('Only PDF and Word documents are supported');
    }
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const extractQuestions = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one file');
      return;
    }

    setIsProcessing(true);
    setExtractionStatus('Processing files...');
    
    try {
      // Simulate question extraction process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock extracted questions with proper formatting
      const mockQuestions = [
        {
          id: 1,
          question: "What is the integral of $\\int x^2 dx$?",
          options: [
            "$\\frac{x^3}{3} + C$",
            "$\\frac{x^3}{2} + C$", 
            "$x^3 + C$",
            "$2x + C$"
          ],
          answer: 0,
          explanation: "Using the power rule: $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$, so $\\int x^2 dx = \\frac{x^3}{3} + C$"
        },
        {
          id: 2,
          question: "Which of the following is a prime number?",
          options: ["15", "21", "23", "27"],
          answer: 2,
          explanation: "23 is only divisible by 1 and itself, making it a prime number."
        },
        {
          id: 3,
          question: "What is the derivative of $f(x) = e^{2x}$?",
          options: [
            "$e^{2x}$",
            "$2e^{2x}$",
            "$\\frac{e^{2x}}{2}$",
            "$2xe^{2x-1}$"
          ],
          answer: 1,
          explanation: "Using chain rule: $\\frac{d}{dx}[e^{2x}] = e^{2x} \\cdot 2 = 2e^{2x}$"
        }
      ];

      setExtractedQuestions(mockQuestions);
      setExtractionStatus('Extraction completed successfully!');
    } catch (error) {
      setExtractionStatus('Error during extraction. Please try again.');
      console.error('Extraction error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setExtractedQuestions([]);
    setExtractionStatus('');
  };

  const saveAsJSON = () => {
    if (extractedQuestions.length === 0) {
      alert('No questions to save');
      return;
    }

    const jsonData = extractedQuestions.map((q, index) => ({
      question: q.question,
      options: q.options,
      answer: q.answer,
      level: 1, // Default level
      explanation: q.explanation || undefined
    }));

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_questions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`extract-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header className="extract-header">
        <div className="page-title">
          <button className="back-btn" onClick={() => navigate('/')}>
            ←
          </button>
          <span className="title-icon">🔍</span>
          <span className="title-text">Question Extractor</span>
        </div>
        <div className="header-controls">
          <button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            title="Toggle Dark Mode"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <div className="extract-content">
        {/* Upload Section */}
        <div className="upload-section">
          <div className="section-header">
            <h2>📄 Upload Documents</h2>
            <p>Upload Word or PDF files to extract questions automatically</p>
          </div>

          <div className="file-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <button 
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="upload-icon">📁</span>
              Choose Files
            </button>
            <p className="upload-hint">Supported formats: PDF, DOC, DOCX</p>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="file-list">
              <h3>Uploaded Files ({uploadedFiles.length})</h3>
              {uploadedFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-info">
                    <span className="file-icon">
                      {file.type.includes('pdf') ? '📕' : '📄'}
                    </span>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                  <button 
                    className="remove-btn"
                    onClick={() => removeFile(index)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="actions">
            <button 
              className="extract-btn"
              onClick={extractQuestions}
              disabled={isProcessing || uploadedFiles.length === 0}
            >
              {isProcessing ? (
                <>
                  <span className="loading-spinner"></span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="extract-icon">⚡</span>
                  Extract Questions
                </>
              )}
            </button>
            
            {uploadedFiles.length > 0 && (
              <button className="clear-btn" onClick={clearAll}>
                Clear All
              </button>
            )}
          </div>

          {/* Status */}
          {extractionStatus && (
            <div className={`status-message ${isProcessing ? 'processing' : 'completed'}`}>
              {extractionStatus}
            </div>
          )}
        </div>

        {/* Results Section */}
        {extractedQuestions.length > 0 && (
          <div className="results-section">
            <div className="section-header">
              <h2>📋 Extracted Questions ({extractedQuestions.length})</h2>
              <button className="save-btn" onClick={saveAsJSON}>
                💾 Save as JSON
              </button>
            </div>

            <div className="questions-grid">
              {extractedQuestions.map((q, index) => (
                <div key={q.id} className="question-card">
                  <div className="question-number">Q{index + 1}</div>
                  <div className="question-text" dangerouslySetInnerHTML={{ __html: q.question }} />
                  
                  <div className="options-list">
                    {q.options.map((option, optIndex) => (
                      <div 
                        key={optIndex} 
                        className={`option ${optIndex === q.answer ? 'correct' : ''}`}
                      >
                        <span className="option-label">
                          {String.fromCharCode(65 + optIndex)})
                        </span>
                        <span 
                          className="option-text"
                          dangerouslySetInnerHTML={{ __html: option }}
                        />
                        {optIndex === q.answer && <span className="correct-mark">✓</span>}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="explanation">
                      <strong>Explanation:</strong>
                      <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExtractPage;
