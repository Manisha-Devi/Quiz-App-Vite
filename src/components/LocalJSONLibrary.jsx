
import React, { useState, useEffect } from 'react';
import { getAllJSONFiles } from '../utils/indexedDB';
import '../components/styles/LocalJSONLibrary.css';

function LocalJSONLibrary({ onFileSelect }) {
  const [localFiles, setLocalFiles] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleFileSelect = (file) => {
    const formattedData = [{
      name: file.filename,
      questions: file.data
    }];
    onFileSelect(formattedData);
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
      <div className="files-grid">
        {localFiles.map((file, index) => {
          const questionCount = file.data?.length || 0;
          const levelCounts = { 0: 0, 1: 0, 2: 0 };
          
          if (file.data) {
            file.data.forEach(q => {
              if (q.level !== undefined) levelCounts[q.level]++;
            });
          }

          return (
            <div key={index} className="local-file-card">
              <div className="file-header">
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <h3 className="file-name">{file.filename}</h3>
                  <p className="file-stats">{questionCount} questions</p>
                  <div className="file-levels">
                    <span className="level-stat easy">🟢 {levelCounts[0]}</span>
                    <span className="level-stat medium">🟠 {levelCounts[1]}</span>
                    <span className="level-stat hard">🔴 {levelCounts[2]}</span>
                  </div>
                </div>
              </div>
              
              <div className="file-actions">
                <button 
                  className="select-file-btn"
                  onClick={() => handleFileSelect(file)}
                >
                  <span>Select File</span>
                  <span className="btn-icon">✓</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LocalJSONLibrary;
