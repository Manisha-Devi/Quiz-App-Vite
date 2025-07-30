
import React, { useState, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import './styles/DrawingOverlay.css';

function DrawingOverlay({ currentQuestionIndex = 0 }) {
  const [visible, setVisible] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState({}); // Store lines as nested object with questionIndex as key
  const [brushColor, setBrushColor] = useState('#000');
  const [tool, setTool] = useState('pen');
  const [drawingVisible, setDrawingVisible] = useState(false);

  // Load saved drawings from localStorage on component mount
  useEffect(() => {
    const savedDrawings = localStorage.getItem('questionDrawings');
    if (savedDrawings) {
      try {
        setLines(JSON.parse(savedDrawings));
      } catch (error) {
        console.error('Error loading saved drawings:', error);
      }
    }
  }, []);

  // Save drawings to localStorage whenever lines change
  useEffect(() => {
    localStorage.setItem('questionDrawings', JSON.stringify(lines));
  }, [lines]);

  // Make drawing overlay globally accessible for other components
  useEffect(() => {
    window.drawingOverlay = {
      toggle: toggleOverlay,
      clear: () => handleClear(),
      setQuestionIndex: (index) => {
        // This function can be called from other components to sync question index
        console.log('Drawing overlay synced to question:', index);
      }
    };

    return () => {
      delete window.drawingOverlay;
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

  // Start drawing a new line for the current question
  const handleMouseDownOrTouchStart = (e) => {
    setIsDrawing(true);
    const pointer = getPointerPosition(e);

    setLines((prevLines) => {
      const newLines = { ...prevLines };

      // If the group for the currentQuestionIndex doesn't exist, create it
      if (!newLines[currentQuestionIndex]) {
        newLines[currentQuestionIndex] = {};
      }

      const questionLines = newLines[currentQuestionIndex];
      const newLineIndex = Object.keys(questionLines).length;

      // Add the new line to the current question's canvas
      questionLines[newLineIndex] = {
        tool,
        color: brushColor,
        points: [pointer.x, pointer.y]
      };

      return newLines;
    });
  };

  // Draw while the mouse or touch is moving
  const handleMouseMoveOrTouchMove = (e) => {
    if (!isDrawing) return;

    const pointer = getPointerPosition(e);

    setLines((prevLines) => {
      const updatedLines = { ...prevLines };

      if (!updatedLines[currentQuestionIndex]) {
        return updatedLines;
      }

      const questionLines = updatedLines[currentQuestionIndex];
      const currentLineIndex = Object.keys(questionLines).length - 1;
      
      if (questionLines[currentLineIndex]) {
        // Append points to the current line
        questionLines[currentLineIndex].points = questionLines[currentLineIndex].points.concat([pointer.x, pointer.y]);
      }

      return updatedLines;
    });
  };

  // Stop drawing the current line
  const handleMouseUpOrTouchEnd = () => {
    setIsDrawing(false);
  };

  // Clear the canvas for the current question only
  const handleClear = () => {
    setLines((prevLines) => {
      const newLines = { ...prevLines };
      
      // Clear only the current question's canvas
      if (newLines[currentQuestionIndex]) {
        newLines[currentQuestionIndex] = {};
      }

      return newLines;
    });
  };

  // Clear all canvases for all questions
  const handleClearAll = () => {
    setLines({});
    localStorage.removeItem('questionDrawings');
  };

  // Get the lines for the current question
  const getCurrentQuestionLines = () => {
    return lines[currentQuestionIndex] || {};
  };

  return (
    <>
      <div className="drawing-toggle">
        <button onClick={toggleOverlay} title={`Drawing Canvas - Question ${currentQuestionIndex + 1}`}>
          ✍️
        </button>
        <div className={`drawing-panel ${visible ? 'open' : ''}`}>
          <div className="drawing-info">
            <span className="question-indicator">Q{currentQuestionIndex + 1}</span>
          </div>
          
          <div className="tool-section">
            <button 
              onClick={() => setTool('pen')} 
              className={tool === 'pen' ? 'active' : ''}
              title="Pen Tool"
            >
              🖊️
            </button>
            
            {tool === 'pen' && (
              <div className="color-picker">
                <button 
                  onClick={() => setBrushColor('#000')} 
                  style={{ background: '#000' }}
                  className={brushColor === '#000' ? 'active' : ''}
                  title="Black"
                />
                <button 
                  onClick={() => setBrushColor('#f00')} 
                  style={{ background: '#f00' }}
                  className={brushColor === '#f00' ? 'active' : ''}
                  title="Red"
                />
                <button 
                  onClick={() => setBrushColor('#00f')} 
                  style={{ background: '#00f' }}
                  className={brushColor === '#00f' ? 'active' : ''}
                  title="Blue"
                />
                <button 
                  onClick={() => setBrushColor('#0a0')} 
                  style={{ background: '#0a0' }}
                  className={brushColor === '#0a0' ? 'active' : ''}
                  title="Green"
                />
              </div>
            )}
            
            <button 
              onClick={() => setTool('eraser')} 
              className={tool === 'eraser' ? 'active' : ''}
              title="Eraser Tool"
            >
              🧽
            </button>
          </div>

          <div className="action-section">
            <button onClick={handleClear} title="Clear Current Question Canvas">
              🗑️ Clear
            </button>
            <button onClick={handleClearAll} title="Clear All Question Canvases" className="danger-btn">
              🗑️ Clear All
            </button>
          </div>

          <div className="canvas-stats">
            <small>
              Drawings: {Object.keys(getCurrentQuestionLines()).length} lines
              <br />
              Total Questions with Drawings: {Object.keys(lines).length}
            </small>
          </div>
        </div>
      </div>

      <div id="scratchpad" style={{ display: visible ? 'block' : 'none' }}>
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
              {/* Render only the lines for the current question */}
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
