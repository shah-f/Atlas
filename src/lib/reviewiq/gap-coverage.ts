import type { CandidateGap, PropertySummary } from "./types";

export type GapCoverageMode = "draft" | "completed";

const GENERIC_SIGNALS = new Set([
  "a",
  "an",
  "and",
  "area",
  "at",
  "did",
  "during",
  "experience",
  "felt",
  "for",
  "hotel",
  "how",
  "if",
  "in",
  "is",
  "it",
  "mixed",
  "more",
  "my",
  "needed",
  "no",
  "not",
  "of",
  "on",
  "or",
  "property",
  "room",
  "some",
  "stay",
  "sure",
  "the",
  "to",
  "too",
  "up",
  "very",
  "was",
  "when",
  "yes",
  "you",
  "your"
]);

const RATING_SIGNAL_ALIASES: Record<string, string[]> = {
  checkin: ["check-in", "check in", "arrival", "arrived", "front desk", "reception", "receptionist", "wait"],
  cleanliness: ["cleanliness", "clean", "spotless", "dirty", "filthy", "bathroom", "shower", "housekeeping", "smell", "smelled"],
  communication: ["communication", "responsive", "response", "messaged", "called"],
  hotelcondition: ["condition", "dated", "updated", "outdated", "worn", "maintenance", "broken", "renovated"],
  location: ["location", "walkable", "neighborhood", "transit"],
  roomcleanliness: ["cleanliness", "clean", "spotless", "dirty", "bathroom", "housekeeping", "shower", "smell"],
  roomcomfort: ["comfort", "comfortable", "bed", "sleep", "mattress", "pillows"],
  service: ["service", "staff", "front desk", "helpful", "friendly", "rude", "receptionist"],
  value_formoney: ["value", "worth", "price", "expensive", "cheap"]
};

export type GapCoverage = {
  covered: boolean;
  matchedSignals: string[];
  score: number;
};

function normalizeSignal(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text: string) {
  return normalizeSignal(text)
    .split(/\s+/)
    .filter(Boolean).length;
}

type GapClause = {
  text: string;
  closed: boolean;
  wordCount: number;
};

function splitIntoClauses(text: string): GapClause[] {
  const parts = text.split(/([.!?;,\n]+)/);
  const clauses: GapClause[] = [];

  for (let index = 0; index < parts.length; index += 2) {
    const clauseText = normalizeSignal(parts[index] ?? "");
    if (!clauseText) {
      continue;
    }

    const delimiter = parts[index + 1] ?? "";
    clauses.push({
      text: clauseText,
      closed: Boolean(delimiter.trim()),
      wordCount: countWords(clauseText)
    });
  }

  return clauses;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique(values: string[]) {
  return values.filter((value, index, all) => all.indexOf(value) === index);
}

function questionChoiceSignals(gap: CandidateGap) {
  return gap.question.choices.flatMap((choice) =>
    normalizeSignal(choice)
      .split(/\s+/)
      .filter((token) => token.length >= 4 && !GENERIC_SIGNALS.has(token))
  );
}

export function getGapSignals(gap: CandidateGap) {
  const normalizedKeywords = gap.keywords.map(normalizeSignal).filter(Boolean);
  const ratingSignals = gap.ratingSignals.flatMap((signal) => RATING_SIGNAL_ALIASES[signal] ?? [signal]);
  const labelSignals = [
    normalizeSignal(gap.label),
    normalizeSignal(gap.question.previewLabel),
    ...normalizeSignal(gap.question.text)
      .split(/\s+/)
      .filter((token) => token.length >= 5 && !GENERIC_SIGNALS.has(token)),
    ...questionChoiceSignals(gap)
  ];

  return unique([...normalizedKeywords, ...ratingSignals.map(normalizeSignal), ...labelSignals]).filter(Boolean);
}

function matchesSignal(reviewText: string, signal: string) {
  if (!signal) {
    return false;
  }

  if (signal.includes(" ")) {
    return reviewText.includes(signal);
  }

  return new RegExp(`\\b${escapeRegExp(signal)}\\b`, "i").test(reviewText);
}

function hasClauseCoverage(clause: GapClause, matchedSignals: string[], mode: GapCoverageMode) {
  if (!matchedSignals.length) {
    return false;
  }

  const hasStrongPhrase = matchedSignals.some((signal) => signal.includes(" "));
  const isOpenDraftWithEnoughContext = clause.wordCount >= 6 && (matchedSignals.length >= 2 || hasStrongPhrase);

  if (mode === "completed" && !clause.closed) {
    return false;
  }

  if (mode === "draft" && !clause.closed && !isOpenDraftWithEnoughContext) {
    return false;
  }

  return clause.wordCount >= 4 || matchedSignals.length >= 2 || (hasStrongPhrase && clause.wordCount >= 3);
}

export function getGapCoverage(gap: CandidateGap, reviewText: string, mode: GapCoverageMode = "draft"): GapCoverage {
  const normalizedReview = normalizeSignal(reviewText);
  if (!normalizedReview) {
    return {
      covered: false,
      matchedSignals: [],
      score: 0
    };
  }

  const matchedSignals = getGapSignals(gap).filter((signal) => matchesSignal(normalizedReview, signal));
  const clauseMatches = splitIntoClauses(reviewText).map((clause) => ({
    ...clause,
    matchedSignals: matchedSignals.filter((signal) => matchesSignal(clause.text, signal))
  }));
  const weightedScore = Math.min(
    1,
    matchedSignals.reduce((sum, signal) => sum + (signal.includes(" ") ? 0.55 : 0.34), 0)
  );
  const hasClauseMatch = clauseMatches.some((clause) =>
    hasClauseCoverage(clause, clause.matchedSignals, mode)
  );

  return {
    covered: hasClauseMatch,
    matchedSignals: matchedSignals.slice(0, 3),
    score: Number(weightedScore.toFixed(2))
  };
}

export function getRemainingGaps(property: PropertySummary, reviewText: string, mode: GapCoverageMode = "draft") {
  return property.candidateGaps
    .map((gap) => ({
      gap,
      coverage: getGapCoverage(gap, reviewText, mode)
    }))
    .filter(({ coverage }) => !coverage.covered)
    .sort((left, right) => right.gap.baseScore - left.gap.baseScore || left.coverage.score - right.coverage.score);
}
