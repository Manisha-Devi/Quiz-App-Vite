
import { deleteDatabase } from './indexedDB';

export const clearAllAppData = async () => {
  try {
    // Clear localStorage completely
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear IndexedDB completely
    await deleteDatabase();
    
    // Clear service worker cache if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Clear cookies (if on same domain)
    if (document.cookie) {
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    }
    
    console.log("All application data cleared successfully");
    return true;
  } catch (error) {
    console.error("Error clearing application data:", error);
    return false;
  }
};

export const clearSpecificData = (keys = []) => {
  try {
    keys.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error("Error clearing specific data:", error);
    return false;
  }
};
