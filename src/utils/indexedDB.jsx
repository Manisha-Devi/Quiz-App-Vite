
// src/utils/indexedDB.js

// Open the IndexedDB database
export const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("quizDatabase", 2);

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

      // JSON files store - dedicated store for JSON files from json folder
      const jsonFilesStore = db.createObjectStore("jsonFiles", { keyPath: "filename" });
      jsonFilesStore.createIndex("by_filename", "filename", { unique: true });

      // JSON Images store - dedicated store for images associated with JSON files
      const byFilenameStore = db.createObjectStore("by_filename", { keyPath: "folderName" });
      byFilenameStore.createIndex("by_imagename", "images.name", { unique: false });
      byFilenameStore.createIndex("by_json_file", "folderName", { unique: false });

      // Exam data store - for exam state, questions, meta data
      db.createObjectStore("examData", { keyPath: "id" });

      // User settings store - for dark mode, bold mode, etc.
      db.createObjectStore("userSettings", { keyPath: "id" });

      // Exam results store - for answers and review marks
      db.createObjectStore("examResults", { keyPath: "id" });
    };
  });
};

// Store image in IndexedDB
export const storeImage = async (imageData, imageName, jsonFileName = null) => {
  const db = await openDb();
  
  if (jsonFileName) {
    // Store in jsonImages store for JSON-associated images
    return storeJSONImage(jsonFileName, imageName, imageData);
  } else {
    // Store in regular images store
    const transaction = db.transaction("images", "readwrite");
    const store = transaction.objectStore("images");

    const image = {
      id: imageName,
      name: imageName,
      data: imageData,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(image);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error storing image");
    });
  }
};

// Store text data (JSON content) in IndexedDB
export const storeData = async (storeName, data) => {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  return store.put(data);
};

// Store text content in IndexedDB texts store
export const storeText = async (content, key) => {
  const db = await openDb();
  const transaction = db.transaction("texts", "readwrite");
  const store = transaction.objectStore("texts");

  const textData = {
    id: key,
    content: content
  };

  return store.put(textData);
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

// Store JSON file data in dedicated jsonFiles store
export const storeJSONFile = async (filename, jsonData) => {
  const db = await openDb();
  const transaction = db.transaction("jsonFiles", "readwrite");
  const store = transaction.objectStore("jsonFiles");

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

// Store image associated with JSON file in dedicated jsonImages store
export const storeJSONImage = async (jsonFileName, imageName, imageData) => {
  try {
    const db = await openDb();
    const transaction = db.transaction(['by_filename'], 'readwrite');
    const store = transaction.objectStore('by_filename');

    // Get existing folder data or create new
    const existingData = await new Promise((resolve) => {
      const request = store.get(jsonFileName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    const folderData = existingData || {
      folderName: jsonFileName,
      images: [],
      timestamp: Date.now()
    };

    // Check if image already exists, if not add it
    const existingImageIndex = folderData.images.findIndex(img => img.name === imageName);
    const imageObj = {
      name: imageName,
      data: imageData,
      timestamp: Date.now()
    };

    if (existingImageIndex >= 0) {
      folderData.images[existingImageIndex] = imageObj;
    } else {
      folderData.images.push(imageObj);
    }

    await store.put(folderData);

    console.log(`Image ${imageName} stored for folder ${jsonFileName}`);
  } catch (error) {
    console.error('Error storing JSON image:', error);
  }
};

// Function to retrieve all images for a specific JSON file
export const getJSONImages = async (jsonFileName) => {
  try {
    const db = await openDb();
    const transaction = db.transaction(['by_filename'], 'readonly');
    const store = transaction.objectStore('by_filename');

    const folderData = await new Promise((resolve) => {
      const request = store.get(jsonFileName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });

    return folderData ? folderData.images : [];
  } catch (error) {
    console.error('Error retrieving JSON images:', error);
    return [];
  }
};

// Get image associated with JSON file from dedicated jsonImages store
export const getJSONImage = async (jsonFileName, imageName) => {
  try {
    const db = await openDb();
    const transaction = db.transaction("by_filename", "readonly");
    const store = transaction.objectStore("by_filename");

    const folderData = await new Promise((resolve, reject) => {
      const request = store.get(jsonFileName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject("Error fetching JSON image");
    });

    if (folderData && folderData.images) {
      const image = folderData.images.find(img => img.name === imageName);
      return image ? image.data : null;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching JSON image:", error);
    return null;
  }
};

// Get all images for a specific JSON file
export const getAllJSONImages = async (jsonFileName) => {
  try {
    const db = await openDb();
    const transaction = db.transaction("by_filename", "readonly");
    const store = transaction.objectStore("by_filename");

    const folderData = await new Promise((resolve, reject) => {
      const request = store.get(jsonFileName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject("Error fetching JSON images");
    });

    return folderData ? folderData.images : [];
  } catch (error) {
    console.error("Error fetching JSON images:", error);
    return [];
  }
};

// Clear all images for a specific JSON file
export const clearJSONImages = async (jsonFileName) => {
  try {
    const db = await openDb();
    const transaction = db.transaction("by_filename", "readwrite");
    const store = transaction.objectStore("by_filename");

    await new Promise((resolve, reject) => {
      const request = store.delete(jsonFileName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject("Error clearing JSON images");
    });

    console.log(`Cleared all images for ${jsonFileName}`);
  } catch (error) {
    console.error("Error clearing JSON images:", error);
  }
};

// Clear all JSON images from dedicated jsonImages store
export const clearAllJSONImages = async () => {
  const db = await openDb();
  const transaction = db.transaction("by_filename", "readwrite");
  const store = transaction.objectStore("by_filename");
  return store.clear();
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
  const stores = ['userSettings', 'examData', 'examResults', 'jsonFiles', 'by_filename', 'images', 'texts'];
  
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
