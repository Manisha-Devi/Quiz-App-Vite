// src/hooks/useStorage.js
import { useState, useEffect } from "react";
import { openDb, storeData, getData } from "../utils/indexedDB"; // IndexedDB utils

const useStorage = (key, storageType = "localStorage") => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      let loadedData = null;

      if (storageType === "localStorage") {
        loadedData = localStorage.getItem(key);
        setData(loadedData ? JSON.parse(loadedData) : null);
      } else if (storageType === "indexedDB") {
        try {
          loadedData = await getData("texts", key); // Using indexedDB
          setData(loadedData || null);
        } catch (error) {
          console.error("Error loading from IndexedDB:", error);
        }
      }
    };

    loadData();
  }, [key, storageType]);

  const saveData = async (newData) => {
    if (storageType === "localStorage") {
      localStorage.setItem(key, JSON.stringify(newData));
    } else if (storageType === "indexedDB") {
      await storeData("texts", { id: key, content: newData });
    }
    setData(newData);
  };

  const clearData = async () => {
    if (storageType === "localStorage") {
      localStorage.removeItem(key);
    } else if (storageType === "indexedDB") {
      await storeData("texts", { id: key, content: null });
    }
    setData(null);
  };

  return {
    data,
    saveData,
    clearData,
  };
};

export default useStorage;
