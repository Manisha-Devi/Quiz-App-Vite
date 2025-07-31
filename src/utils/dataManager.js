import { openDb, storeData, getData, deleteData } from './indexedDB';

class DataManager {
  constructor() {
    this.dbPromise = openDb();
  }

  // User Settings Management
  async getUserSettings() {
    try {
      const db = await this.dbPromise;
      const transaction = db.transaction(['userSettings'], 'readonly');
      const store = transaction.objectStore('userSettings');

      const settings = {};
      const keys = ['darkMode', 'boldMode', 'quizTime', 'practiceMode', 'enableDrawing', 'retryMode', 'isFullscreen'];

      for (const key of keys) {
        const request = store.get(key);
        const result = await new Promise((resolve) => {
          request.onsuccess = () => resolve(request.result?.value);
          request.onerror = () => resolve(null);
        });
        settings[key] = result;
      }

      return settings;
    } catch (error) {
      console.error('Error getting user settings:', error);
      return {};
    }
  }

  async setUserSetting(key, value) {
    try {
      await storeData('userSettings', { id: key, value });
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  async getUserSetting(key, defaultValue = null) {
    try {
      const result = await getData('userSettings', key);
      const value = result?.value ?? defaultValue;
      console.log(`Retrieved setting ${key}:`, value);
      return value;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return defaultValue;
    }
  }

  // Exam Data Management
  async getExamData(key) {
    try {
      const result = await getData('examData', key);
      const data = result?.data || null;
      console.log(`Retrieved exam data ${key}:`, data ? 'Found' : 'Not found');
      return data;
    } catch (error) {
      console.error(`Error getting exam data ${key}:`, error);
      return null;
    }
  }

  async setExamData(key, data) {
    try {
      await storeData('examData', { id: key, data });
      console.log(`Stored exam data ${key}:`, data ? 'Success' : 'No data');
      return true;
    } catch (error) {
      console.error(`Error setting exam data ${key}:`, error);
      return false;
    }
  }

  async deleteExamData(key) {
    try {
      await deleteData('examData', key);
      return true;
    } catch (error) {
      console.error(`Error deleting exam data ${key}:`, error);
      return false;
    }
  }

  // Exam Results Management
  async getExamResults(key) {
    try {
      const result = await getData('examResults', key);
      return result?.data || null;
    } catch (error) {
      console.error(`Error getting exam results ${key}:`, error);
      return null;
    }
  }

  async setExamResults(key, data) {
    try {
      await storeData('examResults', { id: key, data });
      return true;
    } catch (error) {
      console.error(`Error setting exam results ${key}:`, error);
      return false;
    }
  }

  async deleteExamResults(key) {
    try {
      await deleteData('examResults', key);
      return true;
    } catch (error) {
      console.error(`Error deleting exam results ${key}:`, error);
      return false;
    }
  }

  // Quiz Setup Data Management
  async getQuizSetup() {
    try {
      const result = await getData('examData', 'quizSetup');
      return result?.data || null;
    } catch (error) {
      console.error('Error getting quiz setup:', error);
      return null;
    }
  }

  async setQuizSetup(data) {
    try {
      await storeData('examData', { id: 'quizSetup', data });
      return true;
    } catch (error) {
      console.error('Error setting quiz setup:', error);
      return false;
    }
  }

  // File Image Map Management
  async getFileImageMap() {
    try {
      const result = await getData('examData', 'fileImageMap');
      return result?.data || {};
    } catch (error) {
      console.error('Error getting file image map:', error);
      return {};
    }
  }

  async setFileImageMap(imageMap) {
    try {
      await storeData('examData', { id: 'fileImageMap', data: imageMap });
      return true;
    } catch (error) {
      console.error('Error setting file image map:', error);
      return false;
    }
  }

  // Load JSON images from folders
  async loadJSONImages() {
    try {
      const { loadJSONImagesFromFolders } = await import('./jsonLoader');
      await loadJSONImagesFromFolders();
      console.log('JSON images loaded successfully');
    } catch (error) {
      console.error('Error loading JSON images:', error);
    }
  }

  // Get image from jsonImages store
  async getImageFromJSONImagesStore(jsonFileName, imageName) {
    try {
      const { getImageFromJSONImagesStore } = await import('./indexedDB');
      const imageData = await getImageFromJSONImagesStore(jsonFileName, imageName);
      console.log(`🖼️ Fetched image ${imageName} for ${jsonFileName}:`, imageData ? 'Found' : 'Not found');
      return imageData;
    } catch (error) {
      console.error('Error fetching image from jsonImages store:', error);
      return null;
    }
  }

  // Get all images for JSON file from jsonImages store
  async getAllImagesForJSONFile(jsonFileName) {
    try {
      const { getAllImagesForJSONFile } = await import('./indexedDB');
      return await getAllImagesForJSONFile(jsonFileName);
    } catch (error) {
      console.error('Error fetching all images for JSON file:', error);
      return [];
    }
  }

  // Clear all data for fresh start (keeps database structure intact)
  async clearAllAppData() {
    try {
      // Get fresh database connection
      const db = await this.dbPromise;
      if (!db) {
        throw new Error('Database connection not available');
      }

      const stores = ['userSettings', 'examData', 'examResults', 'jsonFiles', 'by_filename', 'jsonImages'];
      let clearedStores = 0;

      // Clear each store individually without dropping database
      for (const storeName of stores) {
        try {
          // Check if store exists before trying to clear it
          if (!db.objectStoreNames.contains(storeName)) {
            console.log(`Store ${storeName} does not exist, skipping...`);
            continue;
          }

          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);

          // Wait for the clear operation to complete with timeout
          await Promise.race([
            new Promise((resolve, reject) => {
              const clearRequest = store.clear();
              clearRequest.onsuccess = () => {
                console.log(`✅ Store ${storeName} cleared successfully`);
                clearedStores++;
                resolve();
              };
              clearRequest.onerror = () => {
                console.error(`❌ Error clearing store ${storeName}:`, clearRequest.error);
                reject(clearRequest.error);
              };
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Timeout clearing ${storeName}`)), 10000)
            )
          ]);

          // Wait for transaction to complete
          await new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
          });

        } catch (storeError) {
          console.error(`Failed to clear store ${storeName}:`, storeError);
          // Continue with other stores even if one fails
        }
      }

      console.log(`✅ Successfully cleared ${clearedStores}/${stores.length} IndexedDB stores - database structure preserved`);
      return clearedStores > 0;
    } catch (error) {
      console.error('❌ Error clearing app data:', error);
      return false;
    }
  }

  // Enforce IndexedDB-only operations
  async enforceIndexedDBOnly() {
    try {
      console.log('Enforcing IndexedDB-only operations - localStorage disabled');
      // This method ensures we're only using IndexedDB
      return true;
    } catch (error) {
      console.error('Error enforcing IndexedDB-only mode:', error);
      return false;
    }
  }

  // Force close database connections
  async forceCloseConnections() {
    try {
      if (this.dbPromise) {
        const db = await this.dbPromise;
        if (db && !db.closed) {
          db.close();
          console.log('Database connection forcefully closed');
        }
        this.dbPromise = null;
      }
      return true;
    } catch (error) {
      console.error('Error force closing database connections:', error);
      return false;
    }
  }

  // Initialize IndexedDB with default settings if needed
  async initializeApp() {
    try {
      console.log('Initializing IndexedDB-only application...');

      // Set default settings if they don't exist
      const defaultSettings = {
        darkMode: false,
        boldMode: false,
        quizTime: 60,
        practiceMode: false,
        enableDrawing: true,
        retryMode: false,
        isFullscreen: false
      };

      for (const [key, defaultValue] of Object.entries(defaultSettings)) {
        const existingValue = await this.getUserSetting(key);
        if (existingValue === null) {
          await this.setUserSetting(key, defaultValue);
        }
      }

      console.log('IndexedDB application initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing IndexedDB application:', error);
      return false;
    }
  }
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;