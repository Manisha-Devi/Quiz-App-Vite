import { Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import SectionSetupPage from './pages/SectionSetupPage';
import ExamPage from './pages/ExamPage';
import ResultPage from './pages/ResultPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<UploadPage />} />
      <Route path="/sections" element={<SectionSetupPage />} />
      <Route path="/exam" element={<ExamPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}

export default App;
