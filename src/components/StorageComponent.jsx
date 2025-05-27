// src/components/StorageComponent.js
import React, { useState } from "react";
import useStorage from "../hooks/useStorage";

const StorageComponent = ({ storageKey }) => {
  const [storageType, setStorageType] = useState("localStorage"); // Default storage to localStorage
  const { data, saveData, clearData } = useStorage(storageKey, storageType);

  const handleSave = () => {
    const newData = { value: Math.random() * 100 }; // Example data to save
    saveData(newData);
  };

  const handleClear = () => {
    clearData();
  };

  return (
    <div>
      <h3>Storage Component</h3>

      <div>
        <label>Select Storage Type:</label>
        <select onChange={(e) => setStorageType(e.target.value)} value={storageType}>
          <option value="localStorage">LocalStorage</option>
          <option value="indexedDB">IndexedDB</option>
        </select>
      </div>

      <div>
        <button onClick={handleSave}>Save Data</button>
        <button onClick={handleClear}>Clear Data</button>
      </div>

      <div>
        <h4>Stored Data:</h4>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  );
};

export default StorageComponent;
