
// src/utils/indexedDB.js

// Open the IndexedDB database
export const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("quizDatabase", 3);

    request.onerror = (event) => {
      reject("Error opening IndexedDB");
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Clear all existing stores
      const storeNames = ['jsonFiles', 'jsonImages', 'examData', 'userSettings', 'examResults'];
      storeNames.forEach(storeName => {
        if (db.objectStoreNames.contains(storeName)) {
          db.deleteObjectStore(storeName);
        }
      });

      // JSON files store - dedicated store for JSON files from json folder
      const jsonFilesStore = db.createObjectStore("jsonFiles", { keyPath: "filename" });

      // JSON Images store - structure with jsonFileName and imageName keys
      const jsonImagesStore = db.createObjectStore("jsonImages", { keyPath: ["jsonFileName", "imageName"] });
      jsonImagesStore.createIndex("by_json_file", "jsonFileName", { unique: false });
      jsonImagesStore.createIndex("by_image_name", "imageName", { unique: false });

      // Exam data store - for exam state, questions, meta data
      db.createObjectStore("examData", { keyPath: "id" });

      // User settings store - for dark mode, bold mode, etc.
      db.createObjectStore("userSettings", { keyPath: "id" });

      // Exam results store - for answers and review marks
      db.createObjectStore("examResults", { keyPath: "id" });
    };
  });
};

// Store image in IndexedDB - only for JSON-associated images
export const storeImage = async (imageData, imageName, jsonFileName) => {
  if (!jsonFileName) {
    throw new Error("jsonFileName is required for storing images");
  }
  return storeJSONImage(jsonFileName, imageName, imageData);
};

// Store text data (JSON content) in IndexedDB
export const storeData = async (storeName, data) => {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  return store.put(data);
};

// Get data from IndexedDB - Fixed to return the actual object
export const getData = async (storeName, key) => {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject("Error fetching data");
  });
};

// Store JSON file data in dedicated jsonFiles store
export const storeJSONFile = async (filename, jsonData) => {
  const db = await openDb();
  const transaction = db.transaction("jsonFiles", "readwrite");
  const store = transaction.objectStore(jsonFiles);

  const fileData = {
    filename: filename,
    data: jsonData,
    storedAt: new Date().toISOString()
  };

  return store.put(fileData);
};

// Get JSON file data from dedicated jsonFiles store
export const getJSONFile = async (filename) => {
  const db = await openDb();
  const transaction = db.transaction("jsonFiles", "readonly");
  const store = transaction.objectStore("jsonFiles");

  return new Promise((resolve, reject) => {
    const request = store.get(filename);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject("Error fetching JSON file");
  });
};

// Get all JSON files from dedicated jsonFiles store
export const getAllJSONFiles = async () => {
  const db = await openDb();
  const transaction = db.transaction("jsonFiles", "readonly");
  const store = transaction.objectStore("jsonFiles");

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject("Error fetching all JSON files");
  });
};

// Clear all JSON files from dedicated jsonFiles store
export const clearJSONFiles = async () => {
  const db = await openDb();
  const transaction = db.transaction("jsonFiles", "readwrite");
  const store = transaction.objectStore("jsonFiles");
  return store.clear();
};

// Store image associated with JSON file in jsonImages store
export const storeJSONImage = async (jsonFileName, imageName, imageData) => {
  return storeImageInJSONImagesStore(jsonFileName, imageName, imageData);
};

// Function to retrieve all images for a specific JSON file
export const getJSONImages = async (jsonFileName) => {
  return getAllImagesForJSONFile(jsonFileName);
};

// Get image associated with JSON file from jsonImages store
export const getJSONImage = async (jsonFileName, imageName) => {
  return getImageFromJSONImagesStore(jsonFileName, imageName);
};

// Get all images for a specific JSON file
export const getAllJSONImages = async (jsonFileName) => {
  return getAllImagesForJSONFile(jsonFileName);
};

// Clear all images for a specific JSON file
export const clearJSONImages = async (jsonFileName) => {
  return clearImagesForJSONFile(jsonFileName);
};

// Clear all JSON images from jsonImages store
export const clearAllJSONImages = async () => {
  const db = await openDb();
  const transaction = db.transaction("jsonImages", "readwrite");
  const store = transaction.objectStore("jsonImages");
  return store.clear();
};

// Store image in jsonImages store with jsonFileName and imageName keys
export const storeImageInJSONImagesStore = async (jsonFileName, imageName, imageData) => {
  try {
    const db = await openDb();
    const transaction = db.transaction(['jsonImages'], 'readwrite');
    const store = transaction.objectStore('jsonImages');

    const imageRecord = {
      jsonFileName: jsonFileName,
      imageName: imageName,
      data: imageData,
      timestamp: Date.now()
    };

    await new Promise((resolve, reject) => {
      const request = store.put(imageRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`✅ Image ${imageName} stored for ${jsonFileName} in jsonImages store`);
  } catch (error) {
    console.error('Error storing image in jsonImages store:', error);
  }
};

// Get image from jsonImages store using jsonFileName and imageName
export const getImageFromJSONImagesStore = async (jsonFileName, imageName) => {
  try {
    const db = await openDb();
    const transaction = db.transaction(['jsonImages'], 'readonly');
    const store = transaction.objectStore('jsonImages');

    const imageRecord = await new Promise((resolve, reject) => {
      const request = store.get([jsonFileName, imageName]);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return imageRecord ? imageRecord.data : null;
  } catch (error) {
    console.error('Error getting image from jsonImages store:', error);
    return null;
  }
};

// Get all images for a specific JSON file from jsonImages store
export const getAllImagesForJSONFile = async (jsonFileName) => {
  try {
    const db = await openDb();
    const transaction = db.transaction(['jsonImages'], 'readonly');
    const store = transaction.objectStore('jsonImages');
    const index = store.index('by_json_file');

    const images = await new Promise((resolve, reject) => {
      const request = index.getAll(jsonFileName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return images || [];
  } catch (error) {
    console.error('Error getting all images for JSON file:', error);
    return [];
  }
};

// Clear all images for a specific JSON file from jsonImages store
export const clearImagesForJSONFile = async (jsonFileName) => {
  try {
    const db = await openDb();
    const transaction = db.transaction(['jsonImages'], 'readwrite');
    const store = transaction.objectStore('jsonImages');
    const index = store.index('by_json_file');

    const images = await new Promise((resolve, reject) => {
      const request = index.getAll(jsonFileName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const image of images) {
      await new Promise((resolve, reject) => {
        const deleteRequest = store.delete([image.jsonFileName, image.imageName]);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
    }

    console.log(`✅ Cleared all images for ${jsonFileName} from jsonImages store`);
  } catch (error) {
    console.error('Error clearing images for JSON file:', error);
  }
};

// Delete data from any store
export const deleteData = async (storeName, id) => {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve("Data deleted successfully");
    request.onerror = () => reject("Error deleting data");
  });
};

// Clear entire database
export const clearDatabase = async () => {
  const db = await openDb();
  const stores = ['userSettings', 'examData', 'examResults', 'jsonFiles', 'jsonImages'];
  
  for (const storeName of stores) {
    try {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await store.clear();
    } catch (error) {
      console.error(`Error clearing store ${storeName}:`, error);
    }
  }
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
