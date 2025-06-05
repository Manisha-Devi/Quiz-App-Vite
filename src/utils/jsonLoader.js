
import { storeJSONFile } from './indexedDB';

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
        
        // Store in dedicated jsonFiles IndexedDB store
        await storeJSONFile(fileName, jsonData);
        
        console.log(`Stored ${fileName} in jsonFiles IndexedDB store`);
      } catch (error) {
        console.error(`Error loading ${path}:`, error);
      }
    }
    
    console.log('All JSON files loaded into dedicated jsonFiles IndexedDB store');
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

// Function to get JSON file from dedicated jsonFiles store
export const getJSONFileFromStore = async (filename) => {
  try {
    const { getJSONFile } = await import('./indexedDB');
    return await getJSONFile(filename);
  } catch (error) {
    console.error(`Error fetching ${filename} from jsonFiles store:`, error);
    return null;
  }
};
