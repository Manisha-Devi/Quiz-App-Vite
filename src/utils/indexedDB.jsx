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
      const jsonImagesStore = db.createObjectStore("jsonImages", { keyPath: "id" });
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
    const transaction = db.transaction(['jsonImages'], 'readwrite');
    const store = transaction.objectStore('jsonImages');

    await store.put({
      id: `${jsonFileName}_${imageName}`,
      jsonFileName,
      imageName,
      imageData,
      timestamp: Date.now()
    });

    console.log(`Image ${imageName} stored for ${jsonFileName}`);
  } catch (error) {
    console.error('Error storing JSON image:', error);
  }
};

// Function to retrieve all images for a specific JSON file
export const getJSONImages = async (jsonFileName) => {
  try {
    const db = await openDb();
    const transaction = db.transaction(['jsonImages'], 'readonly');
    const store = transaction.objectStore('jsonImages');
    const index = store.index('by_json_file');

    const images = await index.getAll(jsonFileName);

    return images.map(image => ({
      name: image.imageName,
      data: image.imageData
    }));
  } catch (error) {
    console.error('Error retrieving JSON images:', error);
    return [];
  }
};

// Get image associated with JSON file from dedicated jsonImages store
export const getJSONImage = async (jsonFileName, imageName) => {
  const db = await openDb();
  const transaction = db.transaction("jsonImages", "readonly");
  const store = transaction.objectStore("jsonImages");

  return new Promise((resolve, reject) => {
    const request = store.get(`${jsonFileName}_${imageName}`);
    request.onsuccess = () => resolve(request.result?.imageData || null);
    request.onerror = () => reject("Error fetching JSON image");
  });
};

// Get all images for a specific JSON file
export const getAllJSONImages = async (jsonFileName) => {
  const db = await openDb();
  const transaction = db.transaction("jsonImages", "readonly");
  const store = transaction.objectStore("jsonImages");
  const index = store.index("by_json_file");

  return new Promise((resolve, reject) => {
    const request = index.getAll(jsonFileName);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject("Error fetching JSON images");
  });
};

// Clear all images for a specific JSON file
export const clearJSONImages = async (jsonFileName) => {
  const db = await openDb();
  const transaction = db.transaction("jsonImages", "readwrite");
  const store = transaction.objectStore("jsonImages");
  const index = store.index("by_json_file");

  return new Promise((resolve, reject) => {
    const request = index.getAll(jsonFileName);
    request.onsuccess = () => {
      const images = request.result;
      const deletePromises = images.map(image => store.delete(image.id));
      Promise.all(deletePromises).then(() => resolve()).catch(reject);
    };
    request.onerror = () => reject("Error clearing JSON images");
  });
};

// Clear all JSON images from dedicated jsonImages store
export const clearAllJSONImages = async () => {
  const db = await openDb();
  const transaction = db.transaction("jsonImages", "readwrite");
  const store = transaction.objectStore("jsonImages");
  return store.clear();
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