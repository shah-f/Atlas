import crypto from "node:crypto";
import { ATTRIBUTE_CATALOG } from "./attribute-catalog.mjs";
import { classifySentiment, safeLower, summarizeText, tokenize } from "./text.mjs";

const NOW = new Date("2026-04-14T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(isoDate) {
  if (!isoDate) {
    return null;
  }

  return Math.max(0, Math.round((NOW.valueOf() - new Date(isoDate).valueOf()) / DAY_MS));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function inferPropertyType(description) {
  const lower = safeLower(description);
  if (lower.includes("resort")) {
    return "Resort";
  }
  if (lower.includes("aparthotel")) {
    return "Aparthotel";
  }
  if (lower.includes("motel")) {
    return "Motel";
  }
  if (lower.includes("inn")) {
    return "Inn";
  }
  if (lower.includes("suite")) {
    return "Suites";
  }
  return "Hotel";
}

function makeDisplayName(property) {
  const type = inferPropertyType(property.propertyDescription);
  const parts = [property.city, property.province, type].filter(Boolean);
  return parts.slice(0, 2).join(" ") + ` ${parts.at(-1)}`;
}

function collectStaticText(property) {
  const staticBlocks = [
    property.areaDescription,
    property.propertyDescription,
    property.popularAmenities.join(" "),
    property.checkOutPolicy.join(" "),
    property.petPolicy.join(" "),
    property.childrenAndExtraBedPolicy.join(" "),
    property.checkInInstructions.join(" "),
    property.knowBeforeYouGo.join(" ")
  ];

  for (const values of Object.values(property.amenityBuckets)) {
    staticBlocks.push(values.join(" "));
  }

  return safeLower(staticBlocks.join(" "));
}

function ratingSignal(attribute, review) {
  const entries = attribute.ratingSignals
    .map((signalKey) => [signalKey, review.ratings[signalKey]])
    .filter(([, value]) => typeof value === "number");

  if (!entries.length || !review.acquisitionDate) {
    return null;
  }

  const [ratingKey, value] = entries.sort((a, b) => Number(a[1]) - Number(b[1]))[0];
  const rating = Number(value);
  const sentiment = rating <= 2.5 ? "negative" : rating >= 4 ? "positive" : "mixed";

  return {
    reviewId: review.reviewId,
    date: review.acquisitionDate,
    source: "rating",
    sentiment,
    score: rating <= 2.5 ? 1.2 : rating <= 3.5 ? 0.75 : 0.45,
    snippet: `Guest rated ${ratingKey} ${rating}/5.`,
    daysAgo: daysSince(review.acquisitionDate)
  };
}

function textSignals(attribute, review) {
  if (!review.text || !review.acquisitionDate) {
    return [];
  }

  const lower = review.normalizedText;
  const hits = attribute.keywords.filter((keyword) => lower.includes(keyword));
  if (!hits.length) {
    return [];
  }

  return [
    {
      reviewId: review.reviewId,
      date: review.acquisitionDate,
      source: "review",
      sentiment: classifySentiment(review.text),
      score: 1 + hits.length * 0.2,
      snippet: summarizeText(review.text, review.summary),
      daysAgo: daysSince(review.acquisitionDate)
    }
  ];
}

function hasStaticCoverage(attribute, property, staticText) {
  const keyedCoverage = attribute.descriptionKeys.some((key) => {
    const rawValue = property[key];
    if (Array.isArray(rawValue)) {
      return rawValue.length > 0;
    }

    return Boolean(rawValue);
  });

  const keywordCoverage = attribute.keywords.some((keyword) => staticText.includes(keyword));
  return keyedCoverage || keywordCoverage;
}

function isAttributeRelevant(attribute, staticCoverage, evidence) {
  return attribute.alwaysRelevant || staticCoverage || evidence.length > 0;
}

function buildRationale(attribute, scoreParts) {
  if (scoreParts.contradiction) {
    return `Recent signals about ${attribute.label.toLowerCase()} conflict, so this is the highest-value detail to refresh.`;
  }

  if (scoreParts.missingStatic) {
    return `The listing has weak structured coverage for ${attribute.label.toLowerCase()}, so a quick guest confirmation adds new value.`;
  }

  if (scoreParts.daysAgo === null) {
    return `We could not find recent guest evidence about ${attribute.label.toLowerCase()}, so this fills a blind spot.`;
  }

  if (scoreParts.daysAgo > 365) {
    return `The last strong signal about ${attribute.label.toLowerCase()} is over a year old, so this refreshes stale information.`;
  }

  return `This is a high-impact detail with lighter recent coverage than other property facts.`;
}

function buildGap(attribute, property, propertyReviews, staticText) {
  const evidence = propertyReviews.flatMap((review) => {
    const ratingEvidence = ratingSignal(attribute, review);

    return [
      ...textSignals(attribute, review),
      ...(ratingEvidence ? [ratingEvidence] : [])
    ];
  });

  const staticCoverage = hasStaticCoverage(attribute, property, staticText);
  if (!isAttributeRelevant(attribute, staticCoverage, evidence)) {
    return null;
  }

  const sortedEvidence = evidence.sort((a, b) => {
    const freshA = a.daysAgo ?? 9999;
    const freshB = b.daysAgo ?? 9999;
    return freshA - freshB || b.score - a.score;
  });

  const lastMentionedAt = sortedEvidence[0]?.date ?? null;
  const recentEvidence = sortedEvidence.filter((item) => (item.daysAgo ?? 9999) <= 365);
  const positiveSignals = recentEvidence.filter((item) => item.sentiment === "positive").length;
  const negativeSignals = recentEvidence.filter((item) => item.sentiment === "negative").length;
  const contradiction = positiveSignals > 0 && negativeSignals > 0;
  const missingStatic = !staticCoverage;
  const daysAgo = daysSince(lastMentionedAt);
  const staleness = daysAgo === null ? 1 : clamp(daysAgo / 540, 0, 1);
  const scarcity = 1 - clamp(recentEvidence.length / 4, 0, 1);
  const contradictionBoost = contradiction ? 0.55 : 0;
  const missingBoost = missingStatic ? 0.45 : 0.18;
  const score =
    attribute.impact *
    (0.38 + missingBoost + scarcity * 0.42 + staleness * 0.5 + contradictionBoost - attribute.effort * 0.25);

  const confidence = clamp(0.45 + recentEvidence.length * 0.08 + (staticCoverage ? 0.12 : 0), 0.4, 0.94);

  return {
    attributeKey: attribute.key,
    label: attribute.label,
    category: attribute.category,
    baseScore: Number(score.toFixed(3)),
    confidence: Number(confidence.toFixed(2)),
    staticCoverage,
    contradiction,
    lastMentionedAt,
    recentEvidenceCount: recentEvidence.length,
    evidence: sortedEvidence.slice(0, 3),
    keywords: attribute.keywords,
    ratingSignals: attribute.ratingSignals,
    question: {
      ...attribute.question,
      previewLabel: attribute.previewLabel
    },
    rationale: buildRationale(attribute, {
      contradiction,
      missingStatic,
      daysAgo
    })
  };
}

function buildReviewStats(reviews) {
  const withTextCount = reviews.filter((review) => review.text).length;
  const recentReviewCount = reviews.filter((review) => (daysSince(review.acquisitionDate) ?? 9999) <= 365).length;
  const lastReviewAt = reviews
    .map((review) => review.acquisitionDate)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    totalReviews: reviews.length,
    withTextCount,
    recentReviewCount,
    lastReviewAt: lastReviewAt ?? null
  };
}

function buildPropertySummary(property, reviews) {
  const staticText = collectStaticText(property);
  const gaps = ATTRIBUTE_CATALOG.map((attribute) => buildGap(attribute, property, reviews, staticText))
    .filter(Boolean)
    .sort((a, b) => b.baseScore - a.baseScore);

  return {
    propertyId: property.propertyId,
    displayName: makeDisplayName(property),
    city: property.city,
    province: property.province,
    country: property.country,
    starRating: property.starRating,
    guestRatingAvg: property.guestRatingAvg,
    tagline: summarizeText(property.propertyDescription, `${property.city} stay`),
    areaDescription: summarizeText(property.areaDescription, "Location details available in the property listing."),
    popularAmenities: property.popularAmenities.slice(0, 8),
    policies: {
      checkInWindow: [property.checkInStartTime, property.checkInEndTime].filter(Boolean).join(" - "),
      checkOutTime: property.checkOutTime,
      petPolicy: property.petPolicy[0] ?? "",
      childrenPolicy: property.childrenAndExtraBedPolicy[0] ?? ""
    },
    reviewStats: buildReviewStats(reviews),
    candidateGaps: gaps,
    reviewHighlights: reviews
      .filter((review) => review.text)
      .slice(0, 4)
      .map((review) => ({
        reviewId: review.reviewId,
        acquisitionDate: review.acquisitionDate,
        summary: review.summary,
        ratingOverall: review.ratings.overall ?? null
      }))
  };
}

export function buildCatalog(descriptions, reviews) {
  const reviewsByProperty = reviews.reduce((accumulator, review) => {
    if (!accumulator[review.propertyId]) {
      accumulator[review.propertyId] = [];
    }

    accumulator[review.propertyId].push(review);
    return accumulator;
  }, {});

  const properties = descriptions.map((property) =>
    buildPropertySummary(property, reviewsByProperty[property.propertyId] ?? [])
  );

  return {
    generatedAt: NOW.toISOString(),
    properties,
    reviewsByProperty
  };
}

export function buildDataQualitySummary(descriptions, reviews, catalog) {
  const propertyIds = new Set(descriptions.map((item) => item.propertyId));
  const orphanReviewCount = reviews.filter((review) => !propertyIds.has(review.propertyId)).length;
  const uniquePropertyCount = propertyIds.size;
  const datedReviewCount = reviews.filter((review) => review.acquisitionDate).length;
  const textReviewCount = reviews.filter((review) => review.text).length;

  return {
    propertyCount: catalog.properties.length,
    uniquePropertyCount,
    reviewCount: reviews.length,
    orphanReviewCount,
    datedReviewCount,
    textReviewCount
  };
}

function makeChunkId(propertyId, suffix, text) {
  const hash = crypto.createHash("sha1").update(`${propertyId}:${suffix}:${text}`).digest("hex");
  return `${propertyId}:${suffix}:${hash.slice(0, 12)}`;
}

function summarizeRatings(ratings) {
  return Object.entries(ratings)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => `${key} ${value}/5`)
    .join(", ");
}

function inferAttributeHintsFromText(text) {
  const lower = safeLower(text);

  return ATTRIBUTE_CATALOG.filter((attribute) =>
    attribute.keywords.some((keyword) => lower.includes(keyword))
  ).map((attribute) => attribute.key);
}

function inferAttributeHintsFromRatings(ratings) {
  return ATTRIBUTE_CATALOG.filter((attribute) =>
    attribute.ratingSignals.some((signalKey) => typeof ratings[signalKey] === "number")
  ).map((attribute) => attribute.key);
}

function buildPropertyChunks(property, propertySummary) {
  const overviewText = [
    `${propertySummary.displayName} in ${[property.city, property.province, property.country].filter(Boolean).join(", ")}.`,
    `Listing summary: ${propertySummary.tagline}.`,
    `Area notes: ${propertySummary.areaDescription}.`,
    `Amenities: ${propertySummary.popularAmenities.join(", ") || "not specified"}.`,
    `Guest rating average: ${property.guestRatingAvg ?? "unknown"}.`
  ]
    .filter(Boolean)
    .join(" ");

  const policyText = [
    `Check-in window: ${propertySummary.policies.checkInWindow || "not listed"}.`,
    `Check-out time: ${propertySummary.policies.checkOutTime || "not listed"}.`,
    `Pet policy: ${propertySummary.policies.petPolicy || "not listed"}.`,
    `Family policy: ${propertySummary.policies.childrenPolicy || "not listed"}.`,
    `Check-in instructions: ${property.checkInInstructions.join(" ") || "not listed"}.`,
    `Know before you go: ${property.knowBeforeYouGo.join(" ") || "not listed"}.`
  ]
    .filter(Boolean)
    .join(" ");

  return [
    {
      chunkId: makeChunkId(property.propertyId, "property-overview", overviewText),
      propertyId: property.propertyId,
      source: "property",
      date: null,
      label: "Property overview",
      summary: propertySummary.tagline,
      text: overviewText,
      attributeHints: inferAttributeHintsFromText(overviewText),
      sentiment: "mixed"
    },
    {
      chunkId: makeChunkId(property.propertyId, "property-policy", policyText),
      propertyId: property.propertyId,
      source: "property",
      date: null,
      label: "Policies and logistics",
      summary: summarizeText(policyText, "Property policies"),
      text: policyText,
      attributeHints: inferAttributeHintsFromText(policyText),
      sentiment: "mixed"
    }
  ];
}

function buildReviewChunks(review) {
  const chunks = [];
  const ratingDrivenSignals = Object.entries(review.ratings).filter(
    ([, value]) => typeof value === "number" && (value <= 3.5 || value >= 4.5)
  );

  if (review.text) {
    const reviewText = [
      `Guest review for property ${review.propertyId}.`,
      review.acquisitionDate ? `Review date: ${review.acquisitionDate}.` : "",
      summarizeRatings(review.ratings) ? `Ratings: ${summarizeRatings(review.ratings)}.` : "",
      `Review: ${review.text}`
    ]
      .filter(Boolean)
      .join(" ");

    chunks.push({
      chunkId: makeChunkId(review.propertyId, review.reviewId, reviewText),
      propertyId: review.propertyId,
      source: "review",
      reviewId: review.reviewId,
      date: review.acquisitionDate,
      label: "Guest review",
      summary: review.summary,
      text: reviewText,
      attributeHints: inferAttributeHintsFromText(review.text),
      sentiment: classifySentiment(review.text)
    });
  }

  if (ratingDrivenSignals.length) {
    const ratingText = `Guest rating signal for property ${review.propertyId}. ${
      review.acquisitionDate ? `Review date: ${review.acquisitionDate}. ` : ""
    }Ratings: ${summarizeRatings(review.ratings)}.`;

    chunks.push({
      chunkId: makeChunkId(review.propertyId, `${review.reviewId}-rating`, ratingText),
      propertyId: review.propertyId,
      source: "rating",
      reviewId: review.reviewId,
      date: review.acquisitionDate,
      label: review.text ? "Structured rating signal" : "Rating-only signal",
      summary: summarizeRatings(review.ratings) || "Rating signal",
      text: ratingText,
      attributeHints: inferAttributeHintsFromRatings(review.ratings),
      sentiment: "mixed"
    });
  }

  return chunks;
}

export function buildRagIndex(descriptions, reviews, catalog) {
  const propertyMap = Object.fromEntries(descriptions.map((property) => [property.propertyId, property]));

  const chunks = [];

  for (const propertySummary of catalog.properties) {
    const property = propertyMap[propertySummary.propertyId];
    if (!property) {
      continue;
    }

    chunks.push(...buildPropertyChunks(property, propertySummary));
  }

  for (const review of reviews) {
    chunks.push(...buildReviewChunks(review));
  }

  const chunksByProperty = chunks.reduce((accumulator, chunk) => {
    if (!accumulator[chunk.propertyId]) {
      accumulator[chunk.propertyId] = [];
    }

    accumulator[chunk.propertyId].push(chunk);
    return accumulator;
  }, {});

  return {
    generatedAt: NOW.toISOString(),
    chunkCount: chunks.length,
    chunksByProperty
  };
}
