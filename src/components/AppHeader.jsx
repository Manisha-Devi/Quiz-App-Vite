import React from "react";
import "./styles/AppHeader.css";

function AppHeader({
  isOnline,
  isDarkMode,
  onToggleDarkMode,
  onLibraryAction,
  libraryIcon = "📁",
  libraryTitle = "Open local quiz files",
  libraryActive = true,
  title = "Upload",
}) {
  return (
    <header className="app-header">
      <div className="app-header-title">
        <span className="app-header-title-icon" aria-hidden="true">
          📂
        </span>
        <span className="app-header-title-text">{title}</span>
      </div>

      <div className="app-header-controls">
        <div
          className="app-header-connection"
          aria-label={isOnline ? "Online" : "Offline"}
        >
          <span
            className={`app-header-status-dot ${
              isOnline ? "online" : "offline"
            }`}
            aria-hidden="true"
          />
          <span>{isOnline ? "Online" : "Offline"}</span>
        </div>
        <button
          type="button"
          className="app-header-button app-header-theme-button"
          onClick={onToggleDarkMode}
          title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
        <button
          type="button"
          className={`app-header-button app-header-library-button${
            libraryActive ? " active" : ""
          }`}
          onClick={onLibraryAction}
          title={libraryTitle}
          aria-label={libraryTitle}
        >
          {libraryIcon}
        </button>
      </div>
    </header>
  );
}

export default AppHeader;
