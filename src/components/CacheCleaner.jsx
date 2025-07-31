import React, { useState, useEffect } from 'react';
import dataManager from '../utils/dataManager';

const CacheCleaner = ({ onDataChange }) => {
  const [loading, setLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');


  const fetchJSONData = async () => {
    if (loading) return;

    if (confirm(
      "⚠️ Are you sure you want to Fetch Data? This will fetch data from the server."
    )) {
      try {
        setLoading(true);
        setCurrentOperation('fetching');
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
            // Try different path strategies for production
            let response;
            let data;

            // First try the public path (for production)
            try {
              response = await fetch(`/${file.name}.json`);
              if (response.ok) {
                data = await response.json();
              }
            } catch (e) {
              // If that fails, try the src path (for development)
              response = await fetch(`/src/json/${file.name}.json`);
              if (response.ok) {
                data = await response.json();
              }
            }

            if (data) {
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
          // Store each file in dedicated jsonFiles store
          const { storeJSONFile } = await import('../utils/indexedDB');

          for (const fileData of loadedData) {
            await storeJSONFile(fileData.name, fileData.questions);
            console.log(`Stored ${fileData.name} in jsonFiles store with ${fileData.questions.length} questions`);
          }

          console.log(`Successfully stored ${loadedData.length} JSON files in dedicated jsonFiles IndexedDB store`);
          alert(`✅ Successfully loaded ${loadedData.length} JSON files into jsonFiles IndexedDB store!`);

          if (onDataChange) {
            onDataChange();
          }
        } else {
          alert('⚠️ No JSON files could be loaded');
        }
      } catch (error) {
        console.error('Error fetching JSON data:', error);
        alert(`❌ Error loading JSON files: ${error.message || 'Please try again.'}`);
      } finally {
        setLoading(false);
        setCurrentOperation('');
      }
    }
  };

  const clearIndexedDBStores = async () => {
    if (loading) return;

    if (confirm("⚠️ Are you sure you want to CLEAR all IndexedDB stores? This will empty all data but keep the database structure intact.")) {
      try {
        setLoading(true);
        setCurrentOperation('clearing');
        console.log('Starting IndexedDB stores clearing process...');

        const success = await dataManager.clearAllAppData();

        if (success) {
          console.log('✅ All IndexedDB stores cleared successfully');
          alert('✅ All IndexedDB stores cleared successfully!');

          if (onDataChange) {
            onDataChange();
          }
        } else {
          throw new Error('Failed to clear IndexedDB stores');
        }

      } catch (error) {
        console.error('Error clearing IndexedDB stores:', error);
        alert(`❌ Error clearing IndexedDB stores: ${error.message || 'Unknown error occurred.'}`);
      } finally {
        setLoading(false);
        setCurrentOperation('');
      }
    }
  };

  const clearBrowserStorage = async () => {
    if (loading) return;

    if (confirm(
      "⚠️ Are you sure you want to CLEAR all browser storage? This will remove localStorage, sessionStorage, and cookies for this domain."
    )) {
      try {
        setLoading(true);
        setCurrentOperation('storage');
        console.log('Starting browser storage clearing process...');

        // Clear localStorage
        const localStorageCount = localStorage.length;
        localStorage.clear();
        console.log(`✅ localStorage cleared (${localStorageCount} items removed)`);

        // Clear sessionStorage
        const sessionStorageCount = sessionStorage.length;
        sessionStorage.clear();
        console.log(`✅ sessionStorage cleared (${sessionStorageCount} items removed)`);

        // Clear cookies
        const cookies = document.cookie.split(";");
        let cookiesCleared = 0;

        for (let cookie of cookies) {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name) {
            // Clear cookie for current domain
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
            cookiesCleared++;
          }
        }
        console.log(`✅ Cookies cleared (${cookiesCleared} cookies removed)`);

        // Clear cache if available
        let cacheCount = 0;
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            cacheCount = cacheNames.length;
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log(`✅ Cache cleared (${cacheCount} caches removed)`);
          } catch (cacheError) {
            console.warn('Warning: Could not clear cache:', cacheError);
          }
        }

        const summary = [
          `✅ Browser storage cleared successfully!`,
          ``,
          `📊 Summary:`,
          `• localStorage: ${localStorageCount} items removed`,
          `• sessionStorage: ${sessionStorageCount} items removed`,
          `• Cookies: ${cookiesCleared} cookies removed`,
          `• Cache: ${cacheCount} caches cleared`
        ].join('\n');

        alert(summary);

        if (onDataChange) {
          onDataChange();
        }

      } catch (error) {
        console.error('Error clearing browser storage:', error);
        alert(`❌ Error clearing browser storage: ${error.message || 'Unknown error occurred.'}`);
      } finally {
        setLoading(false);
        setCurrentOperation('');
      }
    }
  };

  const deleteIndexedDB = async () => {
    if (loading) return;

    if (confirm(
      "⚠️ Are you sure you want to DELETE the entire IndexedDB database? This will remove ALL data and you'll need to reload the page to recreate the database. This action cannot be undone."
    )) {
      try {
        setLoading(true);
        setCurrentOperation('deleting');
        console.log('Starting IndexedDB database deletion process...');

        // Step 1: Force close all database connections
        try {
          // Close dataManager connection
          const db = await dataManager.dbPromise;
          if (db && !db.closed) {
            db.close();
            console.log('DataManager database connection closed');
          }

          // Clear the promise to prevent reopening
          dataManager.dbPromise = null;

          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }

          console.log('All database connections should be closed now');
        } catch (closeError) {
          console.warn('Error closing connections:', closeError);
        }

        // Step 2: Wait longer for connections to fully close
        console.log('Waiting for database connections to close...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Multiple attempts to delete with increasing delays
        let attempts = 0;
        const maxAttempts = 3;
        let deleteSuccess = false;

        while (attempts < maxAttempts && !deleteSuccess) {
          attempts++;
          console.log(`Delete attempt ${attempts}/${maxAttempts}...`);

          try {
            const result = await new Promise((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase("quizDatabase");

              deleteReq.onsuccess = () => {
                console.log('✅ Database deleted successfully on attempt', attempts);
                resolve('Database deleted successfully');
              };

              deleteReq.onerror = (event) => {
                console.error('❌ Delete error on attempt', attempts, ':', event.target.error);
                reject(new Error(`Delete failed: ${event.target.error?.message || 'Unknown error'}`));
              };

              deleteReq.onblocked = () => {
                console.warn('⚠️ Database deletion blocked on attempt', attempts);
                reject(new Error('BLOCKED'));
              };

              // Shorter timeout for retry attempts
              setTimeout(() => {
                reject(new Error('TIMEOUT'));
              }, 5000);
            });

            deleteSuccess = true;
            console.log('Database deletion result:', result);
            alert('✅ IndexedDB database "quizDatabase" deleted successfully!');

          } catch (attemptError) {
            if (attemptError.message === 'BLOCKED' && attempts < maxAttempts) {
              console.log(`Attempt ${attempts} blocked, waiting before retry...`);
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            } else if (attemptError.message === 'TIMEOUT' && attempts < maxAttempts) {
              console.log(`Attempt ${attempts} timed out, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            } else {
              throw attemptError;
            }
          }

          if (!deleteSuccess) {
            throw new Error('All delete attempts failed');
          }

        } catch (error) {
          console.error('Error during database deletion:', error);

          let errorMessage = '❌ Database deletion failed.\n\n';

          if (error.message === 'BLOCKED' || error.message.includes('blocked')) {
            errorMessage += '🔒 The database is still open in another tab or window.\n\n';
            errorMessage += 'Please try these steps:\n';
            errorMessage += '1. Close ALL other tabs/windows with this application\n';
            errorMessage += '2. Wait 10 seconds\n';
            errorMessage += '3. Try again\n\n';
            errorMessage += 'If the problem persists, restart your browser completely.';
          } else if (error.message.includes('timeout') || error.message === 'TIMEOUT') {
            errorMessage += '⏱️ The operation timed out.\n\n';
            errorMessage += 'This usually means the database is busy.\n';
            errorMessage += 'Please refresh the page and try again.';
          } else {
            errorMessage += `❓ Unexpected error: ${error.message || 'Unknown error occurred.'}\n\n`;
            errorMessage += 'Try refreshing the page and attempting again.';
          }

          alert(errorMessage);
        } finally {
          if (onDataChange) {
            onDataChange();
          }
          setLoading(false);
          setCurrentOperation('');
        }
      }
    }
  };

  return (
    <>
      <button
        onClick={fetchJSONData}
        disabled={loading}
        className="compact-dev-btn fetch-btn"
        title="Load JSON files from project and store in IndexedDB"
      >
        <span className="compact-icon">{loading && currentOperation === 'fetching' ? '⏳' : '📥'}</span>
        <span className="compact-text">
          {loading && currentOperation === 'fetching' ? 'Fetching' : 'Fetch'}
        </span>
      </button>

      <button
        onClick={clearIndexedDBStores}
        disabled={loading}
        className="compact-dev-btn clear-btn"
        title="Clear all IndexedDB stores (keeps database structure)"
      >
        <span className="compact-icon">{loading && currentOperation === 'clearing' ? '⏳' : '🧹'}</span>
        <span className="compact-text">
          {loading && currentOperation === 'clearing' ? 'Clearing' : 'Clear'}
        </span>
      </button>

      <button
        onClick={clearBrowserStorage}
        disabled={loading}
        className="compact-dev-btn storage-btn"
        title="Clear localStorage, sessionStorage, and cookies"
      >
        <span className="compact-icon">{loading && currentOperation === 'storage' ? '⏳' : '🗂️'}</span>
        <span className="compact-text">
          {loading && currentOperation === 'storage' ? 'Clearing' : 'Storage'}
        </span>
      </button>

      <button
        onClick={deleteIndexedDB}
        disabled={loading}
        className="compact-dev-btn delete-btn"
        title="Delete entire IndexedDB database (requires page reload)"
      >
        <span className="compact-icon">{loading && currentOperation === 'deleting' ? '⏳' : '🗑️'}</span>
        <span className="compact-text">
          {loading && currentOperation === 'deleting' ? 'Deleting' : 'Delete'}
        </span>
      </button>


    </>
  );
};

export default CacheCleaner;