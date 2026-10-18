import React from "react";
import useStorageMode from "./useStorageMode";

const modeLabels = {
  server: "Server",
  local: "Local",
  upload: "Upload",
};

function StorageIcon({ mode }) {
  if (mode === "local") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 6.5h6l2 2h9v9.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z" />
        <path d="M3.5 9h17" />
      </svg>
    );
  }

  if (mode === "upload") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 15V4" />
        <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
        <path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="6.5" rx="1.5" />
      <rect x="3.5" y="13.5" width="17" height="6.5" rx="1.5" />
      <path d="M7 7.25h.01M7 16.75h.01" />
      <path d="M11 7.25h6M11 16.75h6" />
    </svg>
  );
}

function StorageModeCycleButton() {
  const { mode, uploading, cycleMode } = useStorageMode();
  const label = uploading ? "Uploading…" : modeLabels[mode];
  const nextMode =
    mode === "server" ? "Local" : mode === "local" ? "Upload JSON" : "Server";

  return (
    <button
      type="button"
      className={`storage-mode-cycle-button mode-${mode}`}
      onClick={cycleMode}
      disabled={uploading}
      title={`Current mode: ${label}. Click to switch to ${nextMode}.`}
      aria-label={`Current storage mode: ${label}. Click to switch to ${nextMode}.`}
    >
      <StorageIcon mode={mode} />
      <span>{label}</span>
    </button>
  );
}

export default StorageModeCycleButton;
