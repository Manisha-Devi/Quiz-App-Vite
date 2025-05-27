import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard'; // Import the reusable component
import '../styles/ResultPage.css';

function ResultPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [reviewMarks, setReviewMarks] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const q = JSON.parse(localStorage.getItem('finalQuiz') || '[]');
    const a = JSON.parse(localStorage.getItem('examAnswers') || '{}');
    const r = JSON.parse(localStorage.getItem('reviewMarks') || '{}');

    setQuestions(q);
    setAnswers(a);
    setReviewMarks(r);
  }, []);

  const handleRestart = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="result-page">
      <h1>🎯 Quiz Review</h1>

      {questions.map((q, idx) => (
        <QuestionCard
          key={idx}
          question={q}
          index={idx}
          userAnswer={answers[idx]}
          reviewMarked={reviewMarks[idx]}
        />
      ))}

      <button
        className="retake-button"
        onClick={handleRestart}
        aria-label="Retake the quiz"
      >
        🔁 Retake Quiz
      </button>
    </div>
  );
}

export default ResultPage;
