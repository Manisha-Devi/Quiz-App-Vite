
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
      
      return true;
    } catch (error) {
      console.error('Error clearing all app data:', error);
      return false;
    }
  }

  // Migration helper - transfer from localStorage to IndexedDB
  async migrateFromLocalStorage() {
    try {
      // User settings migration
      const settingsToMigrate = [
        { key: 'darkMode', transform: (val) => val === 'true' },
        { key: 'boldMode', transform: (val) => val === 'true' },
        { key: 'quizTime', transform: (val) => parseInt(val) || 60 },
        { key: 'practiceMode', transform: (val) => val === 'true' },
        { key: 'enableDrawing', transform: (val) => val !== 'false' },
        { key: 'retryMode', transform: (val) => val === 'true' }
      ];

      for (const setting of settingsToMigrate) {
        const localValue = localStorage.getItem(setting.key);
        if (localValue !== null) {
          await this.setUserSetting(setting.key, setting.transform(localValue));
        }
      }

      // Exam data migration
      const examDataToMigrate = [
        'quizData', 'finalQuiz', 'examState', 'examMeta', 'fileImageMap'
      ];

      for (const key of examDataToMigrate) {
        const localValue = localStorage.getItem(key);
        if (localValue) {
          try {
            const parsedData = JSON.parse(localValue);
            await this.setExamData(key, parsedData);
          } catch (e) {
            console.error(`Error parsing ${key} from localStorage:`, e);
          }
        }
      }

      // Exam results migration
      const resultsToMigrate = [
        'examAnswers', 'reviewMarks', 'retryAnswers', 'retryCompleted'
      ];

      for (const key of resultsToMigrate) {
        const localValue = localStorage.getItem(key);
        if (localValue) {
          try {
            const parsedData = JSON.parse(localValue);
            await this.setExamResults(key, parsedData);
          } catch (e) {
            console.error(`Error parsing ${key} from localStorage:`, e);
          }
        }
      }

      // Mark migration as complete
      await this.setUserSetting('migrationComplete', true);
      
      console.log('Migration from localStorage to IndexedDB completed successfully');
      console.log('From now on, all data operations will use IndexedDB exclusively');
      
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      // Don't mark as complete if migration failed
      return false;
    }
  }

  // Utility method to check if we should use IndexedDB (always true after migration)
  async shouldUseIndexedDB() {
    const migrationComplete = await this.getUserSetting('migrationComplete', false);
    return migrationComplete;
  }

  // Method to ensure no localStorage usage throughout the app
  async enforceIndexedDBOnly() {
    const migrationComplete = await this.getUserSetting('migrationComplete', false);
    
    if (migrationComplete && localStorage.length > 0) {
      console.warn('localStorage data detected after migration - clearing to maintain IndexedDB-only policy');
      localStorage.clear();
    }
    
    return migrationComplete;
  }

  // Check if migration is needed - more robust version
  async checkMigrationStatus() {
    try {
      const migrationComplete = await this.getUserSetting('migrationComplete', false);
      
      if (!migrationComplete) {
        console.log('Migration not complete, starting migration...');
        const migrationSuccess = await this.migrateFromLocalStorage();
        
        if (migrationSuccess) {
          // Clear localStorage completely after successful migration
          try {
            localStorage.clear();
            console.log('localStorage cleared after migration');
          } catch (error) {
            console.warn('Could not clear localStorage:', error);
          }
        }
        
        return migrationSuccess;
      }
      
      console.log('Migration already completed, using IndexedDB exclusively');
      return true;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  // Enhanced migration with better error handling
  async migrateFromLocalStorage() {
    try {
      console.log('Starting migration from localStorage to IndexedDB...');
      
      // Check if there's any localStorage data to migrate
      const hasLocalStorageData = localStorage.length > 0;
      
      if (!hasLocalStorageData) {
        console.log('No localStorage data found, marking migration as complete');
        await this.setUserSetting('migrationComplete', true);
        return true;
      }
}

// Create singleton instance
const dataManager = new DataManager();

export default dataManager;
