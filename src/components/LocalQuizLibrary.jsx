
import React, { useState, useEffect } from 'react';
import useOfflineStorage from '../hooks/useOfflineStorage';
import './styles/LocalQuizLibrary.css';

const LocalQuizLibrary = ({ onQuizSelect }) => {
  const { localQuizzes, loadLocalQuizzes, isOnline } = useOfflineStorage();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLocalQuizzes();
  }, []);

  const filteredQuizzes = localQuizzes.filter(quiz =>
    quiz.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuizSelect = (quiz) => {
    // Update last used timestamp
    quiz.lastUsed = new Date().toISOString();
    onQuizSelect(quiz);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="local-quiz-library">
      <div className="library-header">
        <h2>📚 Saved Quizzes</h2>
        <p>Choose from your saved quiz files to continue</p>
      </div>

      <div className="controls-section">
        <div className="search-row">
          <div className="search-input-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search quizzes by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <div className="search-actions">
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Library Stats */}
      {filteredQuizzes.length > 0 && (
        <div className="library-stats">
          <span className="total-files">
            📊 Total: {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? 'zes' : ''} | 
            Status: {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      )}

      {filteredQuizzes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No saved quizzes found</h3>
          <p>Upload some quiz files to see them here</p>
        </div>
      ) : (
        <div className="files-container grid files-grid-2-col">
          {filteredQuizzes.map((quiz) => {
            const questionCount = quiz.data?.length || 0;
            return (
              <div 
                key={quiz.id} 
                className="file-card"
                onClick={() => handleQuizSelect(quiz)}
              >
                <div className="file-content">
                  <div className="file-info">
                    {/* Row 1: File name (left aligned) */}
                    <div className="file-row file-name-row">
                      <span className="file-icon">📚</span>
                      <h3 className="file-name">{quiz.name}</h3>
                    </div>
                    
                    {/* Row 2: Questions (left), Date (center), Size (right) */}
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
                      
                      <div className="file-images-center">
                        <span className="date-info">
                          📅 {formatDate(quiz.createdAt)}
                        </span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocalQuizLibrary;
