import React, { useState } from "react";
import "../styles/ServerDataPage.css";

function ServerQuestionBankUpload({ onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const uploadJsonFiles = async (event) => {
    const input = event.currentTarget;
    const chosenFiles = Array.from(input.files || []);
    input.value = "";
    if (!chosenFiles.length) return;
    setUploading(true);
    setError("");
    setMessage("");

    try {
      if (chosenFiles.length > 20) {
        throw new Error("Choose no more than 20 JSON files at a time.");
      }

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
          validFiles.push({ filename: file.name, questions: JSON.parse(await file.text()) });
        } catch {
          clientErrors.push(`${file.name}: invalid JSON.`);
        }
      }
      if (!validFiles.length) {
        throw new Error(clientErrors.join("\n") || "No valid JSON files found.");
      }
      const response = await fetch("/api/question-bank/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: validFiles }),
      });
      const body = await response.json();
      if (!response.ok) {
        const serverErrors = (body.errors || [])
          .map((item) => `${item.filename}: ${(item.errors || []).join(", ")}`)
          .join("\n");
        throw new Error(serverErrors || body.error || "JSON upload failed.");
      }
      const importErrors = (body.errors || []).map(
        (item) => `${item.filename}: ${(item.errors || []).join(", ")}`,
      );
      const allErrors = [...clientErrors, ...importErrors];
      if (allErrors.length) setError(allErrors.join("\n"));
      setMessage(`${body.imported || 0} JSON file(s) saved on the server.`);
      if (!importErrors.length && Number(body.imported) > 0) onSuccess?.();
    } catch (uploadError) {
      setError(uploadError.message || "JSON upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="server-data-panel server-upload-panel">
      <div className="server-data-actions">
        <div>
          <h2>Upload question files to the server</h2>
          <p>Choose JSON banks from this device. Each file can be up to 2 MB, with a 5 MB total limit; matching names replace their server copy.</p>
        </div>
        <label className={`server-secondary-button${uploading ? " disabled" : ""}`}>
          {uploading ? "Uploading…" : "Choose JSON files"}
          <input
            type="file"
            accept=".json,application/json"
            multiple
            disabled={uploading}
            onChange={uploadJsonFiles}
          />
        </label>
      </div>
      {message && <p className="server-message success" role="status">{message}</p>}
      {error && <pre className="server-message error" role="alert">{error}</pre>}
      <p className="server-upload-note">Server files appear in the Server library after upload completes.</p>
    </section>
  );
}

export default ServerQuestionBankUpload;
