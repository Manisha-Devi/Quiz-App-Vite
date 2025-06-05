
import { storeText } from './indexedDB';

// Function to dynamically import all JSON files from the json folder
export const loadJSONFilesToStorage = async () => {
  try {
    // Import all JSON files from the json folder
    const jsonModules = import.meta.glob('../json/*.json');
    
    console.log('Found JSON files:', Object.keys(jsonModules));
    
    // Process each JSON file
    for (const path in jsonModules) {
      try {
        // Get the file name without extension
        const fileName = path.split('/').pop().replace('.json', '');
        
        // Import the JSON content
        const module = await jsonModules[path]();
        const jsonData = module.default;
        
        // Store in IndexedDB
        await storeText(jsonData, fileName);
        
        console.log(`Stored ${fileName} in IndexedDB`);
      } catch (error) {
        console.error(`Error loading ${path}:`, error);
      }
    }
    
    console.log('All JSON files loaded into IndexedDB');
  } catch (error) {
    console.error('Error loading JSON files:', error);
  }
};

// Function to get available JSON file names
export const getAvailableJSONFiles = () => {
  const jsonModules = import.meta.glob('../json/*.json');
  return Object.keys(jsonModules).map(path => 
    path.split('/').pop().replace('.json', '')
  );
};
