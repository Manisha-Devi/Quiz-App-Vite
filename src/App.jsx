import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import SectionSetupPage from './pages/SectionSetupPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import dataManager from './utils/dataManager';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Only run migration once on first app load
        const migrationComplete = await dataManager.getUserSetting('migrationComplete', false);

        if (!migrationComplete) {
          console.log('First time app launch - running migration from localStorage to IndexedDB...');
          await dataManager.migrateFromLocalStorage();

          // Clear localStorage after successful migration to prevent future conflicts
          localStorage.clear();
          console.log('Migration completed and localStorage cleared');
        }

        console.log('App initialization completed - using IndexedDB exclusively');
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Initializing application...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/sections" element={<SectionSetupPage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;