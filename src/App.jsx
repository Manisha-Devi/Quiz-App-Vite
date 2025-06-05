import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import SectionSetupPage from './pages/SectionSetupPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import PWAInstaller from './components/PWAInstaller';
import DrawingOverlay from './components/DrawingOverlay';
import { loadJSONFilesToStorage } from './utils/jsonLoader';
import './App.css';

function App() {
  useEffect(() => {
    // Auto-load JSON files into IndexedDB when app starts
    loadJSONFilesToStorage();
  }, []);

  return (
    <Router>
      <div className="App">
        <PWAInstaller />
        <DrawingOverlay />
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/setup" element={<SectionSetupPage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/result" element={<ResultPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;