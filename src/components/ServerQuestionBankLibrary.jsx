import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dataManager from "../utils/dataManager";
import { openDb } from "../utils/indexedDB";
import "../components/styles/LocalJSONLibrary.css";
import "../styles/ServerDataPage.css";

const levels = [
  { key: 0, label: "Easy" },
  { key: 1, label: "Medium" },
  { key: 2, label: "Hard" },
];
const PAGE_SIZE = 10;

async function clearObjectStore(db, storeName) {
  if (!db.objectStoreNames.contains(storeName)) return;
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

function ServerQuestionBankLibrary({ refreshTrigger = 0 }) {
  const [files, setFiles] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/question-bank", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Could not load the server question bank.");
      }
      setFiles(Array.isArray(body.files) ? body.files : []);
      setSelectedNames((current) =>
        current.filter((name) => (body.files || []).some((file) => file.filename === name)),
      );
    } catch (loadError) {
      setError(loadError.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles, refreshTrigger]);

  const importBundledFiles = async () => {
    setSyncing(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/question-bank/import-bundled", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        const details = (body.errors || [])
          .map((item) => `${item.filename}: ${(item.errors || []).join(", ")}`)
          .join("\n");
        throw new Error(details || body.error || "Server import failed.");
      }
      setFiles(body.files || []);
      setMessage(`${body.imported || 0} JSON file(s) synced from public/json.`);
      if ((body.errors || []).length) {
        setError(body.errors.map((item) => `${item.filename}: ${(item.errors || []).join(", ")}`).join("\n"));
      }
    } catch (syncError) {
      setError(syncError.message || "Server import failed.");
    } finally {
      setSyncing(false);
    }
  };

  const toggleFile = (filename) => {
    setSelectedNames((current) =>
      current.includes(filename)
        ? current.filter((name) => name !== filename)
        : [...current, filename],
    );
  };

  const continueToSetup = async () => {
    const selectedFiles = files
      .filter((file) => selectedNames.includes(file.filename))
      .map((file) => ({
        name: file.filename,
        questionCount: file.questionCount,
        levelCounts: file.levelCounts,
        imageCount: file.imageCount,
        serverSource: true,
      }));
    if (!selectedFiles.length) {
      setError("Select at least one server file for the quiz.");
      return;
    }
    setError("");
    try {
      const saved = await dataManager.setExamData("quizData", selectedFiles);
      if (!saved) throw new Error("Could not save the setup metadata.");
      navigate("/sections");
    } catch (setupError) {
      setError(setupError.message || "Could not open quiz setup.");
    }
  };

  const clearOldBrowserBank = async () => {
    const hasSavedQuiz = (await dataManager.getExamData("finalQuiz"))?.length > 0;
    const details = hasSavedQuiz
      ? "This clears the old full question-bank cache and setup copy from this browser. Your saved quiz, results, settings, and quiz images will be kept."
      : "This clears the old full question-bank cache, setup copy, and cached images from this browser. Your settings and results will be kept.";
    if (!window.confirm(`${details}\n\nContinue?`)) return;
    setError("");
    setMessage("");
    try {
      const db = await openDb();
      await clearObjectStore(db, "jsonFiles");
      await dataManager.deleteExamData("quizData");
      if (!hasSavedQuiz) {
        await clearObjectStore(db, "jsonImages");
        await dataManager.deleteExamData("fileImageMap");
      }
      setMessage(
        hasSavedQuiz
          ? "Old question-bank data cleared. The current quiz and its images were kept."
          : "Old question-bank and image caches cleared. Settings and results were kept.",
      );
    } catch (clearError) {
      setError(clearError.message || "Could not clear the old browser cache.");
    }
  };

  const filteredFiles = useMemo(
    () => files
      .filter((file) => file.filename.toLowerCase().includes(searchTerm.trim().toLowerCase()))
      .sort((a, b) => a.filename.localeCompare(b.filename)),
    [files, searchTerm],
  );
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const pageFiles = filteredFiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalQuestions = files.reduce((total, file) => total + (file.questionCount || 0), 0);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <div className="local-json-library server-library">
      <div className="library-header">
        <h2>Select Server Quiz Files</h2>
        <p>Choose from question banks stored on this server</p>
      </div>

      <section className="server-library-tools" aria-label="Server question bank tools">
        <div className="server-data-actions">
          <div>
            <h2>Manage server question files</h2>
            <p>
              Sync JSON files from <code>public/json</code>. Only question data
              selected for a quiz is saved in this browser.
            </p>
          </div>
          <div className="server-data-buttons">
            <button
              type="button"
              className="server-primary-button"
              onClick={importBundledFiles}
              disabled={syncing || loading}
            >
              {syncing ? "Syncing…" : "Sync public/json to server"}
            </button>
            <button
              type="button"
              className="server-refresh-button"
              onClick={loadFiles}
              disabled={loading || syncing}
            >
              {loading ? "Refreshing…" : "Refresh list"}
            </button>
          </div>
        </div>
        {message && <p className="server-message success" role="status">{message}</p>}
        {error && <pre className="server-message error" role="alert">{error}</pre>}

        <div className="controls-section">
          <div className="search-row">
            <div className="search-input-container">
              <span className="search-icon" aria-hidden="true">⌕</span>
              <input
                type="search"
                className="search-input"
                placeholder="Search files by name..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Search server files by name"
              />
              {searchTerm && (
                <div className="search-actions">
                  <button className="clear-search" type="button" onClick={() => setSearchTerm("")} aria-label="Clear search">×</button>
                </div>
              )}
            </div>
          </div>
          <div className="filters-row">
            <div className="filter-group">
              <span className="filter-label">View:</span>
              <div className="view-toggle" role="group" aria-label="File view">
                <button type="button" className={`view-btn${viewMode === "grid" ? " active" : ""}`} onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"}>⊞</button>
                <button type="button" className={`view-btn${viewMode === "list" ? " active" : ""}`} onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"}>☰</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="library-stats">
        <span className="total-files">
          Total: {filteredFiles.length} files · {totalQuestions} questions | Page {currentPage} of {totalPages}
        </span>
      </div>

      {loading ? (
        <div className="loading-state" aria-live="polite">
          <div className="loading-spinner" />
          <p>Loading server files…</p>
        </div>
      ) : error && files.length === 0 ? (
        <div className="server-empty-state">
          <p>Server files could not be loaded.</p>
          <button type="button" className="server-refresh-button" onClick={loadFiles}>Try again</button>
        </div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <h3>No server files found</h3>
          <p>Sync public/json or upload a JSON file to add question banks.</p>
        </div>
      ) : (
        <div className={`files-container ${viewMode} files-grid-2-col`}>
          {pageFiles.length === 0 ? (
            <div className="no-results">
              <h3>No files match your search</h3>
              <p>Try another file name.</p>
            </div>
          ) : pageFiles.map((file) => {
            const selected = selectedNames.includes(file.filename);
            const count = file.questionCount || 0;
            return (
              <div
                key={file.filename}
                className={`file-card ${selected ? "selected" : ""} ${viewMode}`}
                role="checkbox"
                aria-checked={selected}
                tabIndex={0}
                onClick={() => toggleFile(file.filename)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleFile(file.filename);
                  }
                }}
              >
                <div className="file-content">
                  <div className="file-info">
                    <div className="file-row file-name-row">
                      <span className="file-icon" aria-hidden="true">▤</span>
                      <h3 className="file-name">{file.filename}</h3>
                    </div>
                    <div className="file-row file-meta-row">
                      <div className="file-questions-left">
                        <span className="question-prefix" style={{ color: count <= 20 ? "#4CAF50" : count <= 50 ? "#ff9800" : "#f44336" }}>Q:</span>
                        <span className="question-count">{count} questions</span>
                      </div>
                      <div className="file-images-center">
                        {file.imageCount > 0 && <span className="image-info">{file.imageCount} images</span>}
                      </div>
                      <div className="file-size-right">
                        <span className="file-size">{count <= 20 ? "Small" : count <= 50 ? "Medium" : "Large"}</span>
                      </div>
                    </div>
                    <div className="server-level-counts server-card-levels">
                      {levels.map(({ key, label }) => (
                        <span key={key} title={label}>{label[0]} {file.levelCounts?.[key] || 0}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {selected && <div className="selected-indicator" aria-label="Selected">✓</div>}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button className="pagination-btn" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>← Previous</button>
          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button key={page} type="button" className={`pagination-page${currentPage === page ? " active" : ""}`} onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
          </div>
          <button className="pagination-btn" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>Next →</button>
        </div>
      )}

      <div className="action-section server-selection-action">
        <button
          type="button"
          className={`continue-btn${selectedNames.length === 0 ? " disabled" : ""}`}
          onClick={continueToSetup}
          disabled={selectedNames.length === 0 || loading}
        >
          Continue with {selectedNames.length} file{selectedNames.length === 1 ? "" : "s"}
          <span className="btn-icon">→</span>
        </button>
      </div>

      <div className="browser-cache-card">
        <div>
          <h3>Free space on this browser</h3>
          <p>Remove the old full question-bank cache while keeping saved quiz results and settings.</p>
        </div>
        <button type="button" className="server-danger-button" onClick={clearOldBrowserBank} disabled={files.length === 0}>
          Clear old local bank cache
        </button>
      </div>
    </div>
  );
}

export default ServerQuestionBankLibrary;
