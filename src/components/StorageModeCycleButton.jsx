import React from "react";
import { useStorageMode } from "./StorageModeContext";

const modes = [
  { id: "server", label: "Server" },
  { id: "local", label: "Local" },
  { id: "upload", label: "Upload" },
];

function ModeIcon({ mode }) {
  if (mode === "server") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="6" rx="1.5" />
        <rect x="4" y="14" width="16" height="6" rx="1.5" />
        <path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" />
      </svg>
    );
  }

  if (mode === "local") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15V4m0 0L8 8m4-4 4 4" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

function StorageModeCycleButton() {
  const { mode, setMode } = useStorageMode();

  return (
    <div className="storage-mode-control" role="group" aria-label="Question bank source">
      {modes.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`storage-mode-option${mode === item.id ? " active" : ""}`}
          aria-pressed={mode === item.id}
          aria-label={`${item.label} question bank mode`}
          title={`${item.label} question bank mode`}
          onClick={() => setMode(item.id)}
        >
          <ModeIcon mode={item.id} />
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default StorageModeCycleButton;
