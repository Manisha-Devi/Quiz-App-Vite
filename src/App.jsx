import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import SectionSetupPage from './pages/SectionSetupPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import PWAInstaller from './components/PWAInstaller';
import { loadJSONFilesToStorage, loadJSONImagesFromFolders } from './utils/jsonLoader';
import './App.css';

function App() {
  useEffect(() => {
    // Auto-load JSON files and their associated images into IndexedDB when app starts
    const loadAllData = async () => {
      await loadJSONFilesToStorage();
      await loadJSONImagesFromFolders();
    };
    
    loadAllData();
  }, []);

  return (
    <Router>
      <div className="App">
        <PWAInstaller />
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