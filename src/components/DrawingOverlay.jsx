
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

  // Get current question index from ExamPage
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Listen for question changes from ExamPage
  useEffect(() => {
    const handleQuestionChange = (event) => {
      const newIndex = event.detail.questionIndex;
      setCurrentQuestionIndex(newIndex);
      console.log('Question changed to:', newIndex);
    };

    // Listen for custom events from ExamPage
    window.addEventListener('questionChanged', handleQuestionChange);
    
    // Also check if there's a global current question index
    const checkCurrentQuestion = () => {
      if (window.currentQuestionIndex !== undefined) {
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
  }, []);

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
    // Dispatch event to ExamPage to go to next question
    const event = new CustomEvent('navigateQuestion', { 
      detail: { direction: 'next' } 
    });
    window.dispatchEvent(event);
  };

  // Navigate to previous question (if available)
  const prevQuestion = () => {
    // Dispatch event to ExamPage to go to previous question
    const event = new CustomEvent('navigateQuestion', { 
      detail: { direction: 'prev' } 
    });
    window.dispatchEvent(event);
  };

  // Generate PDF with all questions and drawings
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
      
      for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;
        
        // Temporarily switch to the question
        const originalIndex = currentQuestionIndex;
        setCurrentQuestionIndex(questionIndex);
        
        // Wait for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Capture the main exam content (question area)
        const examContent = document.querySelector('.exam-left') || 
                           document.querySelector('.question-viewer') ||
                           document.querySelector('.exam-main-layout');
        
        if (examContent) {
          try {
            const canvas = await html2canvas(examContent, {
              useCORS: true,
              allowTaint: true,
              scale: 2,
              backgroundColor: '#ffffff',
              width: examContent.offsetWidth,
              height: examContent.offsetHeight
            });
            
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pageWidth - 20; // 10mm margin on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Add question content
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 40));
            
            // Add question info
            const question = questions[questionIndex];
            const userAnswer = answers[questionIndex];
            
            let yPosition = Math.min(imgHeight + 20, pageHeight - 30);
            
            // Add question number
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Question ${questionIndex + 1}`, 10, yPosition);
            
            // Add user's answer if exists
            if (userAnswer !== undefined) {
              yPosition += 6;
              pdf.setFont('helvetica', 'normal');
              const answerText = question.options && question.options[userAnswer] 
                ? `Answer: ${String.fromCharCode(65 + userAnswer)}) ${question.options[userAnswer]}`
                : `Answer: ${userAnswer}`;
              pdf.text(answerText, 10, yPosition);
            }
            
            // Add correct answer
            if (question.answer !== undefined) {
              yPosition += 6;
              pdf.setTextColor(0, 128, 0); // Green color
              const correctText = question.options && question.options[question.answer]
                ? `Correct: ${String.fromCharCode(65 + question.answer)}) ${question.options[question.answer]}`
                : `Correct: ${question.answer}`;
              pdf.text(correctText, 10, yPosition);
              pdf.setTextColor(0, 0, 0); // Reset to black
            }
            
          } catch (canvasError) {
            console.error('Error capturing question:', questionIndex, canvasError);
            // Add fallback text
            pdf.setFontSize(14);
            pdf.text(`Question ${questionIndex + 1} - Screenshot unavailable`, 10, 20);
          }
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
        
        // Restore original question index
        setCurrentQuestionIndex(originalIndex);
      }
      
      // Save the PDF
      const fileName = `Quiz_Questions_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      alert(`PDF generated successfully! File saved as: ${fileName}`);
      
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

  // Load drawing data from localStorage on component mount
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
          
          {/* PDF Generation button */}
          <button onClick={generatePDF} title="Generate PDF with all questions and drawings" className="pdf-btn">
            📄 PDF
          </button>
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
