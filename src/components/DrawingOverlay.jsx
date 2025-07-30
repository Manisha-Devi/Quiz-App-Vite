import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './styles/DrawingOverlay.css';

function DrawingOverlay() {
  const [visible, setVisible] = useState(false);
  const [color, setColor] = useState('#000');
  const [savedImage, setSavedImage] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState({}); // Store lines as a nested object with questionIndex as key
  const [brushColor, setBrushColor] = useState('#000');
  const [tool, setTool] = useState('pen');
  const [drawingVisible, setDrawingVisible] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [questionScreenshots, setQuestionScreenshots] = useState({}); // Store screenshots for each question
  const canvasRef = useRef(null);

  // Get current question index from ExamPage
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Listen for question changes from ExamPage
  useEffect(() => {
    const handleQuestionChange = (event) => {
      const newIndex = event.detail.questionIndex;

      // Take screenshot of current question before switching (with delay to ensure content is loaded)
      if (newIndex !== currentQuestionIndex && currentQuestionIndex >= 0) {
        setTimeout(() => {
          takeQuestionScreenshot(currentQuestionIndex);
        }, 300);
      }

      setCurrentQuestionIndex(newIndex);
      console.log('Question changed to:', newIndex);

      // Take screenshot of new question after content loads
      setTimeout(() => {
        takeQuestionScreenshot(newIndex);
      }, 800);
    };

    // Listen for custom events from ExamPage
    window.addEventListener('questionChanged', handleQuestionChange);

    // Sync with global current question index
    const syncCurrentQuestion = () => {
      if (window.currentQuestionIndex !== undefined && window.currentQuestionIndex !== currentQuestionIndex) {
        // Take screenshot before changing
        if (currentQuestionIndex >= 0) {
          takeQuestionScreenshot(currentQuestionIndex);
        }
        setCurrentQuestionIndex(window.currentQuestionIndex);
        
        // Take screenshot of new question
        setTimeout(() => {
          takeQuestionScreenshot(window.currentQuestionIndex);
        }, 500);
      }
    };

    // Initial sync and periodic sync
    syncCurrentQuestion();
    const interval = setInterval(syncCurrentQuestion, 500);

    return () => {
      window.removeEventListener('questionChanged', handleQuestionChange);
      clearInterval(interval);
    };
  }, [currentQuestionIndex]);

  // Take screenshot of current question - capture full exam page with HD quality
  const takeQuestionScreenshot = async (questionIndex) => {
    // Check if we already have a recent screenshot (within 2 seconds)
    const existingScreenshot = questionScreenshots[questionIndex];
    if (existingScreenshot && (Date.now() - existingScreenshot.timestamp) < 2000) {
      console.log(`Recent screenshot exists for question ${questionIndex + 1}, skipping`);
      return;
    }

    try {
      // Wait for content to fully load
      await new Promise(resolve => setTimeout(resolve, 300));

      // Target the entire exam UI for full page screenshot
      const examContent = document.querySelector('.exam-ui') || document.body;
      if (!examContent) {
        console.log('Exam content not found');
        return;
      }

      console.log(`Taking HD screenshot for question ${questionIndex + 1}...`);

      // Temporarily hide drawing toggle button for clean screenshot
      const drawingToggle = document.querySelector('.drawing-toggle');
      const toggleDisplay = drawingToggle ? drawingToggle.style.display : null;
      if (drawingToggle) drawingToggle.style.display = 'none';

      // Use high quality settings for full page screenshot
      const canvas = await html2canvas(examContent, {
        scale: 1.0, // Full HD quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: true,
        onclone: (clonedDoc) => {
          // Ensure all content is visible in the cloned document
          const body = clonedDoc.body;
          if (body) {
            body.style.transform = 'none';
            body.style.overflow = 'visible';
          }
          
          // Remove only unwanted UI elements but keep drawing canvas
          const elementsToRemove = clonedDoc.querySelectorAll(
            '.drawing-toggle, .fullscreen-btn-container, script'
          );
          elementsToRemove.forEach(el => el.remove());
          
          // Make sure drawing canvas is visible if it exists
          const drawingCanvas = clonedDoc.querySelector('#scratchpad canvas');
          if (drawingCanvas) {
            drawingCanvas.style.display = 'block';
            drawingCanvas.style.visibility = 'visible';
            drawingCanvas.style.opacity = '1';
          }
        }
      });

      // Restore drawing toggle visibility
      if (drawingToggle && toggleDisplay !== null) {
        drawingToggle.style.display = toggleDisplay;
      } else if (drawingToggle) {
        drawingToggle.style.display = 'block';
      }

      // Use PNG for better quality with drawing elements
      const screenshotData = canvas.toDataURL('image/png', 1.0);

      setQuestionScreenshots(prev => {
        const updated = {
          ...prev,
          [questionIndex]: {
            data: screenshotData,
            timestamp: Date.now(),
            visited: true,
            questionNumber: questionIndex + 1
          }
        };
        
        // Save to localStorage immediately
        localStorage.setItem('questionScreenshots', JSON.stringify(updated));
        return updated;
      });

      // Clean up canvas immediately
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 1, 1);

      console.log(`✅ Screenshot saved for question ${questionIndex + 1}`);
    } catch (error) {
      console.error(`❌ Error taking screenshot for question ${questionIndex + 1}:`, error);
    }
  };

  const toggleOverlay = () => {
    setDrawingVisible(!drawingVisible);
    setVisible(!visible);
  };

  // Get pointer position for both mouse and touch events
  const getPointerPosition = (e) => {
    const stage = e.target.getStage();
    return stage.getPointerPosition();
  };

  // Start drawing a new line for current question
  const handleMouseDownOrTouchStart = (e) => {
    setIsDrawing(true);
    const pointer = getPointerPosition(e);

    setLines((prevLines) => {
      const newLines = { ...prevLines };

      // If the group for the currentQuestionIndex doesn't exist, create it
      if (!newLines[currentQuestionIndex]) {
        newLines[currentQuestionIndex] = {};
      }

      const group = newLines[currentQuestionIndex];
      const newLineIndex = Object.keys(group).length;

      // Add the new line to the current question's group
      group[newLineIndex] = {
        tool,
        color: brushColor,
        points: [pointer.x, pointer.y]
      };

      console.log("Drawing started for question:", currentQuestionIndex, newLines);
      return newLines;
    });
  };

  // Draw while the mouse or touch is moving
  const handleMouseMoveOrTouchMove = (e) => {
    if (!isDrawing) return;

    const pointer = getPointerPosition(e);

    setLines((prevLines) => {
      const updatedLines = { ...prevLines };

      const group = updatedLines[currentQuestionIndex];
      if (!group) return prevLines;

      const currentLineIndex = Object.keys(group).length - 1;
      const currentLine = group[currentLineIndex];

      if (currentLine) {
        currentLine.points = currentLine.points.concat([pointer.x, pointer.y]);
      }

      return updatedLines;
    });
  };

  // Stop drawing the current line
  const handleMouseUpOrTouchEnd = () => {
    setIsDrawing(false);
  };

  // Clear the canvas for current question only
  const handleClear = () => {
    setLines((prevLines) => {
      const newLines = { ...prevLines };

      // Clear only the current question's drawings
      if (newLines[currentQuestionIndex]) {
        newLines[currentQuestionIndex] = {};
      }

      console.log("Cleared drawings for question:", currentQuestionIndex);
      return newLines;
    });
  };

  // Navigate to next question (if available)
  const nextQuestion = async () => {
    // Take screenshot before navigating with proper timing
    await takeQuestionScreenshot(currentQuestionIndex);
    
    // Small delay to ensure screenshot is processed
    setTimeout(() => {
      // Dispatch event to ExamPage to go to next question
      const event = new CustomEvent('navigateQuestion', { 
        detail: { direction: 'next' } 
      });
      window.dispatchEvent(event);
    }, 200);
  };

  // Navigate to previous question (if available)
  const prevQuestion = async () => {
    // Take screenshot before navigating with proper timing
    await takeQuestionScreenshot(currentQuestionIndex);
    
    // Small delay to ensure screenshot is processed
    setTimeout(() => {
      // Dispatch event to ExamPage to go to previous question
      const event = new CustomEvent('navigateQuestion', { 
        detail: { direction: 'prev' } 
      });
      window.dispatchEvent(event);
    }, 200);
  };

  // Generate PDF with only HD screenshots
  const generatePDF = async () => {
    try {
      // Take screenshot of current question first
      await takeQuestionScreenshot(currentQuestionIndex);

      const visitedQuestions = Object.keys(questionScreenshots)
        .map(key => parseInt(key))
        .sort((a, b) => a - b);

      if (visitedQuestions.length === 0) {
        alert('कोई questions visit नहीं हुए हैं।');
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5; // Minimal margin for more space

      let totalPagesAdded = 0;

      for (let i = 0; i < visitedQuestions.length; i++) {
        const questionIndex = visitedQuestions[i];
        const screenshot = questionScreenshots[questionIndex];

        // Add new page for each screenshot
        if (i > 0) {
          pdf.addPage();
        }
        totalPagesAdded++;

        // Add screenshot - full page size
        if (screenshot && screenshot.data) {
          try {
            // Calculate dimensions to fit full page
            const availableWidth = pageWidth - (2 * margin);
            const availableHeight = pageHeight - (2 * margin);
            
            // Use full available space for HD screenshot
            const imgWidth = availableWidth;
            const imgHeight = availableHeight;

            // Center the screenshot on page
            const xPosition = margin;
            const yPosition = margin;

            // Add high quality screenshot
            pdf.addImage(screenshot.data, 'PNG', xPosition, yPosition, imgWidth, imgHeight);

          } catch (imgError) {
            console.error('Error adding screenshot:', imgError);
          }
        }
      }

      // Save the PDF with date and time including seconds
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN').replace(/\//g, '-'); // DD-MM-YYYY format
      const timeStr = now.toLocaleTimeString('en-IN', { hour12: false }).replace(/:/g, '-'); // HH-MM-SS format
      const fileName = `Quiz_Screenshots_${dateStr}_${timeStr}.pdf`;
      pdf.save(fileName);

      alert(`✅ PDF सफलतापूर्वक बनाई गई!\n📄 File: ${fileName}\n📚 Questions: ${visitedQuestions.length}\n📄 Pages: ${totalPagesAdded}`);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('❌ PDF बनाने में समस्या हुई। कृपया फिर से कोशिश करें।');
    }
  };

  // Get current question's drawings
  const getCurrentQuestionLines = () => {
    return lines[currentQuestionIndex] || {};
  };

  // Save drawing data to localStorage when lines change
  useEffect(() => {
    localStorage.setItem('questionDrawings', JSON.stringify(lines));
  }, [lines]);

  // Save screenshots to localStorage when they change
  useEffect(() => {
    localStorage.setItem('questionScreenshots', JSON.stringify(questionScreenshots));
  }, [questionScreenshots]);

  // Load drawing data and screenshots from localStorage on component mount
  useEffect(() => {
    const savedDrawings = localStorage.getItem('questionDrawings');
    if (savedDrawings) {
      try {
        const parsedDrawings = JSON.parse(savedDrawings);
        setLines(parsedDrawings);
      } catch (error) {
        console.error('Error loading saved drawings:', error);
      }
    }

    const savedScreenshots = localStorage.getItem('questionScreenshots');
    if (savedScreenshots) {
      try {
        const parsedScreenshots = JSON.parse(savedScreenshots);
        setQuestionScreenshots(parsedScreenshots);
      } catch (error) {
        console.error('Error loading saved screenshots:', error);
      }
    }
  }, []);

  // Cleanup function with memory management
  const cleanup = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Clear any cached image data
      if (ctx.canvas) {
        ctx.canvas.width = ctx.canvas.width; // Force canvas reset
      }
    }

    // Clear screenshots if too many accumulated (keep only last 10)
    const screenshotKeys = Object.keys(questionScreenshots);
    if (screenshotKeys.length > 10) {
      const sortedKeys = screenshotKeys.sort((a, b) => Number(a) - Number(b));
      const keysToRemove = sortedKeys.slice(0, screenshotKeys.length - 10);

      setQuestionScreenshots(prev => {
        const updated = { ...prev };
        keysToRemove.forEach(key => {
          delete updated[key];
          // Also remove from localStorage to prevent memory buildup
          try {
            const stored = JSON.parse(localStorage.getItem('questionScreenshots') || '{}');
            delete stored[key];
            localStorage.setItem('questionScreenshots', JSON.stringify(stored));
          } catch (e) {
            console.warn('Could not clean localStorage screenshots:', e);
          }
        });
        return updated;
      });
    }
  };

  useEffect(() => {
    const handleQuestionChange = (event) => {
      const { questionIndex } = event.detail;
      setCurrentQuestionIndex(questionIndex);

      // Clear previous drawing when switching questions
      cleanup();

      // Auto-capture screenshot when navigating to a new question
      const timeoutId = setTimeout(() => {
        takeQuestionScreenshot(questionIndex);
      }, 500);

      // Store timeout ID for cleanup
      return () => clearTimeout(timeoutId);
    };

    window.addEventListener('questionChanged', handleQuestionChange);

    // Cleanup function
    return () => {
      window.removeEventListener('questionChanged', handleQuestionChange);
      cleanup();
    };
  }, []);

  // Add periodic cleanup to prevent memory buildup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }

      // Clear old screenshots data periodically (keep only last 5)
      setQuestionScreenshots(prev => {
        const keys = Object.keys(prev);
        if (keys.length > 5) {
          const sortedKeys = keys.sort((a, b) => Number(a) - Number(b));
          const keysToKeep = sortedKeys.slice(-5);
          const updated = {};
          keysToKeep.forEach(key => {
            updated[key] = prev[key];
          });
          return updated;
        }
        return prev;
      });

      // Clear old localStorage data
      try {
        const stored = JSON.parse(localStorage.getItem('questionScreenshots') || '{}');
        const keys = Object.keys(stored);
        if (keys.length > 10) {
          const sortedKeys = keys.sort((a, b) => Number(a) - Number(b));
          const keysToKeep = sortedKeys.slice(-10);
          const updated = {};
          keysToKeep.forEach(key => {
            updated[key] = stored[key];
          });
          localStorage.setItem('questionScreenshots', JSON.stringify(updated));
        }
      } catch (e) {
        console.warn('Cleanup warning:', e);
      }
    }, 2 * 60 * 1000); // Run every 2 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <>
      <div className="drawing-toggle" style={{ zIndex: 10000, pointerEvents: 'auto' }}>
        <button onClick={toggleOverlay} style={{ zIndex: 10001 }}>✍️</button>
        <div className={`drawing-panel ${visible ? 'open' : ''}`} style={{ zIndex: 9999 }}>
          <button onClick={() => setTool('pen')}>🖊️</button>
          {tool === 'pen' && (
            <div className="color-picker">
              <button onClick={() => setBrushColor('#000')} style={{ background: '#000' }} />
              <button onClick={() => setBrushColor('#f00')} style={{ background: '#f00' }} />
              <button onClick={() => setBrushColor('#00f')} style={{ background: '#00f' }} />
              <button onClick={() => setBrushColor('#0a0')} style={{ background: '#0a0' }} />
            </div>
          )}
          <button onClick={() => setTool('eraser')}>🧽</button>
          <button onClick={handleClear}>🗑️</button>

          {/* Navigation buttons for questions */}
          <button onClick={prevQuestion} title="Previous Question">⬅️</button>
          <button onClick={nextQuestion} title="Next Question">➡️</button>

          {/* Page counter display as circular icon */}
          <div 
            className="page-counter-circle" 
            title={`Visited questions: ${Object.keys(questionScreenshots).length} - Click to download PDF`}
            onClick={generatePDF}
          >
            {Object.keys(questionScreenshots).length}
          </div>
        </div>
      </div>
      <div id="scratchpad" style={{ display: visible ? 'block' : 'none' }}>
        {/* Drawing Pad - shows only current question's drawings */}
        {drawingVisible && (
          <Stage
            width={window.innerWidth}
            height={window.innerHeight}
            onMouseDown={handleMouseDownOrTouchStart}
            onMouseMove={handleMouseMoveOrTouchMove}
            onMouseUp={handleMouseUpOrTouchEnd}
            onTouchStart={handleMouseDownOrTouchStart}
            onTouchMove={handleMouseMoveOrTouchMove}
            onTouchEnd={handleMouseUpOrTouchEnd}
          >
            <Layer>
              {/* Display only current question's lines */}
              {Object.entries(getCurrentQuestionLines()).map(([lineIndex, line]) => (
                <Line
                  key={`${currentQuestionIndex}-${lineIndex}`}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.tool === 'pen' ? 3 : 30}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                />
              ))}
            </Layer>
          </Stage>
        )}
      </div>
    </>
  );
}

export default DrawingOverlay;