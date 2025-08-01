import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MathJaxContext } from 'better-react-mathjax';
import { useSwipeable } from 'react-swipeable';
import QuestionViewer from '../components/QuestionViewer';
import QuestionNavigator from '../components/QuestionNavigator';
import DrawingOverlay from '../components/DrawingOverlay';
import dataManager from '../utils/dataManager';
import '../styles/ExamPage.css';
import { storeData, getData, openDb } from '../utils/indexedDB';

function ExamPage() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false); // Track fullscreen state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isBoldMode, setIsBoldMode] = useState(false);

  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const toggleDarkMode = async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    try {
      await storeData('userSettings', { id: 'darkMode', value: newDarkMode });
    } catch (error) {
      console.error('Error saving dark mode to IndexedDB:', error);
    }

    // Force re-render by updating document class
    if (newDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  };

  const toggleBoldMode = async () => {
    const newBoldMode = !isBoldMode;
    setIsBoldMode(newBoldMode);

    try {
      await storeData('userSettings', { id: 'boldMode', value: newBoldMode });
    } catch (error) {
      console.error('Error saving bold mode to IndexedDB:', error);
    }

    // Force re-render by updating document class
    if (newBoldMode) {
      document.documentElement.classList.add('bold-mode');
      document.body.classList.add('bold-mode');
    } else {
      document.documentElement.classList.remove('bold-mode');
      document.body.classList.remove('bold-mode');
    }
  };

  const [quizTime, setQuizTime] = useState(60);
  const [practiceMode, setPracticeMode] = useState(false);
  const [enableDrawing, setEnableDrawing] = useState(true);
  const [retryMode, setRetryMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [questionStartTimes, setQuestionStartTimes] = useState({});
  const [questionTimeSpent, setQuestionTimeSpent] = useState({});
  const [answers, setAnswers] = useState({});
  const [reviewMarks, setReviewMarks] = useState({});
  const [examMeta, setExamMeta] = useState({});
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [review, setReview] = useState({});
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState({});
  const [timeLeft, setTimeLeft] = useState(Infinity);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [timeWarningDismissed, setTimeWarningDismissed] = useState(false);
  const [showHalfTimeWarning, setShowHalfTimeWarning] = useState(false);
  const [halfTimeWarningDismissed, setHalfTimeWarningDismissed] = useState(false);
  const [showQuarterTimeWarning, setShowQuarterTimeWarning] = useState(false);
  const [quarterTimeWarningDismissed, setQuarterTimeWarningDismissed] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [tabLeaveWarnings, setTabLeaveWarnings] = useState(0);
  const [showTabLeaveWarning, setShowTabLeaveWarning] = useState(false);

  useEffect(() => {
    const loadExamData = async () => {
      const quizData = await dataManager.getExamData('finalQuiz');
      if (!quizData || quizData.length === 0) {
        alert('❌ No quiz data found! Redirecting to upload page.');
        navigate('/');
        return;
      }

      const [
        practiceMode,
        enableDrawing,
        retryMode,
        quizTime,
        darkMode,
        boldMode,
        savedState,
        savedMeta
      ] = await Promise.all([
        dataManager.getUserSetting('practiceMode', false),
        dataManager.getUserSetting('enableDrawing', true),
        dataManager.getUserSetting('retryMode', false),
        dataManager.getUserSetting('quizTime', 60),
        dataManager.getUserSetting('darkMode', false),
        dataManager.getUserSetting('boldMode', false),
        dataManager.getExamData('examState'),
        dataManager.getExamData('examMeta')
      ]);

      // Use saved state or create new

      setQuestions(quizData);
      setPracticeMode(practiceMode);
      setEnableDrawing(enableDrawing);
      setRetryMode(retryMode);
      setQuizTime(quizTime);
      setIsDarkMode(darkMode);
      setIsBoldMode(boldMode);

      if (savedState) {
        setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
        setAnswers(savedState.answers || {});
        setReviewMarks(savedState.reviewMarks || {});
        // Restore other state variables from savedState as necessary
      }
      if (savedMeta) {
        // Restore meta variables from savedMeta as necessary
      }
    };

    loadExamData();
  }, [navigate]);

  useEffect(() => {
    const saveExamState = async () => {
      try {
        await dataManager.setExamData('examState', {
          currentQuestionIndex,
          answers,
          reviewMarks,
          //timeRemaining,
          //isSubmitted,
          //questionsVisited,
          //startTime: Date.now() - (initialTime * 60 * 1000 - timeRemaining * 1000)
        });

        await dataManager.setExamData('examMeta', {
          //totalQuestions: questions.length,
          practiceMode,
          enableDrawing,
          retryMode
        });
      } catch (error) {
        console.error('Error saving exam state:', error);
      }
    };

    //saveExamState();
  }, [currentQuestionIndex, answers, reviewMarks, practiceMode, enableDrawing, retryMode]);

  const validQuizTime = Math.max(1, Number(quizTime || 60));
  const EXAM_DURATION = practiceMode ? Infinity : validQuizTime * 60;

  const mathConfig = { loader: { load: ['input/tex', 'output/chtml'] } };
  const hasMath = (text = '') => /\\\(|\\\[|\\begin|\\frac|\\sqrt/.test(text);



  // Calculate time left based on loaded data
  useEffect(() => {
    if (practiceMode) {
      setTimeLeft(Infinity);
      return;
    }

    const EXAM_DURATION = validQuizTime * 60;

    if (!EXAM_DURATION || EXAM_DURATION <= 0) {
      console.warn("Invalid EXAM_DURATION, using 60 minutes as fallback");
      setTimeLeft(3600);
      return;
    }

    const calculatedTimeLeft = examMeta.startedAt
      ? Math.max(0, EXAM_DURATION - Math.floor((Date.now() - examMeta.startedAt) / 1000))
      : EXAM_DURATION;

    setTimeLeft(calculatedTimeLeft);
  }, [examMeta, practiceMode, validQuizTime]);

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
      setShowSubmitModal(true);
    } else {
      const newIndex = current + 1;
      setCurrent(newIndex);
      window.currentQuestionIndex = newIndex;
      const event = new CustomEvent('questionChanged', { 
        detail: { questionIndex: newIndex } 
      });
      window.dispatchEvent(event);
    }
  }, [current, questions.length]);

  const goPrev = useCallback(() => {
    if (current === 0) {
      setShowSubmitModal(true);
    } else {
      const newIndex = current - 1;
      setCurrent(newIndex);
      window.currentQuestionIndex = newIndex;
      const event = new CustomEvent('questionChanged', { 
        detail: { questionIndex: newIndex } 
      });
      window.dispatchEvent(event);
    }
  }, [current]);

  useEffect(() => {
    if (!examMeta.startedAt) {
      const newMeta = { startedAt: Date.now() };
      setExamMeta(newMeta);
      dataManager.setExamData('examMeta', newMeta);
    }

    window.currentQuestionIndex = current;
    const event = new CustomEvent('questionChanged', { 
      detail: { questionIndex: current } 
    });
    window.dispatchEvent(event);

    const handleDrawingNavigation = (event) => {
      const direction = event.detail.direction;
      if (direction === 'next') {
        goNext();
      } else if (direction === 'prev') {
        goPrev();
      }
    };

    window.addEventListener('navigateQuestion', handleDrawingNavigation);

    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }

    if (isBoldMode) {
      document.documentElement.classList.add('bold-mode');
      document.body.classList.add('bold-mode');
    } else {
      document.documentElement.classList.remove('bold-mode');
      document.body.classList.remove('bold-mode');
    }

    return () => {
      window.removeEventListener('navigateQuestion', handleDrawingNavigation);
    };
  }, [isDarkMode, isBoldMode, current, examMeta.startedAt, goNext, goPrev]);

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
    const saveExamState = async () => {
      try {
        await dataManager.setExamData('examState', { answers, review, current, fiftyFiftyUsed });
      } catch (error) {
        console.error('Error saving exam state:', error);
      }
    };

    if (Object.keys(answers).length > 0 || Object.keys(review).length > 0 || current > 0) {
      saveExamState();
    }
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
            // Save current answers and review marks
            dataManager.setExamResults('examAnswers', answers);
            dataManager.setExamResults('reviewMarks', review);
            navigate('/result');
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

  const handleSubmit = useCallback(async (auto = false) => {
    if (!auto) {
      setShowSubmitModal(true);
      return;
    }

    try {
      await dataManager.setExamResults('examAnswers', answers);
      await dataManager.setExamResults('reviewMarks', review);
      navigate('/result');
    } catch (error) {
      console.error('Error saving exam results:', error);
      navigate('/result');
    }
  }, [answers, review, navigate]);

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
      if (e.key.toLowerCase() === 'b') toggleBoldMode();
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
  }, [current, questions.length, toggleDarkMode, toggleBoldMode, handleClear, enableDrawing, toggleFullscreen, goNext, goPrev, fiftyFiftyUsed, handleOption, practiceMode, toggleReview, handleNext, handleSubmit]);

  // State for file image map
  const [fileImageMap, setFileImageMap] = useState({});

  useEffect(() => {
    const loadFileImageMap = async () => {
      try {
        const mapResult = await dataManager.getFileImageMap();
        console.log('ExamPage - Loaded fileImageMap:', mapResult);
        setFileImageMap(mapResult || {});
      } catch (error) {
        console.error('Error loading file image map:', error);
        setFileImageMap({});
      }
    };

    loadFileImageMap();
  }, []);

  // Function to replace image references with actual image data (same as ResultPage)
  const replaceImageReferences = async (text, fileImageMap) => {
    if (!text || typeof text !== 'string') return text;

    // Find img tags with id attributes
    const imgRegex = /<img[^>]*id=['"]([^'"]*?)['"][^>]*>/g;
    let processedText = text;
    let match;

    while ((match = imgRegex.exec(text)) !== null) {
      const imageName = match[1];
      console.log(`Looking for image: ${imageName}`);

      // Search for image in fileImageMap
      let imageData = null;
      for (const [fileName, images] of Object.entries(fileImageMap)) {
        if (images && Array.isArray(images)) {
          const foundImage = images.find(img => 
            img.name === imageName || 
            img.name === imageName.replace('.png', '') ||
            img.name === imageName.replace('.jpg', '') ||
            img.name === imageName.replace('.jpeg', '')
          );
          if (foundImage) {
            imageData = foundImage.data;
            console.log(`Found image ${imageName} in ${fileName}`);
            break;
          }
        }
      }

      // If not found in fileImageMap, try IndexedDB jsonImages store
      if (!imageData) {
        try {
          // Try different JSON file names
          const possibleJsonNames = ['Image_Demo', 'KaTeX Demo', 'Art and Culture jk'];
          for (const jsonName of possibleJsonNames) {
            imageData = await dataManager.getImageFromJSONImagesStore(jsonName, imageName);
            if (imageData) {
              console.log(`Found image ${imageName} in jsonImages store for ${jsonName}`);
              break;
            }

            // Also try without file extension
            const nameWithoutExt = imageName.replace(/\.(png|jpg|jpeg)$/i, '');
            imageData = await dataManager.getImageFromJSONImagesStore(jsonName, nameWithoutExt);
            if (imageData) {
              console.log(`Found image ${nameWithoutExt} in jsonImages store for ${jsonName}`);
              break;
            }
          }
        } catch (error) {
          console.error(`Error fetching image ${imageName} from jsonImages store:`, error);
        }
      }

      if (imageData) {
        // Replace the img tag with the actual image data
        const newImgTag = match[0].replace(/id=['"][^'"]*['"]/, `src="${imageData}"`).replace(/id=['"][^'"]*['"] /, '');
        processedText = processedText.replace(match[0], `<img src="${imageData}" alt="${imageName}" style="max-width: 100%; height: auto;" />`);
        console.log(`✅ Replaced image reference for ${imageName}`);
      } else {
        console.warn(`❌ Image not found: ${imageName}`);
      }
    }

    return processedText;
  };

  const injectImageSources = useCallback(async (html) => {
    if (!html) return html;

    // Use the same logic as ResultPage
    return await replaceImageReferences(html, fileImageMap);
  }, [fileImageMap]);

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

  const confirmSubmit = useCallback(async () => {
    setShowSubmitModal(false);

    try {
      await dataManager.setExamResults('examAnswers', answers);
      await dataManager.setExamResults('reviewMarks', review);
      navigate('/result');
    } catch (error) {
      console.error('Error saving exam results:', error);
      navigate('/result');
    }
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

  useEffect(() => {
    const loadStoredData = async () => {
      try {
        // Ensure IndexedDB-only operations
        await dataManager.enforceIndexedDBOnly();

        const [
          storedQuizData,
          storedQuizTime,
          storedPracticeMode,
          storedDrawing,
          storedDarkMode,
          storedBoldMode,
          storedFullscreen
        ] = await Promise.all([
          dataManager.getExamData('finalQuiz'),
          dataManager.getUserSetting('quizTime', 60),
          dataManager.getUserSetting('practiceMode', false),
          dataManager.getUserSetting('enableDrawing', true),
          dataManager.getUserSetting('darkMode', false),
          dataManager.getUserSetting('boldMode', false),
          dataManager.getUserSetting('isFullscreen', false)
        ]);

        // Update your component's state with the loaded data
        if (storedQuizData) {
          setQuestions(storedQuizData);
        }
        if (storedQuizTime !== undefined) {
          setQuizTime(storedQuizTime);
        }
        if (storedPracticeMode !== undefined) {
          setPracticeMode(storedPracticeMode);
        }
        if (storedDrawing !== undefined) {
          setEnableDrawing(storedDrawing);
        }
        if (storedDarkMode !== undefined) {
          setIsDarkMode(storedDarkMode);
          if (storedDarkMode) {
            document.documentElement.classList.add('dark-mode');
            document.body.classList.add('dark-mode');
          } else {
            document.documentElement.classList.remove('dark-mode');
            document.body.classList.remove('dark-mode');
          }
        }
        if (storedBoldMode !== undefined) {
          setIsBoldMode(storedBoldMode);
          if (storedBoldMode) {
            document.documentElement.classList.add('bold-mode');
            document.body.classList.add('bold-mode');
          } else {
            document.documentElement.classList.remove('bold-mode');
            document.body.classList.remove('bold-mode');
          }
        }
        if (storedFullscreen !== undefined) {
          setIsFullscreen(storedFullscreen);
        }
      } catch (error) {
        console.error('Error loading data from IndexedDB:', error);
      }
    };

    loadStoredData();
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
                <button className={`bold-toggle-btn ${isBoldMode ? 'active' : ''}`} onClick={toggleBoldMode} title="Toggle Bold Mode">
                  <strong>B</strong>
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
                  isBoldMode={isBoldMode}
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
                    window.currentQuestionIndex= i;
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