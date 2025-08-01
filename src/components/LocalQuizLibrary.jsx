
import React, { useState, useEffect } from 'react';
import useOfflineStorage from '../hooks/useOfflineStorage';
import './styles/LocalQuizLibrary.css';

const LocalQuizLibrary = ({ onQuizSelect }) => {
  const { localQuizzes, loadLocalQuizzes, isOnline, deleteQuiz } = useOfflineStorage();
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

  const handleDeleteQuiz = async (e, quizId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await deleteQuiz(quizId);
        await loadLocalQuizzes(); // Refresh the list
      } catch (error) {
        console.error('Error deleting quiz:', error);
        alert('Failed to delete quiz. Please try again.');
      }
    }
  };

  const handleAddImages = (e, quiz) => {
    e.stopPropagation();
    // Create file input for image upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (event) => {
      const files = Array.from(event.target.files);
      if (files.length > 0) {
        // Handle image upload logic here
        console.log(`Adding ${files.length} images to quiz: ${quiz.name}`);
        alert(`Selected ${files.length} image(s) for ${quiz.name}`);
      }
    };
    input.click();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileSize = (quiz) => {
    const sizeInBytes = JSON.stringify(quiz).length;
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getSizeCategory = (quiz) => {
    const sizeInBytes = JSON.stringify(quiz).length;
    if (sizeInBytes < 10 * 1024) return 'Small';
    if (sizeInBytes < 100 * 1024) return 'Medium';
    return 'Large';
  };

  if (localQuizzes.length === 0) {
    return (
      <div className="local-quiz-library">
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No Saved Quizzes Found</h3>
          <p>Upload and save some quizzes to see them here</p>
        </div>
      </div>
    );
  }

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

      <div className="files-container grid">
        {filteredQuizzes.map((quiz) => {
          const questionCount = quiz.data?.length || 0;
          
          return (
            <div 
              key={quiz.id} 
              className="file-card"
              onClick={() => handleQuizSelect(quiz)}
            >
              <div className="file-card-content">
                <div className="file-content-wrapper">
                  {/* Row 1: File name */}
                  <div className="file-row file-name-row">
                    <h3 className="file-name">{quiz.name}</h3>
                  </div>
                  
                  {/* Row 2: Questions (left), Images (center), Size (right) */}
                  <div className="file-row file-meta-row">
                    <div className="file-questions-left">
                      <span className="question-count-icon">📝</span>
                      <span className="question-count">{questionCount} questions</span>
                    </div>
                    
                    <div 
                      className="file-images-center clickable-image-area"
                      onClick={(e) => handleAddImages(e, quiz)}
                      title="Click to add images"
                    >
                      <span className="image-add-info">
                        📷 Add Images
                      </span>
                    </div>
                    
                    <div className="file-size-right">
                      <span className="size-category">{getSizeCategory(quiz)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete button in top-right corner */}
              <button 
                className="delete-quiz-btn"
                onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                title="Delete quiz"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LocalQuizLibrary;
