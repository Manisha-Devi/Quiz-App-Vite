
import { storeJSONFile, storeJSONImage, getAllJSONFiles, clearJSONFiles, storeImageInJSONImagesStore } from './indexedDB';

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

// Function to load images from JSON-associated folders into IndexedDB
export const loadJSONImagesFromFolders = async () => {
  try {
    console.log('🔍 Loading JSON images from folders...');

    // Get all image files from json folder and its subfolders
    const allImageModules = import.meta.glob('../json/**/*.{png,jpg,jpeg,gif,webp,svg}');

    console.log('📁 Found image modules:', Object.keys(allImageModules));
    console.log('📊 Total images found:', Object.keys(allImageModules).length);

    // Process each image
    for (const imagePath of Object.keys(allImageModules)) {
      console.log(`\n🖼️ Processing: ${imagePath}`);

      // Parse the path to extract folder structure
      // Example: ../json/Image_Demo/Question1.png
      const pathParts = imagePath.split('/');
      console.log('📂 Path parts:', pathParts);

      // Find the folder name after 'json'
      const jsonIndex = pathParts.findIndex(part => part === 'json');
      console.log('📍 JSON index:', jsonIndex);

      if (jsonIndex !== -1 && jsonIndex + 1 < pathParts.length) {
        const folderName = pathParts[jsonIndex + 1]; // Folder name after 'json'
        const imageName = pathParts[pathParts.length - 1]; // Image file name

        // Use folder name as jsonFileName
        const jsonFileName = folderName;

        console.log(`📂 Folder: ${folderName}`);
        console.log(`📄 JSON File Name: ${jsonFileName}`);
        console.log(`🖼️ Image Name: ${imageName}`);
        console.log(`📏 Path length: ${pathParts.length}, Required: > ${jsonIndex + 2}`);

        // Check if it's in a subfolder (not directly in json folder)
        if (pathParts.length > jsonIndex + 2) {
          try {
            console.log(`🚀 Starting image processing for ${imageName}...`);

            // Import the image as a URL
            const imageModule = await allImageModules[imagePath]();
            const imageUrl = imageModule.default;

            console.log(`📥 Loading image from URL: ${imageUrl}`);

            // Convert image URL to blob data
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            console.log(`📦 Blob size: ${blob.size} bytes`);

            // Convert blob to base64 data URL
            const base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                console.log(`📝 Base64 data length: ${reader.result.length}`);
                resolve(reader.result);
              };
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(blob);
            });

            // Store image in jsonImages IndexedDB store
            console.log(`💾 Storing in IndexedDB: ${jsonFileName} -> ${imageName}`);
            await storeImageInJSONImagesStore(jsonFileName, imageName, base64Data);
            console.log(`✅ Successfully stored image ${imageName} for ${jsonFileName} in jsonImages store`);

            // Verify storage immediately
            const { getImageFromJSONImagesStore } = await import('./indexedDB');
            const verifyImage = await getImageFromJSONImagesStore(jsonFileName, imageName);
            console.log(`🔍 Verification: Image ${imageName} for ${jsonFileName} found:`, verifyImage ? 'YES' : 'NO');

          } catch (error) {
            console.error(`❌ Error loading image ${imagePath}:`, error);
          }
        } else {
          console.log(`⏭️ Skipping ${imagePath} - not in a subfolder (path length: ${pathParts.length})`);
        }
      } else {
        console.log(`⏭️ Skipping ${imagePath} - invalid path structure (jsonIndex: ${jsonIndex})`);
      }
    }

    console.log('\n✅ All JSON images processing completed');
    
    // Final verification - check what's in the store
    console.log('\n🔍 Final verification - checking stored images:');
    const { getAllImagesForJSONFile } = await import('./indexedDB');
    const storedImages = await getAllImagesForJSONFile('Image_Demo');
    console.log('📋 Images stored for Image_Demo:', storedImages);
    
    // Additional verification - check individual images
    if (storedImages.length > 0) {
      for (const img of storedImages) {
        console.log(`✅ Found image: ${img.imageName} (${img.data ? 'has data' : 'no data'})`);
      }
    } else {
      console.log('❌ No images found in jsonImages store!');
      console.log('🔍 Let me check what image files were found during glob...');
      
      // Re-check glob results
      const debugImageModules = import.meta.glob('../json/**/*.{png,jpg,jpeg,gif,webp,svg}');
      console.log('🖼️ Available image modules:', Object.keys(debugImageModules));
    }

  } catch (error) {
    console.error('❌ Error loading JSON images:', error);
  }
};

// Load JSON files into dedicated jsonFiles IndexedDB store
export const loadJSONFiles = async () => {
  try {
    console.log('Loading JSON files into dedicated jsonFiles IndexedDB store...');

    // Get all JSON files
    const jsonModules = import.meta.glob('../json/*.json');

    console.log('Found JSON files:', Object.keys(jsonModules));

    // Clear existing JSON files first
    await clearJSONFiles();

    // Process each JSON file
    for (const [path, moduleFunction] of Object.entries(jsonModules)) {
      try {
        const jsonData = await moduleFunction();
        const fileName = path.split('/').pop().replace('.json', '');

        // Store JSON data in dedicated jsonFiles store
        await storeJSONFile(fileName, jsonData);

        console.log(`Stored ${fileName} in jsonFiles IndexedDB store`);
      } catch (error) {
        console.error(`Error loading ${path}:`, error);
      }
    }

    // Load associated images after JSON files are loaded
    console.log('Starting to load images into jsonImages store...');
    await loadJSONImagesFromFolders();

    console.log('All JSON files and associated images loaded into IndexedDB stores');
  } catch (error) {
    console.error('Error loading JSON files:', error);
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

    return 0;

  } catch (error) {
    console.error(`Error loading images for ${jsonFileName}:`, error);
    return 0;
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
