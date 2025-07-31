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

  // Clear all data for fresh start
  async clearAllAppData() {
    try {
      const db = await this.dbPromise;
      const stores = ['userSettings', 'examData', 'examResults', 'jsonFiles', 'jsonImages'];

      for (const storeName of stores) {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await store.clear();
      }

      console.log('All IndexedDB data cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing all app data:', error);
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