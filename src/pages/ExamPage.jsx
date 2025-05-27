import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MathJaxContext } from 'better-react-mathjax';
import { useSwipeable } from 'react-swipeable';
import QuestionViewer from '../components/QuestionViewer';
import QuestionNavigator from '../components/QuestionNavigator';
import '../styles/ExamPage.css';
import DrawingOverlay from '../components/DrawingOverlay';
function ExamPage() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false); // Track fullscreen state
  // Fullscreen Toggle Handler
  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };
  const quizTimeRaw = localStorage.getItem('quizTime');
  if (!quizTimeRaw) throw new Error("❌ quizTime not found in localStorage.");
  const quizTimeMinutes = Number(quizTimeRaw);
  if (isNaN(quizTimeMinutes) || quizTimeMinutes <= 0) {
    throw new Error("❌ Invalid quizTime in localStorage.");
  }
  const EXAM_DURATION = quizTimeMinutes * 60;

  const mathConfig = { loader: { load: ['input/tex', 'output/chtml'] } };
  const hasMath = (text = '') => /\\\(|\\\[|\\begin|\\frac|\\sqrt/.test(text);

  const meta = JSON.parse(localStorage.getItem('examMeta')) || {};
  const saved = JSON.parse(localStorage.getItem('examState')) || {};

  const [questions] = useState(() => JSON.parse(localStorage.getItem('finalQuiz')) || []);
  const [current, setCurrent] = useState(saved.current ?? 0);
  const [answers, setAnswers] = useState(saved.answers ?? {});
  const [review, setReview] = useState(saved.review ?? {});
  const [timeLeft, setTimeLeft] = useState(() =>
    meta.startedAt
      ? Math.max(0, EXAM_DURATION - Math.floor((Date.now() - meta.startedAt) / 1000))
      : EXAM_DURATION
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    if (!meta.startedAt) {
      localStorage.setItem('examMeta', JSON.stringify({ startedAt: Date.now() }));
    }
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem('examState', JSON.stringify({ answers, review, current }));
  }, [answers, review, current]);

  const handleClear = () => {
    setAnswers(a => { const c = { ...a }; delete c[current]; return c; });
    setReview(r => { const c = { ...r }; delete c[current]; return c; });
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key >= '1' && e.key <= '4') handleOption(Number(e.key) - 1);
      if (e.key === '0') toggleReview();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key.toLowerCase() === 'r') toggleReview();
      if (e.key.toLowerCase() === 'c') handleClear();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, questions.length]);

  const injectImageSources = (html) => {
    const imageMap = JSON.parse(localStorage.getItem('fileImageMap') || '{}');
    const flatMap = {};
    Object.values(imageMap).flat().forEach(({ name, data }) => {
      flatMap[name] = data;
    });

    return html.replace(/<img\s+[^>]*id=['"]([^'"]+)['"][^>]*>/g, (match, id) => {
      const src = flatMap[id] || '';
      return `<img id="${id}" src="${src}" alt="${id}" />`;
    });
  };

  const goNext = useCallback(() => setCurrent(c => (c + 1) % questions.length), [questions.length]);
  const goPrev = useCallback(() => setCurrent(c => (c - 1 + questions.length) % questions.length), [questions.length]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goNext,
    onSwipedRight: goPrev,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const q = questions[current] || {};

  const formatTime = s => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const handleOption = idx => setAnswers(a => ({ ...a, [current]: idx }));
  const toggleReview = () => setReview(r => ({ ...r, [current]: !r[current] }));
  const handleNext = () => current < questions.length - 1 && setCurrent(current + 1);

  const handleSubmit = (auto = false) => {
    if (!auto && !window.confirm("Are you sure you want to submit the test?")) return;
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    localStorage.setItem('reviewMarks', JSON.stringify(review));
    navigate('/result');
  };

  if (!questions.length) return <div className="exam-ui">Loading exam…</div>;

  return (
    <>
      
    <div className={`exam-ui ${isFullscreen ? 'fullscreen' : ''}`}>
    <MathJaxContext config={mathConfig}>
      <div className="exam-ui">
        <header className="exam-header">
          <div className="section-name">{q.section || 'General'}</div>
          <div className="d-flex align-items-center gap-2">
            <div className="timer-box">{formatTime(timeLeft)}</div>
            <button className="toggle-btn" onClick={() => setIsSidebarOpen(o => !o)}>
              {isMobile ? (isSidebarOpen ? '⬇️' : '⬆️') : (isSidebarOpen ? '⬅️' : '➡️')}
            </button>
          </div>
        
        </header>

        {timeLeft <= 300 && (
          <div className="time-warning">⚠️ Only 5 minutes left. Please finish up!</div>
        )}

        <div className="exam-main-layout">
          <div className="exam-left" {...swipeHandlers}>
            <QuestionViewer
              question={q}
              currentIndex={current}
              answer={answers[current]}
              reviewMarked={review[current]}
              onOptionClick={handleOption}
              onToggleReview={toggleReview}
              injectImageSources={injectImageSources}
              hasMath={hasMath}
            />
          </div>

          <div className={`exam-right ${isSidebarOpen ? 'open' : 'closed'}`}>
            <QuestionNavigator
              totalQuestions={questions.length}
              current={current}
              answers={answers}
              review={review}
              onJump={(i) => setCurrent(i)}
            />
          </div>
        </div>

        <footer className="exam-footer">
          <div className="footer-left">
            <button onClick={handleClear}>Clear Response</button>
            <button onClick={handleNext} className="primary">Save & Next</button>
          </div>
          <div className="footer-right">
            <button onClick={() => handleSubmit(false)} className="submit">Submit Test</button>
          </div>
        </footer>
      </div>
    </MathJaxContext>
    <DrawingOverlay />
    {/* Fullscreen Button on Right Side */}
        <div className="fullscreen-btn-container">
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
            {/* Only show the enter fullscreen icon when not in fullscreen */}
            {!isFullscreen && (
              <span className="fullscreen-icon">⛶</span> // Enter fullscreen icon
            )}
            {/* Nothing displayed when in fullscreen */}
          </button>
        </div>
      </div>
    </>
  );
}

export default ExamPage;
