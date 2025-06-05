
import { storeJSONFile, storeJSONImage } from './indexedDB';

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

// Function to load images associated with JSON files
export const loadJSONImagesFromFolders = async () => {
  try {
    // Get all available JSON file names
    const jsonFiles = getAvailableJSONFiles();
    
    for (const jsonFileName of jsonFiles) {
      // Create folder name by replacing spaces with underscores
      const folderName = jsonFileName.replace(/\s+/g, '_');
      
      try {
        // Try to import images from the corresponding folder
        const imageModules = import.meta.glob(`../json/${folderName}/*.(png|jpg|jpeg|gif|webp)`, { eager: false });
        
        console.log(`Found images for ${jsonFileName}:`, Object.keys(imageModules));
        
        // Process each image file
        for (const imagePath in imageModules) {
          try {
            // Get the image file name
            const imageName = imagePath.split('/').pop();
            
            // Import the image as a URL
            const imageModule = await imageModules[imagePath]();
            const imageUrl = imageModule.default;
            
            // Convert image URL to blob data
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            
            reader.onload = async () => {
              // Store image in jsonImages IndexedDB store
              await storeJSONImage(jsonFileName, imageName, reader.result);
              console.log(`Stored image ${imageName} for ${jsonFileName} in jsonImages store`);
            };
            
            reader.readAsDataURL(blob);
          } catch (error) {
            console.error(`Error loading image ${imagePath}:`, error);
          }
        }
      } catch (error) {
        console.log(`No images folder found for ${jsonFileName} (${folderName})`);
      }
    }
    
    console.log('All JSON images loaded into jsonImages IndexedDB store');
  } catch (error) {
    console.error('Error loading JSON images:', error);
  }
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

// Function to get images for a specific JSON file
export const getJSONImagesFromStore = async (jsonFileName) => {
  try {
    const { getAllJSONImages } = await import('./indexedDB');
    return await getAllJSONImages(jsonFileName);
  } catch (error) {
    console.error(`Error fetching images for ${jsonFileName}:`, error);
    return [];
  }
};

// Function to get a specific image for a JSON file
export const getSpecificJSONImage = async (jsonFileName, imageName) => {
  try {
    const { getJSONImage } = await import('./indexedDB');
    return await getJSONImage(jsonFileName, imageName);
  } catch (error) {
    console.error(`Error fetching image ${imageName} for ${jsonFileName}:`, error);
    return null;
  }
};
