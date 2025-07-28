import React, { useState, useEffect } from 'react';
import { getAllJSONFiles } from '../utils/indexedDB';
import '../components/styles/LocalJSONLibrary.css';

function LocalJSONLibrary({ onFileSelect }) {
  const [localFiles, setLocalFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [quizTime, setQuizTime] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

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

    localStorage.setItem('quizTime', String(quizTime));
    localStorage.setItem('fileImageMap', JSON.stringify({}));

    onFileSelect(formattedData, quizTime);
  };

  const getFilteredAndSortedFiles = () => {
    let filtered = localFiles.filter(file => {
      const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterBy === 'all') return matchesSearch;

      const questionCount = Array.isArray(file.data) ? file.data.length : 0;
      if (filterBy === 'small') return matchesSearch && questionCount <= 20;
      if (filterBy === 'medium') return matchesSearch && questionCount > 20 && questionCount <= 50;
      if (filterBy === 'large') return matchesSearch && questionCount > 50;

      return matchesSearch;
    });

    // Sort files
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename);
        case 'size':
          const aSize = Array.isArray(a.data) ? a.data.length : 0;
          const bSize = Array.isArray(b.data) ? b.data.length : 0;
          return bSize - aSize;
        case 'recent':
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredFiles = getFilteredAndSortedFiles();

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


      {/* Enhanced Search and Filters */}
      <div className="controls-section">
        <div className="search-row">
          <div className="search-input-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="name">Name (A-Z)</option>
              <option value="size">Questions Count</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Filter by size:</label>
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Files</option>
              <option value="small">Small (≤20 questions)</option>
              <option value="medium">Medium (21-50 questions)</option>
              <option value="large">Large (&gt;50 questions)</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">View:</label>
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ⊞
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Selection Summary */}
      <div className="selection-summary">
        <div className="selection-info">
          <span className="selection-count">
            {selectedFiles.length} files selected
          </span>
        </div>
        {selectedFiles.length > 0 && (
          <button 
            className="clear-selection-btn"
            onClick={() => setSelectedFiles([])}
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Files Display */}
      <div className={`files-container ${viewMode}`}>
        {filteredFiles.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No files match your search</h3>
            <p>Try adjusting your search terms or filters</p>
          </div>
        ) : (
          filteredFiles.map((file, index) => {
            const isSelected = selectedFiles.some(f => f.filename === file.filename);
            const questionCount = Array.isArray(file.data) ? file.data.length : 0;

            return (
              <div 
                key={index} 
                className={`file-card ${isSelected ? 'selected' : ''} ${viewMode}`}
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
                    <div className="file-meta">
                      <span className="question-count">
                        📝 {questionCount} questions
                      </span>
                      <span className="file-size">
                        {questionCount <= 20 ? '🟢 Small' : 
                         questionCount <= 50 ? '🟡 Medium' : '🔴 Large'}
                      </span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="selected-indicator">✓</div>
                )}
              </div>
            );
          })
        )}
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