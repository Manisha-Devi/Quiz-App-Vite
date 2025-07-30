import React, { useState, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import './styles/DrawingOverlay.css';

function DrawingOverlay() {
  const [visible, setVisible] = useState(false);
  const [color, setColor] = useState('#000');
  const [savedImage, setSavedImage] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState({}); // Store lines as a nested object with index as key
  const [brushColor, setBrushColor] = useState('#000');
  const [tool, setTool] = useState('pen');
  const [drawingVisible, setDrawingVisible] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0); // Track the current index for navigation

  const toggleOverlay = () => {
    setDrawingVisible(!drawingVisible);
    setVisible(!visible);
  };

  const togglePenColors = () => {
    if (!visible) {
      // If overlay is not visible, open it first
      setDrawingVisible(true);
      setVisible(true);
    }
    // Set tool to pen to show color picker
    setTool('pen');
  };

  // Get pointer position for both mouse and touch events
  const getPointerPosition = (e) => {
    const stage = e.target.getStage();
    return stage.getPointerPosition();
  };

  // Start drawing a new line or add points to the existing line in the current group
  const handleMouseDownOrTouchStart = (e) => {
    setIsDrawing(true);
    const pointer = getPointerPosition(e);

    setLines((prevLines) => {
      const newLines = { ...prevLines }; // Copy previous lines

      // If the group for the currentIndex doesn't exist, create a new group
      if (!newLines[currentIndex]) {
        newLines[currentIndex] = {}; // Create a new group if not exist
      }

      const group = newLines[currentIndex];
      const newIndex = Object.keys(group).length; // Get the next available line index

      // Add the new line to the group
      group[newIndex] = {
        tool,
        color: brushColor,
        points: [pointer.x, pointer.y]
      };

      console.log("Updated lines after mouse down:", newLines);
      return newLines;
    });
  };

  // Draw while the mouse or touch is moving
  const handleMouseMoveOrTouchMove = (e) => {
    if (!isDrawing) return;

    const pointer = getPointerPosition(e);

    setLines((prevLines) => {
      const updatedLines = { ...prevLines }; // Copy the previous lines

      const group = updatedLines[currentIndex]; // Get the group for the current index
      const currentLine = group[Object.keys(group).length - 1]; // Get the current line by its index

      // Append points to the current line
      currentLine.points = currentLine.points.concat([pointer.x, pointer.y]);

      console.log("Updated lines with new points:", updatedLines);
      return updatedLines; // Return the updated lines
    });
  };

  // Stop drawing the current line
  const handleMouseUpOrTouchEnd = () => {
    setIsDrawing(false);
  };

  // Clear the canvas but only for the current group
  const handleClear = () => {
    setLines((prevLines) => {
      const newLines = { ...prevLines }; // Copy previous lines

      // If the group exists, clear the lines for the current index
      if (newLines[currentIndex]) {
        newLines[currentIndex] = {}; // Clear the lines for the current group
      }

      console.log("Lines cleared for current index:", currentIndex, newLines);
      return newLines;
    });
  };

  // Handle adding a new group (increment index)
  const handleAddition = () => {
    // Increment the index for the next group
    const newIndex = currentIndex + 1;

    // Set the current index and preserve the lines for the previous group
    setLines((prevLines) => {
      const newLines = { ...prevLines };
      newLines[newIndex] = {}; // Create a new group for the next index
      console.log("Added new group (handleAddition):", newLines);
      return newLines;
    });

    setCurrentIndex(newIndex); // Update the current index
    console.log("Current index after addition:", newIndex);
  };

  // Handle removing the current group and shifting subsequent indexes
  const handleRemove = () => {
    setLines((prevLines) => {
      const newLines = { ...prevLines }; // Copy previous lines

      // If the group for the currentIndex exists, delete it
      if (newLines[currentIndex]) {
        delete newLines[currentIndex]; // Delete the lines for the current group
        console.log("Removed lines for current index:", currentIndex, newLines);
      }

      // Now shift all subsequent groups down by 1 index
      const shiftedLines = {};
      Object.keys(newLines).forEach((key) => {
        const groupIndex = parseInt(key, 10);
        if (groupIndex > currentIndex) {
          shiftedLines[groupIndex - 1] = newLines[key]; // Shift down by 1 index
        } else {
          shiftedLines[groupIndex] = newLines[key]; // Keep other groups as is
        }
      });

      console.log("Shifted groups after removal:", shiftedLines);
      return shiftedLines;
    });

    // Decrement the current index since we removed the current group
    setCurrentIndex(Math.max(0, currentIndex - 1)); // Update the index after removal
    console.log("Current index after remove:", currentIndex);
  };

  // Navigate to the next group (index)
  const nextIndex = () => {
    if (currentIndex < Object.keys(lines).length - 1) {
      setCurrentIndex(currentIndex + 1); // Move to the next group
      console.log("Next group index:", currentIndex + 1);
    }
  };

  // Navigate to the previous group (index)
  const prevIndex = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1); // Move to the previous group
      console.log("Previous group index:", currentIndex - 1);
    }
  };

  // Ensure that we re-render lines properly when the currentIndex changes
  useEffect(() => {
    console.log('Navigated to group:', currentIndex);
  }, [currentIndex]);

  // Make togglePenColors available globally
  useEffect(() => {
    window.togglePenColors = togglePenColors;
    return () => {
      delete window.togglePenColors;
    };
  }, [visible]);

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

          {/* New buttons for adding, removing, and navigating */}
          <button onClick={handleAddition}>➕</button>
          <button onClick={handleRemove}>✖️</button>
          <button onClick={nextIndex}>➡️</button>
          <button onClick={prevIndex}>⬅️</button>
        </div>
      </div>
      <div id="scratchpad" style={{ display: visible ? 'block' : 'none' }}>
        {/* Drawing Pad */}
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
              {/* Loop through each group (currentIndex) and each line within that group */}
              {Object.entries(lines).map(([groupIndex, group]) =>
                groupIndex === String(currentIndex) && // Only display lines in the current group
                Object.entries(group).map(([lineIndex, line]) => (
                  <Line
                    key={`${groupIndex}-${lineIndex}`}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.tool === 'pen' ? 3 : 30} // thinner for pen, larger for eraser
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={line.tool === 'eraser' ? 'destination-out' : 'source-over'}
                  />
                ))
              )}
            </Layer>
          </Stage>
        )}
      </div>
    </>
  );
}

export default DrawingOverlay;
