
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

  // Take screenshot of current question
  const takeQuestionScreenshot = async (questionIndex) => {
    try {
      const examContent = document.querySelector('.exam-left') || 
                         document.querySelector('.question-viewer') ||
                         document.querySelector('.exam-main-layout');
      
      if (examContent) {
        const canvas = await html2canvas(examContent, {
          useCORS: true,
          allowTaint: true,
          scale: 1.5,
          backgroundColor: '#ffffff',
          width: examContent.offsetWidth,
          height: examContent.offsetHeight
        });
        
        const screenshotData = canvas.toDataURL('image/png');
        
        setQuestionScreenshots(prev => ({
          ...prev,
          [questionIndex]: {
            data: screenshotData,
            timestamp: Date.now(),
            width: canvas.width,
            height: canvas.height
          }
        }));
        
        console.log(`Screenshot taken for question ${questionIndex + 1}`);
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

  // Generate PDF with all questions, screenshots, and drawings
  const generatePDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Get questions from localStorage
      const questions = JSON.parse(localStorage.getItem('finalQuiz')) || [];
      const answers = JSON.parse(localStorage.getItem('examAnswers')) || 
                     JSON.parse(localStorage.getItem('examState'))?.answers || {};
      
      let isFirstPage = true;
      let totalPagesAdded = 0;
      
      // Take screenshot of current question before generating PDF
      await takeQuestionScreenshot(currentQuestionIndex);
      
      for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;
        totalPagesAdded++;
        
        const question = questions[questionIndex];
        const userAnswer = answers[questionIndex];
        
        // Add page header
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Question ${questionIndex + 1}`, 10, 15);
        
        let yPosition = 25;
        
        // Add screenshot if available
        const screenshot = questionScreenshots[questionIndex];
        if (screenshot) {
          try {
            const imgWidth = pageWidth - 20; // 10mm margin on each side
            const imgHeight = Math.min((screenshot.height * imgWidth) / screenshot.width, pageHeight - 80);
            
            pdf.addImage(screenshot.data, 'PNG', 10, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
          } catch (imgError) {
            console.error('Error adding screenshot for question:', questionIndex, imgError);
            // Add fallback text
            pdf.setFontSize(10);
            pdf.text('Screenshot not available', 10, yPosition);
            yPosition += 10;
          }
        } else {
          // Add fallback text
          pdf.setFontSize(10);
          pdf.text('No screenshot available for this question', 10, yPosition);
          yPosition += 10;
        }
        
        // Add question info at bottom
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          totalPagesAdded++;
          yPosition = 20;
        }
        
        // Add user's answer if exists
        if (userAnswer !== undefined) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          const answerText = question.options && question.options[userAnswer] 
            ? `Your Answer: ${String.fromCharCode(65 + userAnswer)}) ${question.options[userAnswer]}`
            : `Your Answer: ${userAnswer}`;
          pdf.text(answerText, 10, yPosition);
          yPosition += 6;
        }
        
        // Add correct answer
        if (question.answer !== undefined) {
          pdf.setTextColor(0, 128, 0); // Green color
          const correctText = question.options && question.options[question.answer]
            ? `Correct Answer: ${String.fromCharCode(65 + question.answer)}) ${question.options[question.answer]}`
            : `Correct Answer: ${question.answer}`;
          pdf.text(correctText, 10, yPosition);
          pdf.setTextColor(0, 0, 0); // Reset to black
          yPosition += 6;
        }
        
        // Add drawing overlay if exists for this question
        const questionDrawings = lines[questionIndex];
        if (questionDrawings && Object.keys(questionDrawings).length > 0) {
          try {
            // Create a temporary canvas for drawing
            const drawingCanvas = document.createElement('canvas');
            drawingCanvas.width = window.innerWidth;
            drawingCanvas.height = window.innerHeight;
            const ctx = drawingCanvas.getContext('2d');
            
            // Set white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            
            // Draw all lines for this question
            Object.values(questionDrawings).forEach(line => {
              if (line.points && line.points.length >= 2) {
                ctx.strokeStyle = line.color || '#000';
                ctx.lineWidth = line.tool === 'pen' ? 3 : 30;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (line.tool === 'eraser') {
                  ctx.globalCompositeOperation = 'destination-out';
                } else {
                  ctx.globalCompositeOperation = 'source-over';
                }
                
                ctx.beginPath();
                ctx.moveTo(line.points[0], line.points[1]);
                for (let i = 2; i < line.points.length; i += 2) {
                  ctx.lineTo(line.points[i], line.points[i + 1]);
                }
                ctx.stroke();
              }
            });
            
            const drawingImgData = drawingCanvas.toDataURL('image/png');
            
            // Add new page for drawing
            pdf.addPage();
            totalPagesAdded++;
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Question ${questionIndex + 1} - Drawing Notes`, 10, 15);
            
            const drawingImgWidth = pageWidth - 20;
            const drawingImgHeight = (drawingCanvas.height * drawingImgWidth) / drawingCanvas.width;
            
            pdf.addImage(drawingImgData, 'PNG', 10, 25, drawingImgWidth, Math.min(drawingImgHeight, pageHeight - 35));
            
          } catch (drawingError) {
            console.error('Error adding drawing for question:', questionIndex, drawingError);
          }
        }
      }
      
      // Update page count
      setPdfPageCount(totalPagesAdded);
      
      // Save the PDF
      const fileName = `Quiz_Complete_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      alert(`PDF generated successfully!\nFile: ${fileName}\nTotal Pages: ${totalPagesAdded}`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
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
            title={`Screenshots captured: ${Object.keys(questionScreenshots).length} - Click to download PDF`}
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
