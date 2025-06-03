
import { useState, useEffect } from 'react';
import { storeData, getData, openDb } from '../utils/indexedDB';

const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [localQuizzes, setLocalQuizzes] = useState([]);

  useEffect(() => {
    loadLocalQuizzes();
    
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      syncPendingData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadLocalQuizzes = async () => {
    try {
      const db = await openDb();
      const transaction = db.transaction('quizCache', 'readonly');
      const store = transaction.objectStore('quizCache');
      const request = store.getAll();
      
      request.onsuccess = () => {
        setLocalQuizzes(request.result || []);
      };
    } catch (error) {
      console.error('Failed to load local quizzes:', error);
    }
  };

  const saveQuizToLocal = async (quizData, quizName) => {
    try {
      const quizEntry = {
        id: `quiz_${Date.now()}`,
        name: quizName,
        data: quizData,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };
      
      await storeData('quizCache', quizEntry);
      setLocalQuizzes(prev => [...prev, quizEntry]);
      return true;
    } catch (error) {
      console.error('Failed to save quiz locally:', error);
      return false;
    }
  };

  const saveQuizResult = async (resultData) => {
    try {
      const result = {
        id: `result_${Date.now()}`,
        ...resultData,
        date: new Date().toISOString(),
        synced: false
      };
      
      await storeData('quizResults', result);
      
      if (!isOnline) {
        const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
        pending.push({ type: 'result', data: result });
        localStorage.setItem('pendingSync', JSON.stringify(pending));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save result:', error);
      return false;
    }
  };

  const getLocalResults = async () => {
    try {
      const db = await openDb();
      const transaction = db.transaction('quizResults', 'readonly');
      const store = transaction.objectStore('quizResults');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject('Failed to fetch results');
      });
    } catch (error) {
      console.error('Failed to get local results:', error);
      return [];
    }
  };

  const syncPendingData = async () => {
    try {
      const pendingSync = JSON.parse(localStorage.getItem('pendingSync') || '[]');
      
      if (pendingSync.length > 0) {
        console.log('Syncing pending data:', pendingSync);
        // Here you can add actual sync logic if needed
        localStorage.removeItem('pendingSync');
      }
      
      setSyncStatus('synced');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  };

  const saveOfflineData = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      if (!isOnline) {
        const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
        pending.push({ key, timestamp: Date.now(), type: 'data' });
        localStorage.setItem('pendingSync', JSON.stringify(pending));
      }
      return true;
    } catch (error) {
      console.error('Failed to save offline data:', error);
      return false;
    }
  };

  return {
    isOnline,
    syncStatus,
    localQuizzes,
    saveOfflineData,
    saveQuizToLocal,
    saveQuizResult,
    getLocalResults,
    syncPendingData,
    loadLocalQuizzes
  };
};

export default useOfflineStorage;
