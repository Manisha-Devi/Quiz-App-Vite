
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionExtractor from '../components/QuestionExtractor';
import useOfflineStorage from '../hooks/useOfflineStorage';
import dataManager from '../utils/dataManager';
import '../styles/ExtractPage.css';

function ExtractPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', message: '', type: 'info' });
  const navigate = useNavigate();
  const { isOnline } = useOfflineStorage();

  useEffect(() => {
    const loadSettings = async () => {
      const darkModeValue = await dataManager.getUserSetting('darkMode', false);
      setIsDarkMode(darkModeValue);
    };
    loadSettings();
  }, []);

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    await dataManager.setUserSetting('darkMode', newDarkMode);
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleExtractedQuestions = (extractedQuestions) => {
    handleDialogAlert('Questions Extracted', `${extractedQuestions.length} questions extracted successfully! They have been saved as JSON.`, 'success');
  };

  const handleDialogAlert = (title, message, type = 'info') => {
    setDialogContent({ title, message, type });
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
  };

  const goBack = () => {
    navigate('/');
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.toLowerCase() === 'm') {
        toggleDarkMode();
      }
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      }
      if (e.key === 'Escape') {
        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className={`extract-page ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header className="extract-header">
        <div className="page-title">
          <button className="back-btn" onClick={goBack} title="Go Back">
            ←
          </button>
          <span className="title-icon">🔍</span>
          <span className="title-text">Question Extractor</span>
        </div>
        <div className="header-controls">
          <div className="connection-indicator">
            <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
            <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button
            className="theme-toggle-btn"
            onClick={toggleDarkMode}
            title="Toggle Dark Mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="extract-content">
        <div className="extract-description">
          <h2>📄 Extract Questions from Documents</h2>
          <p>Upload Word/PDF files or paste text to extract questions with proper KaTeX formatting</p>
          <div className="format-info">
            <h3>Expected Format:</h3>
            <div className="format-example">
              <pre>{`1. Question text?
A) Option 1
B) Option 2
C) Option 3
D) Option 4
Answer: A
Explanation: Explanation of question (optional)`}</pre>
            </div>
          </div>
        </div>

        <div className="extractor-container">
          <QuestionExtractor
            onExtractedQuestions={handleExtractedQuestions}
            onAlert={handleDialogAlert}
            isStandalone={true}
          />
        </div>
      </div>

      {/* Custom Dialog Box */}
      {dialogVisible && (
        <div className="custom-dialog-overlay" onClick={closeDialog}>
          <div className="custom-dialog-box" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">
                <span className="dialog-icon">
                  {dialogContent.type === 'success' ? '✅' : 
                   dialogContent.type === 'error' ? '❌' : 
                   dialogContent.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                {dialogContent.title}
              </h3>
              <button className="dialog-close-btn" onClick={closeDialog}>✕</button>
            </div>
            <div className="dialog-content">
              <p className="dialog-message">{dialogContent.message}</p>
            </div>
            <div className="dialog-actions">
              <button className="dialog-ok-btn" onClick={closeDialog}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Button */}
      <div className="fullscreen-btn-container">
        <button className="fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
          <span className="fullscreen-icon">{isFullscreen ? "⤲" : "⛶"}</span>
        </button>
      </div>
    </div>
  );
}

export default ExtractPage;
