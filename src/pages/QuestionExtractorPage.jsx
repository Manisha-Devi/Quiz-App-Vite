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

    // Clean up text but preserve original line structure
    let cleanedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split into lines for line-by-line processing
    const lines = cleanedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    let currentQuestion = null;
    let questionCounter = 1;
    let isParsingOptions = false;
    let isParsingAnswer = false;
    let isParsingExplanation = false;
    let isParsingLevel = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check if line starts with a number followed by a dot (question start)
      const questionMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/);
      if (questionMatch && !isParsingAnswer && !isParsingExplanation) {
        // Save previous question if exists and is valid
        if (currentQuestion && currentQuestion.question && currentQuestion.options.length === 4) {
          if (currentQuestion.level === undefined) {
            currentQuestion.level = 0;
          }
          questions.push(currentQuestion);
        }

        // Reset parsing flags
        isParsingOptions = false;
        isParsingAnswer = false;
        isParsingExplanation = false;
        isParsingLevel = false;

        // Start new question
        let questionText = questionMatch[2].trim();

        // Process mathematical expressions in question text
        questionText = questionText
          .replace(/\b(\\sum|\\infty|\\pi|\\euro|\\cdots|\\cos|\\sin)\b/g, '$$$1$$')
          .replace(/\(([^)]*\\[a-zA-Z]+[^)]*)\)/g, '($$$1$$)')
          .replace(/([a-zA-Z])_\{([^}]+)\}/g, '$$$$1_{$2}$$$$')
          .replace(/([a-zA-Z])\^([0-9n])/g, '$$$$1^{$2}$$$$')
          .replace(/([a-zA-Z])\^([a-zA-Z])/g, '$$$$1^{$2}$$$$')
          .replace(/\b(\d+)!/g, '$$$$1!$$$$')
          .replace(/\b([a-zA-Z])!/g, '$$$$1!$$$$')
          .replace(/\b([a-zA-Z])\(([a-zA-Z])\)/g, '$$$$1($2)$$$$')
          .replace(/\\choose/g, '\\binom');

        currentQuestion = {
          id: `q${fileIndex}_${questionCounter++}`,
          question: questionText,
          options: [],
          correct: '',
          explanation: '',
          level: undefined
        };
        continue;
      }

      // Check for options (A. B. C. D. format)
      const optionMatch = trimmedLine.match(/^([A-D])[\.\)]\s*(.*)$/i);
      if (optionMatch && !isParsingAnswer && !isParsingExplanation && !isParsingLevel) {
        isParsingOptions = true;
        let optionText = optionMatch[2].trim();

        // Process mathematical expressions in options
        optionText = optionText
          .replace(/\b(\\sum|\\infty|\\pi|\\euro|\\cdots|\\cos|\\sin)\b/g, '$$$1$$')
          .replace(/\(([^)]*\\[a-zA-Z]+[^)]*)\)/g, '($$$1$$)')
          .replace(/([a-zA-Z])_\{([^}]+)\}/g, '$$$$1_{$2}$$$$')
          .replace(/([a-zA-Z])\^([0-9n])/g, '$$$$1^{$2}$$$$')
          .replace(/([a-zA-Z])\^([a-zA-Z])/g, '$$$$1^{$2}$$$$')
          .replace(/\b(\d+)!/g, '$$$$1!$$$$')
          .replace(/\b([a-zA-Z])!/g, '$$$$1!$$$$')
          .replace(/\b([a-zA-Z])\(([a-zA-Z])\)/g, '$$$$1($2)$$$$')
          .replace(/\\choose/g, '\\binom');

        currentQuestion.options.push(optionText);
        continue;
      }

      // Check for answer (Answer: A format)
      if (currentQuestion && trimmedLine.toLowerCase().startsWith('answer:')) {
        isParsingAnswer = true;
        isParsingOptions = false;
        const answerMatch = trimmedLine.match(/answer:\s*([A-D])/i);
        if (answerMatch) {
          currentQuestion.correct = answerMatch[1].toUpperCase();
        }
        continue;
      }

      // Check for level (Level: Medium format or just Level: at end of answer line)
      if (currentQuestion && (trimmedLine.toLowerCase().includes('level:') || (isParsingAnswer && /\b(easy|medium|hard)\b/i.test(trimmedLine)))) {
        isParsingLevel = true;
        let levelText = '';

        // Extract level from current line
        if (trimmedLine.toLowerCase().includes('level:')) {
          const levelMatch = trimmedLine.match(/level:\s*(easy|medium|hard|\d+)/i);
          if (levelMatch) {
            levelText = levelMatch[1].toLowerCase();
          }
        } else if (isParsingAnswer) {
          // Level might be on the same line as answer
          const levelMatch = trimmedLine.match(/\b(easy|medium|hard)\b/i);
          if (levelMatch) {
            levelText = levelMatch[1].toLowerCase();
          }
        }

        // Convert level text to number
        if (levelText === 'easy' || levelText === '0') {
          currentQuestion.level = 0;
        } else if (levelText === 'medium' || levelText === '1') {
          currentQuestion.level = 1;
        } else if (levelText === 'hard' || levelText === '2') {
          currentQuestion.level = 2;
        } else if (!isNaN(parseInt(levelText))) {
          const level = parseInt(levelText);
          currentQuestion.level = Math.min(Math.max(level, 0), 2);
        }

        // If this line also contains answer, parse it
        if (!currentQuestion.correct && trimmedLine.toLowerCase().includes('answer:')) {
          const answerMatch = trimmedLine.match(/answer:\s*([A-D])/i);
          if (answerMatch) {
            currentQuestion.correct = answerMatch[1].toUpperCase();
          }
        }
        continue;
      }

      // Check for explanation
      if (currentQuestion && trimmedLine.toLowerCase().startsWith('explanation:')) {
        isParsingExplanation = true;
        isParsingAnswer = false;
        isParsingLevel = false;
        const explanationMatch = trimmedLine.match(/explanation:\s*(.+)/i);
        if (explanationMatch) {
          currentQuestion.explanation = explanationMatch[1].trim();
        }
        continue;
      }

      // Continue explanation on next lines
      if (currentQuestion && isParsingExplanation && !trimmedLine.match(/^(\d+)\./)) {
        if (currentQuestion.explanation) {
          currentQuestion.explanation += ' ' + trimmedLine;
        } else {
          currentQuestion.explanation = trimmedLine;
        }
        continue;
      }
    }

    // Add the last question if valid
    if (currentQuestion && currentQuestion.question && currentQuestion.options.length === 4) {
      if (currentQuestion.level === undefined) {
        currentQuestion.level = 0;
      }
      questions.push(currentQuestion);
    }

    return questions;
  };

  const processQuestionText = (text) => {
    const lines = text.split('\n');
    const processedLines = lines.map(line => {
      let processedLine = line;

      // Replace tabs with 4 spaces first
      processedLine = processedLine.replace(/\t/g, '    ');

      // Handle mathematical expressions - wrap standalone math symbols in $ $
      processedLine = processedLine
        .replace(/\b(\\sum|\\infty|\\pi|\\euro|\\cdots|\\cos|\\sin)\b/g, '$$$1$$')
        .replace(/\(([^)]*\\[a-zA-Z]+[^)]*)\)/g, '($$$1$$)')
        .replace(/([a-zA-Z])_\{([^}]+)\}/g, '$$$$1_{$2}$$$$')
        .replace(/([a-zA-Z])\^([0-9n])/g, '$$$$1^{$2}$$$$')
        .replace(/([a-zA-Z])\^([a-zA-Z])/g, '$$$$1^{$2}$$$$')
        .replace(/\b(\d+)!/g, '$$$$1!$$$$')
        .replace(/\b([a-zA-Z])!/g, '$$$$1!$$$$')
        .replace(/\b([a-zA-Z])\(([a-zA-Z])\)/g, '$$$$1($2)$$$$')
        .replace(/\\choose/g, '\\binom');

      // Replace multiple spaces (2 or more) with HTML non-breaking spaces
      processedLine = processedLine.replace(/\s{2,}/g, (match) => {
        return '&nbsp;'.repeat(match.length);
      });

      return processedLine;
    });

    return processedLines.join('<br/>');
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
                // Create a modified question object for display
                const displayQuestion = {
                  ...question,
                  options: question.options,
                  answer: question.correct.charCodeAt(0) - 65
                };

                return (
                  <div key={question.id} className="extracted-question-card">
                    <div className="question-header">
                      <div className="question-number">Q{index + 1}</div>
                      <div className="level-badge">
                        <span className="level-icon">✅</span>
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
                          className={`option ${optionIndex === (question.correct.charCodeAt(0) - 65) ? 'correct-option' : ''}`}
                        >
                          <div className="option-label">{String.fromCharCode(65 + optionIndex)}</div>
                          <div className="option-text">{option}</div>
                          {optionIndex === (question.correct.charCodeAt(0) - 65) && (
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