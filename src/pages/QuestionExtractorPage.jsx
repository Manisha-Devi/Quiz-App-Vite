import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/QuestionExtractorPage.css';
import useOfflineStorage from '../hooks/useOfflineStorage';
import QuestionCard from '../components/QuestionCard';

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
          console.log('Extracted text from DOCX:', extractedText.substring(0, 500)); // Debug log
        } else if (file.type === 'application/pdf') {
          // For PDF parsing, you would need pdf-parse or similar library
          // For now, we'll show a message that PDF parsing is not yet implemented
          console.log('PDF parsing not yet implemented');
          alert('PDF parsing is not yet implemented. Please use DOCX files for now.');
          continue;
        }

        if (!extractedText || extractedText.trim().length === 0) {
          console.log('No text extracted from file:', file.name);
          alert(`No text could be extracted from ${file.name}. Please check the file format.`);
          continue;
        }

        // Parse questions from extracted text
        const questions = parseQuestionsFromText(extractedText, i);
        console.log(`Extracted ${questions.length} questions from ${file.name}`);
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

    // Clean and normalize text
    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .trim();

    // Split text into lines and clean up
    const lines = cleanText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    let currentQuestion = null;
    let questionCounter = 1;

    console.log('Total lines to process:', lines.length);
    console.log('First 10 lines:', lines.slice(0, 10));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`Line ${i}: "${line}"`);

      // Check if line starts with a number followed by colon (question)
      if (/^\d+:\s*.+/.test(line) && 
          !line.toLowerCase().includes('answer:') && 
          !line.toLowerCase().includes('level:') && 
          !line.toLowerCase().includes('explanation:')) {
        
        const questionMatch = line.match(/^(\d+):\s*(.+)/);
        if (questionMatch) {
          console.log('✅ Found question:', questionMatch[2]);
          
          // Save previous question if exists and is complete
          if (currentQuestion && currentQuestion.question && currentQuestion.options.length >= 2 && currentQuestion.correct) {
            if (currentQuestion.level === undefined) {
              currentQuestion.level = 0;
            }
            questions.push(currentQuestion);
            console.log('✅ Saved previous question');
          }

          // Start new question
          currentQuestion = {
            id: `q${fileIndex}_${questionCounter++}`,
            question: questionMatch[2].trim(),
            options: [],
            correct: '',
            explanation: '',
            level: undefined
          };
        }
      }
      // Check for options - strict format "A:" only
      else if (currentQuestion && /^[A-D]:\s*.+/.test(line)) {
        const optionMatch = line.match(/^([A-D]):\s*(.+)/);
        if (optionMatch) {
          currentQuestion.options.push(optionMatch[2].trim());
          console.log('✅ Added option:', optionMatch[1], optionMatch[2].trim());
        }
      }
      // Check for answer - strict format "Answer: A" only
      else if (currentQuestion && /^answer:\s*[A-D]/i.test(line)) {
        const answerMatch = line.match(/^answer:\s*([A-D])/i);
        if (answerMatch) {
          currentQuestion.correct = answerMatch[1].toUpperCase();
          console.log('✅ Set answer:', answerMatch[1].toUpperCase());
        }
      }
      // Check for explanation - strict format "Explanation:" only
      else if (currentQuestion && /^explanation:\s*/i.test(line)) {
        const explanationMatch = line.match(/^explanation:\s*(.+)/i);
        if (explanationMatch) {
          currentQuestion.explanation = explanationMatch[1].trim();
          console.log('✅ Set explanation');
        }
      }
      // Check for level - strict format "Level:" only
      else if (currentQuestion && /^level:\s*/i.test(line)) {
        // Try to extract numeric level first
        const numericMatch = line.match(/^level:\s*(\d+)/i);
        if (numericMatch) {
          const level = parseInt(numericMatch[1]);
          currentQuestion.level = Math.min(Math.max(level, 0), 2);
          console.log('✅ Set numeric level:', currentQuestion.level);
        } else {
          // Try to extract text-based level
          const textMatch = line.match(/^level:\s*(easy|medium|meduim|hard|beginner|intermediate|advanced)/i);
          if (textMatch) {
            const levelText = textMatch[1].toLowerCase();
            switch (levelText) {
              case 'easy':
              case 'beginner':
                currentQuestion.level = 0;
                break;
              case 'medium':
              case 'meduim':
              case 'intermediate':
                currentQuestion.level = 1;
                break;
              case 'hard':
              case 'advanced':
                currentQuestion.level = 2;
                break;
              default:
                currentQuestion.level = 0;
            }
            console.log('✅ Set text level:', currentQuestion.level);
          }
        }
      }
    }

    // Add the last question if valid and complete
    if (currentQuestion && currentQuestion.question && currentQuestion.options.length >= 2 && currentQuestion.correct) {
      if (currentQuestion.level === undefined) {
        currentQuestion.level = 0;
      }
      questions.push(currentQuestion);
      console.log('✅ Saved last question');
    }

    console.log('🎯 Total questions extracted:', questions.length);
    console.log('Questions details:', questions);
    return questions;
  };

  const formatAsJSON = () => {
    const jsonOutput = extractedQuestions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      answer: q.correct.charCodeAt(0) - 65, // Convert A,B,C,D to 0,1,2,3
      level: q.level || 0,
      explanation: q.explanation || ""
    }));

    // Use the first file's name with spaces replaced by underscores
    const fileName = files.length > 0 
      ? files[0].name.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_") + ".json"
      : "extracted-questions.json";

    const blob = new Blob([JSON.stringify(jsonOutput, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
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
              {extractedQuestions.slice(0, 3).map((question, index) => {
                const correctAnswerIndex = question.correct ? question.correct.charCodeAt(0) - 65 : -1;

                return (
                  <div key={question.id} className="extracted-question-card">
                    <div className="question-header">
                      <div className="question-number">Q{index + 1}</div>
                      <div className="level-badge">
                        <span className="level-text">
                          {question.level === 0 ? 'Easy' : question.level === 1 ? 'Medium' : 'Hard'}
                        </span>
                      </div>
                    </div>

                    <div className="question-text">
                      {question.question}
                    </div>

                    <div className="options-grid">
                      {question.options?.map((option, optionIndex) => (
                        <div 
                          key={optionIndex} 
                          className={`option ${optionIndex === correctAnswerIndex ? 'correct-option' : ''}`}
                        >
                          <div className="option-label">{String.fromCharCode(65 + optionIndex)}</div>
                          <div className="option-text">{option}</div>
                          {optionIndex === correctAnswerIndex && (
                            <div className="correct-mark">✅</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {question.explanation && (
                      <div className="explanation">
                        <div className="explanation-header">💡 Explanation</div>
                        <div className="explanation-text">{question.explanation}</div>
                      </div>
                    )}
                  </div>
                );
              })}

              {extractedQuestions.length > 3 && (
                <div className="more-questions">
                  <div className="more-questions-text">
                    +{extractedQuestions.length - 3} more questions available
                  </div>
                  <div className="more-questions-hint">
                    Export as JSON to see all questions
                  </div>
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