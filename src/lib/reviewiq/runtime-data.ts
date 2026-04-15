import fs from "node:fs";
import path from "node:path";
import type { CatalogData, RagIndex } from "./types";

const catalogPath = path.join(process.cwd(), "data", "generated", "catalog.json");
const ragIndexPath = path.join(process.cwd(), "data", "generated", "rag-index.json");

let cachedCatalog: CatalogData | null = null;
let cachedRagIndex: RagIndex | null = null;

export function normalizePropertyDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const normalized: string[] = [];

  for (const part of parts) {
    if (normalized.length && normalized[normalized.length - 1].toLowerCase() === part.toLowerCase()) {
      continue;
    }

    normalized.push(part);
  }

  return normalized.join(" ");
}

export function getCatalogData(): CatalogData {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  if (!fs.existsSync(catalogPath)) {
    throw new Error(
      "Missing generated catalog. Run `npm run ingest` before starting the app."
    );
  }

  const raw = fs.readFileSync(catalogPath, "utf8");
  const parsedCatalog = JSON.parse(raw) as CatalogData;
  cachedCatalog = {
    ...parsedCatalog,
    properties: parsedCatalog.properties.map((property) => ({
      ...property,
      displayName: normalizePropertyDisplayName(property.displayName)
    }))
  };
  return cachedCatalog;
}

export function getPropertyById(propertyId: string) {
  return getCatalogData().properties.find((property) => property.propertyId === propertyId) ?? null;
}

export function getRagIndex(): RagIndex | null {
  if (cachedRagIndex) {
    return cachedRagIndex;
  }

  if (!fs.existsSync(ragIndexPath)) {
    return null;
  }

  const raw = fs.readFileSync(ragIndexPath, "utf8");
  cachedRagIndex = JSON.parse(raw) as RagIndex;
  return cachedRagIndex;
}
