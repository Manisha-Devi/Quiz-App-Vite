
import React from 'react';
import { clearAllAppData } from '../utils/dataManager';

const CacheCleaner = ({ isDarkMode, loading, setLoading }) => {
  const clearBrowserCache = async () => {
    try {
      // Clear all app data
      await clearAllAppData();
      
      // Force reload without cache
      window.location.reload(true);
      
      alert('Cache cleared! Page will refresh.');
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error clearing cache. Try manual browser refresh.');
    }
  };

  const forceRefresh = () => {
    // Clear Vite cache in development
    if (import.meta.hot) {
      import.meta.hot.invalidate();
    }
    
    // Hard reload
    window.location.reload(true);
  };

  return (
    <div className={`cache-cleaner-footer ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="cache-cleaner-content">
        <div className="cache-cleaner-info">
          <span className="cache-cleaner-title">Developer Tools</span>
          <span className="cache-cleaner-desc">Use if updates not showing</span>
        </div>
        <div className="cache-cleaner-actions">
          <button 
            onClick={clearBrowserCache} 
            className="cache-action-btn"
            disabled={loading}
          >
            🗑️ Clear All Data
          </button>
          <button 
            onClick={forceRefresh} 
            className="cache-action-btn"
            disabled={loading}
          >
            🔄 Force Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default CacheCleaner;
