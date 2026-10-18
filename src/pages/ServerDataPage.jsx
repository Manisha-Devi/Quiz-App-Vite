import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageNavigation from "../components/PageNavigation";
import dataManager from "../utils/dataManager";
import { openDb } from "../utils/indexedDB";
import "../styles/ServerDataPage.css";

const questionLevels = [
  { key: 0, label: "Easy" },
  { key: 1, label: "Medium" },
  { key: 2, label: "Hard" },
];

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
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const itemsPerPage = 12;

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

  const clearSelection = () => setSelectedNames([]);

  const filteredFiles = files
    .filter((file) => {
      const matchesSearch = file.filename
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());
      const questionCount = file.questionCount || 0;
      const isSelected = selectedNames.includes(file.filename);

      if (!matchesSearch) return false;
      if (filterBy === "selected") return isSelected;
      if (filterBy === "unselected") return !isSelected;
      if (filterBy === "small") return questionCount <= 20;
      if (filterBy === "medium")
        return questionCount > 20 && questionCount <= 50;
      if (filterBy === "large") return questionCount > 50;
      return true;
    })
    .sort((first, second) => {
      if (sortBy === "questions") {
        return second.questionCount - first.questionCount;
      }
      return first.filename.localeCompare(second.filename);
    });
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const visibleFiles = filteredFiles.slice(
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

  const totalQuestions = files.reduce(
    (total, file) => total + file.questionCount,
    0,
  );

  return (
    <main className="server-data-page">
      <header className="server-data-navbar">
        <div className="server-data-brand">📂 Quiz Files</div>
        <PageNavigation />
      </header>

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

        <div className="server-bank-heading">
          <div>
            <h2>Server question bank</h2>
            <p>
              {files.length} file(s) · {totalQuestions} question(s) ·{" "}
              {selectedNames.length} selected
            </p>
          </div>
          <button
            type="button"
            className="server-refresh-button"
            onClick={loadFiles}
            disabled={loading || syncing || uploading}
          >
            Refresh
          </button>
        </div>

        {files.length > 0 && (
          <div className="server-file-controls">
            <label className="server-search">
              <span aria-hidden="true">🔍</span>
              <input
                type="search"
                value={searchTerm}
                placeholder="Search files by name..."
                aria-label="Search server files by name"
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>
            <label className="server-control-select">
              <span>Filter</span>
              <select
                value={filterBy}
                onChange={(event) => {
                  setFilterBy(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All files</option>
                <option value="selected">Selected</option>
                <option value="unselected">Not selected</option>
                <option value="small">Small (up to 20 questions)</option>
                <option value="medium">Medium (21–50 questions)</option>
                <option value="large">Large (over 50 questions)</option>
              </select>
            </label>
            <label className="server-control-select">
              <span>Sort</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="name">Name</option>
                <option value="questions">Most questions</option>
              </select>
            </label>
            <div className="server-view-toggle" role="group" aria-label="File display">
              <button
                type="button"
                className={viewMode === "grid" ? "active" : ""}
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                ⊞
              </button>
              <button
                type="button"
                className={viewMode === "list" ? "active" : ""}
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                title="List view"
              >
                ☰
              </button>
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <section className="server-selected-section" aria-label="Selected files">
            <div className="server-selected-heading">
              <h3>✓ Selected files ({selectedFiles.length})</h3>
              <button type="button" onClick={clearSelection}>
                Clear all
              </button>
            </div>
            <div className="server-selected-list">
              {selectedFiles.map((file) => (
                <button
                  type="button"
                  key={file.filename}
                  className="server-selected-chip"
                  onClick={() => toggleFile(file.filename)}
                  aria-label={`Remove ${file.filename} from selection`}
                >
                  {file.filename} <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <p className="server-empty-state">Loading server file list…</p>
        ) : files.length === 0 ? (
          <div className="server-empty-state">
            No files are stored on the server yet. Sync <code>public/json</code>{" "}
            or upload a JSON file to begin.
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="server-empty-state">
            No files match these search and filter settings.
          </div>
        ) : (
          <>
            <p className="server-file-results">
              Showing {(page - 1) * itemsPerPage + 1}–
              {Math.min(page * itemsPerPage, filteredFiles.length)} of{" "}
              {filteredFiles.length} files
            </p>
            <div className={`server-file-list ${viewMode}`}>
              {visibleFiles.map((file) => {
                const selected = selectedNames.includes(file.filename);
                const questionCount = file.questionCount || 0;
                const sizeLabel =
                  questionCount <= 20
                    ? "Small"
                    : questionCount <= 50
                      ? "Medium"
                      : "Large";

                return (
                  <button
                    type="button"
                    className={`server-file-card ${viewMode}${
                      selected ? " selected" : ""
                    }`}
                    key={file.filename}
                    onClick={() => toggleFile(file.filename)}
                    aria-pressed={selected}
                  >
                    <span className="server-card-title">
                      <span aria-hidden="true">📄</span>
                      <strong title={file.filename}>{file.filename}</strong>
                    </span>
                    <span className="server-card-meta">
                      <span>{questionCount} questions</span>
                      {file.imageCount > 0 && (
                        <span>🖼️ {file.imageCount} images</span>
                      )}
                      <span className={`server-size-tag ${sizeLabel.toLowerCase()}`}>
                        {sizeLabel}
                      </span>
                    </span>
                    <span className="server-level-counts">
                      {questionLevels.map(({ key, label }) => (
                        <span key={key} title={label}>
                          {label[0]} {file.levelCounts?.[key] || 0}
                        </span>
                      ))}
                    </span>
                    {selected && (
                      <span className="server-selected-indicator" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="server-pagination">
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => current - 1)}
                  disabled={page === 1}
                >
                  ← Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => current + 1)}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        <div className="server-data-footer">
          <p>
            The current quiz and needed images are saved in IndexedDB after
            question selection.
          </p>
          <button
            type="button"
            className="server-primary-button"
            onClick={continueToSetup}
            disabled={selectedNames.length === 0 || loading}
          >
            Set up selected quiz
          </button>
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
