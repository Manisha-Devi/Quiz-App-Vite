
import React, { useState, useEffect } from 'react';
import { getAllJSONFiles } from '../utils/indexedDB';
import '../components/styles/LocalJSONLibrary.css';

function LocalJSONLibrary({ onFileSelect }) {
  const [localFiles, setLocalFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [quizTime, setQuizTime] = useState(60);

  useEffect(() => {
    loadLocalFiles();
  }, []);

  const loadLocalFiles = async () => {
    try {
      setLoading(true);
      const files = await getAllJSONFiles();
      setLocalFiles(files);
    } catch (error) {
      console.error('Error loading local JSON files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileToggle = (file) => {
    setSelectedFiles(prev => {
      const isSelected = prev.some(f => f.filename === file.filename);
      if (isSelected) {
        return prev.filter(f => f.filename !== file.filename);
      } else {
        return [...prev, file];
      }
    });
  };

  const handleContinue = () => {
    if (selectedFiles.length === 0) {
      alert('⚠️ Please select at least one file');
      return;
    }

    const formattedData = selectedFiles.map(file => ({
      name: file.filename,
      questions: file.data
    }));

    // Store quiz time in localStorage
    localStorage.setItem('quizTime', String(quizTime));
    localStorage.setItem('fileImageMap', JSON.stringify({}));

    onFileSelect(formattedData);
  };

  const filteredFiles = localFiles.filter(file =>
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="local-json-library">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading local files...</p>
        </div>
      </div>
    );
  }

  if (localFiles.length === 0) {
    return (
      <div className="local-json-library">
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No Local Files Found</h3>
          <p>Files from the json folder will appear here when available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="local-json-library">
      {/* Search Bar */}
      <div className="search-section">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Quiz Time Setting */}
      <div className="quiz-time-section">
        <div className="time-setting">
          <label className="time-label">
            <span className="time-icon">⏱️</span>
            <span className="time-text">Quiz Duration (minutes)</span>
          </label>
          <input
            type="number"
            min="1"
            max="300"
            value={quizTime}
            onChange={(e) => setQuizTime(Number(e.target.value))}
            className="time-input"
          />
        </div>
      </div>

      {/* Selection Summary */}
      <div className="selection-summary">
        <span className="selection-count">
          {selectedFiles.length} of {filteredFiles.length} files selected
        </span>
        {selectedFiles.length > 0 && (
          <button 
            className="clear-selection-btn"
            onClick={() => setSelectedFiles([])}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Files Grid */}
      <div className="files-grid">
        {filteredFiles.map((file, index) => {
          const isSelected = selectedFiles.some(f => f.filename === file.filename);
          
          return (
            <div 
              key={index} 
              className={`local-file-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleFileToggle(file)}
            >
              <div className="file-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleFileToggle(file)}
                  className="checkbox-input"
                />
              </div>
              
              <div className="file-content">
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <h3 className="file-name">{file.filename}</h3>
                </div>
              </div>
              
              {isSelected && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="action-section">
        <button 
          className={`continue-btn ${selectedFiles.length === 0 ? 'disabled' : ''}`}
          onClick={handleContinue}
          disabled={selectedFiles.length === 0}
        >
          <span>Continue with {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}</span>
          <span className="btn-icon">➡️</span>
        </button>
      </div>
    </div>
  );
}

export default LocalJSONLibrary;
