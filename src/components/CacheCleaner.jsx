
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
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      zIndex: 9999,
      background: '#f0f0f0',
      padding: '10px',
      borderRadius: '5px',
      border: '1px solid #ccc'
    }}>
      <h4>Developer Tools</h4>
      <button onClick={clearBrowserCache} style={{ margin: '5px', padding: '8px' }}>
        🗑️ Clear All Data
      </button>
      <button onClick={forceRefresh} style={{ margin: '5px', padding: '8px' }}>
        🔄 Force Refresh
      </button>
      <div style={{ fontSize: '12px', marginTop: '5px' }}>
        Use if updates not showing
      </div>
    </div>
  );
};

export default CacheCleaner;
