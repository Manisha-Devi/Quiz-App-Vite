
import React, { useState, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
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
