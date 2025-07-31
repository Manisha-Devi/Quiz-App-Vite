import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MathJaxContext } from 'better-react-mathjax';
import UploadPage from './pages/UploadPage';
import SectionSetupPage from './pages/SectionSetupPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';
import PWAInstaller from './components/PWAInstaller';
import { loadJSONFilesToStorage } from './utils/jsonLoader';
import { checkAndRunMigration } from './utils/migrationHelper';
import './App.css';

function App() {
  useEffect(() => {
    // Run migration first, then load JSON files
    const initializeApp = async () => {
      await checkAndRunMigration();
      await loadJSONFilesToStorage();
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