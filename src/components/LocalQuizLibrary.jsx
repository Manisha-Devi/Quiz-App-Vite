
import React, { useState, useEffect } from 'react';
import './styles/LocalQuizLibrary.css';
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
        <h2>📚 Saved Quizzes ({localQuizzes.length})</h2>
        <div className="status-indicator">
          <span className={`status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search quizzes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="quiz-grid">
        {filteredQuizzes.length === 0 ? (
          <div className="empty-state">
            <p>📝 No saved quizzes found</p>
            <small>Upload some quiz files to see them here</small>
          </div>
        ) : (
          filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-card" onClick={() => handleQuizSelect(quiz)}>
              <div className="quiz-card-header">
                <h3>{quiz.name}</h3>
                <span className="quiz-questions">
                  {quiz.data?.length || 0} questions
                </span>
              </div>
              
              <div className="quiz-card-meta">
                <div className="quiz-date">
                  📅 Created: {formatDate(quiz.createdAt)}
                </div>
                <div className="quiz-last-used">
                  🕒 Last used: {formatDate(quiz.lastUsed)}
                </div>
              </div>
              
              <div className="quiz-card-footer">
                <button className="load-quiz-btn">
                  Load Quiz 🚀
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocalQuizLibrary;
