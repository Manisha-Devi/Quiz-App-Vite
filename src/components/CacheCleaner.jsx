import React, { useState, useEffect } from 'react';
import dataManager from '../utils/dataManager';

const CacheCleaner = ({ onDataChange, onAlert, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');

  const fetchJSONData = async () => {
    if (loading) return;

    const confirmAction = () => performFetchJSONData();

    if (onConfirm) {
      onConfirm(
        "Fetch Data",
        "⚠️ Are you sure you want to Fetch Data? This will fetch data from the server.",
        confirmAction
      );
      return;
    }

    if (confirm(
      "⚠️ Are you sure you want to Fetch Data? This will fetch data from the server."
    )) {
        performFetchJSONData();
    }
  };

  const performFetchJSONData = async () => {
    try {
      setLoading(true);
      setCurrentOperation('fetching');
      console.log('Fetching JSON files data and storing in IndexedDB...');

      // Dynamic import of JSON files and store them in IndexedDB
      const jsonFiles = [
        { name: 'Art and Culture jk', path: '/json/Art and Culture jk.json' },
        { name: 'Email', path: '/json/Email.json' },
        { name: 'Image_Demo', path: '/json/Image_Demo.json' },
        { name: 'KaTeX Demo', path: '/json/KaTeX Demo.json' },
        { name: 'Operating_System', path: '/json/Operating_System.json' },
        { name: 'Sanfoundry_Excel', path: '/json/Sanfoundry_Excel.json' },
        { name: 'Sanfoundry_Office', path: '/json/Sanfoundry_Office.json' },
        { name: 'Sanfoundry_PowerPoint', path: '/json/Sanfoundry_PowerPoint.json' },
        { name: 'Sanfoundry_Word', path: '/json/Sanfoundry_Word.json' }
      ];

      const loadedData = [];

      for (const file of jsonFiles) {
        try {
          // Try different path strategies for production
          let response;
          let data;

          // First try the public path (for production)
          try {
            response = await fetch(`/json/${file.name}.json`);
            if (response.ok) {
              data = await response.json();
            }
          } catch (e) {
            console.warn(`Could not load from /json/${file.name}.json:`, e);
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

        // Now also fetch and store images associated with JSON files
        console.log('🖼️ Starting to load associated images...');
        const { loadJSONImagesFromFolders } = await import('../utils/jsonLoader');
        await loadJSONImagesFromFolders();
        console.log('✅ Images loading process completed');

        if (onAlert) {
          onAlert('Data Fetch Success', `✅ Successfully loaded:\n📄 ${loadedData.length} JSON files\n🖼️ Associated images\n\nAll data stored in IndexedDB!`, 'success');
        } else {
          alert(`✅ Successfully loaded:\n📄 ${loadedData.length} JSON files\n🖼️ Associated images\n\nAll data stored in IndexedDB!`);
        }

        if (onDataChange) {
          onDataChange();
        }
      } else {
        if (onAlert) {
          onAlert('Data Fetch Warning', '⚠️ No JSON files could be loaded', 'warning');
        } else {
          alert('⚠️ No JSON files could be loaded');
        }
      }
    } catch (error) {
      console.error('Error fetching JSON data:', error);
      if (onAlert) {
        onAlert('Data Fetch Error', `❌ Error loading JSON files: ${error.message || 'Please try again.'}`, 'error');
      } else {
        alert(`❌ Error loading JSON files: ${error.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const clearIndexedDBStores = async () => {
    if (loading) return;

    const confirmAction = () => performClearIndexedDBStores();

    if (onConfirm) {
      onConfirm(
        "Clear IndexedDB Stores",
        "⚠️ Are you sure you want to CLEAR all IndexedDB stores? This will empty all data but keep the database structure intact.",
        confirmAction
      );
      return;
    }

    if (confirm("⚠️ Are you sure you want to CLEAR all IndexedDB stores? This will empty all data but keep the database structure intact.")) {
        performClearIndexedDBStores();
    }
  };

  const performClearIndexedDBStores = async () => {
    try {
      setLoading(true);
      setCurrentOperation('clearing');
      console.log('🧹 Starting IndexedDB stores clearing process...');

      // Try to clear using dataManager first
      let success = await dataManager.clearAllAppData();

      // If dataManager fails, try direct approach
      if (!success) {
        console.log('⚠️ DataManager clear failed, trying direct approach...');
        success = await clearStoresDirectly();
      }

      if (success) {
        console.log('✅ All IndexedDB stores cleared successfully');
        if (onAlert) {
          onAlert('Clear Success', '✅ All IndexedDB stores cleared successfully!\n\n📊 All data has been removed while preserving the database structure.', 'success');
        } else {
          alert('✅ All IndexedDB stores cleared successfully!\n\n📊 All data has been removed while preserving the database structure.');
        }

        if (onDataChange) {
          onDataChange();
        }
      } else {
        throw new Error('Failed to clear IndexedDB stores using all available methods');
      }

    } catch (error) {
      console.error('❌ Error clearing IndexedDB stores:', error);
      if (onAlert) {
        onAlert('Clear Error', `❌ Error clearing IndexedDB stores: ${error.message || 'Unknown error occurred.'}\n\nTip: Try the Delete button instead to remove the entire database.`, 'error');
      } else {
        alert(`❌ Error clearing IndexedDB stores: ${error.message || 'Unknown error occurred.'}\n\nTip: Try the Delete button instead to remove the entire database.`);
      }
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  // Helper function for direct store clearing
  const clearStoresDirectly = async () => {
    try {
      const { openDb } = await import('../utils/indexedDB');
      const db = await openDb();

      if (!db) {
        throw new Error('Could not open database');
      }

      const stores = ['userSettings', 'examData', 'examResults', 'jsonFiles', 'jsonImages'];
      let clearedCount = 0;

      for (const storeName of stores) {
        try {
          if (!db.objectStoreNames.contains(storeName)) {
            console.log(`Store ${storeName} does not exist, skipping...`);
            continue;
          }

          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);

          await new Promise((resolve, reject) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => {
              console.log(`✅ Direct clear of ${storeName} successful`);
              clearedCount++;
              resolve();
            };
            clearRequest.onerror = () => reject(clearRequest.error);
          });

        } catch (storeError) {
          console.error(`Failed to directly clear store ${storeName}:`, storeError);
        }
      }

      console.log(`✅ Direct clear completed: ${clearedCount}/${stores.length} stores cleared`);
      return clearedCount > 0;

    } catch (error) {
      console.error('❌ Direct clear failed:', error);
      return false;
    }
  };

  const clearBrowserStorage = async () => {
    if (loading) return;

    const confirmAction = () => performClearBrowserStorage();

    if (onConfirm) {
      onConfirm(
        "Clear Browser Storage",
        "⚠️ Are you sure you want to CLEAR all browser storage? This will remove localStorage, sessionStorage, and cookies for this domain.",
        confirmAction
      );
      return;
    }

    if (confirm(
      "⚠️ Are you sure you want to CLEAR all browser storage? This will remove localStorage, sessionStorage, and cookies for this domain."
    )) {
        performClearBrowserStorage();
    }
  };

  const performClearBrowserStorage = async () => {
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

      if (onAlert) {
        onAlert('Storage Clear Success', summary, 'success');
      } else {
        alert(summary);
      }

      if (onDataChange) {
        onDataChange();
      }

    } catch (error) {
      console.error('Error clearing browser storage:', error);
      if (onAlert) {
        onAlert('Storage Clear Error', `❌ Error clearing browser storage: ${error.message || 'Unknown error occurred.'}`, 'error');
      } else {
        alert(`❌ Error clearing browser storage: ${error.message || 'Unknown error occurred.'}`);
      }
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const deleteIndexedDB = async () => {
    if (loading) return;

    const confirmAction = () => performDeleteIndexedDB();

    if (onConfirm) {
      onConfirm(
        "Delete IndexedDB",
        "⚠️ Are you sure you want to DELETE the entire IndexedDB database?\n\n🔥 This will:\n• Remove ALL data permanently\n• Delete the entire database structure\n• Cannot be undone\n\nProceed with deletion?",
        confirmAction
      );
      return;
    }

    if (confirm(
      "⚠️ Are you sure you want to DELETE the entire IndexedDB database?\n\n🔥 This will:\n• Remove ALL data permanently\n• Delete the entire database structure\n• Cannot be undone\n\nProceed with deletion?"
    )) {
        performDeleteIndexedDB();
    }
  };

  const performDeleteIndexedDB = async () => {
    try {
      setLoading(true);
      setCurrentOperation('deleting');
      console.log('🗑️ Starting IndexedDB database deletion process...');

      // Step 1: Force close all database connections
      await forceCloseAllConnections();

      // Step 2: Wait for connections to fully close
      console.log('⏳ Waiting for database connections to close...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Attempt database deletion with retry logic
      const deleteSuccess = await attemptDatabaseDeletion();

      if (deleteSuccess) {
        console.log('✅ IndexedDB database deleted successfully');

        // Mark database as deleted to prevent automatic recreation
        const { default: dataManager } = await import('../utils/dataManager');
        dataManager.markDatabaseAsDeleted();

        if (onAlert) {
          onAlert('Delete Success', '✅ IndexedDB database deleted successfully!\n\n🗑️ The database has been completely removed and will not recreate automatically.', 'success');
        } else {
          alert('✅ IndexedDB database deleted successfully!\n\n🗑️ The database has been completely removed and will not recreate automatically.');
        }

        if (onDataChange) {
          onDataChange();
        }

      } else {
        throw new Error('Failed to delete IndexedDB database after multiple attempts');
      }

    } catch (error) {
      console.error('❌ Error deleting IndexedDB:', error);
      if (onAlert) {
        onAlert('Delete Error', `❌ Error deleting IndexedDB: ${error.message || 'Unknown error occurred.'}\n\n💡 Troubleshooting tips:\n• Close all other tabs with this app\n• Try the Clear button instead\n• Manually reload the page`, 'error');
      } else {
        alert(`❌ Error deleting IndexedDB: ${error.message || 'Unknown error occurred.'}\n\n💡 Troubleshooting tips:\n• Close all other tabs with this app\n• Try the Clear button instead\n• Manually reload the page`);
      }
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  // Helper function to force close all connections
  const forceCloseAllConnections = async () => {
    try {
      // Force close dataManager connection
      const { default: dataManager } = await import('../utils/dataManager');
      await dataManager.forceCloseConnections();

      // Try to close any other potential connections
      if (typeof window !== 'undefined' && window.indexedDB) {
        // Create a temporary connection and immediately close it
        try {
          const tempRequest = indexedDB.open("quizDatabase");
          tempRequest.onsuccess = (event) => {
            const tempDb = event.target.result;
            if (tempDb && !tempDb.closed) {
              tempDb.close();
              console.log('🔒 Temporary connection closed');
            }
          };
        } catch (tempError) {
          console.warn('Warning during temporary connection cleanup:', tempError);
        }
      }

      console.log('🔒 All database connections force closed');
    } catch (closeError) {
      console.warn('⚠️ Error during connection cleanup:', closeError);
    }
  };

  // Helper function to attempt database deletion with retries
  const attemptDatabaseDeletion = async () => {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Deletion attempt ${attempt}/${maxAttempts}...`);

      const success = await new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase("quizDatabase");
        let resolved = false;

        const resolveOnce = (result) => {
          if (!resolved) {
            resolved = true;
            resolve(result);
          }
        };

        deleteRequest.onsuccess = () => {
          console.log(`✅ Database deletion successful on attempt ${attempt}`);
          resolveOnce(true);
        };

        deleteRequest.onerror = (event) => {
          console.error(`❌ Database deletion failed on attempt ${attempt}:`, event.target.error);
          resolveOnce(false);
        };

        deleteRequest.onblocked = () => {
          console.warn(`⚠️ Database deletion blocked on attempt ${attempt}`);
          // Wait a bit longer for blocked requests
          setTimeout(() => resolveOnce(false), 5000);
        };

        // Timeout for each attempt
        setTimeout(() => {
          if (!resolved) {
            console.error(`⏰ Database deletion timed out on attempt ${attempt}`);
            resolveOnce(false);
          }
        }, 10000);
      });

      if (success) {
        return true;
      }

      // Wait before retrying (except on last attempt)
      if (attempt < maxAttempts) {
        console.log(`⏳ Waiting before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return false;
  };

  return (
    <>
      <button
        onClick={fetchJSONData}
        disabled={loading}
        className="compact-dev-btn fetch-btn"
        title="Manual fetch: Load JSON files and images from project and store in IndexedDB"
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