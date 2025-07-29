import React, { useState, useEffect } from 'react';
import { getAllJSONFiles } from '../utils/indexedDB';
import '../components/styles/LocalJSONLibrary.css';

function LocalJSONLibrary({ onFileSelect }) {
  const [localFiles, setLocalFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [quizTime, setQuizTime] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadLocalFiles();
  }, []);

  const loadLocalFiles = async (forceReload = false) => {
    try {
      setLoading(true);

      if (forceReload) {
        // Force reload from file system by calling jsonLoader
        const { loadJSONFilesToStorage } = await import('../utils/jsonLoader');
        await loadJSONFilesToStorage();
      }

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

  const addSearchFilter = () => {
    if (searchTerm.trim() && !activeFilters.includes(searchTerm.trim())) {
      setActiveFilters(prev => [...prev, searchTerm.trim()]);
      setSearchTerm('');
    }
  };

  const removeFilter = (filterToRemove) => {
    setActiveFilters(prev => prev.filter(filter => filter !== filterToRemove));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearchTerm('');
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
      const filename = file.filename.toLowerCase();
      
      // Check if matches current search term
      const matchesCurrentSearch = searchTerm ? filename.includes(searchTerm.toLowerCase()) : true;
      
      // Check if matches any active filters
      const matchesActiveFilters = activeFilters.length === 0 || 
        activeFilters.some(filter => filename.includes(filter.toLowerCase()));

      const matchesSearch = matchesCurrentSearch && matchesActiveFilters;

      if (filterBy === 'all') return matchesSearch;

      const questionCount = Array.isArray(file.data) ? file.data.length : 0;
      const isSelected = selectedFiles.some(f => f.filename === file.filename);
      
      if (filterBy === 'small') return matchesSearch && questionCount <= 20;
      if (filterBy === 'medium') return matchesSearch && questionCount > 20 && questionCount <= 50;
      if (filterBy === 'large') return matchesSearch && questionCount > 50;
      if (filterBy === 'selected') return matchesSearch && isSelected;
      if (filterBy === 'unselected') return matchesSearch && !isSelected;
      if (filterBy === 'popular') return matchesSearch && questionCount >= 20 && questionCount <= 100;

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

  // Pagination logic
  const filteredFiles = getFilteredAndSortedFiles();
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFiles = filteredFiles.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };


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
              onKeyPress={(e) => e.key === 'Enter' && addSearchFilter()}
              className="search-input"
            />
            <div className="search-actions">
              {searchTerm && (
                <button 
                  className="add-filter-btn"
                  onClick={addSearchFilter}
                  title="Add as filter"
                >
                  ✓
                </button>
              )}
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilters.length > 0 && (
          <div className="active-filters">
            <div className="filters-header">
              <span className="filters-label">Active Filters:</span>
              <button className="clear-all-filters" onClick={clearAllFilters}>
                Clear All
              </button>
            </div>
            <div className="filter-tags">
              {activeFilters.map((filter, index) => (
                <span key={index} className="filter-tag">
                  {filter}
                  <button 
                    className="remove-filter"
                    onClick={() => removeFilter(filter)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

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
              <option value="selected">Selected Files Only</option>
              <option value="unselected">Unselected Files Only</option>
              <option value="popular">Popular Sizes (20-100 questions)</option>
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

      {/* Library Stats - Moved above files */}
      {filteredFiles.length > 0 && (
        <div className="library-stats">
          <span className="total-files">
            📊 Total: {filteredFiles.length} files | 
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      {/* Files Display */}
      <div className={`files-container ${viewMode} files-grid-2-col`}>
        {currentFiles.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No files match your search</h3>
            <p>Try adjusting your search terms or filters</p>
          </div>
        ) : (
          currentFiles.map((file, index) => {
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            onClick={goToPrevPage}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>

          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
          </div>

          <button 
            className="pagination-btn"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}



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