import React, { useState } from 'react';
import dataManager from '../utils/dataManager';

const CacheCleaner = () => {
  const [loading, setLoading] = useState(false);

  const fetchJSONData = async () => {
    if (loading) return;

    try {
      setLoading(true);
      console.log('Fetching JSON files data and storing in IndexedDB...');

      // Dynamic import of JSON files and store them in IndexedDB
      const jsonFiles = [
        { name: 'Art and Culture jk', path: '../json/Art and Culture jk.json' },
        { name: 'Email', path: '../json/Email.json' },
        { name: 'Image_Demo', path: '../json/Image_Demo.json' },
        { name: 'KaTeX Demo', path: '../json/KaTeX Demo.json' },
        { name: 'Operating_System', path: '../json/Operating_System.json' },
        { name: 'Sanfoundry_Excel', path: '../json/Sanfoundry_Excel.json' },
        { name: 'Sanfoundry_Office', path: '../json/Sanfoundry_Office.json' },
        { name: 'Sanfoundry_PowerPoint', path: '../json/Sanfoundry_PowerPoint.json' },
        { name: 'Sanfoundry_Word', path: '../json/Sanfoundry_Word.json' }
      ];

      const loadedData = [];

      for (const file of jsonFiles) {
        try {
          const response = await fetch(`/src/json/${file.name}.json`);
          if (response.ok) {
            const data = await response.json();
            loadedData.push({
              name: file.name,
              questions: data
            });
            console.log(`Loaded ${file.name}: ${data.length} questions`);
          }
        } catch (error) {
          console.warn(`Could not load ${file.name}:`, error);
        }
      }

      if (loadedData.length > 0) {
        // Store in IndexedDB
        await dataManager.setExamData('quizData', loadedData);
        console.log(`Successfully stored ${loadedData.length} JSON files in IndexedDB`);
        alert(`✅ Successfully loaded ${loadedData.length} JSON files into IndexedDB!`);
      } else {
        alert('⚠️ No JSON files could be loaded');
      }

    } catch (error) {
      console.error('Error fetching JSON data:', error);
      alert('❌ Error loading JSON files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteIndexedDB = async () => {
    if (loading) return;

    const confirmed = window.confirm(
      "⚠️ Are you sure you want to DELETE the entire IndexedDB database? This will remove ALL data and you'll need to reload the page to recreate the database. This action cannot be undone."
    );

    if (confirmed) {
      try {
        setLoading(true);
        console.log('Starting IndexedDB database deletion process...');

        // First try to close any existing connections
        try {
          const db = await dataManager.dbPromise;
          if (db && !db.closed) {
            db.close();
            console.log('Existing database connection closed');
          }
        } catch (closeError) {
          console.warn('Could not close existing connection:', closeError);
        }

        // Wait a bit for connections to close
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now delete the database
        const result = await new Promise((resolve, reject) => {
          console.log('Attempting to delete database "quizDatabase"...');
          const deleteReq = indexedDB.deleteDatabase("quizDatabase");
          
          deleteReq.onsuccess = () => {
            console.log('✅ Database deleted successfully');
            resolve('Database deleted successfully');
          };
          
          deleteReq.onerror = (event) => {
            console.error('❌ Error deleting database:', event.target.error);
            reject(new Error(`Delete failed: ${event.target.error?.message || 'Unknown error'}`));
          };
          
          deleteReq.onblocked = () => {
            console.warn('⚠️ Database deletion blocked - likely open in another tab');
            reject(new Error('Database deletion blocked. Please close all other tabs/windows with this application and try again.'));
          };

          // Timeout after 10 seconds
          setTimeout(() => {
            reject(new Error('Database deletion timed out after 10 seconds'));
          }, 10000);
        });

        console.log('Database deletion result:', result);
        alert('✅ IndexedDB database "quizDatabase" deleted successfully! Page will reload now.');

        // Force hard reload to recreate database
        setTimeout(() => {
          window.location.href = window.location.href;
        }, 1000);

      } catch (error) {
        console.error('Error during database deletion:', error);
        
        let errorMessage = '❌ Error deleting database: ';
        if (error.message.includes('blocked')) {
          errorMessage += 'Database is open in another tab. Please close all other tabs and try again.';
        } else if (error.message.includes('timed out')) {
          errorMessage += 'Operation timed out. Please refresh the page and try again.';
        } else {
          errorMessage += error.message || 'Unknown error occurred.';
        }
        
        alert(errorMessage);
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 1000
    }}>
      <button 
        onClick={fetchJSONData}
        disabled={loading}
        style={{
          background: loading ? '#ccc' : 'linear-gradient(135deg, #4CAF50, #45a049)',
          color: 'white',
          border: 'none',
          padding: '12px 16px',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: loading ? 0.7 : 1
        }}
        title="Fetch JSON files from project and store in IndexedDB"
      >
        {loading ? '⏳ Loading...' : '📥 Fetch Data'}
      </button>
      <button 
        onClick={deleteIndexedDB}
        disabled={loading}
        style={{
          background: loading ? '#ccc' : 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
          color: 'white',
          border: 'none',
          padding: '12px 16px',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: loading ? 0.7 : 1
        }}
        title="Delete entire IndexedDB database (requires page reload)"
      >
        {loading ? '⏳ Deleting...' : '🗑️ Delete DB'}
      </button>
    </div>
  );
};

export default CacheCleaner;