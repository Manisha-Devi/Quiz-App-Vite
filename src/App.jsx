import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import SectionSetupPage from './pages/SectionSetupPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import PWAInstaller from './components/PWAInstaller';
import { loadJSONFilesToStorage, loadJSONImagesFromFolders } from './utils/jsonLoader';
import './App.css';
import './styles/ExamPage.css';
import './styles/ResultPage.css';
import './styles/SectionSetupPage.css';
import './styles/UploadPage.css';

function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await loadJSONFilesToStorage();
        await loadJSONImagesFromFolders();
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
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