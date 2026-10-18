import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StorageModeContext from "./storageModeStore";

export function StorageModeProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState(() =>
    window.location.pathname === "/local-upload" ? "local" : "server",
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (location.pathname === "/server-data") setMode("server");
    if (location.pathname === "/local-upload") setMode("local");
  }, [location.pathname]);

  const finishUpload = useCallback(
    (notice) => {
      setUploading(false);
      setMode("server");
      navigate("/server-data", {
        state: { storageUpload: notice },
      });
    },
    [navigate],
  );

  const handleUploadFiles = useCallback(
    async (event) => {
      const input = event.currentTarget;
      const files = Array.from(input.files || []);
      input.value = "";

      if (files.length === 0) {
        setMode("local");
        return;
      }

      setUploading(true);
      const clientErrors = [];
      const validFiles = [];
      let totalBytes = 0;

      if (files.length > 20) {
        finishUpload({
          error: "Choose no more than 20 JSON files at a time.",
        });
        return;
      }

      for (const file of files) {
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
        finishUpload({
          error: clientErrors.join("\n") || "No valid JSON files found.",
        });
        return;
      }

      try {
        const response = await fetch("/api/question-bank/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: validFiles }),
        });
        const body = await response.json();
        const importErrors = (body.errors || []).map(
          (item) => `${item.filename}: ${item.errors.join(", ")}`,
        );
        const allErrors = [...clientErrors, ...importErrors];

        if (!response.ok && !body.imported) {
          finishUpload({
            error:
              allErrors.join("\n") ||
              body.error ||
              "Could not save JSON files on the server.",
          });
          return;
        }

        finishUpload({
          message: `${body.imported} JSON file(s) saved on the server.`,
          error: allErrors.join("\n"),
        });
      } catch (error) {
        finishUpload({
          error:
            error.message || "Could not connect to the server question bank.",
        });
      }
    },
    [finishUpload],
  );

  const cycleMode = useCallback(() => {
    if (uploading) return;

    if (mode === "server") {
      setMode("local");
      navigate("/local-upload");
      return;
    }

    if (mode === "local") {
      setMode("upload");
      fileInputRef.current?.click();
      return;
    }

    setMode("server");
    navigate("/server-data");
  }, [mode, navigate, uploading]);

  return (
    <StorageModeContext.Provider value={{ mode, uploading, cycleMode }}>
      {children}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        hidden
        onChange={handleUploadFiles}
        onCancel={() => setMode("local")}
      />
    </StorageModeContext.Provider>
  );
}
