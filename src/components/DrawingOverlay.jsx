
import React, { useState, useEffect } from 'react';
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

  // Get current question index from ExamPage
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Listen for question changes from ExamPage
  useEffect(() => {
    const handleQuestionChange = (event) => {
      const newIndex = event.detail.questionIndex;
      
      // Take screenshot of current question before switching
      if (newIndex !== currentQuestionIndex) {
        takeQuestionScreenshot(currentQuestionIndex);
      }
      
      setCurrentQuestionIndex(newIndex);
      console.log('Question changed to:', newIndex);
    };

    // Listen for custom events from ExamPage
    window.addEventListener('questionChanged', handleQuestionChange);
    
    // Also check if there's a global current question index
    const checkCurrentQuestion = () => {
      if (window.currentQuestionIndex !== undefined) {
        if (window.currentQuestionIndex !== currentQuestionIndex) {
          takeQuestionScreenshot(currentQuestionIndex);
        }
        setCurrentQuestionIndex(window.currentQuestionIndex);
      }
    };
    
    // Check immediately and set up interval to sync
    checkCurrentQuestion();
    const interval = setInterval(checkCurrentQuestion, 100);

    return () => {
      window.removeEventListener('questionChanged', handleQuestionChange);
      clearInterval(interval);
    };
  }, [currentQuestionIndex]);

  // Take screenshot of current question - capture full exam page
  const takeQuestionScreenshot = async (questionIndex) => {
    try {
      // Capture the entire exam UI instead of just the question area
      const examContent = document.querySelector('.exam-ui') || 
                         document.querySelector('.exam-main-layout') ||
                         document.body;
      
      if (examContent) {
        const canvas = await html2canvas(examContent, {
          useCORS: true,
          allowTaint: true,
          scale: 1.2,
          backgroundColor: '#ffffff',
          width: examContent.offsetWidth,
          height: examContent.offsetHeight,
          scrollX: 0,
          scrollY: 0,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight
        });
        
        const screenshotData = canvas.toDataURL('image/png');
        
        setQuestionScreenshots(prev => ({
          ...prev,
          [questionIndex]: {
            data: screenshotData,
            timestamp: Date.now(),
            width: canvas.width,
            height: canvas.height,
            visited: true
          }
        }));
        
        console.log(`Full page screenshot taken for question ${questionIndex + 1}`);
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
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
  const nextQuestion = () => {
    // Take screenshot before navigating
    takeQuestionScreenshot(currentQuestionIndex);
    
    // Dispatch event to ExamPage to go to next question
    const event = new CustomEvent('navigateQuestion', { 
      detail: { direction: 'next' } 
    });
    window.dispatchEvent(event);
  };

  // Navigate to previous question (if available)
  const prevQuestion = () => {
    // Take screenshot before navigating
    takeQuestionScreenshot(currentQuestionIndex);
    
    // Dispatch event to ExamPage to go to previous question
    const event = new CustomEvent('navigateQuestion', { 
      detail: { direction: 'prev' } 
    });
    window.dispatchEvent(event);
  };

  // Generate PDF with 2 screenshots per page for better space utilization
  const generatePDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pageWidth - (2 * margin);
      const availableHeight = pageHeight - (2 * margin);
      
      // Get questions from localStorage
      const questions = JSON.parse(localStorage.getItem('finalQuiz')) || [];
      const answers = JSON.parse(localStorage.getItem('examAnswers')) || 
                     JSON.parse(localStorage.getItem('examState'))?.answers || {};
      
      let totalPagesAdded = 0;
      let screenshotsOnCurrentPage = 0;
      let currentYPosition = margin;
      
      // Take screenshot of current question before generating PDF
      await takeQuestionScreenshot(currentQuestionIndex);
      
      // Get only visited questions (those with screenshots)
      const visitedQuestions = Object.keys(questionScreenshots)
        .map(key => parseInt(key))
        .sort((a, b) => a - b);
      
      if (visitedQuestions.length === 0) {
        alert('कोई questions visit नहीं हुए हैं। पहले कुछ questions देखें।');
        return;
      }
      
      // Add first page
      totalPagesAdded++;
      
      // Add title page
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Quiz Screenshots & Notes', pageWidth / 2, 30, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Questions Visited: ${visitedQuestions.length}`, pageWidth / 2, 45, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 55, { align: 'center' });
      
      currentYPosition = 70;
      
      for (let i = 0; i < visitedQuestions.length; i++) {
        const questionIndex = visitedQuestions[i];
        const screenshot = questionScreenshots[questionIndex];
        const questionDrawings = lines[questionIndex];
        
        // Check if we need a new page (2 screenshots per page max)
        if (screenshotsOnCurrentPage >= 2) {
          pdf.addPage();
          totalPagesAdded++;
          screenshotsOnCurrentPage = 0;
          currentYPosition = margin;
        }
        
        // If first screenshot on page, start from top
        if (screenshotsOnCurrentPage === 0) {
          currentYPosition = margin + 5;
        }
        
        // Calculate image dimensions for half page height
        const maxImageHeight = (availableHeight - 20) / 2; // Space for 2 images + spacing
        const imageWidth = availableWidth * 0.95; // 95% of available width
        
        // Add question header
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Q${questionIndex + 1}`, margin, currentYPosition);
        currentYPosition += 8;
        
        // Add screenshot
        if (screenshot) {
          try {
            // Calculate proper aspect ratio
            const aspectRatio = screenshot.width / screenshot.height;
            let imgWidth = imageWidth;
            let imgHeight = imgWidth / aspectRatio;
            
            // If height is too much, adjust based on height
            if (imgHeight > maxImageHeight) {
              imgHeight = maxImageHeight;
              imgWidth = imgHeight * aspectRatio;
            }
            
            // Center the image horizontally
            const xPosition = (pageWidth - imgWidth) / 2;
            
            pdf.addImage(screenshot.data, 'PNG', xPosition, currentYPosition, imgWidth, imgHeight);
            currentYPosition += imgHeight + 5;
            
            // Add drawing overlay if exists
            if (questionDrawings && Object.keys(questionDrawings).length > 0) {
              try {
                // Create canvas for drawing overlay
                const drawingCanvas = document.createElement('canvas');
                drawingCanvas.width = screenshot.width;
                drawingCanvas.height = screenshot.height;
                const ctx = drawingCanvas.getContext('2d');
                
                // Transparent background
                ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                
                // Scale factor for drawings to match screenshot
                const scaleX = screenshot.width / window.innerWidth;
                const scaleY = screenshot.height / window.innerHeight;
                
                // Draw all lines with proper scaling
                Object.values(questionDrawings).forEach(line => {
                  if (line.points && line.points.length >= 2) {
                    ctx.strokeStyle = line.color || '#FF0000'; // Make drawings more visible
                    ctx.lineWidth = (line.tool === 'pen' ? 4 : 35) * Math.max(scaleX, scaleY);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.globalCompositeOperation = 'source-over';
                    
                    ctx.beginPath();
                    const scaledPoints = line.points.map((point, index) => 
                      index % 2 === 0 ? point * scaleX : point * scaleY
                    );
                    
                    ctx.moveTo(scaledPoints[0], scaledPoints[1]);
                    for (let j = 2; j < scaledPoints.length; j += 2) {
                      ctx.lineTo(scaledPoints[j], scaledPoints[j + 1]);
                    }
                    ctx.stroke();
                  }
                });
                
                const drawingImgData = drawingCanvas.toDataURL('image/png');
                
                // Overlay drawing on screenshot with same dimensions
                pdf.addImage(drawingImgData, 'PNG', xPosition, currentYPosition - imgHeight - 5, imgWidth, imgHeight);
                
              } catch (drawingError) {
                console.error('Error adding drawing overlay:', drawingError);
              }
            }
            
          } catch (imgError) {
            console.error('Error adding screenshot:', imgError);
            pdf.setFontSize(10);
            pdf.text('Screenshot लोड नहीं हो सका', margin, currentYPosition);
            currentYPosition += 10;
          }
        }
        
        screenshotsOnCurrentPage++;
        
        // Add some spacing between questions on same page
        if (screenshotsOnCurrentPage === 1) {
          currentYPosition += 10;
        }
      }
      
      // Save the PDF
      const fileName = `Quiz_Screenshots_${new Date().getTime()}.pdf`;
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

  return (
    <>
      <div className="drawing-toggle">
        <button onClick={toggleOverlay}>✍️</button>
        <div className={`drawing-panel ${visible ? 'open' : ''}`}>
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
