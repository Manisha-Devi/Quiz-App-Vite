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

    // Force re-render by updating document class
    if (newDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  };

  const quizTimeRaw = localStorage.getItem('quizTime');
  const practiceMode = localStorage.getItem('practiceMode') === 'true';
  const enableDrawing = localStorage.getItem('enableDrawing') !== 'false';

  if (!quizTimeRaw) {
    console.error("❌ quizTime not found in localStorage.");
    // Set default time if not found
    localStorage.setItem('quizTime', '60');
  }

  const quizTimeMinutes = Number(quizTimeRaw || '60');
  if (isNaN(quizTimeMinutes) || quizTimeMinutes <= 0) {
    console.error("❌ Invalid quizTime in localStorage, using default 60 minutes.");
    localStorage.setItem('quizTime', '60');
  }

  const validQuizTime = Math.max(1, quizTimeMinutes); // Ensure at least 1 minute
  const EXAM_DURATION = practiceMode ? Infinity : validQuizTime * 60;

  const mathConfig = { loader: { load: ['input/tex', 'output/chtml'] } };
  const hasMath = (text = '') => /\\\(|\\\[|\\begin|\\frac|\\sqrt/.test(text);

  const meta = JSON.parse(localStorage.getItem('examMeta')) || {};
  const saved = JSON.parse(localStorage.getItem('examState')) || {};

  const [questions] = useState(() => JSON.parse(localStorage.getItem('finalQuiz')) || []);
  const [current, setCurrent] = useState(saved.current ?? 0);
  const [answers, setAnswers] = useState(saved.answers ?? {});
  const [review, setReview] = useState(saved.review ?? {});
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(saved.fiftyFiftyUsed ?? {});
  const [timeLeft, setTimeLeft] = useState(() => {
    if (practiceMode) return Infinity;

    // Ensure EXAM_DURATION is valid
    if (!EXAM_DURATION || EXAM_DURATION <= 0) {
      console.warn("Invalid EXAM_DURATION, using 60 minutes as fallback");
      return 3600; // 60 minutes fallback
    }

    return meta.startedAt
      ? Math.max(0, EXAM_DURATION - Math.floor((Date.now() - meta.startedAt) / 1000))
      : EXAM_DURATION;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [showTimeWarning, setShowTimeWarning] = useState(false); // Track visibility of the warning
  const [timeWarningDismissed, setTimeWarningDismissed] = useState(false); // Track if warning was dismissed
  const [showHalfTimeWarning, setShowHalfTimeWarning] = useState(false);
  const [halfTimeWarningDismissed, setHalfTimeWarningDismissed] = useState(false);
  const [showQuarterTimeWarning, setShowQuarterTimeWarning] = useState(false);
  const [quarterTimeWarningDismissed, setQuarterTimeWarningDismissed] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [tabLeaveWarnings, setTabLeaveWarnings] = useState(0);
  const [showTabLeaveWarning, setShowTabLeaveWarning] = useState(false);

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

  const goNext = useCallback(() => {
    if (current >= questions.length - 1) {
      // If we're at or past the last question, show submit modal
      setShowSubmitModal(true);
    } else {
      const newIndex = current + 1;
      setCurrent(newIndex);
      // Notify DrawingOverlay about question change
      window.currentQuestionIndex = newIndex;
      const event = new CustomEvent('questionChanged', { 
        detail: { questionIndex: newIndex } 
      });
      window.dispatchEvent(event);
    }
  }, [current, questions.length]);

  const goPrev = useCallback(() => {
    if (current === 0) {
      // If we're at the first question and trying to go back, show submit modal
      setShowSubmitModal(true);
    } else {
      const newIndex = current - 1;
      setCurrent(newIndex);
      // Notify DrawingOverlay about question change
      window.currentQuestionIndex = newIndex;
      const event = new CustomEvent('questionChanged', { 
        detail: { questionIndex: newIndex } 
      });
      window.dispatchEvent(event);
    }
  }, [current]);

  useEffect(() => {
    // Clear ResultPage data when entering ExamPage
    const RESULT_PAGE_KEYS = [
      'examAnswers',
      'reviewMarks',
      'retryAnswers',
      'retryCompleted',
      'retryQuestions',
      'currentRetryIndex',
      'retryStats'
    ];

    RESULT_PAGE_KEYS.forEach((key) => localStorage.removeItem(key));

    if (!meta.startedAt) {
      localStorage.setItem('examMeta', JSON.stringify({ startedAt: Date.now() }));
    }

    // Set initial question index for DrawingOverlay
    window.currentQuestionIndex = current;
    const event = new CustomEvent('questionChanged', { 
      detail: { questionIndex: current } 
    });
    window.dispatchEvent(event);

    // Listen for navigation events from DrawingOverlay
    const handleDrawingNavigation = (event) => {
      const direction = event.detail.direction;
      if (direction === 'next') {
        goNext();
      } else if (direction === 'prev') {
        goPrev();
      }
    };

    window.addEventListener('navigateQuestion', handleDrawingNavigation);

    // Sync dark mode with document classes
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }

    return () => {
      window.removeEventListener('navigateQuestion', handleDrawingNavigation);
    };
  }, [isDarkMode, current, goNext, goPrev]);

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
          // Show submit modal instead of auto-submitting
          setShowSubmitModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [practiceMode]);

  useEffect(() => {
    localStorage.setItem('examState', JSON.stringify({ answers, review, current, fiftyFiftyUsed }));
  }, [answers, review, current, fiftyFiftyUsed]);

  // Tab visibility detection for warnings (only in exam mode)
  useEffect(() => {
    if (practiceMode) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden/switched - increment warning count
        setTabLeaveWarnings(prev => {
          const newCount = prev + 1;

          if (newCount >= 3) {
            // Force submit after 3 warnings
            setTimeout(() => {
              localStorage.setItem('examAnswers', JSON.stringify(answers));
              localStorage.setItem('reviewMarks', JSON.stringify(review));
              navigate('/result');
            }, 100);
          } else {
            // Show warning popup
            setShowTabLeaveWarning(true);
          }

          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [practiceMode, answers, review, navigate]);

  // Prevent browser back button and redirect to UploadPage
  useEffect(() => {
    // Push current state to prevent back navigation
    window.history.pushState(null, null, window.location.pathname);

    const handlePopState = (event) => {
      event.preventDefault();

      // Always redirect to UploadPage when back is pressed
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // Show time warnings at different intervals
  useEffect(() => {
    if (practiceMode) return;

    // Half time warning (50% time remaining)
    const halfTime = Math.floor(EXAM_DURATION / 2);
    if (timeLeft <= halfTime && timeLeft > halfTime - 5 && !halfTimeWarningDismissed) {
      setShowHalfTimeWarning(true);
    }

    // Quarter time warning (25% time remaining) 
    const quarterTime = Math.floor(EXAM_DURATION / 4);
    if (timeLeft <= quarterTime && timeLeft > quarterTime - 5 && !quarterTimeWarningDismissed) {
      setShowQuarterTimeWarning(true);
    }

    // 5 minutes left warning (critical)
    if (timeLeft <= 300 && timeLeft > 0 && !timeWarningDismissed) {
      setShowTimeWarning(true);
    }
  }, [timeLeft, practiceMode, timeWarningDismissed, halfTimeWarningDismissed, quarterTimeWarningDismissed, EXAM_DURATION]);

  const handleClear = useCallback(() => {
    setAnswers(a => { const c = { ...a }; delete c[current]; return c; });
    setReview(r => { const c = { ...r }; delete c[current]; return c; });
    // Don't clear fiftyFiftyUsed - it should remain used even after clearing response
    // Clear other question states (show answer) but keep 50/50 state
    if (window.clearQuestionStates) {
      window.clearQuestionStates();
    }
  }, [current]);

  useEffect(() => {
    const handler = (e) => {
      // Don't trigger shortcuts if user is typing in an input field, textarea, or contenteditable element
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true' ||
        activeElement.isContentEditable
      );

      if (isTyping) return;

      if (e.key >= '1' && e.key <= '4') {
        const optionIndex = Number(e.key) - 1;
        const hiddenOptions = fiftyFiftyUsed[current] || [];
        // Only allow selection if option is not hidden by 50/50
        if (!hiddenOptions.includes(optionIndex)) {
          handleOption(optionIndex);
        }
      }
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key.toLowerCase() === 'r') toggleReview();
      if (e.key.toLowerCase() === 'c') handleClear();
      if (e.key.toLowerCase() === 'q') setIsSidebarOpen(prev => !prev);
      if (e.key.toLowerCase() === 'm') toggleDarkMode();
      if (e.key.toLowerCase() === 'h' && practiceMode) {
        // Toggle show answer in practice mode
        if (window.toggleShowAnswer) {
          window.toggleShowAnswer();
        }
      }
      if (e.key.toLowerCase() === 's') {
        // Save & Next
        handleNext();
      }
      if (e.key === 'Enter') {
        // Submit Test
        handleSubmit(false);
      }
      if (e.key === '5' && !practiceMode) {
        // Activate 50/50 lifeline in exam mode
        if (window.triggerFiftyFifty) {
          window.triggerFiftyFifty();
        }
      }
      if (e.key.toLowerCase() === 'd' && enableDrawing) {
        // Toggle drawing overlay if drawing is enabled
        const drawingOverlay = document.querySelector('.drawing-toggle button');
        if (drawingOverlay) {
          drawingOverlay.click();
        }
      }
      if (e.key.toLowerCase() === 'f') {
        // Toggle fullscreen
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, questions.length, toggleDarkMode, handleClear, enableDrawing, toggleFullscreen, goNext, goPrev, fiftyFiftyUsed, handleOption, practiceMode, toggleReview, handleNext, handleSubmit]);

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

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goNext,
    onSwipedRight: goPrev,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const q = questions[current] || {};

  const formatTime = useCallback(s => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;

    // Show hours only if there are hours
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    // Show minutes only if there are minutes or if more than 59 seconds
    else if (m > 0 || s >= 60) {
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    // Show only seconds if less than 1 minute
    else {
      return `${String(sec).padStart(2, '0')}s`;
    }
  }, []);

  const getTimerColorClass = useCallback(() => {
    if (practiceMode || timeLeft === Infinity) return '';

    const totalTime = EXAM_DURATION;
    const quarterTime = totalTime * 0.25;
    const tenMinutes = 600; // 10 minutes in seconds
    const fiveMinutes = 300; // 5 minutes in seconds

    if (timeLeft <= fiveMinutes) {
      return 'timer-critical';
    } else if (timeLeft <= tenMinutes || timeLeft <= quarterTime) {
      return 'timer-warning';
    } else {
      return 'timer-normal';
    }
  }, [timeLeft, practiceMode, EXAM_DURATION]);

  const handleOption = useCallback(idx => {
    if (idx === undefined) {
      // Clear the answer for current question
      setAnswers(a => {
        const newAnswers = { ...a };
        delete newAnswers[current];
        return newAnswers;
      });
    } else {
      setAnswers(a => ({ ...a, [current]: idx }));
    }
  }, [current]);
  const toggleReview = useCallback(() => setReview(r => ({ ...r, [current]: !r[current] })), [current]);
  const handleNext = useCallback(() => {
    if (current === questions.length - 1) {
      setShowSubmitModal(true);
    } else {
      setCurrent(current + 1);
    }
  }, [current, questions.length]);

  const handleSubmit = useCallback((auto = false) => {
    if (!auto) {
      setShowSubmitModal(true);
      return;
    }
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    localStorage.setItem('reviewMarks', JSON.stringify(review));
    navigate('/result');
  }, [answers, review, navigate]);

  const confirmSubmit = useCallback(() => {
    setShowSubmitModal(false);
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    localStorage.setItem('reviewMarks', JSON.stringify(review));
    navigate('/result');
  }, [answers, review, navigate]);

  const cancelSubmit = useCallback(() => {
    setShowSubmitModal(false);
    // Ensure we stay on the current question after cancelling
    // No need to change current state, just close modal
  }, []);

  const closeTimeWarning = useCallback(() => {
    setShowTimeWarning(false); // Hide the warning
    setTimeWarningDismissed(true); // Mark as dismissed so it won't show again
  }, []);

  const closeHalfTimeWarning = useCallback(() => {
    setShowHalfTimeWarning(false);
    setHalfTimeWarningDismissed(true);
  }, []);

  const closeQuarterTimeWarning = useCallback(() => {
    setShowQuarterTimeWarning(false);
    setQuarterTimeWarningDismissed(true);
  }, []);

  const closeTabLeaveWarning = useCallback(() => {
    setShowTabLeaveWarning(false);
  }, []);

  if (!questions.length || !sections.length) return <div className="exam-ui">Loading exam…</div>;

  return (
    <>
      <div className={`exam-ui ${isFullscreen ? 'fullscreen' : ''} ${isDarkMode ? 'dark-mode' : ''}`}>

          <div className="exam-ui">
            <header className="exam-header">
              <div className="page-title">
                <span className="title-icon">📚</span>
                <span className="title-text">{practiceMode ? 'Practice' : 'Exam'}</span>
              </div>
              <div className="header-controls">
                <div className={`timer-box ${getTimerColorClass()}`}>
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

            {!practiceMode && showHalfTimeWarning && (
              <div className="time-warning half-time-warning">
                ⏰ Half time reached! You have {formatTime(timeLeft)} remaining.
                <button className="close-btn" onClick={closeHalfTimeWarning}>✖️</button>
              </div>
            )}

            {!practiceMode && showQuarterTimeWarning && (
              <div className="time-warning quarter-time-warning">
                ⚡ Quarter time left! Only {formatTime(timeLeft)} remaining. Speed up!
                <button className="close-btn" onClick={closeQuarterTimeWarning}>✖️</button>
              </div>
            )}

            {!practiceMode && showTimeWarning && timeLeft <= 300 && timeLeft > 0 && (
              <div className="time-warning critical-time-warning">
                🚨 CRITICAL: Only 5 minutes left! Please finish up immediately!
                <button className="close-btn" onClick={closeTimeWarning}>✖️</button>
              </div>
            )}

            {!practiceMode && showTabLeaveWarning && (
              <div className="time-warning tab-leave-warning">
                ⚠️ WARNING #{tabLeaveWarnings}: Don't leave this tab during exam! 
                {tabLeaveWarnings >= 2 && " Next leave will auto-submit your exam!"}
                <button className="close-btn" onClick={closeTabLeaveWarning}>✖️</button>
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
                  practiceMode={practiceMode}
                  onClear={handleClear}
                  fiftyFiftyUsed={fiftyFiftyUsed[current]}
                  onFiftyFiftyUse={(hiddenOptions) => setFiftyFiftyUsed(prev => ({ ...prev, [current]: hiddenOptions }))}
                />
              </div>

              <div className={`exam-right ${isSidebarOpen ? 'open' : 'closed'}`}>
                <QuestionNavigator
                  totalQuestions={questions.length}
                  current={current}
                  answers={answers}
                  review={review}
                  onJump={(i) => {
                    setCurrent(i);
                    // Notify DrawingOverlay about question change
                    window.currentQuestionIndex = i;
                    const event = new CustomEvent('questionChanged', { 
                      detail: { questionIndex: i } 
                    });
                    window.dispatchEvent(event);
                  }}
                />
              </div>
            </div>

            <footer className="exam-footer">
              <div className="footer-left">
                <button onClick={handleClear}>Clear Response</button>
                <button onClick={handleNext} className="primary">Save & Next</button>
              </div>
              <div className="footer-right">
                <button onClick={() => handleSubmit(false)} className="submit">Submit Exam</button>
              </div>
            </footer>
          </div>

        {enableDrawing && <DrawingOverlay />}
        <div className="fullscreen-btn-container">
          <button className="fullscreen-btn" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
            <span className="fullscreen-icon">{isFullscreen ? "⤲" : "⛶"}</span>
          </button>
        </div>

        {/* Custom Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="submit-modal-overlay" onClick={timeLeft <= 0 ? undefined : cancelSubmit}>
            <div className="submit-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="submit-modal-header">
                <h3 className="submit-modal-title">
                  {timeLeft <= 0 ? "⏰ Time's Up!" : "Are You Sure?"}
                </h3>
              </div>
              <div className="submit-modal-body">
                <p>
                  {timeLeft <= 0 
                    ? "Your exam time has ended. Your responses have been saved and will be submitted." 
                    : "Do you want to submit your test? This action cannot be undone."
                  }
                </p>
              </div>
              <div className="submit-modal-footer">
                {timeLeft > 0 && (
                  <button className="submit-modal-btn cancel-btn" onClick={cancelSubmit}>
                    <span className="btn-icon">✗</span>
                    <span>Cancel</span>
                  </button>
                )}
                <button className="submit-modal-btn confirm-btn" onClick={confirmSubmit}>
                  <span className="btn-icon">✓</span>
                  <span>{timeLeft <= 0 ? "View Results" : "Submit"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ExamPage;