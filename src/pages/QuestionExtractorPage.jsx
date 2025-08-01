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
    
    // Clean up text and split into sections by question numbers
    let cleanedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Find all question starts with regex
    const questionPattern = /(\d+)\.\s*(.+?)(?=\d+\.\s|$)/gs;
    const questionMatches = [...cleanedText.matchAll(questionPattern)];
    
    let questionCounter = 1;
    
    for (const match of questionMatches) {
      const questionNumber = parseInt(match[1]);
      const questionContent = match[2].trim();
      
      // Parse each question content
      const lines = questionContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let currentQuestion = {
        id: `q${fileIndex}_${questionCounter++}`,
        question: '',
        options: [],
        correct: '',
        explanation: '',
        level: 0
      };
      
      let questionText = '';
      let isParsingOptions = false;
      let isParsingAnswer = false;
      let isParsingExplanation = false;
      let isParsingLevel = false;
      
      // Check if this is a match-the-following question
      const isMatchQuestion = questionContent.toLowerCase().includes('match') && questionContent.toLowerCase().includes('following');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for options (A., B., C., D. or A), B), C), D))
        const optionMatch = line.match(/^([A-D])[\.\)]\s*(.+)/i);
        if (optionMatch && !isParsingAnswer && !isParsingExplanation) {
          isParsingOptions = true;
          const optionText = optionMatch[2].trim();
          currentQuestion.options.push(optionText);
          continue;
        }
        
        // Check for answer
        if (line.toLowerCase().includes('answer:')) {
          isParsingAnswer = true;
          isParsingOptions = false;
          isParsingExplanation = false;
          const answerMatch = line.match(/answer:\s*([A-D])/i);
          if (answerMatch) {
            currentQuestion.correct = answerMatch[1].toUpperCase();
          }
          continue;
        }
        
        // Check for level/difficulty
        if (line.toLowerCase().includes('level:')) {
          isParsingLevel = true;
          const levelMatch = line.match(/level:\s*(easy|medium|hard|\d+)/i);
          if (levelMatch) {
            const levelValue = levelMatch[1].toLowerCase();
            if (levelValue === 'easy' || levelValue === '0') {
              currentQuestion.level = 0;
            } else if (levelValue === 'medium' || levelValue === '1') {
              currentQuestion.level = 1;
            } else if (levelValue === 'hard' || levelValue === '2') {
              currentQuestion.level = 2;
            } else {
              const numLevel = parseInt(levelValue);
              currentQuestion.level = Math.min(Math.max(numLevel, 0), 2);
            }
          }
          continue;
        }
        
        // Check for explanation
        if (line.toLowerCase().includes('explanation:')) {
          isParsingExplanation = true;
          isParsingOptions = false;
          isParsingAnswer = false;
          const explanationMatch = line.match(/explanation:\s*(.+)/i);
          if (explanationMatch) {
            currentQuestion.explanation = explanationMatch[1].trim();
          }
          continue;
        }
        
        // Continue parsing explanation if we're in explanation mode
        if (isParsingExplanation && !line.toLowerCase().includes('level:') && !line.toLowerCase().includes('answer:')) {
          if (currentQuestion.explanation) {
            currentQuestion.explanation += ' ' + line;
          } else {
            currentQuestion.explanation = line;
          }
          continue;
        }
        
        // If not parsing options, answer, or explanation, add to question text
        if (!isParsingOptions && !isParsingAnswer && !isParsingExplanation && !isParsingLevel) {
          if (questionText) {
            questionText += ' ' + line;
          } else {
            questionText = line;
          }
        }
      }
      
      // Handle HTML formatting and preserve structure for complex questions
      if (isMatchQuestion) {
        // Parse match-the-following questions with proper formatting
        const allLines = questionContent.split('\n');
        let formattedQuestion = '';
        let foundFirstOption = false;
        let isTableSection = false;
        
        for (let line of allLines) {
          line = line.trim();
          
          // Skip empty lines
          if (!line) continue;
          
          // Check if we've reached the options section
          if (line.match(/^[A-D][\.\)]/i)) {
            foundFirstOption = true;
            break;
          }
          
          // Skip answer, explanation, and level lines
          if (line.toLowerCase().includes('answer:') || 
              line.toLowerCase().includes('explanation:') || 
              line.toLowerCase().includes('level:')) {
            break;
          }
          
          // Detect table structure
          if (line.includes('\t') || (line.length > 5 && line.includes(' ') && 
              (line.includes('A') || line.includes('B') || line.includes('1.') || line.includes('2.') || line.includes('3.')))) {
            
            if (!isTableSection) {
              // Start table formatting
              if (formattedQuestion && !formattedQuestion.endsWith('<br>')) {
                formattedQuestion += '<br><br>';
              }
              isTableSection = true;
            }
            
            // Format table rows with proper spacing
            let formattedLine = line;
            
            // Handle column headers (A and B)
            if (line.includes('A') && line.includes('B') && line.length < 20) {
              formattedLine = line.replace(/\s+/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
            }
            // Handle numbered items with options
            else if (line.includes('.') && (line.includes('i.') || line.includes('ii.') || line.includes('iii.'))) {
              // Replace multiple spaces/tabs with proper spacing
              formattedLine = line.replace(/\s+/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
            }
            // Handle items with large spacing
            else {
              formattedLine = line.replace(/\t+/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
                               .replace(/\s{3,}/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');
            }
            
            if (formattedQuestion && !formattedQuestion.endsWith('<br>')) {
              formattedQuestion += '<br>';
            }
            formattedQuestion += formattedLine;
          } else {
            // Regular question text
            if (formattedQuestion && !isTableSection) {
              formattedQuestion += ' ' + line;
            } else if (formattedQuestion && isTableSection) {
              formattedQuestion += '<br>' + line;
              isTableSection = false;
            } else {
              formattedQuestion = line;
            }
          }
        }
        
        currentQuestion.question = formattedQuestion.trim();
      } else {
        // Regular question formatting
        currentQuestion.question = questionText.trim();
      }
      
      // Only add question if it has valid structure
      if (currentQuestion.question && currentQuestion.options.length >= 4 && currentQuestion.correct) {
        // Ensure we have exactly 4 options
        currentQuestion.options = currentQuestion.options.slice(0, 4);
        questions.push(currentQuestion);
      }
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

                    <div 
                      className="question-text"
                      dangerouslySetInnerHTML={{ __html: question.question }}
                    ></div>

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