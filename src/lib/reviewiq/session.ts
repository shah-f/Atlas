import { getPropertyById, getRagIndex } from "./runtime-data";
import { getGapCoverage } from "./gap-coverage";
import type {
  AnswerPreview,
  CandidateGap,
  EvidenceSnippet,
  PropertySummary,
  RagChunk,
  ReviewDraft,
  SessionQuestion
} from "./types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-nano";
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_RAG_EMBEDDING_MODEL ?? "text-embedding-3-small";

function scoreGap(gap: CandidateGap, draft: ReviewDraft) {
  const coverage = getGapCoverage(gap, draft.reviewText);
  if (coverage.covered) {
    return 0;
  }

  if (coverage.score >= 0.34) {
    return Number((gap.baseScore * 0.35).toFixed(3));
  }

  return gap.baseScore;
}

function buildHeuristicQuestion(property: PropertySummary, gap: CandidateGap): SessionQuestion {
  const sessionId = crypto.randomUUID();
  const freshnessLine = gap.lastMentionedAt
    ? `Last strong signal: ${new Date(gap.lastMentionedAt).toLocaleDateString("en-US")}.`
    : "No recent guest confirmation found.";

  return {
    sessionId,
    propertyId: property.propertyId,
    propertyName: property.displayName,
    attributeKey: gap.attributeKey,
    label: gap.label,
    prompt: gap.question.text,
    answerType: gap.question.answerType,
    choices: gap.question.choices,
    placeholder: gap.question.placeholder,
    rationale: gap.rationale,
    whyNow: `${freshnessLine} ${gap.contradiction ? "Recent signals disagree." : "This detail has lighter recent coverage than other property facts."}`,
    evidence: gap.evidence,
    previewLabel: gap.question.previewLabel,
    confidence: gap.confidence,
    retrievalMode: "heuristic"
  };
}

function topHeuristicCandidates(
  property: PropertySummary,
  draft: ReviewDraft,
  limit = 3,
  excludeAttributeKeys: string[] = []
) {
  const excluded = new Set(excludeAttributeKeys);

  return property.candidateGaps
    .filter((gap) => !excluded.has(gap.attributeKey))
    .map((gap) => ({
      gap,
      personalizedScore: scoreGap(gap, draft)
    }))
    .filter((item) => item.personalizedScore > 0.15)
    .sort((left, right) => right.personalizedScore - left.personalizedScore)
    .slice(0, limit);
}

function normalizeAnswer(rawAnswer: string) {
  return rawAnswer.replace(/\s+/g, " ").trim();
}

function buildAnswerPreview(question: SessionQuestion, rawAnswer: string): AnswerPreview {
  const cleaned = normalizeAnswer(rawAnswer);
  const proposedValue = cleaned || "No answer captured";
  const exactChoice = question.choices.some((choice) => choice.toLowerCase() === proposedValue.toLowerCase());
  const confidence = exactChoice ? 0.92 : cleaned.length > 20 ? 0.78 : cleaned.length > 0 ? 0.65 : 0.35;

  return {
    attributeKey: question.attributeKey,
    label: question.label,
    previewLabel: question.previewLabel,
    proposedValue,
    confidence: Number(confidence.toFixed(2)),
    impactSummary: `This will refresh ${question.previewLabel} for future travelers comparing ${question.propertyName}.`,
    internalNote: `Store as a candidate fact update for ${question.attributeKey} with reviewer-provided evidence from the current session.`
  };
}

function cosineSimilarity(left: number[], right: number[]) {
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

function daysAgo(isoDate: string | null) {
  if (!isoDate) {
    return null;
  }

  const now = Date.now();
  const then = new Date(isoDate).valueOf();
  return Math.max(0, Math.round((now - then) / (24 * 60 * 60 * 1000)));
}

function buildRagQuery(property: PropertySummary, gap: CandidateGap, draft: ReviewDraft) {
  void draft;
  return [
    `Property: ${property.displayName} in ${property.city}, ${property.country}.`,
    `Target attribute: ${gap.label}.`,
    `Reason: ${gap.rationale}`,
    "Choose a follow-up based only on the property dataset, stale facts, contradictions, and missing confirmations."
  ]
    .filter(Boolean)
    .join(" ");
}

async function createEmbeddings(texts: string[], dimensions: number) {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: texts,
      model: OPENAI_EMBEDDING_MODEL,
      dimensions,
      encoding_format: "float"
    })
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  return payload.data.map((item) => item.embedding);
}

function chunkToEvidence(chunk: RagChunk, semanticScore: number): EvidenceSnippet {
  return {
    chunkId: chunk.chunkId,
    reviewId: chunk.reviewId,
    date: chunk.date,
    source: chunk.source,
    sentiment: chunk.sentiment,
    score: Number((semanticScore + (chunk.source === "review" ? 0.05 : 0)).toFixed(3)),
    snippet: chunk.summary,
    daysAgo: daysAgo(chunk.date),
    semanticScore: Number(semanticScore.toFixed(3))
  };
}

function retrieveEvidenceForGap(gap: CandidateGap, queryVector: number[], chunks: RagChunk[]) {
  const preferredChunks = chunks.filter(
    (chunk) => chunk.source === "property" || chunk.attributeHints.includes(gap.attributeKey)
  );
  const retrievalPool = preferredChunks.length >= 3 ? preferredChunks : chunks;

  return retrievalPool
    .map((chunk) => {
      const semanticScore = cosineSimilarity(queryVector, chunk.vector);
      const attributeBoost = chunk.attributeHints.includes(gap.attributeKey) ? 0.08 : 0;
      const freshnessBoost = (daysAgo(chunk.date) ?? 9999) <= 365 ? 0.05 : 0;
      const sourceBoost = chunk.source === "rating" ? 0.12 : chunk.source === "property" ? 0.08 : 0;
      const finalScore = semanticScore + attributeBoost + freshnessBoost + sourceBoost;

      return {
        chunk,
        finalScore,
        semanticScore
      };
    })
    .sort((left, right) => right.finalScore - left.finalScore)
    .slice(0, 4);
}

function buildCandidateContext(
  property: PropertySummary,
  candidate: { gap: CandidateGap; personalizedScore: number },
  retrievedEvidence: ReturnType<typeof retrieveEvidenceForGap>
) {
  return {
    attributeKey: candidate.gap.attributeKey,
    label: candidate.gap.label,
    baseQuestion: candidate.gap.question.text,
    answerType: candidate.gap.question.answerType,
    choices: candidate.gap.question.choices,
    previewLabel: candidate.gap.question.previewLabel,
    personalizedScore: Number(candidate.personalizedScore.toFixed(3)),
    rationale: candidate.gap.rationale,
    semanticEvidenceScore: Number(
      (
        retrievedEvidence.reduce((sum, item) => sum + item.finalScore, 0) /
        Math.max(retrievedEvidence.length, 1)
      ).toFixed(3)
    ),
    evidence: retrievedEvidence.map((item) => ({
      source: item.chunk.source,
      date: item.chunk.date,
      summary: item.chunk.summary,
      semanticScore: Number(item.semanticScore.toFixed(3))
    })),
    property: {
      name: property.displayName,
      city: property.city,
      country: property.country
    }
  };
}

async function generateGroundedQuestion(candidateContexts: ReturnType<typeof buildCandidateContext>[]) {
  if (!OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      text: {
        format: {
          type: "json_object"
        }
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Return JSON only.",
                "You are a cost-conscious travel-review RAG selector.",
                "Choose exactly one candidate attribute and write one short follow-up question.",
                "Prioritize freshness, contradiction, and answerability.",
                "Stay faithful to the retrieved evidence.",
                "Use one of the provided candidate attribute keys and preserve the provided answer choices."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                candidates: candidateContexts
              })
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) {
    return null;
  }

  try {
    return JSON.parse(payload.output_text) as {
      attributeKey: string;
      prompt: string;
      rationale: string;
      whyNow: string;
      confidence?: number;
    };
  } catch {
    return null;
  }
}

async function buildRagQuestion(
  property: PropertySummary,
  draft: ReviewDraft,
  excludeAttributeKeys: string[] = []
) {
  const ragIndex = getRagIndex();
  if (!ragIndex || !OPENAI_API_KEY) {
    return null;
  }

  const propertyChunks = ragIndex.chunksByProperty[property.propertyId] ?? [];
  if (!propertyChunks.length) {
    return null;
  }

  const candidates = topHeuristicCandidates(property, draft, 3, excludeAttributeKeys);
  if (!candidates.length) {
    return null;
  }

  const queryEmbeddings = await createEmbeddings(
    candidates.map((candidate) => buildRagQuery(property, candidate.gap, draft)),
    ragIndex.dimensions
  );

  const retrievedByGap = candidates.map((candidate, index) => ({
    candidate,
    retrieved: retrieveEvidenceForGap(candidate.gap, queryEmbeddings[index], propertyChunks)
  }));

  const candidateContexts = retrievedByGap.map(({ candidate, retrieved }) =>
    buildCandidateContext(property, candidate, retrieved)
  );

  const grounded = await generateGroundedQuestion(candidateContexts);
  const selectedPair =
    retrievedByGap.find(({ candidate }) => candidate.gap.attributeKey === grounded?.attributeKey) ??
    retrievedByGap
      .sort((left, right) => {
        const leftScore =
          left.candidate.personalizedScore +
          left.retrieved.reduce((sum, item) => sum + item.finalScore, 0) / Math.max(left.retrieved.length, 1);
        const rightScore =
          right.candidate.personalizedScore +
          right.retrieved.reduce((sum, item) => sum + item.finalScore, 0) / Math.max(right.retrieved.length, 1);

        return rightScore - leftScore;
      })[0];

  if (!selectedPair) {
    return null;
  }

  const { candidate, retrieved } = selectedPair;
  const fallbackQuestion = buildHeuristicQuestion(property, candidate.gap);

  return {
    ...fallbackQuestion,
    prompt: grounded?.prompt?.trim() || fallbackQuestion.prompt,
    rationale: grounded?.rationale?.trim() || fallbackQuestion.rationale,
    whyNow: grounded?.whyNow?.trim() || fallbackQuestion.whyNow,
    confidence: Number((grounded?.confidence ?? candidate.gap.confidence).toFixed(2)),
    retrievalMode: "custom_rag" as const,
    evidence: retrieved.map((item) => chunkToEvidence(item.chunk, item.semanticScore))
  };
}

export async function startSession(
  propertyId: string,
  draft: ReviewDraft,
  options: {
    count?: number;
    excludeAttributeKeys?: string[];
  } = {}
) {
  const property = getPropertyById(propertyId);
  if (!property) {
    throw new Error("Property not found.");
  }

  const questions: SessionQuestion[] = [];
  const requestedCount = Math.max(0, Math.min(2, options.count ?? 1));
  const usedAttributeKeys = new Set(options.excludeAttributeKeys ?? []);

  for (let index = 0; index < requestedCount; index += 1) {
    const excludeAttributeKeys = Array.from(usedAttributeKeys);
    const ragQuestion = await buildRagQuestion(property, draft, excludeAttributeKeys).catch(() => null);
    if (ragQuestion) {
      questions.push(ragQuestion);
      usedAttributeKeys.add(ragQuestion.attributeKey);
      continue;
    }

    const fallbackCandidate = topHeuristicCandidates(property, draft, 1, excludeAttributeKeys)[0]?.gap;
    if (!fallbackCandidate) {
      break;
    }

    const fallbackQuestion = buildHeuristicQuestion(property, fallbackCandidate);
    questions.push(fallbackQuestion);
    usedAttributeKeys.add(fallbackQuestion.attributeKey);
  }

  return {
    property,
    questions
  };
}

export function previewAnswer(question: SessionQuestion, rawAnswer: string) {
  return buildAnswerPreview(question, rawAnswer);
}

export async function polishReviewText(reviewText: string, locale = "en-US", languageCode = "en") {
  const trimmed = normalizeAnswer(reviewText);
  if (!trimmed) {
    return {
      polishedText: reviewText,
      changed: false
    };
  }

  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      text: {
        format: {
          type: "json_object"
        }
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: [
                "Return JSON only.",
                "You are a multilingual review grammar fixer.",
                "Keep the review in the same language as the original user text.",
                "Only fix grammar, capitalization, punctuation, spacing, and obvious typo-level spelling issues.",
                "Correct only obvious contextual spelling mistakes, missing apostrophes in common contractions, and clear comma mistakes.",
                "Actively fix missing sentence-ending punctuation and obvious punctuation spacing when the intended sentence is clear.",
                "You may make a few more obvious corrections when the intended wording is clear, including repeated-word cleanup and very simple punctuation fixes.",
                "When a sentence is an obvious run-on, add the most natural comma or period to separate the clauses instead of leaving them joined.",
                "Fix obvious review shorthand when the intended word is clear, such as rlly to really or ekpt to kept.",
                "Prefer under-correcting to over-correcting. If a possible change is ambiguous, leave the user's wording alone.",
                "Do not add new facts, do not rewrite for style, do not shorten heavily, and do not intensify sentiment.",
                "Preserve the traveler's meaning and tone.",
                'Return keys "polishedText" and "changed".'
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                locale,
                languageCode,
                reviewText: trimmed
              })
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Review polish request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { output_text?: string };
  if (!payload.output_text) {
    throw new Error("No review polish output returned.");
  }

  const parsed = JSON.parse(payload.output_text) as {
    polishedText?: string;
    changed?: boolean;
  };

  const polishedText = normalizeAnswer(parsed.polishedText ?? reviewText);

  return {
    polishedText,
    changed: (Boolean(parsed.changed) || polishedText !== trimmed) && polishedText !== trimmed
  };
}
