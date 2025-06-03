
import { useState, useEffect } from 'react';

const useOfflineStorage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('synced');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      // Sync any pending data when coming back online
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

  const syncPendingData = async () => {
    try {
      // Check for any pending quiz results in localStorage
      const pendingResults = localStorage.getItem('pendingResults');
      if (pendingResults) {
        // Process pending data when online
        console.log('Syncing pending results:', pendingResults);
        // You can add actual sync logic here
        localStorage.removeItem('pendingResults');
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
        // Mark as pending sync
        const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
        pending.push({ key, timestamp: Date.now() });
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
    saveOfflineData,
    syncPendingData
  };
};

export default useOfflineStorage;
