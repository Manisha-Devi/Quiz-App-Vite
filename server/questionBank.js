import fs from "node:fs/promises";
import path from "node:path";

const supportedImageTypes = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

export function normalizeFilename(filename) {
  if (typeof filename !== "string") {
    throw badRequest("Each file needs a filename.");
  }

  const basename = path.basename(filename.trim());
  const normalized = basename.replace(/\.json$/i, "").trim();
  const containsControlCharacter = [...normalized].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    containsControlCharacter ||
    /[<>:"/\\|?*]/.test(normalized)
  ) {
    throw badRequest(`Invalid JSON filename: ${filename}`);
  }

  return normalized;
}

export function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return ["The JSON file must contain a non-empty array of questions."];
  }

  const errors = [];

  questions.forEach((question, index) => {
    const prefix = `Question ${index + 1}`;

    if (
      !question ||
      typeof question.question !== "string" ||
      question.question.trim() === ""
    ) {
      errors.push(`${prefix}: missing question text.`);
    }

    if (
      !Array.isArray(question?.options) ||
      question.options.length < 2 ||
      question.options.length > 6
    ) {
      errors.push(`${prefix}: must have 2–6 options.`);
    } else if (
      !Number.isInteger(question.answer) ||
      question.answer < 0 ||
      question.answer >= question.options.length
    ) {
      errors.push(`${prefix}: answer must point to an existing option.`);
    }

    if (![0, 1, 2].includes(question?.level)) {
      errors.push(`${prefix}: level must be 0, 1, or 2.`);
    }
  });

  return errors;
}

export function getLevelCounts(questions) {
  return questions.reduce(
    (counts, question) => {
      if ([0, 1, 2].includes(question?.level)) {
        counts[question.level] += 1;
      }
      return counts;
    },
    { 0: 0, 1: 0, 2: 0 },
  );
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

async function getImageCount(assetDirectory, filename) {
  try {
    const entries = await fs.readdir(path.join(assetDirectory, filename), {
      withFileTypes: true,
    });
    return entries.filter(
      (entry) =>
        entry.isFile() &&
        Object.hasOwn(supportedImageTypes, path.extname(entry.name).toLowerCase()),
    ).length;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}

async function getImagesForQuestions(assetDirectory, filename, questions) {
  const referencedNames = new Set();
  const imageTagPattern = /<img\b[^>]*\bid=['"]([^'"]+)['"][^>]*>/gi;

  for (const question of questions) {
    const textValues = [
      question.question,
      question.explanation,
      ...(Array.isArray(question.options) ? question.options : []),
    ];

    for (const text of textValues) {
      if (typeof text !== "string") continue;
      for (const match of text.matchAll(imageTagPattern)) {
        referencedNames.add(path.basename(match[1].trim()));
      }
    }
  }

  if (referencedNames.size === 0) return [];

  let imageFiles;
  try {
    imageFiles = await fs.readdir(path.join(assetDirectory, filename));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const images = [];
  const available = imageFiles.filter((imageName) =>
    Object.hasOwn(supportedImageTypes, path.extname(imageName).toLowerCase()),
  );

  for (const reference of referencedNames) {
    const referenceStem = path.parse(reference).name.toLowerCase();
    const match = available.find(
      (imageName) =>
        imageName.toLowerCase() === reference.toLowerCase() ||
        path.parse(imageName).name.toLowerCase() === referenceStem,
    );

    if (!match) continue;

    const imageData = await fs.readFile(
      path.join(assetDirectory, filename, match),
    );
    const mimeType = supportedImageTypes[path.extname(match).toLowerCase()];
    images.push({
      name: match,
      data: `data:${mimeType};base64,${imageData.toString("base64")}`,
    });
  }

  return images;
}

export function createQuestionBankService({ db, assetDirectory }) {
  let writeQueue = Promise.resolve();

  const persistFiles = (files) => {
    const write = writeQueue.then(async () => {
      for (const file of files) {
        db.data.files[file.filename] = {
          filename: file.filename,
          questions: file.questions,
          updatedAt: new Date().toISOString(),
        };
      }
      await db.write();
    });

    writeQueue = write.catch(() => {});
    return write;
  };

  const listFiles = async () => {
    const files = await Promise.all(
      Object.values(db.data.files).map(async (file) => ({
        filename: file.filename,
        questionCount: file.questions.length,
        levelCounts: getLevelCounts(file.questions),
        imageCount: await getImageCount(assetDirectory, file.filename),
        updatedAt: file.updatedAt,
      })),
    );

    return files.sort((a, b) =>
      a.filename.localeCompare(b.filename, undefined, { sensitivity: "base" }),
    );
  };

  const importBundledFiles = async () => {
    const entries = await fs.readdir(assetDirectory, { withFileTypes: true });
    const jsonFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name));

    const imported = [];
    const errors = [];

    for (const entry of jsonFiles) {
      try {
        const filename = normalizeFilename(entry.name);
        const content = await fs.readFile(
          path.join(assetDirectory, entry.name),
          "utf8",
        );
        const questions = JSON.parse(content);
        const validationErrors = validateQuestions(questions);

        if (validationErrors.length > 0) {
          errors.push({
            filename: entry.name,
            errors: validationErrors.slice(0, 8),
          });
          continue;
        }

        imported.push({ filename, questions });
      } catch (error) {
        errors.push({ filename: entry.name, errors: [error.message] });
      }
    }

    if (imported.length > 0) await persistFiles(imported);

    return {
      imported: imported.length,
      errors,
      files: await listFiles(),
    };
  };

  const importUploadedFiles = async (files) => {
    if (!Array.isArray(files) || files.length === 0) {
      throw badRequest("Choose at least one JSON file to import.");
    }
    if (files.length > 20) {
      throw badRequest("Import up to 20 JSON files at a time.");
    }

    const imported = [];
    const errors = [];

    for (const file of files) {
      try {
        const filename = normalizeFilename(file?.filename);
        const validationErrors = validateQuestions(file?.questions);

        if (validationErrors.length > 0) {
          errors.push({
            filename,
            errors: validationErrors.slice(0, 8),
          });
          continue;
        }

        imported.push({ filename, questions: file.questions });
      } catch (error) {
        errors.push({
          filename: file?.filename || "Unknown file",
          errors: [error.message],
        });
      }
    }

    if (imported.length > 0) await persistFiles(imported);

    return {
      imported: imported.length,
      errors,
      files: await listFiles(),
    };
  };

  const selectQuestions = async (fileSelections) => {
    if (!Array.isArray(fileSelections) || fileSelections.length === 0) {
      throw badRequest("Select at least one question file.");
    }
    if (fileSelections.length > 100) {
      throw badRequest("Select no more than 100 files for one quiz.");
    }

    const selectedQuestions = [];
    const fileImageMap = {};
    const seenFiles = new Set();

    for (const selection of fileSelections) {
      const filename = normalizeFilename(selection?.filename);
      if (seenFiles.has(filename)) {
        throw badRequest(`The file ${filename} is selected more than once.`);
      }
      seenFiles.add(filename);

      const bankFile = db.data.files[filename];
      if (!bankFile) {
        throw badRequest(
          `The server question file "${filename}" was not found. Refresh the server list and try again.`,
        );
      }

      let sectionQuestions = [];

      if (selection.mode === "range") {
        const { startIndex, endIndex } = selection;
        if (
          !Number.isInteger(startIndex) ||
          !Number.isInteger(endIndex) ||
          startIndex < 1 ||
          endIndex < startIndex ||
          endIndex > bankFile.questions.length
        ) {
          throw badRequest(`The question range for "${filename}" is invalid.`);
        }

        sectionQuestions = bankFile.questions.slice(startIndex - 1, endIndex);
      } else if (selection.mode === "difficulty") {
        const counts = selection.counts || {};
        const levelCounts = getLevelCounts(bankFile.questions);

        for (const level of [0, 1, 2]) {
          const count = counts[level] ?? counts[String(level)] ?? 0;
          if (
            !Number.isInteger(count) ||
            count < 0 ||
            count > levelCounts[level]
          ) {
            throw badRequest(
              `The selected question count for level ${level} in "${filename}" is invalid.`,
            );
          }

          const candidates = shuffle(
            bankFile.questions.filter((question) => question.level === level),
          );
          sectionQuestions.push(...candidates.slice(0, count));
        }

        sectionQuestions = shuffle(sectionQuestions);
      } else {
        throw badRequest(`The selection mode for "${filename}" is invalid.`);
      }

      const sectionQuestionsWithName = sectionQuestions.map((question) => ({
        ...question,
        section: filename,
      }));
      selectedQuestions.push(...sectionQuestionsWithName);

      const images = await getImagesForQuestions(
        assetDirectory,
        filename,
        sectionQuestions,
      );
      if (images.length > 0) fileImageMap[`${filename}.json`] = images;
    }

    if (selectedQuestions.length === 0) {
      throw badRequest("Select at least one question before starting the quiz.");
    }

    return {
      questions: selectedQuestions,
      fileImageMap,
      selectedCount: selectedQuestions.length,
    };
  };

  return {
    importBundledFiles,
    importUploadedFiles,
    listFiles,
    selectQuestions,
  };
}
