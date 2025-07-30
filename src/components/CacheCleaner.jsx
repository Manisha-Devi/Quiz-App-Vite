
import React from 'react';
import { clearAllAppData } from '../utils/dataManager';

const CacheCleaner = () => {
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
    <div style={{ 
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'rgba(102, 126, 234, 0.1)',
      borderRadius: '12px',
      border: '1px solid rgba(102, 126, 234, 0.2)'
    }}>
      <span style={{ fontSize: '14px', fontWeight: '500', color: '#666' }}>
        Developer Tools:
      </span>
      <button 
        onClick={clearBrowserCache} 
        style={{ 
          padding: '8px 16px',
          background: '#ff4757',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        🗑️ Clear All Data
      </button>
      <button 
        onClick={forceRefresh} 
        style={{ 
          padding: '8px 16px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        🔄 Force Refresh
      </button>
    </div>
  );
};

export default CacheCleaner;
