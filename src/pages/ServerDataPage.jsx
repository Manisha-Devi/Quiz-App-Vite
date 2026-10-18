import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StorageModeCycleButton from "../components/StorageModeCycleButton";
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
  const navigate = useNavigate();
  const location = useLocation();

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
    const notice = location.state?.storageUpload;
    if (!notice) return;

    setMessage(notice.message || "");
    setError(notice.error || "");
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

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
      let totalBytes = 0;

      for (const file of chosenFiles) {
        if (!file.name.toLowerCase().endsWith(".json")) {
          clientErrors.push(`${file.name}: choose a JSON file.`);
          continue;
        }
        if (file.size > 2 * 1024 * 1024) {
          clientErrors.push(`${file.name}: maximum file size is 2 MB.`);
          continue;
        }
        totalBytes += file.size;
        if (totalBytes > 5 * 1024 * 1024) {
          clientErrors.push("Keep the total upload size under 5 MB.");
          break;
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
      <header className="server-data-header">
        <div>
          <p className="server-data-eyebrow">Question bank</p>
          <h1>Server Data</h1>
          <p className="server-data-intro">
            JSON question banks stay on the server. Only questions chosen for a
            quiz are saved in this browser.
          </p>
        </div>
        <StorageModeCycleButton />
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
              {files.length} file(s) · {totalQuestions} question(s)
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

        {loading ? (
          <p className="server-empty-state">Loading server file list…</p>
        ) : files.length === 0 ? (
          <div className="server-empty-state">
            No files are stored on the server yet. Sync <code>public/json</code>{" "}
            or upload a JSON file to begin.
          </div>
        ) : (
          <div className="server-file-list">
            {files.map((file) => (
              <label className="server-file-row" key={file.filename}>
                <input
                  type="checkbox"
                  checked={selectedNames.includes(file.filename)}
                  onChange={() => toggleFile(file.filename)}
                />
                <span className="server-file-details">
                  <strong>{file.filename}</strong>
                  <span>
                    {file.questionCount}{" "}
                    {file.questionCount === 1 ? "question" : "questions"}
                    {file.imageCount ? ` · ${file.imageCount} images` : ""}
                  </span>
                </span>
                <span className="server-level-counts">
                  {questionLevels.map(({ key, label }) => (
                    <span key={key} title={label}>
                      {label[0]} {file.levelCounts?.[key] || 0}
                    </span>
                  ))}
                </span>
              </label>
            ))}
          </div>
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
