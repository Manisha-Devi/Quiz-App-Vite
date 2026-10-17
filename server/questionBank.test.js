import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createQuestionBankService } from "./questionBank.js";

const makeQuestion = (id, level, question = `Question ${id}`) => ({
  id,
  question,
  options: ["A", "B", "C"],
  answer: 0,
  level,
});

async function createFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "quiz-question-bank-"));
  const assetDirectory = path.join(root, "json");
  await fs.mkdir(path.join(assetDirectory, "Image Bank"), { recursive: true });

  const questions = [
    makeQuestion(
      "image-question",
      0,
      "Look at this <img id='diagram.png' alt='diagram'>",
    ),
    makeQuestion("medium-question", 1),
    makeQuestion("hard-question", 2),
  ];
  await fs.writeFile(
    path.join(assetDirectory, "Image Bank.json"),
    JSON.stringify(questions),
  );
  await fs.writeFile(
    path.join(assetDirectory, "Image Bank", "diagram.png"),
    Buffer.from("sample-image"),
  );
  await fs.writeFile(
    path.join(assetDirectory, "Image Bank", "unused.png"),
    Buffer.from("unused-image"),
  );

  const db = {
    data: { files: {} },
    async write() {},
  };
  const service = createQuestionBankService({ db, assetDirectory });

  return { root, db, service };
}

test("sync imports bundled files while list results contain metadata only", async () => {
  const { root, db, service } = await createFixture();
  try {
    const result = await service.importBundledFiles();
    assert.equal(result.imported, 1);
    assert.equal(result.errors.length, 0);
    assert.equal(result.files.length, 1);
    assert.equal(result.files[0].filename, "Image Bank");
    assert.equal(result.files[0].questionCount, 3);
    assert.deepEqual(result.files[0].levelCounts, { 0: 1, 1: 1, 2: 1 });
    assert.equal(Object.hasOwn(result.files[0], "questions"), false);
    assert.equal(db.data.files["Image Bank"].questions.length, 3);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("server selection returns only requested questions and their referenced images", async () => {
  const { root, service } = await createFixture();
  try {
    await service.importBundledFiles();
    const result = await service.selectQuestions([
      {
        filename: "Image Bank",
        mode: "difficulty",
        counts: { 0: 1, 1: 0, 2: 0 },
      },
    ]);

    assert.equal(result.selectedCount, 1);
    assert.equal(result.questions.length, 1);
    assert.equal(result.questions[0].id, "image-question");
    assert.equal(result.questions[0].section, "Image Bank");
    assert.deepEqual(
      result.fileImageMap["Image Bank.json"].map((image) => image.name),
      ["diagram.png"],
    );
    assert.match(
      result.fileImageMap["Image Bank.json"][0].data,
      /^data:image\/png;base64,/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("server range selection keeps source order and validates question files", async () => {
  const { root, service } = await createFixture();
  try {
    await service.importBundledFiles();
    const result = await service.selectQuestions([
      { filename: "Image Bank.json", mode: "range", startIndex: 2, endIndex: 3 },
    ]);

    assert.deepEqual(
      result.questions.map((question) => question.id),
      ["medium-question", "hard-question"],
    );
    assert.equal(Object.keys(result.fileImageMap).length, 0);

    const invalid = await service.importUploadedFiles([
      { filename: "../Bad.json", questions: [{ question: "missing fields" }] },
    ]);
    assert.equal(invalid.imported, 0);
    assert.equal(invalid.errors.length, 1);
    await assert.rejects(
      service.selectQuestions([
        { filename: "Image Bank", mode: "range", startIndex: 0, endIndex: 3 },
      ]),
      /range.*invalid/i,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
