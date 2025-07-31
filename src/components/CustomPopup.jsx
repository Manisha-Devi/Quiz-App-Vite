
import React from 'react';
import '../styles/CustomPopup.css';

const CustomPopup = ({ message, type, onClose, isVisible, showConfirm, onConfirm }) => {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      case 'info': return 'Information';
      default: return 'Message';
    }
  };

  return (
    <div className="popup-backdrop" onClick={onClose}>
      <div className={`popup-container popup-${type}`} onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <span className="popup-icon">{getIcon()}</span>
          <h3 className="popup-title">{getTitle()}</h3>
        </div>
        
        <div className="popup-content">
          <pre className="popup-message">{message}</pre>
        </div>
        
        <div className="popup-actions">
          {showConfirm ? (
            <>
              <button className="popup-cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button className="popup-confirm-btn" onClick={onConfirm}>
                Confirm
              </button>
            </>
          ) : (
            <button className="popup-close-btn" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomPopup;
