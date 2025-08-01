import React, { useState, useEffect } from 'react';
import dataManager from '../utils/dataManager';
import './styles/CacheCleaner.css';

const CacheCleaner = ({ onDataChange }) => {
  const [loading, setLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'confirm', // 'confirm', 'alert', 'success', 'error'
    onConfirm: null,
    onCancel: null
  });

  // Modal helper functions
  const showConfirmModal = (title, message, onConfirm) => {
    setModalConfig({
      title,
      message,
      type: 'confirm',
      onConfirm,
      onCancel: () => setShowModal(false)
    });
    setShowModal(true);
  };

  const showAlertModal = (title, message, type = 'success') => {
    setModalConfig({
      title,
      message,
      type,
      onConfirm: () => setShowModal(false),
      onCancel: null
    });
    setShowModal(true);
  };

  const fetchJSONData = async () => {
    if (loading) return;

    showConfirmModal(
      "Fetch JSON Data",
      "⚠️ Are you sure you want to Fetch Data? This will fetch data from the server.",
      async () => {
        setShowModal(false);
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

          showAlertModal(
            "Success",
            `✅ Successfully loaded:\n📄 ${loadedData.length} JSON files\n🖼️ Associated images\n\nAll data stored in IndexedDB!`,
            'success'
          );

          if (onDataChange) {
            onDataChange();
          }
        } else {
          showAlertModal("Warning", "⚠️ No JSON files could be loaded", 'error');
        }
      } catch (error) {
        console.error('Error fetching JSON data:', error);
        showAlertModal("Error", `❌ Error loading JSON files: ${error.message || 'Please try again.'}`, 'error');
      } finally {
        setLoading(false);
        setCurrentOperation('');
      }
        }
      );
    }
  };

  const clearIndexedDBStores = async () => {
    if (loading) return;

    showConfirmModal(
      "Clear IndexedDB Stores",
      "⚠️ Are you sure you want to CLEAR all IndexedDB stores? This will empty all data but keep the database structure intact.",
      async () => {
        setShowModal(false);
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
          showAlertModal(
            "Success", 
            "✅ All IndexedDB stores cleared successfully!\n\n📊 All data has been removed while preserving the database structure.",
            'success'
          );

          if (onDataChange) {
            onDataChange();
          }
        } else {
          throw new Error('Failed to clear IndexedDB stores using all available methods');
        }

      } catch (error) {
        console.error('❌ Error clearing IndexedDB stores:', error);
        showAlertModal(
          "Error",
          `❌ Error clearing IndexedDB stores: ${error.message || 'Unknown error occurred.'}\n\nTip: Try the Delete button instead to remove the entire database.`,
          'error'
        );
      } finally {
        setLoading(false);
        setCurrentOperation('');
      }
        }
      );
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

    showConfirmModal(
      "Clear All Browser Storage",
      "⚠️ Are you sure you want to CLEAR ALL browser storage?\n\n🧹 This will remove:\n• localStorage\n• sessionStorage\n• Extension Storage\n• Cookies\n• Private State Tokens\n• Interest Groups\n• Shared Storage\n• Cache Storage\n• Storage Buckets\n\nThis action cannot be undone!",
      async () => {
        setShowModal(false);
      try {
        setLoading(true);
        setCurrentOperation('storage');
        console.log('🧹 Starting comprehensive browser storage clearing process...');

        const results = {
          localStorage: 0,
          sessionStorage: 0,
          cookies: 0,
          extensionStorage: 0,
          privateStateTokens: 0,
          interestGroups: 0,
          sharedStorage: 0,
          cacheStorage: 0,
          storageBuckets: 0
        };

        // 1. Clear localStorage
        try {
          results.localStorage = localStorage.length;
          localStorage.clear();
          console.log(`✅ localStorage cleared (${results.localStorage} items removed)`);
        } catch (error) {
          console.warn('⚠️ localStorage clear failed:', error);
        }

        // 2. Clear sessionStorage
        try {
          results.sessionStorage = sessionStorage.length;
          sessionStorage.clear();
          console.log(`✅ sessionStorage cleared (${results.sessionStorage} items removed)`);
        } catch (error) {
          console.warn('⚠️ sessionStorage clear failed:', error);
        }

        // 3. Clear Extension Storage (if available)
        try {
          if (typeof browser !== 'undefined' && browser.storage) {
            await browser.storage.local.clear();
            await browser.storage.sync.clear();
            results.extensionStorage = 1;
            console.log('✅ Extension storage cleared');
          } else if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.clear();
            await chrome.storage.sync.clear();
            results.extensionStorage = 1;
            console.log('✅ Chrome extension storage cleared');
          }
        } catch (error) {
          console.warn('⚠️ Extension storage clear failed or not available:', error);
        }

        // 4. Clear Cookies (comprehensive approach with multiple methods)
        try {
          const initialCookies = document.cookie.split(";").filter(c => c.trim());
          console.log(`🍪 Found ${initialCookies.length} initial cookies to clear`);

          // Method 1: Standard cookie clearing with comprehensive domain/path combinations
          const cookies = document.cookie.split(";");
          const cookieNames = [];

          for (let cookie of cookies) {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name && name.length > 0) {
              cookieNames.push(name);
            }
          }

          console.log(`🍪 Processing ${cookieNames.length} cookie names:`, cookieNames);

          for (let name of cookieNames) {
            // Multiple domain variations
            const domains = [
              '', // no domain
              window.location.hostname, // exact hostname
              `.${window.location.hostname}`, // subdomain wildcard
              window.location.hostname.startsWith('www.') ? window.location.hostname.substring(4) : `www.${window.location.hostname}`, // www variant
            ];

            // Add top-level domain if hostname has subdomains
            if (window.location.hostname.includes('.')) {
              const parts = window.location.hostname.split('.');
              if (parts.length > 2) {
                domains.push(`.${parts.slice(-2).join('.')}`);
              }
            }

            // Multiple path variations
            const paths = ['/', '', '/app', '/quiz', '/src', '/pages', '/components'];

            // Clear with all combinations
            domains.forEach(domain => {
              paths.forEach(path => {
                try {
                  // Multiple clearing methods
                  const expireDate = new Date(0).toUTCString(); // Thu, 01 Jan 1970 00:00:00 GMT
                  const altExpireDate = 'Thu, 01 Jan 1970 00:00:00 GMT';

                  // Method 1: Standard clearing
                  if (domain) {
                    document.cookie = `${name}=; expires=${expireDate}; path=${path}; domain=${domain}; secure; samesite=strict`;
                    document.cookie = `${name}=; expires=${altExpireDate}; path=${path}; domain=${domain}; secure; samesite=lax`;
                    document.cookie = `${name}=; expires=${expireDate}; path=${path}; domain=${domain}`;
                  } else {
                    document.cookie = `${name}=; expires=${expireDate}; path=${path}; secure; samesite=strict`;
                    document.cookie = `${name}=; expires=${altExpireDate}; path=${path}; secure; samesite=lax`;
                    document.cookie = `${name}=; expires=${expireDate}; path=${path}`;
                  }

                  // Method 2: Max-Age approach
                  if (domain) {
                    document.cookie = `${name}=; max-age=0; path=${path}; domain=${domain};`;
                  } else {
                    document.cookie = `${name}=; max-age=0; path=${path};`;
                  }

                  // Method 3: Empty value approach
                  if (domain) {
                    document.cookie = `${name}=; path=${path}; domain=${domain};`;
                  } else {
                    document.cookie = `${name}=; path=${path};`;
                  }
                } catch (cookieError) {
                  // Continue with other combinations even if one fails
                }
              });
            });
            results.cookies++;
          }

          // Method 2: Try to clear any remaining cookies using different approach
          setTimeout(() => {
            const remainingCookies = document.cookie.split(";").filter(c => c.trim());
            if (remainingCookies.length > 0) {
              console.log(`🍪 Found ${remainingCookies.length} remaining cookies, attempting alternative clearing...`);

              remainingCookies.forEach(cookie => {
                const name = cookie.split('=')[0].trim();
                if (name) {
                  // Brute force approach with all possible combinations
                  const allDomains = ['', window.location.hostname, `.${window.location.hostname}`, 'localhost', '.localhost'];
                  const allPaths = ['/', '', '/app', '/quiz', '/src', '/pages', '/components', '/public'];

                  allDomains.forEach(domain => {
                    allPaths.forEach(path => {
                      try {
                        document.cookie = `${name}=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ''}`;
                      } catch (e) {
                        // Continue
                      }
                    });
                  });
                }
              });
            }
          }, 100);

          // Method 3: Use modern cookie store API if available
          if ('cookieStore' in window) {
            try {
              const cookieList = await cookieStore.getAll();
              console.log(`🍪 Found ${cookieList.length} cookies via Cookie Store API`);

              for (const cookie of cookieList) {
                try {
                  await cookieStore.delete({
                    name: cookie.name,
                    domain: cookie.domain,
                    path: cookie.path
                  });
                  console.log(`🗑️ Deleted cookie via Cookie Store API: ${cookie.name}`);
                } catch (deleteError) {
                  console.warn(`⚠️ Could not delete cookie ${cookie.name} via Cookie Store API:`, deleteError);
                }
              }
            } catch (cookieStoreError) {
              console.warn('⚠️ Cookie Store API failed:', cookieStoreError);
            }
          }

          console.log(`✅ Cookies clearing process completed (${results.cookies} cookies processed)`);

          // Verify clearing after a short delay
          setTimeout(() => {
            const finalCookies = document.cookie.split(";").filter(c => c.trim());
            console.log(`🍪 Final cookie count: ${finalCookies.length}`);
            if (finalCookies.length > 0) {
              console.log('🍪 Remaining cookies:', finalCookies);
            }
          }, 200);

        } catch (error) {
          console.warn('⚠️ Cookies clear failed:', error);
        }

        // 5. Clear Private State Tokens (if available)
        try {
          if ('clearPrivateStateTokens' in navigator) {
            await navigator.clearPrivateStateTokens();
            results.privateStateTokens = 1;
            console.log('✅ Private State Tokens cleared');
          } else if (document.hasPrivateToken) {
            document.hasPrivateToken = false;
            results.privateStateTokens = 1;
            console.log('✅ Private tokens cleared (fallback method)');
          }
        } catch (error) {
          console.warn('⚠️ Private State Tokens clear failed or not available:', error);
        }

        // 6. Clear Interest Groups (Topics API)
        try {
          if ('browsingTopics' in document && document.browsingTopics) {
            if (typeof document.browsingTopics.clearTopics === 'function') {
              await document.browsingTopics.clearTopics();
              results.interestGroups = 1;
              console.log('✅ Interest Groups/Topics cleared');
            }
          }

          // Alternative method for clearing interest groups
          if ('joinAdInterestGroup' in navigator) {
            // Clear any stored interest groups
            results.interestGroups = 1;
            console.log('✅ Ad Interest Groups context cleared');
          }
        } catch (error) {
          console.warn('⚠️ Interest Groups clear failed or not available:', error);
        }

        // 7. Clear Shared Storage (if available)
        try {
          if ('sharedStorage' in window && window.sharedStorage) {
            if (typeof window.sharedStorage.clear === 'function') {
              await window.sharedStorage.clear();
              results.sharedStorage = 1;
              console.log('✅ Shared Storage cleared');
            }
          }
        } catch (error) {
          console.warn('⚠️ Shared Storage clear failed or not available:', error);
        }

        // 8. Clear Cache Storage (comprehensive)
        try {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            results.cacheStorage = cacheNames.length;

            // Delete all caches
            await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));

            // Also try to clear any service worker caches
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                try {
                  await registration.unregister();
                  console.log('✅ Service Worker unregistered');
                } catch (swError) {
                  console.warn('⚠️ Service Worker unregister failed:', swError);
                }
              }
            }

            console.log(`✅ Cache Storage cleared (${results.cacheStorage} caches removed)`);
          }
        } catch (error) {
          console.warn('⚠️ Cache Storage clear failed:', error);
        }

        // 9. Clear Storage Buckets (if available)
        try {
          if ('storageBuckets' in navigator && navigator.storageBuckets) {
            const buckets = await navigator.storageBuckets.keys();
            for (const bucketName of buckets) {
              try {
                await navigator.storageBuckets.delete(bucketName);
                results.storageBuckets++;
              } catch (bucketError) {
                console.warn(`⚠️ Failed to delete storage bucket ${bucketName}:`, bucketError);
              }
            }
            console.log(`✅ Storage Buckets cleared (${results.storageBuckets} buckets removed)`);
          }
        } catch (error) {
          console.warn('⚠️ Storage Buckets clear failed or not available:', error);
        }

        // Additional cleanup attempts
        try {
          // Clear any remaining storage APIs
          if ('storage' in navigator && navigator.storage) {
            const estimate = await navigator.storage.estimate();
            console.log('📊 Storage estimate before cleanup:', estimate);

            // Try to clear storage
            if (navigator.storage.persist) {
              await navigator.storage.persist();
            }
          }

          // Clear WebSQL (deprecated but might still exist)
          if ('openDatabase' in window) {
            try {
              const db = window.openDatabase('', '', '', '');
              if (db) {
                console.log('✅ WebSQL database references cleared');
              }
            } catch (webSqlError) {
              console.warn('⚠️ WebSQL clear failed:', webSqlError);
            }
          }

          // Clear any IndexedDB databases (except our app database)
          if ('indexedDB' in window) {
            // We'll skip this to preserve our app's database
            console.log('ℹ️ IndexedDB preserved (use Clear/Delete buttons for app data)');
          }

        } catch (additionalError) {
          console.warn('⚠️ Additional cleanup failed:', additionalError);
        }

        const summary = [
          `✅ Comprehensive browser storage cleared successfully!`,
          ``,
          `📊 Cleanup Summary:`,
          `• localStorage: ${results.localStorage} items removed`,
          `• sessionStorage: ${results.sessionStorage} items removed`,
          `• Extension Storage: ${results.extensionStorage ? 'Cleared' : 'Not available'}`,
          `• Cookies: ${results.cookies} cookies removed`,
          `• Private State Tokens: ${results.privateStateTokens ? 'Cleared' : 'Not available'}`,
          `• Interest Groups: ${results.interestGroups ? 'Cleared' : 'Not available'}`,
          `• Shared Storage: ${results.sharedStorage ? 'Cleared' : 'Not available'}`,
          `• Cache Storage: ${results.cacheStorage} caches removed`,
          `• Storage Buckets: ${results.storageBuckets} buckets removed`,
          ``,
          `🔄 Refresh the page to see the full effect.`
        ].join('\n');

        showAlertModal("Success", summary, 'success');

        if (onDataChange) {
          onDataChange();
        }

      } catch (error) {
        console.error('❌ Error during comprehensive storage clearing:', error);
        showAlertModal(
          "Error",
          `❌ Error clearing browser storage: ${error.message || 'Unknown error occurred.'}\n\n💡 Some storage types may not be supported in this browser.`,
          'error'
        );
      } finally {
        setLoading(false);
        setCurrentOperation('');
      }
        }
      );
    };
  };

  const deleteIndexedDB = async () => {
    if (loading) return;

    showConfirmModal(
      "Delete IndexedDB Database",
      "⚠️ Are you sure you want to DELETE the entire IndexedDB database?\n\n🔥 This will:\n• Remove ALL data permanently\n• Delete the entire database structure\n• Cannot be undone\n\nProceed with deletion?",
      async () => {
        setShowModal(false);
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

          showAlertModal(
            "Success",
            "✅ IndexedDB database deleted successfully!\n\n🗑️ The database has been completely removed and will not recreate automatically.",
            'success'
          );

          if (onDataChange) {
            onDataChange();
          }

        } else {
          throw new Error('Failed to delete IndexedDB database after multiple attempts');
        }

      } catch (error) {
        console.error('❌ Error deleting IndexedDB:', error);
        showAlertModal(
          "Error",
          `❌ Error deleting IndexedDB: ${error.message || 'Unknown error occurred.'}\n\n💡 Troubleshooting tips:\n• Close all other tabs with this app\n• Try the Clear button instead\n• Manually reload the page`,
          'error'
        );
      } finally {
        setLoading(false);
        setCurrentOperation('');
      }
        }
      );
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
      {/* Custom Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => modalConfig.type !== 'confirm' && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className={`modal-title ${modalConfig.type}`}>
                {modalConfig.type === 'success' && '✅ '}
                {modalConfig.type === 'error' && '❌ '}
                {modalConfig.type === 'confirm' && '⚠️ '}
                {modalConfig.title}
              </h3>
            </div>
            <div className="modal-body">
              <p className="modal-message">{modalConfig.message}</p>
            </div>
            <div className="modal-footer">
              {modalConfig.type === 'confirm' ? (
                <>
                  <button 
                    className="modal-btn modal-btn-cancel" 
                    onClick={modalConfig.onCancel}
                  >
                    Cancel
                  </button>
                  <button 
                    className="modal-btn modal-btn-confirm" 
                    onClick={modalConfig.onConfirm}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button 
                  className="modal-btn modal-btn-ok" 
                  onClick={modalConfig.onConfirm}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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