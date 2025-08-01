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

        // Simulate extraction process - replace with actual extraction logic
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock extracted questions
        const mockQuestions = [
          {
            id: `q${i}_1`,
            question: `Sample question from ${file.name}?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct: 'A',
            explanation: 'This is a sample explanation for the question.'
          }
        ];

        setExtractedQuestions(prev => [...prev, ...mockQuestions]);
      }

      setShowResults(true);
    } catch (error) {
      console.error('Error extracting questions:', error);
    } finally {
      setIsProcessing(false);
      setProcessingFile('');
    }
  };

  const formatAsJSON = () => {
    const jsonOutput = {
      name: "Extracted Questions",
      description: "Questions extracted from uploaded documents",
      questions: extractedQuestions.map((q, index) => ({
        id: index + 1,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || "",
        difficulty: "medium"
      }))
    };

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
          <p>Upload Word (.docx) or PDF files to extract questions with proper KaTeX formatting</p>

          <div className="format-examples">
            <div className="format-example">
              <h3>📝 Supported Question Format:</h3>
              <div className="example-content">
                <code>
                  1. Question text?<br/>
                  A) Option 1<br/>
                  B) Option 2<br/>
                  C) Option 3<br/>
                  D) Option 4<br/>
                  Answer: A<br/>
                  Explanation: Explanation of question (optional)
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