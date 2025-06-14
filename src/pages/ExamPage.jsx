import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  const quizTimeRaw = localStorage.getItem('quizTime');
  const practiceMode = localStorage.getItem('practiceMode') === 'true';
  const enableDrawing = localStorage.getItem('enableDrawing') !== 'false';

  if (!quizTimeRaw) throw new Error("❌ quizTime not found in localStorage.");
  const quizTimeMinutes = Number(quizTimeRaw);
  if (isNaN(quizTimeMinutes) || quizTimeMinutes <= 0) {
    throw new Error("❌ Invalid quizTime in localStorage.");
  }
  const EXAM_DURATION = practiceMode ? Infinity : quizTimeMinutes * 60;

  const mathConfig = { loader: { load: ['input/tex', 'output/chtml'] } };
  const hasMath = (text = '') => /\\\(|\\\[|\\begin|\\frac|\\sqrt/.test(text);

  const meta = JSON.parse(localStorage.getItem('examMeta')) || {};
  const saved = JSON.parse(localStorage.getItem('examState')) || {};

  const [questions] = useState(() => JSON.parse(localStorage.getItem('finalQuiz')) || []);
  const [current, setCurrent] = useState(saved.current ?? 0);
  const [answers, setAnswers] = useState(saved.answers ?? {});
  const [review, setReview] = useState(saved.review ?? {});
  const [timeLeft, setTimeLeft] = useState(() => {
    if (practiceMode) return Infinity;
    return meta.startedAt
      ? Math.max(0, EXAM_DURATION - Math.floor((Date.now() - meta.startedAt) / 1000))
      : EXAM_DURATION;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [showTimeWarning, setShowTimeWarning] = useState(timeLeft <= 300); // Track visibility of the warning

  // Generate sections with proper numbering and grouping - memoized for performance
  const sections = useMemo(() => {
    // First, group questions by section maintaining order
    const sectionGroups = {};
    const sectionOrder = [];
    
    questions.forEach((question, index) => {
      const sectionName = question.section || 'General';
      if (!sectionGroups[sectionName]) {
        sectionGroups[sectionName] = [];
        sectionOrder.push(sectionName);
      }
      sectionGroups[sectionName].push({ ...question, originalIndex: index });
    });

    // Create sections with continuous numbering in correct order
    const sectionsArray = [];
    let globalQuestionIndex = 0;

    sectionOrder.forEach(sectionName => {
      const sectionQuestions = sectionGroups[sectionName];
      const questionIndices = [];

      for (let i = 0; i < sectionQuestions.length; i++) {
        questionIndices.push(globalQuestionIndex);
        globalQuestionIndex++;
      }

      sectionsArray.push({
        name: sectionName,
        startIndex: questionIndices[0],
        endIndex: questionIndices[questionIndices.length - 1],
        questions: questionIndices,
        totalQuestions: sectionQuestions.length
      });
    });

    return sectionsArray;
  }, [questions]);

  // Get current section - using proper indexing for boundaries - memoized
  const getCurrentSection = useCallback(() => {
    return sections.find(section => {
      return current >= section.startIndex && current <= section.endIndex;
    }) || sections[0];
  }, [current, sections]);

  // Jump to section's first question - memoized
  const jumpToSection = useCallback((sectionIndex) => {
    const section = sections[sectionIndex];
    if (section && section.questions.length > 0) {
      setCurrent(section.questions[0]);
    }
  }, [sections]);

  // Make functions available globally for QuestionViewer
  useEffect(() => {
    window.sections = sections;
    window.getCurrentSection = getCurrentSection;
    window.jumpToSection = jumpToSection;
  }, [current, sections]);

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
    if (practiceMode) return;

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
  }, [practiceMode]);

  useEffect(() => {
    localStorage.setItem('examState', JSON.stringify({ answers, review, current }));
  }, [answers, review, current]);

  const handleClear = useCallback(() => {
    setAnswers(a => { const c = { ...a }; delete c[current]; return c; });
    setReview(r => { const c = { ...r }; delete c[current]; return c; });
  }, [current]);

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

  // Memoize image injection for performance
  const imageMap = useMemo(() => {
    const map = JSON.parse(localStorage.getItem('fileImageMap') || '{}');
    const flatMap = {};
    Object.values(map).flat().forEach(({ name, data }) => {
      flatMap[name] = data;
    });
    return flatMap;
  }, []);

  const injectImageSources = useCallback((html) => {
    return html.replace(/<img\s+[^>]*id=['"]([^'"]+)['"][^>]*>/g, (match, id) => {
      const src = imageMap[id] || '';
      return `<img id="${id}" src="${src}" alt="${id}" />`;
    });
  }, [imageMap]);

  const goNext = useCallback(() => setCurrent(c => (c + 1) % questions.length), [questions.length]);
  const goPrev = useCallback(() => setCurrent(c => (c - 1 + questions.length) % questions.length), [questions.length]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goNext,
    onSwipedRight: goPrev,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const q = questions[current] || {};

  const formatTime = useCallback(s => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }, []);

  const handleOption = useCallback(idx => setAnswers(a => ({ ...a, [current]: idx })), [current]);
  const toggleReview = useCallback(() => setReview(r => ({ ...r, [current]: !r[current] })), [current]);
  const handleNext = useCallback(() => current < questions.length - 1 && setCurrent(current + 1), [current, questions.length]);

  const handleSubmit = useCallback((auto = false) => {
    if (!auto && !window.confirm("Are you sure you want to submit the test?")) return;
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    localStorage.setItem('reviewMarks', JSON.stringify(review));
    navigate('/result');
  }, [answers, review, navigate]);

  const closeTimeWarning = useCallback(() => {
    setShowTimeWarning(false); // Only hide the warning
  }, []);

  if (!questions.length || !sections.length) return <div className="exam-ui">Loading exam…</div>;

  return (
    <>
      <div className={`exam-ui ${isFullscreen ? 'fullscreen' : ''} ${isDarkMode ? 'dark-mode' : ''}`}>
        
          <div className="exam-ui">
            <header className="exam-header">
              <div className="section-name">
                {practiceMode ? 'Practice Mode' : 'Exam Page'}
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="timer-box">
                  {practiceMode ? '∞' : formatTime(timeLeft)}
                </div>
                <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Dark Mode">
                  {isDarkMode ? '☀️' : '🌙'}
                </button>
                <button className="toggle-btn" onClick={() => setIsSidebarOpen(o => !o)}>
                  {isMobile ? (isSidebarOpen ? '⬇️' : '⬆️') : (isSidebarOpen ? '⬅️' : '➡️')}
                </button>
              </div>
            </header>

            {!practiceMode && showTimeWarning && timeLeft <= 300 && (
              <div className="time-warning">
                ⚠️ Only 5 minutes left. Please finish up!
                <button className="close-btn" onClick={closeTimeWarning}>✖️</button>
              </div>
            )}

            <div className="exam-main-layout">
              <div className="exam-left">
                <QuestionViewer
                  question={q}
                  currentIndex={current}
                  answer={answers[current]}
                  reviewMarked={review[current]}
                  onOptionClick={handleOption}
                  onToggleReview={toggleReview}
                  injectImageSources={injectImageSources}
                  hasMath={hasMath}
                  isDarkMode={isDarkMode}
                  swipeHandlers={swipeHandlers}
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
        
        {enableDrawing && <DrawingOverlay />}
        <div className="fullscreen-btn-container">
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
            {!isFullscreen && <span className="fullscreen-icon">⛶</span>}
          </button>
        </div>
      </div>
    </>
  );
}

export default ExamPage;