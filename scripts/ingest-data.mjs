import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { buildCatalog, buildDataQualitySummary, buildRagIndex } from "./lib/catalog-builder.mjs";
import { readDescriptions, readReviews } from "./lib/parse.mjs";

const projectRoot = process.cwd();
const rawDir = path.join(projectRoot, "data", "raw");
const generatedDir = path.join(projectRoot, "data", "generated");
const envPath = path.join(projectRoot, ".env.local");

const embeddingModel = process.env.OPENAI_RAG_EMBEDDING_MODEL ?? "text-embedding-3-small";
const embeddingDimensions = Number(process.env.OPENAI_RAG_EMBEDDING_DIMENSIONS ?? 256);

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  return {
    key: trimmed.slice(0, separatorIndex).trim(),
    value: trimmed.slice(separatorIndex + 1).trim()
  };
}

async function loadLocalEnv() {
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (parsed && !process.env[parsed.key]) {
        process.env[parsed.key] = parsed.value;
      }
    }
  } catch {
    return;
  }
}

function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const l = left[index];
    const r = right[index];
    dot += l * r;
    leftNorm += l * l;
    rightNorm += r * r;
  }

  if (!leftNorm || !rightNorm) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function roundVector(vector) {
  return vector.map((value) => Number(value.toFixed(6)));
}

function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex");
}

async function readEmbeddingCache(cachePath) {
  try {
    const raw = await fs.readFile(cachePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeEmbeddingCache(cachePath, cache) {
  await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");
}

async function createEmbeddings(inputs) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it to .env.local before running `npm run ingest`.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: inputs,
      model: embeddingModel,
      dimensions: embeddingDimensions,
      encoding_format: "float"
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  return payload.data.map((item) => item.embedding);
}

async function attachEmbeddings(ragIndex) {
  const cachePath = path.join(generatedDir, "embedding-cache.json");
  const cache = await readEmbeddingCache(cachePath);
  const unresolved = [];

  for (const propertyChunks of Object.values(ragIndex.chunksByProperty)) {
    for (const chunk of propertyChunks) {
      const textHash = hashText(chunk.text);
      if (cache[textHash]) {
        chunk.vector = cache[textHash];
      } else {
        unresolved.push({
          chunk,
          textHash
        });
      }
    }
  }

  const batchSize = 64;
  for (let index = 0; index < unresolved.length; index += batchSize) {
    const batch = unresolved.slice(index, index + batchSize);
    const embeddings = await createEmbeddings(batch.map((item) => item.chunk.text));

    for (let innerIndex = 0; innerIndex < batch.length; innerIndex += 1) {
      const vector = roundVector(embeddings[innerIndex]);
      batch[innerIndex].chunk.vector = vector;
      cache[batch[innerIndex].textHash] = vector;
    }

    console.log(`Embedded ${Math.min(index + batchSize, unresolved.length)} / ${unresolved.length} RAG chunks.`);
  }

  await writeEmbeddingCache(cachePath, cache);

  return {
    ...ragIndex,
    embeddingModel,
    dimensions: embeddingDimensions
  };
}

function buildRagDiagnostics(ragIndex, catalog) {
  const diagnostics = {};

  for (const property of catalog.properties) {
    const chunks = ragIndex.chunksByProperty[property.propertyId] ?? [];
    const gapDiagnostics = property.candidateGaps.slice(0, 3).map((gap) => {
      const queryText = [
        `Property: ${property.displayName}`,
        `Candidate gap: ${gap.label}`,
        `Question intent: ${gap.question.text}`,
        `Rationale: ${gap.rationale}`
      ].join(" ");

      const pseudoVector = chunks[0]?.vector;
      if (!pseudoVector) {
        return {
          attributeKey: gap.attributeKey,
          topChunks: []
        };
      }

      const ranked = chunks
        .map((chunk) => ({
          chunkId: chunk.chunkId,
          label: chunk.label,
          summary: chunk.summary,
          source: chunk.source,
          similarity: cosineSimilarity(cacheOrZeroVector(queryText, pseudoVector.length), chunk.vector)
        }))
        .sort((left, right) => right.similarity - left.similarity)
        .slice(0, 2);

      return {
        attributeKey: gap.attributeKey,
        topChunks: ranked
      };
    });

    diagnostics[property.propertyId] = gapDiagnostics;
  }

  return diagnostics;
}

function cacheOrZeroVector(text, dimensions) {
  const pseudo = new Array(dimensions).fill(0);
  for (let index = 0; index < text.length; index += 1) {
    pseudo[index % dimensions] += text.charCodeAt(index) / 1000;
  }
  return pseudo;
}

async function main() {
  await loadLocalEnv();
  await fs.mkdir(generatedDir, { recursive: true });

  const descriptions = await readDescriptions(path.join(rawDir, "Description_PROC.csv"));
  const reviews = await readReviews(path.join(rawDir, "Reviews_PROC.csv"));
  const catalog = buildCatalog(descriptions, reviews);
  const summary = buildDataQualitySummary(descriptions, reviews, catalog);
  const baseRagIndex = buildRagIndex(descriptions, reviews, catalog);
  const ragIndex = await attachEmbeddings(baseRagIndex);
  const diagnostics = buildRagDiagnostics(ragIndex, catalog);

  await fs.writeFile(
    path.join(generatedDir, "catalog.json"),
    JSON.stringify(catalog, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(generatedDir, "data-quality.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(generatedDir, "rag-index.json"),
    JSON.stringify(ragIndex, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(generatedDir, "rag-diagnostics.json"),
    JSON.stringify(diagnostics, null, 2),
    "utf8"
  );

  console.log(`Generated catalog for ${summary.propertyCount} properties and ${summary.reviewCount} reviews.`);
  console.log(`Text reviews: ${summary.textReviewCount}. Orphan reviews: ${summary.orphanReviewCount}.`);
  console.log(`Custom RAG index: ${ragIndex.chunkCount} chunks using ${ragIndex.embeddingModel} (${ragIndex.dimensions} dims).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
