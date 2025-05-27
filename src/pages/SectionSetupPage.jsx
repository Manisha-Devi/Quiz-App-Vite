import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SectionSetupPage.css';

function SectionSetupPage() {
  const [quizData, setQuizData] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({});
  const [fileImageMap, setFileImageMap] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [modalIndex, setModalIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('quizData'));
    const images = JSON.parse(localStorage.getItem('fileImageMap') || '{}');

    if (!data) {
      alert("⚠️ No data found. Please upload files first.");
      navigate('/');
      return;
    }

    setQuizData(data);
    setFileImageMap(images);

    const initialCounts = {};
    data.forEach((file, index) => {
      initialCounts[index] = { 0: 0, 1: 0, 2: 0 };
    });
    setQuestionCounts(initialCounts);
  }, [navigate]);

  const handleInputChange = (fileIndex, level, value) => {
    const updated = { ...questionCounts };
    const max = quizData[fileIndex].questions.filter(q => q.level === level).length;
    updated[fileIndex][level] = Math.min(parseInt(value) || 0, max);
    setQuestionCounts(updated);
  };

  const handleStartExam = () => {
    const selectedQuestions = [];

    quizData.forEach((file, fileIndex) => {
      [0, 1, 2].forEach(level => {
        const count = questionCounts[fileIndex][level] || 0;
        const filtered = file.questions.filter(q => q.level === level);
        shuffleArray(filtered);
        const picked = filtered.slice(0, count).map(q => ({ ...q, section: file.name }));
        selectedQuestions.push(...picked);
      });
    });

    if (selectedQuestions.length === 0) {
      alert("⚠️ Please select at least one question before starting the exam.");
      return;
    }

    shuffleArray(selectedQuestions);
    localStorage.setItem('finalQuiz', JSON.stringify(selectedQuestions));
    navigate('/exam');
  };

  const openImageModal = (images) => {
    setModalImages(images);
    setModalIndex(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalImages([]);
    setModalIndex(0);
  };

  return (
    <div className="page">
      <h1>🎯 Select Questions per Section</h1>

      {quizData.map((file, fileIndex) => {
        const levelCounts = { 0: 0, 1: 0, 2: 0 };
        file.questions.forEach(q => levelCounts[q.level]++);

        const selectedTotal = Object.values(questionCounts[fileIndex] || {}).reduce((a, b) => a + b, 0);
        const fileName = `${file.name}.json`;
        const images = fileImageMap[fileName] || [];

        return (
          <div key={fileIndex} className="card" style={{ marginBottom: '30px' }}>
            <h2>📚 Section: {file.name}</h2>
            <p>🧮 Total selected: <strong>{selectedTotal}</strong></p>

            {[0, 1, 2].map(level => {
              const labels = ['🟢 Easy', '🟠 Medium', '🔴 Hard'];
              const maxAvailable = levelCounts[level];
              return (
                <div className="form-group" key={level}>
                  <label>
                    {labels[level]} Questions (max {maxAvailable}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={maxAvailable}
                    value={questionCounts[fileIndex]?.[level] || ''}
                    onChange={(e) =>
                      handleInputChange(fileIndex, level, e.target.value)
                    }
                  />
                </div>
              );
            })}

            {images.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <button
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#4b3ee6',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => openImageModal(images)}
                >
                  🖼️ Preview Images ({images.length})
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button
        className="primary-button"
        onClick={handleStartExam}
        disabled={Object.values(questionCounts).every(q => Object.values(q).every(val => val === 0))}
      >
        🚀 Start Exam
      </button>

      {/* Modal Preview */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '10px',
            textAlign: 'center',
            maxWidth: '90%',
            maxHeight: '90%'
          }}>
            <h3 style={{ marginBottom: '10px' }}>{modalImages[modalIndex]?.name}</h3>
            <img
              src={modalImages[modalIndex]?.data}
              alt={modalImages[modalIndex]?.name}
              style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '8px' }}
            />
            <div style={{ marginTop: '10px' }}>
              <button onClick={() => setModalIndex(i => Math.max(0, i - 1))} disabled={modalIndex === 0}>
                ⬅️ Prev
              </button>
              <button
                onClick={() => setModalIndex(i => Math.min(modalImages.length - 1, i + 1))}
                disabled={modalIndex === modalImages.length - 1}
                style={{ marginLeft: '10px' }}
              >
                Next ➡️
              </button>
            </div>
            <button
              onClick={closeModal}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              ❌ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export default SectionSetupPage;
