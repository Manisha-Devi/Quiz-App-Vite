
import React from 'react';
import dataManager from '../utils/dataManager';

const CacheCleaner = () => {
  const clearBrowserCache = async () => {
    try {
      console.log('Starting data clearing process...');
      
      // Clear all app data from IndexedDB stores (without dropping database)
      const success = await dataManager.clearAllAppData();
      
      if (success) {
        console.log('All IndexedDB stores cleared successfully');
        alert('✅ All data cleared successfully! Page will refresh.');
        
        // Force reload without cache
        window.location.reload(true);
      } else {
        throw new Error('Failed to clear IndexedDB data');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('❌ Error clearing data. Please try again or refresh manually.');
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
        title="Clear all data from IndexedDB stores (keeps database structure)"
      >
        🧹 Clear App Data
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
