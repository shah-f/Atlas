export function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function stripHtml(value) {
  return normalizeWhitespace(
    value
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/li>/gi, "; ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\|MASK\|/g, "")
  );
}

export function safeLower(value) {
  return normalizeWhitespace(value).toLowerCase();
}

export function tokenize(value) {
  return safeLower(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function parseMaybeJsonArray(value) {
  if (!value) {
    return [];
  }

  const cleaned = value.trim();
  if (!cleaned) {
    return [];
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => stripHtml(String(item)));
    }
  } catch (error) {
    return [stripHtml(cleaned)];
  }

  return [stripHtml(cleaned)];
}

export function summarizeText(value, fallback) {
  const cleaned = stripHtml(value);
  if (!cleaned) {
    return fallback;
  }

  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim();
  return firstSentence || cleaned || fallback;
}

export function classifySentiment(text) {
  const positiveMarkers = [
    "great",
    "clean",
    "friendly",
    "helpful",
    "perfect",
    "excellent",
    "safe",
    "walkable",
    "convenient",
    "quiet"
  ];
  const negativeMarkers = [
    "dirty",
    "filthy",
    "rude",
    "bad",
    "closed",
    "broken",
    "slow",
    "smell",
    "dated",
    "noisy",
    "ridiculous",
    "unusable"
  ];

  const lower = safeLower(text);
  const positiveHits = positiveMarkers.filter((marker) => lower.includes(marker)).length;
  const negativeHits = negativeMarkers.filter((marker) => lower.includes(marker)).length;

  if (positiveHits > negativeHits) {
    return "positive";
  }

  if (negativeHits > positiveHits) {
    return "negative";
  }

  return "mixed";
}
