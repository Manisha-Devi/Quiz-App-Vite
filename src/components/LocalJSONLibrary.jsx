import React, { useState, useEffect } from 'react';
import { getAllJSONFiles } from '../utils/indexedDB';
import '../components/styles/LocalJSONLibrary.css';
import dataManager from '../utils/dataManager';

function LocalJSONLibrary({ onFileSelect, refreshTrigger = 0 }) {
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
    debugJsonImagesStore(); // Debug function to check stored images
    debugProductionMode(); // Debug production vs development
  }, []);

  // Debug production mode
  const debugProductionMode = () => {
    console.log('🔍 Environment check:');
    console.log('DEV mode:', import.meta.env.DEV);
    console.log('PROD mode:', import.meta.env.PROD);
    console.log('BASE_URL:', import.meta.env.BASE_URL);
  };

  // Debug function to check what's in jsonImages store
  const debugJsonImagesStore = async () => {
    try {
      console.log('🔍 Debugging jsonImages store...');
      
      // Check for Image_Demo specifically
      const images = await dataManager.getAllImagesForJSONFile('Image_Demo');
      console.log('📋 Images found for Image_Demo:', images);
      
      if (images.length === 0) {
        console.log('⚠️ No images found in jsonImages store for Image_Demo');
        console.log('🔄 Attempting to reload images...');
        
        // Try to reload images
        const { loadJSONImagesFromFolders } = await import('../utils/jsonLoader');
        await loadJSONImagesFromFolders();
        
        // Check again after reload
        const reloadedImages = await dataManager.getAllImagesForJSONFile('Image_Demo');
        console.log('📋 Images found after reload:', reloadedImages);
      }
    } catch (error) {
      console.error('❌ Error debugging jsonImages store:', error);
    }
  };

  // Auto refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadLocalFiles();
    }
  }, [refreshTrigger]);

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



  const handleContinue = async () => {
    if (selectedFiles.length === 0) {
      alert('⚠️ Please select at least one file');
      return;
    }

    const formattedData = selectedFiles.map(file => ({
      name: file.filename,
      questions: file.data
    }));

    // Import dataManager dynamically to avoid circular imports
    const { default: dataManager } = await import('../utils/dataManager');

    await Promise.all([
      dataManager.setUserSetting('quizTime', quizTime),
      dataManager.setFileImageMap({})
    ]);

    // Load associated images for selected JSON files
    console.log('🖼️ Loading associated images for selected files...');
    const fileImageMap = {};

    for (const file of selectedFiles) {
      try {
        console.log(`Loading images for ${file.filename}...`);

        // Get images from jsonImages store
        const images = await dataManager.getAllImagesForJSONFile(file.filename);

        if (images && images.length > 0) {
          // Transform images to match expected format
          fileImageMap[`${file.filename}.json`] = images.map(img => ({
            name: img.imageName,
            data: img.data
          }));
          console.log(`✅ Loaded ${images.length} images for ${file.filename}`);
        } else {
          console.log(`No images found for ${file.filename}`);
        }
      } catch (error) {
        console.error(`Error loading images for ${file.filename}:`, error);
      }
    }

    console.log('Final fileImageMap:', fileImageMap);

    // Store fileImageMap in dataManager
    if (Object.keys(fileImageMap).length > 0) {
      await dataManager.setFileImageMap(fileImageMap);
      console.log('✅ Stored fileImageMap in dataManager');
    }

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
      {/* Stable Header Section */}
      <div className="library-header">
        <h2>📁 Select Quiz Files</h2>
        <p>Choose from available JSON files to start your quiz</p>
        
      </div>

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

        {/* Active Filters Display - Moved here */}
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

      {/* Selected Files Section */}
      {selectedFiles.length > 0 && (
        <div className="selected-files-section">
          <div className="selected-header">
            <h3>✅ Selected Files ({selectedFiles.length})</h3>
            <button 
              className="clear-selection-btn"
              onClick={() => setSelectedFiles([])}
            >
              Clear All
            </button>
          </div>

          <div className="selected-files-grid">
            {selectedFiles.map((file, index) => {
              const questionCount = Array.isArray(file.data) ? file.data.length : 0;
              return (
                <div 
                  key={index} 
                  className="file-card selected-file-card"
                  onClick={() => handleFileToggle(file)}
                >
                  <div className="file-content">
                    <div className="file-info">
                      <div className="file-row file-name-row">
                        <span className="file-icon">📄</span>
                        <h3 className="file-name">{file.filename}</h3>
                      </div>
                      <div className="file-row file-meta-row">
                        <div className="file-questions-left">
                          <span 
                            className="question-prefix" 
                            style={{
                              color: questionCount <= 20 ? '#4CAF50' : 
                                     questionCount <= 50 ? '#ff9800' : '#f44336',
                              fontWeight: 'bold'
                            }}
                          >
                            Q:
                          </span>
                          <span className="question-count">{questionCount} questions</span>
                        </div>
                        <div className="file-size-right">
                          <span className="file-size">
                            {questionCount <= 20 ? '🟢 Small' : 
                             questionCount <= 50 ? '🟡 Medium' : '🔴 Large'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="selected-indicator">✕</div>
                </div>
              );
            })}
          </div>
        </div>
      )}



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
                <div className="file-content">
                  <div className="file-info">
                    <div className="file-row file-name-row">
                      <span className="file-icon">📄</span>
                      <h3 className="file-name">{file.filename}</h3>
                    </div>
                    <div className="file-row file-meta-row">
                      <div className="file-questions-left">
                        <span 
                          className="question-prefix" 
                          style={{
                            color: questionCount <= 20 ? '#4CAF50' : 
                                   questionCount <= 50 ? '#ff9800' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        >
                          Q:
                        </span>
                        <span className="question-count">{questionCount} questions</span>
                      </div>
                      <div className="file-size-right">
                        <span className="file-size">
                          {questionCount <= 20 ? '🟢 Small' : 
                           questionCount <= 50 ? '🟡 Medium' : '🔴 Large'}
                        </span>
                      </div>
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