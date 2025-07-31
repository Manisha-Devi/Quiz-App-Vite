
import { storeJSONFile, storeJSONImage, getAllJSONFiles, clearJSONFiles } from './indexedDB';

// Helper function to get available JSON file names
export const getAvailableJSONFiles = () => {
  // Get JSON files from the glob pattern
  const jsonModules = import.meta.glob('../json/*.json');
  return Object.keys(jsonModules).map(path => 
    path.split('/').pop().replace('.json', '')
  );
};

// Function to dynamically import all JSON files from the json folder
export const loadJSONFilesToStorage = async () => {
  try {
    // Import all JSON files from the json folder
    const jsonModules = import.meta.glob('../json/*.json');
    
    console.log('Found JSON files:', Object.keys(jsonModules));
    
    // Get current file names from the file system
    const currentFileNames = Object.keys(jsonModules).map(path => 
      path.split('/').pop().replace('.json', '')
    );
    
    // Get existing files from IndexedDB
    const existingFiles = await getAllJSONFiles();
    const existingFileNames = existingFiles.map(file => file.filename);
    
    // Find files that were deleted (exist in IndexedDB but not in file system)
    const deletedFiles = existingFileNames.filter(name => !currentFileNames.includes(name));
    
    // Clear IndexedDB completely and reload fresh data
    if (deletedFiles.length > 0) {
      console.log('Deleted files detected:', deletedFiles);
      await clearJSONFiles();
      console.log('Cleared all JSON files from IndexedDB');
    }
    
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
    // Get all image files from all subfolders in json directory
    const allImageModules = import.meta.glob('../json/**/*.{png,jpg,jpeg,gif,webp}', { eager: false });
    
    console.log('Found all image files:', Object.keys(allImageModules));
    
    // Get all available JSON file names
    const jsonFiles = getAvailableJSONFiles();
    
    for (const jsonFileName of jsonFiles) {
      // Try multiple folder name variations to match with JSON file
      const possibleFolderNames = [
        jsonFileName, // Exact match
        jsonFileName.replace(/\s+/g, '_'), // Replace spaces with underscores
        jsonFileName.replace(/\s+/g, ''), // Remove spaces
        jsonFileName.replace(/\s+/g, '-'), // Replace spaces with hyphens
      ];
      
      console.log(`Looking for folder variations for ${jsonFileName}:`, possibleFolderNames);
      
      // Filter images that belong to this JSON file's folder
      const jsonFolderImages = Object.keys(allImageModules).filter(path => {
        const pathParts = path.split('/');
        // Check if the path contains any of the possible folder names for this JSON file
        return possibleFolderNames.some(folderName => pathParts.includes(folderName));
      });
      
      console.log(`Found images for ${jsonFileName}:`, jsonFolderImages);
      
      // Process each image file for this JSON
      for (const imagePath of jsonFolderImages) {
        try {
          // Get the image file name
          const imageName = imagePath.split('/').pop();
          
          console.log(`Processing image ${imageName} for JSON file ${jsonFileName}`);
          
          // Import the image as a URL
          const imageModule = await allImageModules[imagePath]();
          const imageUrl = imageModule.default;
          
          // Convert image URL to blob data
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          
          reader.onload = async () => {
            try {
              // Store image in jsonImages IndexedDB store with the JSON file name as reference
              await storeJSONImage(jsonFileName, imageName, reader.result);
              console.log(`✅ Successfully stored image ${imageName} for ${jsonFileName} in IndexedDB`);
            } catch (error) {
              console.error(`❌ Error storing image ${imageName} for ${jsonFileName}:`, error);
            }
          };
          
          reader.onerror = () => {
            console.error(`❌ Error reading image ${imageName} for ${jsonFileName}`);
          };
          
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error(`Error loading image ${imagePath}:`, error);
        }
      }
    }
    
    console.log('All JSON images loaded into jsonImages IndexedDB store');
  } catch (error) {
    console.error('Error loading JSON images:', error);
  }
};

// Function to get JSON file from dedicated jsonFiles store
export const getJSONFileFromStore = async (filename) => {


// Function to load images for a specific JSON file
export const loadImagesForJSONFile = async (jsonFileName) => {
  try {
    console.log(`Loading images specifically for ${jsonFileName}...`);
    
    // Get all image files from json directory
    const allImageModules = import.meta.glob('../json/**/*.{png,jpg,jpeg,gif,webp}', { eager: false });
    
    // Try multiple folder name variations to match with JSON file
    const possibleFolderNames = [
      jsonFileName, // Exact match
      jsonFileName.replace(/\s+/g, '_'), // Replace spaces with underscores
      jsonFileName.replace(/\s+/g, ''), // Remove spaces
      jsonFileName.replace(/\s+/g, '-'), // Replace spaces with hyphens
    ];
    
    // Filter images that belong to this JSON file's folder
    const jsonFolderImages = Object.keys(allImageModules).filter(path => {
      const pathParts = path.split('/');
      return possibleFolderNames.some(folderName => pathParts.includes(folderName));
    });
    
    console.log(`Found ${jsonFolderImages.length} images for ${jsonFileName}`);
    
    let loadedCount = 0;
    
    // Process each image file
    for (const imagePath of jsonFolderImages) {
      try {
        // Get the image file name
        const imageName = imagePath.split('/').pop();
        
        // Import the image as a URL
        const imageModule = await allImageModules[imagePath]();
        const imageUrl = imageModule.default;
        
        // Convert image URL to blob data
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Convert to data URL and store
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            await storeJSONImage(jsonFileName, imageName, reader.result);
            loadedCount++;
            console.log(`✅ Stored image ${imageName} for ${jsonFileName} (${loadedCount}/${jsonFolderImages.length})`);
          } catch (error) {
            console.error(`❌ Error storing image ${imageName}:`, error);
          }
        };
        
        reader.onerror = () => {
          console.error(`❌ Error reading image ${imageName}`);
        };
        
        reader.readAsDataURL(blob);
        
      } catch (error) {
        console.error(`Error processing image ${imagePath}:`, error);
      }
    }
    
    return loadedCount;
    
  } catch (error) {
    console.error(`Error loading images for ${jsonFileName}:`, error);
    return 0;
  }
};

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
