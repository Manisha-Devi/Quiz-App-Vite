// src/utils/indexedDB.js

// Open the IndexedDB database
export const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("quizDatabase", 1);

    request.onerror = (event) => {
      reject("Error opening IndexedDB");
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Images store
      const imageStore = db.createObjectStore("images", { keyPath: "id" });
      imageStore.createIndex("by_name", "name", { unique: true });
      
      // Texts store
      db.createObjectStore("texts", { keyPath: "id" });
      
      // Quiz results store
      const resultsStore = db.createObjectStore("quizResults", { keyPath: "id", autoIncrement: true });
      resultsStore.createIndex("by_date", "date", { unique: false });
      resultsStore.createIndex("by_score", "score", { unique: false });
      
      // User progress store
      const progressStore = db.createObjectStore("userProgress", { keyPath: "id" });
      progressStore.createIndex("by_category", "category", { unique: false });
      
      // Offline quiz cache
      db.createObjectStore("quizCache", { keyPath: "id" });
    };
  });
};

// Store image in IndexedDB
export const storeImage = async (imageFile, filename) => {
  const db = await openDb();
  const transaction = db.transaction("images", "readwrite");
  const store = transaction.objectStore("images");

  const reader = new FileReader();
  reader.onload = (event) => {
    const imageData = event.target.result;
    const image = {
      id: filename,
      name: filename,
      data: imageData,
    };

    store.put(image); // Store image data
  };

  reader.readAsDataURL(imageFile);
};

// Store text data (JSON content) in IndexedDB
export const storeData = async (storeName, data) => {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  return store.put(data);
};

// Get data from IndexedDB
export const getData = async (storeName, key) => {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.content || null);
    request.onerror = () => reject("Error fetching data");
  });
};

// Get image data from IndexedDB by filename
export const getImage = async (filename) => {
  const db = await openDb();
  const transaction = db.transaction("images", "readonly");
  const store = transaction.objectStore("images");

  const request = store.get(filename);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result ? request.result.data : null);
    };

    request.onerror = () => {
      reject("Error fetching image");
    };
  });
};

// Get text data (JSON content) from IndexedDB by key
export const getText = async (key) => {
  const db = await openDb();
  const transaction = db.transaction("texts", "readonly");
  const store = transaction.objectStore("texts");

  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result ? request.result.content : null);
    };

    request.onerror = () => {
      reject("Error fetching text");
    };
  });
};

// Clear all data in IndexedDB (both images and texts)
export const clearDatabase = async () => {
  const db = await openDb();
  const transaction = db.transaction(["images", "texts"], "readwrite");

  transaction.objectStore("images").clear(); // Clear images store
  transaction.objectStore("texts").clear(); // Clear texts store
};

// Delete the IndexedDB database entirely
export const deleteDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("quizDatabase");

    request.onsuccess = () => {
      resolve("Database deleted successfully");
    };

    request.onerror = () => {
      reject("Error deleting the database");
    };

    request.onblocked = () => {
      reject("Database deletion is blocked (possibly open in another tab or window)");
    };
  });
};