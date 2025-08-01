import React, { useState, useEffect } from 'react';
import dataManager from '../utils/dataManager';
import { 
  openDb, 
  clearDatabase, 
  deleteDatabase, 
  getAllStoredData 
} from '../utils/indexedDB';
import './styles/CacheCleaner.css';

function CacheCleaner({ onDataChange }) {
  const [loading, setLoading] = useState({});
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState('');
  const [dialogTitle, setDialogTitle] = useState('');
  const [storageInfo, setStorageInfo] = useState(null);

  // Show dialog with content
  const showInfoDialog = (title, content) => {
    setDialogTitle(title);
    setDialogContent(content);
    setShowDialog(true);
  };

  // Close dialog
  const closeDialog = () => {
    setShowDialog(false);
    setDialogContent('');
    setDialogTitle('');
  };

  // Fetch all data from IndexedDB
  const handleFetchData = async () => {
    setLoading(prev => ({ ...prev, fetch: true }));
    try {
      const allData = await getAllStoredData();
      const formattedData = JSON.stringify(allData, null, 2);
      showInfoDialog('📊 IndexedDB Data', formattedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      showInfoDialog('❌ Error', 'Failed to fetch data from IndexedDB');
    } finally {
      setLoading(prev => ({ ...prev, fetch: false }));
    }
  };

  // Clear specific stores
  const handleClearStores = async () => {
    setLoading(prev => ({ ...prev, clear: true }));
    try {
      // Clear examData store
      const examDataKeys = ['quizData', 'finalQuiz', 'examState', 'examMeta', 'fileImageMap'];
      for (const key of examDataKeys) {
        await dataManager.deleteExamData(key);
      }

      // Clear examResults store
      const examResultsKeys = ['examAnswers', 'reviewMarks', 'retryAnswers'];
      for (const key of examResultsKeys) {
        await dataManager.deleteExamResults(key);
      }

      showInfoDialog('✅ Success', 'Exam data and results cleared successfully');
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error clearing stores:', error);
      showInfoDialog('❌ Error', 'Failed to clear stores');
    } finally {
      setLoading(prev => ({ ...prev, clear: false }));
    }
  };

  // Show storage information
  const handleShowStorage = async () => {
    setLoading(prev => ({ ...prev, storage: true }));
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = (estimate.usage / (1024 * 1024)).toFixed(2);
        const quota = (estimate.quota / (1024 * 1024)).toFixed(2);
        const percentage = ((estimate.usage / estimate.quota) * 100).toFixed(1);

        const info = `Storage Used: ${used} MB\nStorage Quota: ${quota} MB\nUsage: ${percentage}%`;
        showInfoDialog('💾 Storage Info', info);
      } else {
        showInfoDialog('ℹ️ Info', 'Storage API not supported in this browser');
      }
    } catch (error) {
      console.error('Error getting storage info:', error);
      showInfoDialog('❌ Error', 'Failed to get storage information');
    } finally {
      setLoading(prev => ({ ...prev, storage: false }));
    }
  };

  // Delete entire database
  const handleDeleteDatabase = async () => {
    if (!window.confirm('⚠️ This will delete ALL data permanently. Are you sure?')) {
      return;
    }

    setLoading(prev => ({ ...prev, delete: true }));
    try {
      await deleteDatabase();
      showInfoDialog('✅ Success', 'Database deleted successfully');
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error deleting database:', error);
      showInfoDialog('❌ Error', 'Failed to delete database');
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  return (
    <>
      <div className="cache-cleaner-actions">
        <button
          className="compact-dev-btn fetch-btn"
          onClick={handleFetchData}
          disabled={loading.fetch}
          title="Fetch all data from IndexedDB"
        >
          <span className="compact-icon">📊</span>
          <span className="compact-text">
            {loading.fetch ? 'Loading...' : 'Fetch'}
          </span>
        </button>

        <button
          className="compact-dev-btn clear-btn"
          onClick={handleClearStores}
          disabled={loading.clear}
          title="Clear exam data stores"
        >
          <span className="compact-icon">🧹</span>
          <span className="compact-text">
            {loading.clear ? 'Clearing...' : 'Clear'}
          </span>
        </button>

        <button
          className="compact-dev-btn storage-btn"
          onClick={handleShowStorage}
          disabled={loading.storage}
          title="Show storage information"
        >
          <span className="compact-icon">💾</span>
          <span className="compact-text">
            {loading.storage ? 'Loading...' : 'Storage'}
          </span>
        </button>

        <button
          className="compact-dev-btn delete-btn"
          onClick={handleDeleteDatabase}
          disabled={loading.delete}
          title="Delete entire database"
        >
          <span className="compact-icon">🗑️</span>
          <span className="compact-text">
            {loading.delete ? 'Deleting...' : 'Delete'}
          </span>
        </button>
      </div>

      {/* Dialog Modal */}
      {showDialog && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{dialogTitle}</h3>
              <button className="dialog-close" onClick={closeDialog}>✕</button>
            </div>
            <div className="dialog-body">
              <pre>{dialogContent}</pre>
            </div>
            <div className="dialog-footer">
              <button className="dialog-btn" onClick={closeDialog}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CacheCleaner;