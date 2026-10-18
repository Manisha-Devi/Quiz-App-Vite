import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { FileCardWithImages } from "../components/LocalJSONLibrary";
import useOfflineStorage from "../hooks/useOfflineStorage";
import dataManager from "../utils/dataManager";
import { openDb } from "../utils/indexedDB";
import "../styles/ServerDataPage.css";

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

function ServerDataPage() {
  const [files, setFiles] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { isOnline } = useOfflineStorage();
  const itemsPerPage = 10;

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/question-bank", {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Could not load the server question bank.");
      }
      setFiles(body.files || []);
    } catch (loadError) {
      setError(loadError.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    const loadTheme = async () => {
      const savedDarkMode = await dataManager.getUserSetting("darkMode", false);
      setIsDarkMode(savedDarkMode);
    };
    loadTheme();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = async () => {
    const nextDarkMode = !isDarkMode;
    setIsDarkMode(nextDarkMode);
    await dataManager.setUserSetting("darkMode", nextDarkMode);
  };

  const importBundledFiles = async () => {
    setSyncing(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/question-bank/import-bundled", {
        method: "POST",
      });
      const body = await response.json();
      setFiles(body.files || []);
      if (!response.ok) {
        const details = (body.errors || [])
          .map((item) => `${item.filename}: ${item.errors.join(", ")}`)
          .join("\n");
        throw new Error(details || body.error || "Server import failed.");
      }

      const rejected = (body.errors || []).length;
      setMessage(
        `${body.imported} JSON file(s) saved on the server.${
          rejected ? ` ${rejected} file(s) need attention.` : ""
        }`,
      );
      if (rejected) {
        setError(
          body.errors
            .map((item) => `${item.filename}: ${item.errors.join(", ")}`)
            .join("\n"),
        );
      }
    } catch (importError) {
      setError(importError.message || "Server import failed.");
    } finally {
      setSyncing(false);
    }
  };

  const uploadJsonFiles = async (event) => {
    const input = event.currentTarget;
    const chosenFiles = Array.from(input.files || []);
    input.value = "";
    if (chosenFiles.length === 0) return;

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const validFiles = [];
      const clientErrors = [];

      for (const file of chosenFiles) {
        if (!file.name.toLowerCase().endsWith(".json")) {
          clientErrors.push(`${file.name}: choose a JSON file.`);
          continue;
        }
        if (file.size > 2 * 1024 * 1024) {
          clientErrors.push(`${file.name}: maximum file size is 2 MB.`);
          continue;
        }

        try {
          validFiles.push({
            filename: file.name,
            questions: JSON.parse(await file.text()),
          });
        } catch {
          clientErrors.push(`${file.name}: invalid JSON.`);
        }
      }

      if (validFiles.length === 0) {
        throw new Error(clientErrors.join("\n") || "No valid JSON files found.");
      }

      const response = await fetch("/api/question-bank/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: validFiles }),
      });
      const body = await response.json();
      setFiles(body.files || []);
      if (!response.ok) {
        const serverErrors = (body.errors || [])
          .map((item) => `${item.filename}: ${item.errors.join(", ")}`)
          .join("\n");
        throw new Error(serverErrors || body.error || "JSON upload failed.");
      }

      const importErrors = (body.errors || []).map(
        (item) => `${item.filename}: ${item.errors.join(", ")}`,
      );
      setMessage(`${body.imported} JSON file(s) saved on the server.`);
      const allErrors = [...clientErrors, ...importErrors];
      if (allErrors.length > 0) setError(allErrors.join("\n"));
    } catch (uploadError) {
      setError(uploadError.message || "JSON upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const toggleFile = (filename) => {
    setSelectedNames((current) =>
      current.includes(filename)
        ? current.filter((name) => name !== filename)
        : [...current, filename],
    );
  };

  const filteredFiles = files
    .filter((file) =>
      file.filename.toLowerCase().includes(searchTerm.trim().toLowerCase()),
    )
    .sort((first, second) => first.filename.localeCompare(second.filename));
  const totalPages = Math.max(
    1,
    Math.ceil(filteredFiles.length / itemsPerPage),
  );
  const page = Math.min(currentPage, totalPages);
  const currentFiles = filteredFiles.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );
  const selectedFiles = files.filter((file) =>
    selectedNames.includes(file.filename),
  );

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

    if (selectedFiles.length === 0) {
      setError("Select at least one server file for the quiz.");
      return;
    }

    setError("");
    try {
      const saved = await dataManager.setExamData("quizData", selectedFiles);
      if (!saved) throw new Error("Could not save the small setup metadata.");
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

  return (
    <main className={`server-data-page${isDarkMode ? " dark-mode" : ""}`}>
      <AppHeader
        isOnline={isOnline}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        onLibraryAction={() => navigate("/?mode=upload")}
        libraryIcon="📤"
        libraryTitle="Open Upload Files"
      />
      <header className="server-data-header">
        <div>
          <p className="server-data-eyebrow">Question bank</p>
          <h1>Server Data</h1>
          <p className="server-data-intro">
            JSON question banks stay on the server. Only questions chosen for a
            quiz are saved in this browser.
          </p>
        </div>
      </header>

      <section className="server-data-panel">
        <div className="server-data-actions">
          <div>
            <h2>Store question files on the server</h2>
            <p>
              Add JSON files under <code>public/json</code>, then sync them
              here. Or choose JSON files from this device. Files with the same
              name replace their server copy. Image files used by questions
              should be under <code>public/json/&lt;file name&gt;/</code>.
            </p>
          </div>
          <div className="server-data-buttons">
            <button
              type="button"
              className="server-primary-button"
              onClick={importBundledFiles}
              disabled={syncing || uploading}
            >
              {syncing ? "Syncing…" : "Sync public/json to server"}
            </button>
            <label
              className={`server-secondary-button ${
                uploading ? "disabled" : ""
              }`}
            >
              {uploading ? "Uploading…" : "Upload JSON from device"}
              <input
                type="file"
                accept=".json,application/json"
                multiple
                disabled={syncing || uploading}
                onChange={uploadJsonFiles}
              />
            </label>
          </div>
        </div>

        {message && <p className="server-message success">{message}</p>}
        {error && (
          <pre className="server-message error" role="alert">
            {error}
          </pre>
        )}

        <div className="local-json-library server-file-library">
          <div className="library-header">
            <h2>📁 Select Quiz Files</h2>
            <p>Choose from available JSON files to start your quiz</p>
          </div>

          <div className="controls-section">
            <div className="search-row">
              <div className="search-input-container">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search files by name..."
                  aria-label="Search server files by name"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="search-input"
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="clear-search"
                    title="Clear search"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">View:</label>
                <div className="view-toggle">
                  <button
                    type="button"
                    className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    onClick={() => setViewMode("grid")}
                  >
                    ⊞
                  </button>
                  <button
                    type="button"
                    className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    onClick={() => setViewMode("list")}
                  >
                    ☰
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="refresh-btn"
                onClick={loadFiles}
                disabled={loading || syncing || uploading}
              >
                ↻ Refresh
              </button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="selected-files-section">
              <div className="selected-header">
                <h3>✅ Selected Files ({selectedFiles.length})</h3>
                <button
                  type="button"
                  className="clear-selection-btn"
                  onClick={() => setSelectedNames([])}
                >
                  Clear All
                </button>
              </div>
              <div className="selected-files-grid">
                {selectedFiles.map((file) => (
                  <FileCardWithImages
                    key={file.filename}
                    file={file}
                    isSelected={true}
                    questionCount={file.questionCount}
                    imageCountOverride={file.imageCount || 0}
                    viewMode="grid"
                    onToggle={(selectedFile) =>
                      toggleFile(selectedFile.filename)
                    }
                    showRemoveIcon={true}
                  />
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Loading server files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>No Server Files Found</h3>
              <p>Sync public/json or upload JSON files to see them here</p>
            </div>
          ) : (
            <>
              {filteredFiles.length > 0 && (
                <div className="library-stats">
                  <span className="total-files">
                    📊 Total: {filteredFiles.length} files | Page {page} of{" "}
                    {totalPages}
                  </span>
                </div>
              )}

              <div className={`files-container ${viewMode} files-grid-2-col`}>
                {currentFiles.length === 0 ? (
                  <div className="no-results">
                    <div className="no-results-icon">🔍</div>
                    <h3>No files match your search</h3>
                    <p>Try another file name</p>
                  </div>
                ) : (
                  currentFiles.map((file) => (
                    <FileCardWithImages
                      key={file.filename}
                      file={file}
                      isSelected={selectedNames.includes(file.filename)}
                      questionCount={file.questionCount}
                      imageCountOverride={file.imageCount || 0}
                      viewMode={viewMode}
                      onToggle={(selectedFile) =>
                        toggleFile(selectedFile.filename)
                      }
                    />
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((current) => current - 1)}
                    disabled={page === 1}
                  >
                    ← Previous
                  </button>
                  <div className="pagination-pages">
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                      (pageNumber) => (
                        <button
                          type="button"
                          key={pageNumber}
                          className={`pagination-page ${
                            page === pageNumber ? "active" : ""
                          }`}
                          onClick={() => setCurrentPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((current) => current + 1)}
                    disabled={page === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}

          <div className="action-section">
            <button
              type="button"
              className={`continue-btn ${
                selectedNames.length === 0 ? "disabled" : ""
              }`}
              onClick={continueToSetup}
              disabled={selectedNames.length === 0 || loading}
            >
              <span>
                Continue with {selectedNames.length} file
                {selectedNames.length === 1 ? "" : "s"}
              </span>
              <span className="btn-icon">➡️</span>
            </button>
          </div>

          <p className="server-selection-note">
            The selected quiz and its required images are saved in this browser
            after you continue.
          </p>
        </div>

        <div className="browser-cache-card">
          <div>
            <h3>Free space on this browser</h3>
            <p>
              This removes the old full question-bank copy after you have
              stored the files on the server. Existing settings and results are
              preserved.
            </p>
          </div>
          <button
            type="button"
            className="server-danger-button"
            onClick={clearOldBrowserBank}
            disabled={files.length === 0}
          >
            Clear old local bank cache
          </button>
        </div>
      </section>
    </main>
  );
}

export default ServerDataPage;
