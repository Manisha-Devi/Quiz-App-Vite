
import { storeData, openDb } from './indexedDB';

export const migrateLocalStorageToIndexedDB = async () => {
  try {
    console.log('Starting migration from localStorage to IndexedDB...');
    
    // Migrate user settings
    const darkMode = localStorage.getItem('darkMode') === 'true';
    const boldMode = localStorage.getItem('boldMode') === 'true';
    const quizTime = localStorage.getItem('quizTime') || '60';
    const practiceMode = localStorage.getItem('practiceMode') === 'true';
    const enableDrawing = localStorage.getItem('enableDrawing') !== 'false';
    
    await storeData('userSettings', { id: 'darkMode', value: darkMode });
    await storeData('userSettings', { id: 'boldMode', value: boldMode });
    await storeData('userSettings', { id: 'quizTime', value: parseInt(quizTime) });
    await storeData('userSettings', { id: 'practiceMode', value: practiceMode });
    await storeData('userSettings', { id: 'enableDrawing', value: enableDrawing });
    
    // Migrate exam data
    const examMeta = JSON.parse(localStorage.getItem('examMeta') || '{}');
    const examState = JSON.parse(localStorage.getItem('examState') || '{}');
    const finalQuiz = JSON.parse(localStorage.getItem('finalQuiz') || '[]');
    const fileImageMap = JSON.parse(localStorage.getItem('fileImageMap') || '{}');
    
    if (Object.keys(examMeta).length > 0) {
      await storeData('examData', { id: 'examMeta', data: examMeta });
    }
    
    if (Object.keys(examState).length > 0) {
      await storeData('examData', { id: 'examState', data: examState });
    }
    
    if (finalQuiz.length > 0) {
      await storeData('examData', { id: 'finalQuiz', data: finalQuiz });
    }
    
    if (Object.keys(fileImageMap).length > 0) {
      await storeData('examData', { id: 'fileImageMap', data: fileImageMap });
    }
    
    // Migrate exam results
    const examAnswers = JSON.parse(localStorage.getItem('examAnswers') || '{}');
    const reviewMarks = JSON.parse(localStorage.getItem('reviewMarks') || '{}');
    
    if (Object.keys(examAnswers).length > 0) {
      await storeData('examResults', { id: 'examAnswers', data: examAnswers });
    }
    
    if (Object.keys(reviewMarks).length > 0) {
      await storeData('examResults', { id: 'reviewMarks', data: reviewMarks });
    }
    
    // Mark migration as complete
    await storeData('userSettings', { id: 'migrationComplete', value: true });
    
    console.log('Migration completed successfully');
    return true;
    
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
};

export const checkAndRunMigration = async () => {
  try {
    const db = await openDb();
    const transaction = db.transaction(['userSettings'], 'readonly');
    const store = transaction.objectStore('userSettings');
    
    const migrationCheck = await new Promise((resolve) => {
      const request = store.get('migrationComplete');
      request.onsuccess = () => resolve(request.result?.value || false);
      request.onerror = () => resolve(false);
    });
    
    if (!migrationCheck) {
      console.log('Running first-time migration...');
      await migrateLocalStorageToIndexedDB();
    }
    
  } catch (error) {
    console.error('Error checking migration status:', error);
  }
};
