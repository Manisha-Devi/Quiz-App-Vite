import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/QuestionExtractorPage.css';
import useOfflineStorage from '../hooks/useOfflineStorage';

const QuestionExtractorPage = () => {
  const navigate = useNavigate();
  const { dataManager } = useOfflineStorage();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [files, setFiles] = useState([]);
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await dataManager.getUserSettings();
        setIsDarkMode(settings.darkMode || false);
        setIsFullscreen(settings.isFullscreen || false);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, [dataManager]);

  // Apply theme and fullscreen
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
  }, [isDarkMode, dataManager]);

  const toggleFullscreen = () => {
    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } else {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'M' || e.key === 'm') {
        toggleDarkMode();
      }
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleDarkMode]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => 
      file.type === 'application/pdf' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const extractQuestions = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setExtractedQuestions([]);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessingFile(file.name);

        let extractedText = '';

        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // Parse DOCX file
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
        } else if (file.type === 'application/pdf') {
          // For PDF parsing, you would need pdf-parse or similar library
          // For now, we'll show a message that PDF parsing is not yet implemented
          console.log('PDF parsing not yet implemented');
          continue;
        }

        // Parse questions from extracted text
        const questions = parseQuestionsFromText(extractedText, i);
        setExtractedQuestions(prev => [...prev, ...questions]);
      }

      setShowResults(true);
    } catch (error) {
      console.error('Error extracting questions:', error);
    } finally {
      setIsProcessing(false);
      setProcessingFile('');
    }
  };

  const parseQuestionsFromText = (text, fileIndex) => {
    const questions = [];
    
    // Split text into lines and clean up
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentQuestion = null;
    let questionCounter = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line starts with a number (question)
      const questionMatch = line.match(/^(\d+)\.\s*(.+)/);
      if (questionMatch) {
        // Save previous question if exists
        if (currentQuestion && currentQuestion.question && currentQuestion.options.length === 4) {
          questions.push(currentQuestion);
        }
        
        // Start new question
        currentQuestion = {
          id: `q${fileIndex}_${questionCounter++}`,
          question: questionMatch[2].trim(),
          options: [],
          correct: '',
          explanation: '',
          level: 0 // Default to Easy
        };
      }
      // Check for options (A), B), C), D))
      else if (currentQuestion && line.match(/^[A-D]\)\s*(.+)/)) {
        const optionMatch = line.match(/^[A-D]\)\s*(.+)/);
        if (optionMatch) {
          currentQuestion.options.push(optionMatch[1].trim());
        }
      }
      // Check for answer
      else if (currentQuestion && line.toLowerCase().startsWith('answer:')) {
        const answerMatch = line.match(/answer:\s*([A-D])/i);
        if (answerMatch) {
          currentQuestion.correct = answerMatch[1].toUpperCase();
        }
      }
      // Check for explanation
      else if (currentQuestion && line.toLowerCase().startsWith('explanation:')) {
        const explanationMatch = line.match(/explanation:\s*(.+)/i);
        if (explanationMatch) {
          currentQuestion.explanation = explanationMatch[1].trim();
        }
      }
      // Check for level/difficulty
      else if (currentQuestion && line.toLowerCase().includes('level:')) {
        const levelMatch = line.match(/level:\s*(\d+)/i);
        if (levelMatch) {
          const level = parseInt(levelMatch[1]);
          currentQuestion.level = Math.min(Math.max(level, 0), 2); // Ensure level is 0, 1, or 2
        }
      }
    }
    
    // Add the last question if valid
    if (currentQuestion && currentQuestion.question && currentQuestion.options.length === 4) {
      questions.push(currentQuestion);
    }
    
    return questions;
  };

  const formatAsJSON = () => {
    const jsonOutput = extractedQuestions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      answer: q.options.findIndex(opt => opt === q.options[q.correct.charCodeAt(0) - 65]) !== -1 
        ? q.options.findIndex(opt => opt === q.options[q.correct.charCodeAt(0) - 65])
        : q.correct.charCodeAt(0) - 65, // Convert A,B,C,D to 0,1,2,3
      level: q.level || 0,
      explanation: q.explanation || ""
    }));

    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-questions.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`extractor-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header className="extractor-header">
        <div className="page-title">
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
          <button
            className="back-btn"
            onClick={() => navigate('/upload')}
            title="Back to Upload"
          >
            ⬅️
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="extractor-content">
        {/* Instructions Section */}
        <section className="instructions-section">
          <h2>📄 Document Question Extractor</h2>
          <p>Upload Word (.docx) files to extract questions automatically. PDF support coming soon!</p>

          <div className="format-examples">
            <div className="format-example">
              <h3>📝 Supported Question Format:</h3>
              <div className="example-content">
                <code>
                  1. What is the Capital of India?<br/>
                  A) New Delhi<br/>
                  B) Bombay<br/>
                  C) Kolkata<br/>
                  D) Delhi<br/>
                  Answer: A<br/>
                  Explanation: New Delhi is the capital of India (optional)<br/>
                  Level: 0 (0=Easy, 1=Medium, 2=Hard, optional - defaults to 0)
                </code>
              </div>
            </div>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <span>Automatic question detection and parsing</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📐</span>
              <span>KaTeX mathematical formatting support</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>JSON export for quiz integration</span>
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section className="upload-section">
          <h3>📤 Upload Documents</h3>

          <div className="file-input-container">
            <label 
              className="file-input-label"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                <span className="primary-text">Click to upload or drag & drop</span>
                <span className="secondary-text">Supports .docx and .pdf files</span>
              </div>
              <input
                type="file"
                multiple
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                className="file-input"
              />
            </label>

            {files.length > 0 && (
              <div className="file-count-badge">
                <span className="count-number">{files.length}</span>
                <span className="count-text">Files</span>
              </div>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="file-list">
              <h4>Selected Files ({files.length})</h4>
              <div className="file-items">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      <span className="file-icon">
                        {file.type.includes('pdf') ? '📄' : '📝'}
                      </span>
                      <div className="file-details">
                        <div className="file-name">{file.name}</div>
                        <div className="file-size">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      className="remove-file-btn"
                      onClick={() => removeFile(index)}
                      title="Remove file"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Action Section */}
        <section className="action-section">
          <button
            className="extract-btn"
            onClick={extractQuestions}
            disabled={files.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="loading-spinner"></div>
                <span>Processing {processingFile}...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">🔍</span>
                <span>Extract Questions</span>
              </>
            )}
          </button>
        </section>

        {/* Results Section */}
        {showResults && extractedQuestions.length > 0 && (
          <section className="results-section">
            <div className="results-header">
              <h3>📋 Extracted Questions ({extractedQuestions.length})</h3>
              <button className="export-btn" onClick={formatAsJSON}>
                <span className="btn-icon">💾</span>
                Export as JSON
              </button>
            </div>

            <div className="questions-preview">
              {extractedQuestions.slice(0, 3).map((question, index) => (
                <div key={question.id} className="question-preview">
                  <div className="question-number">Q{index + 1}</div>
                  <div className="question-content">
                    <div className="question-text">{question.question}</div>
                    <div className="options-preview">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="option-preview">
                          {String.fromCharCode(65 + optIndex)}) {option}
                        </div>
                      ))}
                    </div>
                    <div className="answer-preview">Answer: {question.correct}</div>
                    {question.explanation && (
                      <div className="explanation-preview">
                        <strong>Explanation:</strong> {question.explanation}
                      </div>
                    )}
                    <div className="level-preview">
                      Level: {question.level === 0 ? 'Easy' : question.level === 1 ? 'Medium' : 'Hard'}
                    </div>
                  </div>
                </div>
              ))}

              {extractedQuestions.length > 3 && (
                <div className="more-questions">
                  +{extractedQuestions.length - 3} more questions...
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Fullscreen Button */}
      <div className="fullscreen-btn-container">
        <button 
          className="fullscreen-btn" 
          onClick={toggleFullscreen}
          title="Toggle Fullscreen (F11)"
        >
          <span className="fullscreen-icon">
            {isFullscreen ? '🗗' : '🗖'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default QuestionExtractorPage;