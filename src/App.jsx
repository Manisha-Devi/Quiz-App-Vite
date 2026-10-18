
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import SectionSetupPage from './pages/SectionSetupPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import QuestionExtractorPage from './pages/QuestionExtractorPage';
import ServerDataPage from './pages/ServerDataPage';
import { StorageModeProvider } from './components/StorageModeContext';
import dataManager from './utils/dataManager';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Starting IndexedDB-only application...');
        
        // Initialize IndexedDB with default settings
        await dataManager.initializeApp();
        
        console.log('Application initialized successfully - using IndexedDB exclusively');
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
        <p>Initializing IndexedDB application...</p>
      </div>
    );
  }

  return (
    <Router>
      <StorageModeProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/server-data" replace />} />
            <Route path="/local-upload" element={<UploadPage />} />
            <Route path="/sections" element={<SectionSetupPage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/extract" element={<QuestionExtractorPage />} />
            <Route path="/server-data" element={<ServerDataPage />} />
          </Routes>
        </div>
      </StorageModeProvider>
    </Router>
  );
}

export default App;
