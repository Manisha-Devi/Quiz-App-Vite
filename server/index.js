import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import express from "express";
import { JSONFilePreset } from "lowdb/node";
import { createQuestionBankService } from "./questionBank.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const dataFile =
  process.env.LOWDB_FILE ||
  path.join(projectRoot, "data", "question-bank.json");
const bundledJsonDirectory = path.join(projectRoot, "public", "json");

await fs.mkdir(path.dirname(dataFile), { recursive: true });
const db = await JSONFilePreset(dataFile, { files: {} });
db.data.files ||= {};
await db.write();

const questionBank = createQuestionBankService({
  db,
  assetDirectory: bundledJsonDirectory,
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "15mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/question-bank", async (_request, response) => {
  response.json({ files: await questionBank.listFiles() });
});

app.post("/api/question-bank/import-bundled", async (_request, response) => {
  const result = await questionBank.importBundledFiles();
  if (result.imported === 0 && result.errors.length > 0) {
    response.status(422).json(result);
    return;
  }
  response.json(result);
});

app.post("/api/question-bank/import", async (request, response) => {
  const result = await questionBank.importUploadedFiles(request.body?.files);
  if (result.imported === 0 && result.errors.length > 0) {
    response.status(422).json(result);
    return;
  }
  response.json(result);
});

app.post("/api/question-bank/select", async (request, response) => {
  const result = await questionBank.selectQuestions(request.body?.files);
  response.json(result);
});

app.use((error, _request, response, next) => {
  console.error("Server request failed:", error);
  if (response.headersSent) {
    next(error);
    return;
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  response.status(status).json({
    error: status >= 500 ? "Server request failed." : error.message,
  });
});

const port = Number(process.env.PORT) || 5000;


app.listen(port, "0.0.0.0", () => {
  console.log(
    `Quiz backend API listening on port ${port}`,
  );
});
