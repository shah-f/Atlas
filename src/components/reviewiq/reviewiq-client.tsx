"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { StampediaJournal, type StampediaTrip } from "@/components/reviewiq/stampedia-journal";
import { getRemainingGaps } from "@/lib/reviewiq/gap-coverage";
import { formatUiCopy, getMagicFixCopy, getReviewIqUiCopy, type ReviewIqUiCopy } from "@/lib/reviewiq/ui-copy";
import type { AnswerPreview, CandidateGap, DemoHydratedCustomer, DemoHydratedStay, PropertySummary, SessionQuestion } from "@/lib/reviewiq/types";

type ReviewIqClientProps = {
  customer: DemoHydratedCustomer;
  onBackToCustomers: () => void;
  onCustomerUpdate: (customer: DemoHydratedCustomer) => void;
};

type Stage = "confirm" | "mode" | "review" | "questions" | "done";
type InputMode = "type" | "voice";

type ReviewPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type LanguageOption = {
  code: string;
  label: string;
  locale: string;
  dir: "ltr" | "rtl";
};

type QuestionInputState = {
  choice: string;
  details: string;
};

type TasteProfile = {
  label: string;
  archetype: string;
  insight: string;
  recommendations: string[];
  segments: Array<{
    label: string;
    value: number;
    color: string;
  }>;
};

type PropertyPhoto = {
  url: string;
  alt: string;
  position?: string;
  size?: string;
  revealPosition?: string;
  revealSize?: string;
};

type PropertyVisual = {
  gradient: string;
  tile: string;
  reveal: string;
  hasPhoto: boolean;
  photoAlt: string | null;
};

const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", locale: "en-US", dir: "ltr" },
  { code: "es", label: "Español", locale: "es-ES", dir: "ltr" },
  { code: "fr", label: "Français", locale: "fr-FR", dir: "ltr" },
  { code: "de", label: "Deutsch", locale: "de-DE", dir: "ltr" },
  { code: "it", label: "Italiano", locale: "it-IT", dir: "ltr" },
  { code: "pt", label: "Português", locale: "pt-BR", dir: "ltr" },
  { code: "ja", label: "日本語", locale: "ja-JP", dir: "ltr" },
  { code: "zh", label: "中文", locale: "zh-CN", dir: "ltr" },
  { code: "ar", label: "العربية", locale: "ar-SA", dir: "rtl" },
  { code: "hi", label: "हिन्दी", locale: "hi-IN", dir: "ltr" },
  { code: "nl", label: "Nederlands", locale: "nl-NL", dir: "ltr" }
];

const STAR_LABELS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];
const STAR_LABELS_BY_LANGUAGE: Record<string, string[]> = {
  en: STAR_LABELS,
  es: ["", "Terrible", "Mala", "Aceptable", "Buena", "Excelente"],
  fr: ["", "Terrible", "Mauvais", "Correct", "Bon", "Excellent"],
  de: ["", "Schrecklich", "Schlecht", "Okay", "Gut", "Ausgezeichnet"],
  it: ["", "Terribile", "Scarso", "Discreto", "Buono", "Eccellente"],
  pt: ["", "Terrível", "Ruim", "Ok", "Bom", "Excelente"],
  ja: ["", "ひどい", "いまひとつ", "普通", "良い", "素晴らしい"],
  zh: ["", "很差", "较差", "一般", "不错", "非常好"],
  ar: ["", "سيئ جدًا", "سيئ", "مقبول", "جيد", "ممتاز"],
  hi: ["", "बहुत खराब", "खराब", "ठीक", "अच्छा", "उत्कृष्ट"],
  nl: ["", "Vreselijk", "Slecht", "Oké", "Goed", "Uitstekend"]
};
const INLINE_PROMPT_LIMIT = 2;

const PROPERTY_PHOTOS: Record<string, PropertyPhoto> = {
  fa014137b3ea9af6a90c0a86a1d099e46f7e56d6eb33db1ad1ec4bdac68c3caa: {
    url: "/reviewiq-hotels/monterey-california-inn.jpg",
    alt: "Waterfront inn exterior for Monterey California Inn",
    position: "50% 48%",
    size: "112%"
  },
  "3216b1b7885bffdb336265a8de7322ba0cd477cfb3d4f99d19acf488f76a1941": {
    url: "/reviewiq-hotels/bell-gardens-california-motel.jpg",
    alt: "Stylish California hotel room for Bell Gardens California Motel",
    position: "50% 48%",
    size: "116%"
  },
  db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723: {
    url: "/reviewiq-hotels/broomfield-colorado-resort.jpg",
    alt: "Resort exterior with mountain setting for Broomfield Colorado Resort",
    position: "50% 44%",
    size: "118%"
  },
  "5f5a0cd8662f0ddf297f2d27358f680daab5d3ac22fd45a4e1c3c3ec2c101a12": {
    url: "/reviewiq-hotels/freudenstadt-baden-wurttemberg-hotel.jpg",
    alt: "Stylish Black Forest hotel room for Freudenstadt Baden-Wurttemberg Hotel",
    position: "57% 50%",
    size: "132%"
  },
  "9a0043fd4258a1286db1e253ca591662b3aac849da12d0d4f67e08b8f59be65f": {
    url: "/reviewiq-hotels/bochum-hotel-room.jpg",
    alt: "Hotel room interior for Bochum Hotel",
    position: "54% 50%",
    size: "126%"
  },
  "3b984f3ba8df55b2609a1e33fd694cf8407842e1d833c9b4d993b07fc83a2820": {
    url: "/reviewiq-hotels/san-isidro-hotel-room.jpg",
    alt: "Hotel room interior for San Isidro de El General San Jose Hotel",
    position: "52% 48%",
    size: "122%"
  },
  f2d8d9557208d58577e9df7ff34e42bf86fb5b10fdfae0c3040d14c374a2a2b9: {
    url: "/reviewiq-hotels/new-smyrna-beach-florida-inn.jpg",
    alt: "Beachside inn exterior for New Smyrna Beach Florida Inn",
    position: "50% 52%",
    size: "116%"
  },
  "7d027ef72c02eaa17af3c993fd5dba50d17b41a6280389a46c13c7e2c32a5b06": {
    url: "/reviewiq-hotels/ocala-florida-inn.jpg",
    alt: "Florida roadside inn exterior for Ocala Florida Inn",
    position: "50% 48%",
    size: "116%"
  },
  "110f01b8ae518a0ee41047bce5c22572988a435e10ead72dc1af793bba8ce0b0": {
    url: "/reviewiq-hotels/pompei-hotel.jpg",
    alt: "Stylish Pompeii hotel exterior for Pompei Hotel",
    position: "50% 46%",
    size: "122%"
  },
  "823fb2499b4e37d99acb65e7198e75965d6496fd1c579f976205c0e6179206df": {
    url: "/reviewiq-hotels/rome-rm-hotel.jpg",
    alt: "Elegant Rome hotel room for Rome RM Hotel",
    position: "54% 42%",
    size: "126%"
  }
};

const REVIEW_KEYWORDS = [
  "room",
  "staff",
  "clean",
  "breakfast",
  "pool",
  "spa",
  "parking",
  "wifi",
  "check",
  "price",
  "value",
  "location",
  "noise",
  "view",
  "bed",
  "shower",
  "food",
  "friendly",
  "lobby",
  "quiet"
];

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hashString(input: string) {
  return Array.from(input).reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function normalizeBackgroundSize(size?: string) {
  if (!size) {
    return "cover";
  }

  const trimmed = size.trim();
  if (/^\d+(\.\d+)?%$/.test(trimmed)) {
    return `${trimmed} ${trimmed}`;
  }

  return trimmed;
}

function getPropertyVisual(property: PropertySummary): PropertyVisual {
  const themes = [
    {
      gradient: "linear-gradient(135deg, #0f183f 0%, #243c9d 55%, #6aa8ff 100%)",
      tile: "linear-gradient(135deg, #0f183f 0%, #243c9d 55%, #6aa8ff 100%)"
    },
    {
      gradient: "linear-gradient(135deg, #1e243a 0%, #36507f 52%, #f0b24d 100%)",
      tile: "linear-gradient(135deg, #1e243a 0%, #36507f 52%, #f0b24d 100%)"
    },
    {
      gradient: "linear-gradient(135deg, #12253d 0%, #006f8f 48%, #7bc4d7 100%)",
      tile: "linear-gradient(135deg, #12253d 0%, #006f8f 48%, #7bc4d7 100%)"
    },
    {
      gradient: "linear-gradient(135deg, #1f2137 0%, #6d4f7d 45%, #febf4f 100%)",
      tile: "linear-gradient(135deg, #1f2137 0%, #6d4f7d 45%, #febf4f 100%)"
    }
  ];

  const theme = themes[hashString(property.propertyId) % themes.length];
  const photo = PROPERTY_PHOTOS[property.propertyId];

  if (!photo) {
    return {
      ...theme,
      reveal: theme.gradient,
      hasPhoto: false,
      photoAlt: null
    };
  }

  const revealUrl = photo.url.replace(/\.jpg$/i, "-reveal.jpg");
  const position = photo.position ?? "center";
  const size = normalizeBackgroundSize(photo.size);
  const revealPosition = photo.revealPosition ?? position;
  const revealSize = normalizeBackgroundSize(photo.revealSize ?? photo.size);

  return {
    gradient: `url("${photo.url}") ${position}/${size} no-repeat, ${theme.gradient}`,
    tile: `linear-gradient(180deg, rgba(16, 24, 63, 0.16), rgba(16, 24, 63, 0.04)), url("${photo.url}") ${position}/${size} no-repeat, ${theme.tile}`,
    reveal: `url("${revealUrl}") ${revealPosition}/${revealSize} no-repeat, ${theme.gradient}`,
    hasPhoto: true,
    photoAlt: photo.alt
  };
}

function formatPropertyLocation(property: PropertySummary) {
  const city = property.city?.trim() ?? "";
  const province = property.province?.trim() ?? "";
  const country = property.country?.trim() ?? "";

  const provinceLooksLikeCode = /^[A-Z]{2,3}$/.test(province);
  const provinceDuplicatesCity = province && city && province.toLowerCase() === city.toLowerCase();
  const provinceDuplicatesCountry = province && country && province.toLowerCase() === country.toLowerCase();

  const secondary = province && !provinceLooksLikeCode && !provinceDuplicatesCity && !provinceDuplicatesCountry
    ? province
    : country;

  return [city, secondary].filter(Boolean).join(", ");
}

function buildPropertyFacts(property: PropertySummary, locale: string, uiCopy: ReviewIqUiCopy) {
  const facts = [
    property.tagline,
    property.areaDescription,
    property.popularAmenities.length
      ? formatUiCopy(uiCopy.propertyFactAmenities, {
          items: property.popularAmenities.slice(0, 3).join(", ")
        })
      : "",
    property.policies.checkInWindow ? formatUiCopy(uiCopy.propertyFactCheckIn, { value: property.policies.checkInWindow }) : "",
    property.policies.checkOutTime ? formatUiCopy(uiCopy.propertyFactCheckOut, { value: property.policies.checkOutTime }) : "",
    property.reviewStats.lastReviewAt
      ? formatUiCopy(uiCopy.propertyFactLatestReview, {
          date: new Date(property.reviewStats.lastReviewAt).toLocaleDateString(locale)
        })
      : "",
    property.reviewHighlights[0]?.summary
      ? formatUiCopy(uiCopy.propertyFactRecentGuest, {
          summary: property.reviewHighlights[0].summary
        })
      : "",
    property.reviewStats.recentReviewCount
      ? formatUiCopy(uiCopy.propertyFactRecentSlice, {
          count: property.reviewStats.recentReviewCount
        })
      : "",
    property.candidateGaps[0]?.label
      ? formatUiCopy(uiCopy.propertyFactTopGap, {
          label: property.candidateGaps[0].label.toLowerCase()
        })
      : "",
    property.candidateGaps[1]?.label
      ? formatUiCopy(uiCopy.propertyFactAnotherGap, {
          label: property.candidateGaps[1].label.toLowerCase()
        })
      : ""
  ];

  return facts.filter(Boolean).slice(0, 8);
}

function deriveRatings(reviewText: string, stars: number) {
  const lower = reviewText.toLowerCase();

  function inferTopic(keywords: string[], positiveKeywords: string[], negativeKeywords: string[]) {
    const mentionsTopic = keywords.some((keyword) => lower.includes(keyword));
    if (!mentionsTopic) {
      return null;
    }

    if (negativeKeywords.some((keyword) => lower.includes(keyword))) {
      return 2;
    }

    if (positiveKeywords.some((keyword) => lower.includes(keyword))) {
      return 4;
    }

    return stars || 4;
  }

  return {
    overall: stars || null,
    roomcleanliness: inferTopic(["clean", "dirty", "bathroom", "linen"], ["clean", "spotless", "fresh"], ["dirty", "stained", "musty"]),
    service: inferTopic(["staff", "service", "desk", "check-in"], ["friendly", "helpful", "warm"], ["rude", "slow", "unhelpful"]),
    hotelcondition: inferTopic(["dated", "renovated", "condition", "maintenance"], ["renovated", "updated", "new"], ["dated", "worn", "broken"]),
    location: inferTopic(["location", "walk", "nearby", "transit"], ["walkable", "central", "close"], ["far", "isolated", "awkward"])
  } satisfies Record<string, number | null>;
}

function scoreCoverage(reviewText: string) {
  const words = countWords(reviewText);
  const lower = reviewText.toLowerCase();
  let score = Math.min(100, words * 2.6);

  for (const keyword of REVIEW_KEYWORDS) {
    if (lower.includes(keyword)) {
      score += 3.4;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function buildTasteProfile(
  reviewText: string,
  previews: AnswerPreview[],
  property: PropertySummary,
  uiCopy: ReviewIqUiCopy
): TasteProfile {
  const lower = reviewText.toLowerCase();
  const previewKeys = new Set(previews.map((preview) => preview.attributeKey));
  const seeds = [
    {
      label: uiCopy.tasteValue,
      archetype: uiCopy.tasteValueArchetype,
      color: "#7B9FD4",
      keywords: ["value", "price", "worth", "deal", "cost", previewKeys.has("value_formoney") ? "value" : ""]
    },
    {
      label: uiCopy.tasteLocation,
      archetype: uiCopy.tasteLocationArchetype,
      color: "#5BC4A8",
      keywords: ["location", "walk", "transit", "neighborhood", "close"]
    },
    {
      label: uiCopy.tasteComfort,
      archetype: uiCopy.tasteComfortArchetype,
      color: "#C8B87A",
      keywords: ["bed", "sleep", "quiet", "noise", "comfort", "room"]
    },
    {
      label: uiCopy.tasteService,
      archetype: uiCopy.tasteServiceArchetype,
      color: "#D47B8A",
      keywords: ["staff", "service", "friendly", "helpful", "desk"]
    },
    {
      label: uiCopy.tasteAmenities,
      archetype: uiCopy.tasteAmenitiesArchetype,
      color: "#A07BCC",
      keywords: ["pool", "spa", "breakfast", "gym", "restaurant", ...property.popularAmenities.slice(0, 2).map((item) => item.toLowerCase())]
    }
  ];

  const segments = seeds.map((seed) => {
    const keywordHits = seed.keywords.filter(Boolean).filter((keyword) => lower.includes(keyword)).length;
    return {
      label: seed.label,
      archetype: seed.archetype,
      color: seed.color,
      value: 10 + keywordHits * 14
    };
  });

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const normalized = segments
    .map((segment) => ({
      label: segment.label,
      color: segment.color,
      value: Math.max(4, Math.round((segment.value / total) * 100))
    }))
    .sort((left, right) => right.value - left.value);

  const leader = normalized[0];
  const runnerUp = normalized[1];
  const leaderSeed = seeds.find((seed) => seed.label === leader.label) ?? seeds[0];

  return {
    label: leaderSeed.label,
    archetype: leaderSeed.archetype,
    insight: formatUiCopy(uiCopy.tasteInsight, {
      leader: leader.label.toLowerCase(),
      runnerUp: runnerUp.label.toLowerCase()
    }),
    recommendations: [
      formatUiCopy(uiCopy.recommendationLeader, { leader: leader.label.toLowerCase() }),
      formatUiCopy(uiCopy.recommendationRunnerUp, { runnerUp: runnerUp.label.toLowerCase() }),
      uiCopy.recommendationFresh
    ],
    segments: normalized
  };
}

function describeNudge(
  reviewText: string,
  coverageScore: number,
  nextGap: CandidateGap | null,
  promptCount: number,
  remainingGapCount: number,
  uiCopy: ReviewIqUiCopy
) {
  const words = countWords(reviewText);
  if (words < 8) {
    return {
      tone: "probe",
      text: uiCopy.nudgeStart
    };
  }

  if (nextGap && words >= 8) {
    return {
      tone: coverageScore >= 78 ? "great" : "probe",
      text: nextGap.question.text
    };
  }

  if (!remainingGapCount || promptCount >= INLINE_PROMPT_LIMIT) {
    return {
      tone: "great",
      text: uiCopy.nudgeThankYou
    };
  }

  return {
    tone: "great",
    text: uiCopy.nudgeThankYou
  };
}

function composeAnswer(choice: string, details: string) {
  if (choice && details.trim()) {
    return `${choice}. ${details.trim()}`;
  }

  return normalizeText(choice || details);
}

function choiceVariant(label: string, uiCopy: ReviewIqUiCopy) {
  const lower = label.toLowerCase();
  if (lower === uiCopy.yes.toLowerCase()) {
    return "yes";
  }

  if (lower === uiCopy.no.toLowerCase()) {
    return "no";
  }

  return "default";
}

function buildQuestionChoices(question: SessionQuestion, uiCopy: ReviewIqUiCopy) {
  if (question.answerType === "short_text") {
    return [];
  }

  return question.choices.length ? question.choices : [uiCopy.yes, uiCopy.no, uiCopy.notSure];
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

async function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = src;
  });
}

async function fileToDataUrl(file: File) {
  const original = await readFileAsDataUrl(file);

  if (!file.type.startsWith("image/")) {
    return original;
  }

  const image = await loadImageElement(original).catch(() => null);
  if (!image) {
    return original;
  }

  const maxDimension = 1600;
  const largestSide = Math.max(image.width, image.height);
  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;

  if (scale === 1 && file.size <= 1_500_000) {
    return original;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");

  if (!context) {
    return original;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (file.type === "image/png") {
    return canvas.toDataURL("image/png");
  }

  return canvas.toDataURL("image/jpeg", 0.82);
}

function parseIsoDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`);
}

function formatStayDate(isoDate: string, locale: string) {
  return parseIsoDate(isoDate).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getFirstPendingStayId(customer: DemoHydratedCustomer) {
  const reviewedStayIds = new Set(customer.journal.reviewedStayIds);
  return customer.stays.find((stay) => !reviewedStayIds.has(stay.stayId))?.stayId ?? customer.stays[0]?.stayId ?? "";
}

function formatTripDateRange(start: Date, end: Date, locale: string) {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = start.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" })
  });
  const endLabel = end.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return `${startLabel} - ${endLabel}`;
}

function formatTripDuration(start: Date, end: Date, uiCopy: ReviewIqUiCopy) {
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  return `${days} ${days === 1 ? uiCopy.day : uiCopy.days}`;
}

function getFriendlyVoiceForLocale(locale: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return null;
  }

  const normalizedLocale = locale.toLowerCase();
  const baseLocale = normalizedLocale.split("-")[0];
  const preferredPatterns = [
    /natural/i,
    /premium/i,
    /enhanced/i,
    /samantha/i,
    /ava/i,
    /allison/i,
    /serena/i,
    /karen/i,
    /moira/i,
    /daniel/i,
    /google .* female/i,
    /microsoft .* online/i
  ];
  const avoidPatterns = [/compact/i, /robot/i, /novelty/i];

  const localeMatches = voices.filter((voice) => {
    const voiceLocale = voice.lang.toLowerCase();
    return voiceLocale === normalizedLocale || voiceLocale.startsWith(`${baseLocale}-`) || voiceLocale === baseLocale;
  });

  const candidatePool = localeMatches.length ? localeMatches : voices;
  const preferredVoice =
    candidatePool.find(
      (voice) =>
        !avoidPatterns.some((pattern) => pattern.test(voice.name)) &&
        preferredPatterns.some((pattern) => pattern.test(voice.name))
    ) ??
    candidatePool.find(
      (voice) =>
        !avoidPatterns.some((pattern) => pattern.test(voice.name)) &&
        /female|woman|zira|aria|jenny|samantha|moira|serena|karen|ava|allison/i.test(voice.name)
    ) ??
    candidatePool.find((voice) => !avoidPatterns.some((pattern) => pattern.test(voice.name)) && voice.default) ??
    candidatePool.find((voice) => !avoidPatterns.some((pattern) => pattern.test(voice.name))) ??
    null;

  return preferredVoice;
}

function buildStampediaTrips(
  customer: DemoHydratedCustomer,
  selectedStayId: string,
  locale: string,
  uiCopy: ReviewIqUiCopy
): StampediaTrip[] {
  const allStays = customer.stays;
  const reviewedStayIds = new Set(customer.journal.reviewedStayIds);
  const reviewedStays = allStays.filter((stay) => reviewedStayIds.has(stay.stayId));
  const submissionsByStayId = new Map(customer.submissions.map((submission) => [submission.stayId, submission]));

  if (!reviewedStays.length) {
    const trip = customer.trips[0];
    const tripStays = allStays.filter((stay) => stay.tripId === trip?.tripId);
    const start = tripStays[0] ? parseIsoDate(tripStays[0].checkIn) : new Date();
    const end = tripStays[tripStays.length - 1] ? parseIsoDate(tripStays[tripStays.length - 1].checkOut) : start;

    return [
      {
        id: `${trip?.tripId ?? "journal"}:blank`,
        tripId: trip?.tripId ?? "journal",
        title: trip?.title ?? uiCopy.atlasCapsuleJournal,
        country: trip?.coverCountry ?? uiCopy.noStampsYetCountry,
        subtitle: trip?.subtitle ?? uiCopy.firstReviewSubtitle,
        dateRange: formatTripDateRange(start, end, locale),
        durationLabel: formatTripDuration(start, end, uiCopy),
        collectedCount: 0,
        stampCount: tripStays.length,
        stamps: [],
        uploadedPhoto: null
      }
    ];
  }

  const grouped = new Map<
    string,
    {
      title: string;
      country: string;
      subtitle?: string;
      reviewedStays: DemoHydratedStay[];
      totalStayCount: number;
    }
  >();

  const totalStayCountByGroup = new Map<string, number>();
  for (const stay of allStays) {
    const key = `${stay.tripId}:${stay.property.country}`;
    totalStayCountByGroup.set(key, (totalStayCountByGroup.get(key) ?? 0) + 1);
  }

  for (const stay of reviewedStays) {
    const trip = customer.trips.find((item) => item.tripId === stay.tripId);
    const key = `${stay.tripId}:${stay.property.country}`;
    const group = grouped.get(key) ?? {
      title: trip?.title ?? formatUiCopy(uiCopy.countryJournal, { country: stay.property.country }),
      country: stay.property.country,
      subtitle: trip?.subtitle,
      reviewedStays: [],
      totalStayCount: totalStayCountByGroup.get(key) ?? 0
    };
    group.reviewedStays.push(stay);
    grouped.set(key, group);
  }

  return Array.from(grouped.entries())
    .map(([id, group]) => {
      const sortedStays = group.reviewedStays.sort(
        (left, right) => parseIsoDate(left.checkIn).getTime() - parseIsoDate(right.checkIn).getTime()
      );
      const start = parseIsoDate(sortedStays[0].checkIn);
      const end = parseIsoDate(sortedStays[sortedStays.length - 1].checkOut);
      const latestUploadedPhoto = [...sortedStays]
        .reverse()
        .map((stay) => ({
          stay,
          submission: submissionsByStayId.get(stay.stayId)
        }))
        .find(({ submission }) => submission?.uploadedPhotoDataUrl);

      return {
        id,
        tripId: sortedStays[0].tripId,
        title: group.title,
        country: group.country,
        subtitle: group.subtitle,
        dateRange: formatTripDateRange(start, end, locale),
        durationLabel: formatTripDuration(start, end, uiCopy),
        collectedCount: sortedStays.length,
        stampCount: group.totalStayCount,
        uploadedPhoto: latestUploadedPhoto?.submission?.uploadedPhotoDataUrl
          ? {
              src: latestUploadedPhoto.submission.uploadedPhotoDataUrl,
              alt:
                latestUploadedPhoto.submission.uploadedPhotoAlt ??
                `Traveler photo from ${latestUploadedPhoto.stay.property.displayName}`,
              caption: latestUploadedPhoto.stay.property.displayName
            }
          : null,
        stamps: sortedStays.map((stay) => {
          const submission = submissionsByStayId.get(stay.stayId);

          return {
            stayId: stay.stayId,
            propertyId: stay.propertyId,
            tripId: stay.tripId,
            displayName: stay.property.displayName,
            city: stay.property.city,
            country: stay.property.country,
            checkIn: formatStayDate(stay.checkIn, locale),
            checkOut: formatStayDate(stay.checkOut, locale),
            room: stay.roomType,
            confirmation: stay.confirmation,
            dateLabel: formatStayDate(stay.checkIn, locale),
            durationLabel: formatTripDuration(parseIsoDate(stay.checkIn), parseIsoDate(stay.checkOut), uiCopy),
            visual: getPropertyVisual(stay.property),
            reviewTitle: submission?.reviewTitle ?? null,
            reviewText: submission?.reviewText ?? "",
            submittedAt: submission?.submittedAt ?? null,
            collected: true,
            selected: stay.stayId === selectedStayId
          };
        })
      };
    })
    .sort((left, right) => {
      const leftHasSelection = left.stamps.some((stamp) => stamp.selected);
      const rightHasSelection = right.stamps.some((stamp) => stamp.selected);
      if (leftHasSelection !== rightHasSelection) {
        return leftHasSelection ? -1 : 1;
      }

      return right.stampCount - left.stampCount;
    });
}

export function ReviewIqClient({ customer, onBackToCustomers, onCustomerUpdate }: ReviewIqClientProps) {
  const [selectedStayId, setSelectedStayId] = useState(getFirstPendingStayId(customer));
  const [stage, setStage] = useState<Stage>("confirm");
  const [languageCode, setLanguageCode] = useState("en");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode | null>(null);
  const [stars, setStars] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [activeInlinePromptKey, setActiveInlinePromptKey] = useState<string | null>(null);
  const [inlinePromptKeys, setInlinePromptKeys] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<SessionQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, QuestionInputState>>({});
  const [answerPreviews, setAnswerPreviews] = useState<AnswerPreview[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [questionRequestedKey, setQuestionRequestedKey] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState(() => {
    return customer.trips[0]?.tripId ?? "";
  });
  const [journalTurning, setJournalTurning] = useState(false);
  const [stampAnimationActive, setStampAnimationActive] = useState(false);
  const [newStampStayId, setNewStampStayId] = useState<string | null>(null);
  const [magicFixLoading, setMagicFixLoading] = useState(false);
  const [magicFixOpen, setMagicFixOpen] = useState(false);
  const [magicFixTitle, setMagicFixTitle] = useState("");
  const [magicFixSuggestion, setMagicFixSuggestion] = useState("");
  const [magicFixAnimating, setMagicFixAnimating] = useState(false);
  const [magicFixReviewedKey, setMagicFixReviewedKey] = useState("");
  const [selectingStayId, setSelectingStayId] = useState<string | null>(null);
  const [selectingMode, setSelectingMode] = useState<InputMode | null>(null);
  const [doneModalOpen, setDoneModalOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTargetRef = useRef<string | null>(null);
  const voiceBaseRef = useRef("");
  const spokenIntroRef = useRef(false);
  const spokenQuestionRef = useRef("");
  const tripTurnTimerRef = useRef<number | null>(null);
  const staySelectTimerRef = useRef<number | null>(null);
  const modeSelectTimerRef = useRef<number | null>(null);
  const magicFixTimerRef = useRef<number | null>(null);
  const magicFixRequestRef = useRef(0);
  const doneScreenRef = useRef<HTMLDivElement | null>(null);
  const selectedLanguage = LANGUAGES.find((language) => language.code === languageCode) ?? LANGUAGES[0];
  const uiCopy = getReviewIqUiCopy(selectedLanguage.code);
  const selectedStay = customer.stays.find((stay) => stay.stayId === selectedStayId) ?? customer.stays[0];
  const selectedProperty = selectedStay?.property;
  const reviewedStayIds = new Set(customer.journal.reviewedStayIds);
  const pendingStays = customer.stays.filter((stay) => !reviewedStayIds.has(stay.stayId));
  const propertyVisual = selectedProperty ? getPropertyVisual(selectedProperty) : null;
  const reviewWordCount = countWords(reviewText);
  const coverageScore = scoreCoverage(reviewText);
  const remainingGapEntries = selectedProperty ? getRemainingGaps(selectedProperty, reviewText) : [];
  const completedGapEntries = selectedProperty ? getRemainingGaps(selectedProperty, reviewText, "completed") : [];
  const completedGapKeySignature = completedGapEntries.map(({ gap }) => gap.attributeKey).join(":");
  const activeInlinePrompt =
    selectedProperty?.candidateGaps.find((gap) => gap.attributeKey === activeInlinePromptKey) ?? null;
  const visibleInlinePrompt = activeInlinePrompt;
  const nudge = describeNudge(
    reviewText,
    coverageScore,
    visibleInlinePrompt,
    inlinePromptKeys.length,
    completedGapEntries.length,
    uiCopy
  );
  const puzzleFacts = selectedProperty ? buildPropertyFacts(selectedProperty, selectedLanguage.locale, uiCopy) : [];
  const answeredFollowUpCount = followUpQuestions.filter((question) => {
    const answer = questionAnswers[question.sessionId];
    return Boolean(normalizeText(composeAnswer(answer?.choice ?? "", answer?.details ?? "")));
  }).length;
  const tasteProfile = selectedProperty ? buildTasteProfile(reviewText, answerPreviews, selectedProperty, uiCopy) : null;
  const puzzlePieces = [
    stars > 0,
    reviewWordCount >= 8,
    reviewWordCount >= 20,
    reviewWordCount >= 40,
    photos.length > 0,
    stage === "questions" || remainingGapEntries.length === 0,
    answeredFollowUpCount > 0 || answerPreviews.length > 0
  ].filter(Boolean).length;
  const stampediaTrips = buildStampediaTrips(customer, selectedStayId, selectedLanguage.locale, uiCopy);
  const magicFixCopy = getMagicFixCopy(selectedLanguage.code);
  const canContinueToQuestions = normalizeText(reviewText).length > 0 && stars > 0 && !submitting && !magicFixLoading;
  const canSubmit = canContinueToQuestions && !loadingQuestions && !savingAnswers;

  function renderPuzzlePanel() {
    if (!propertyVisual) {
      return null;
    }

    return (
      <div className="puzzle-panel">
        <div className="puzzle-header">
          <span className="puzzle-title">{uiCopy.puzzleTitle}</span>
          <span className="puzzle-prog">{puzzlePieces} / 8</span>
        </div>
        <div className="puzzle-board" style={{ background: propertyVisual.reveal }}>
          <div className="puzzle-mask-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <div className={cx("puzzle-mask", index < puzzlePieces ? "revealed" : "covered")} key={index} />
            ))}
          </div>
        </div>
        <div className="puzzle-fact">
          <strong>{uiCopy.didYouKnow}</strong>{" "}
          {puzzleFacts[Math.max(0, Math.min(puzzlePieces - 1, puzzleFacts.length - 1))] ||
            uiCopy.puzzleFallback}
        </div>
      </div>
    );
  }

  function scrollViewportToTop() {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  function getMagicFixReviewKey(text: string) {
    return `${selectedLanguage.locale}:${normalizeText(text)}`;
  }

  function stopMagicFixAnimation() {
    if (typeof window !== "undefined" && magicFixTimerRef.current) {
      window.clearTimeout(magicFixTimerRef.current);
      magicFixTimerRef.current = null;
    }
    setMagicFixAnimating(false);
  }

  function animateMagicFixSuggestion(targetText: string) {
    if (typeof window === "undefined") {
      setMagicFixSuggestion(targetText);
      setMagicFixAnimating(false);
      return;
    }

    stopMagicFixAnimation();
    setMagicFixAnimating(true);
    setMagicFixSuggestion("");

    let index = 0;
    const totalLength = targetText.length;
    const step = Math.max(1, Math.ceil(totalLength / 90));

    const tick = () => {
      index = Math.min(totalLength, index + step);
      setMagicFixSuggestion(targetText.slice(0, index));

      if (index < totalLength) {
        magicFixTimerRef.current = window.setTimeout(tick, 18);
        return;
      }

      magicFixTimerRef.current = null;
      setMagicFixAnimating(false);
    };

    tick();
  }

  function resetInlinePromptState() {
    setActiveInlinePromptKey((current) => (current === null ? current : null));
    setInlinePromptKeys((current) => (current.length ? [] : current));
  }

  function resetReviewState(nextStage: Stage = "confirm") {
    setStage(nextStage);
    setInputMode(null);
    setStars(0);
    setReviewTitle("");
    setReviewText("");
    resetInlinePromptState();
    setPhotos((current) => {
      for (const photo of current) {
        URL.revokeObjectURL(photo.previewUrl);
      }

      return [];
    });
    setFollowUpQuestions([]);
    setQuestionAnswers({});
    setAnswerPreviews([]);
    setError("");
    setQuestionRequestedKey("");
    setStampAnimationActive(false);
    setNewStampStayId(null);
    magicFixRequestRef.current += 1;
    setMagicFixOpen(false);
    setMagicFixLoading(false);
    setMagicFixTitle("");
    setMagicFixSuggestion("");
    stopMagicFixAnimation();
    setMagicFixReviewedKey("");
    setSelectingStayId(null);
    setSelectingMode(null);
    setDoneModalOpen(false);
    spokenIntroRef.current = false;
    spokenQuestionRef.current = "";
  }

  function invalidateFollowUps() {
    setFollowUpQuestions([]);
    setQuestionAnswers({});
    setAnswerPreviews([]);
    setQuestionRequestedKey("");
    spokenQuestionRef.current = "";
  }

  function prepareDraftForInputMode(nextMode: InputMode) {
    if (nextMode === "voice" || (inputMode && inputMode !== nextMode)) {
      stopVoiceCapture();
      setReviewTitle("");
      setReviewText("");
      resetInlinePromptState();
      invalidateFollowUps();
      setMagicFixOpen(false);
      setMagicFixLoading(false);
      setMagicFixTitle("");
      setMagicFixSuggestion("");
      stopMagicFixAnimation();
      setMagicFixReviewedKey("");
    }

    setInputMode(nextMode);
    setError("");
    setStage("review");
  }

  function questionVoiceTarget(sessionId: string) {
    return `question:${sessionId}`;
  }

  function getVoiceQuestionId(target: string | null) {
    return target?.startsWith("question:") ? target.slice("question:".length) : null;
  }

  function setQuestionChoiceValue(sessionId: string, choice: string) {
    setQuestionAnswers((current) => ({
      ...current,
      [sessionId]: {
        choice,
        details: current[sessionId]?.details ?? ""
      }
    }));
  }

  function setQuestionDetailsValue(sessionId: string, details: string) {
    setQuestionAnswers((current) => ({
      ...current,
      [sessionId]: {
        choice: current[sessionId]?.choice ?? "",
        details
      }
    }));
  }

  async function handleTripRename(tripId: string, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }

    try {
      const response = await fetch("/api/demo/trip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerId: customer.id,
          tripId,
          title: nextTitle
        })
      });

      const payload = (await response.json()) as {
        customer?: DemoHydratedCustomer;
      };

      if (response.ok && payload.customer) {
        onCustomerUpdate(payload.customer);
      }
    } catch {
      // Keep the local typing flow smooth for the demo even if persistence misses.
    }
  }

  function handleTripSelect(tripId: string) {
    if (!tripId || tripId === activeTripId) {
      return;
    }

    setActiveTripId(tripId);
    setJournalTurning(true);
    if (typeof window !== "undefined") {
      if (tripTurnTimerRef.current) {
        window.clearTimeout(tripTurnTimerRef.current);
      }
      tripTurnTimerRef.current = window.setTimeout(() => {
        setJournalTurning(false);
      }, 480);
    }
  }

  function speakNextFollowUpQuestion(currentTarget: string | null) {
    if (stage !== "questions" || inputMode !== "voice" || !voiceSupported) {
      return;
    }

    const currentQuestionId = getVoiceQuestionId(currentTarget);
    if (!currentQuestionId) {
      return;
    }

    const currentIndex = followUpQuestions.findIndex((question) => question.sessionId === currentQuestionId);
    if (currentIndex < 0) {
      return;
    }

    const nextQuestion = followUpQuestions[currentIndex + 1];
    if (!nextQuestion) {
      return;
    }

    speakText(formatUiCopy(uiCopy.followUpSpeechIntro, { prompt: nextQuestion.prompt }));
  }

  function stopVoiceCapture(options?: { announceNextQuestion?: boolean }) {
    const currentTarget = voiceTargetRef.current;

    if (recognitionRef.current && voiceActive) {
      recognitionRef.current.stop();
    }

    voiceTargetRef.current = null;
    setVoiceActive(false);
    setVoiceTarget(null);

    if (options?.announceNextQuestion) {
      speakNextFollowUpQuestion(currentTarget);
    }
  }

  function speakText(text: string, afterSpeak?: () => void, retryCount = 0) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      afterSpeak?.();
      return;
    }

    const synthesis = window.speechSynthesis;
    const selectedVoice = getFriendlyVoiceForLocale(selectedLanguage.locale);

    if (!selectedVoice && synthesis.getVoices().length === 0 && retryCount < 2) {
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          speakText(text, afterSpeak, retryCount + 1);
        }, 120);
      }
      return;
    }

    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.locale;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = selectedLanguage.code === "ja" || selectedLanguage.code === "zh" ? 0.94 : 0.96;
    utterance.pitch = 1.12;
    utterance.volume = 1;
    utterance.onend = () => afterSpeak?.();
    synthesis.speak(utterance);
  }

  function startVoiceCapture(target: string) {
    if (!recognitionRef.current) {
      return;
    }

    stopVoiceCapture();
    voiceTargetRef.current = target;
    setVoiceTarget(target);
    setVoiceActive(true);
    voiceBaseRef.current =
      target === "review" ? reviewText : questionAnswers[getVoiceQuestionId(target) ?? ""]?.details ?? "";

    try {
      recognitionRef.current.lang = selectedLanguage.locale;
      recognitionRef.current.start();
    } catch {
      setVoiceActive(false);
      setVoiceTarget(null);
    }
  }

  function toggleVoiceCapture(target: string) {
    if (voiceActive && voiceTarget === target) {
      stopVoiceCapture({
        announceNextQuestion: Boolean(getVoiceQuestionId(target))
      });
      return;
    }

    startVoiceCapture(target);
  }

  async function requestFollowUpQuestions(signature: string) {
    if (!selectedProperty) {
      return;
    }

    if (!remainingGapEntries.length) {
      setFollowUpQuestions([]);
      setQuestionRequestedKey(signature);
      return;
    }

    setLoadingQuestions(true);
    setError("");

    try {
      const response = await fetch("/api/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          propertyId: selectedProperty.propertyId,
          reviewText,
          ratings: deriveRatings(reviewText, stars),
          locale: selectedLanguage.locale,
          count: Math.min(2, remainingGapEntries.length)
        })
      });

      const payload = (await response.json()) as {
        error?: string;
        questions?: SessionQuestion[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not generate the smart follow-up.");
      }

      setFollowUpQuestions(payload.questions ?? []);
      setQuestionAnswers({});
      setQuestionRequestedKey(signature);
    } catch (requestError) {
      setQuestionRequestedKey("");
      const message = requestError instanceof Error ? requestError.message : "Could not generate the smart follow-up.";
      setError(message);
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function previewQuestionAnswer(question: SessionQuestion, answer: string) {
    const response = await fetch("/api/session/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        answer
      })
    });

    const payload = (await response.json()) as {
      error?: string;
      preview?: AnswerPreview;
    };

    if (!response.ok || !payload.preview) {
      throw new Error(payload.error ?? "Could not preview the answer.");
    }

    return payload.preview;
  }

  async function captureAnswerPreviews() {
    const answeredQuestions = followUpQuestions
      .map((question) => {
        const answer = questionAnswers[question.sessionId];
        return {
          question,
          answer: normalizeText(composeAnswer(answer?.choice ?? "", answer?.details ?? ""))
        };
      })
      .filter((entry) => entry.answer);

    if (!answeredQuestions.length) {
      setAnswerPreviews([]);
      return [];
    }

    setSavingAnswers(true);
    setError("");

    try {
      const previews = await Promise.all(
        answeredQuestions.map((entry) => previewQuestionAnswer(entry.question, entry.answer))
      );
      setAnswerPreviews(previews);
      return previews;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Could not preview the answer.";
      setError(message);
      throw requestError;
    } finally {
      setSavingAnswers(false);
    }
  }

  async function requestMagicFixes(sourceText = reviewText) {
    const trimmed = normalizeText(sourceText);
    if (!trimmed) {
      return null;
    }

    const response = await fetch("/api/session/polish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reviewText: trimmed,
        locale: selectedLanguage.locale,
        languageCode: selectedLanguage.code
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      polishedText?: string;
      changed?: boolean;
      generatedTitle?: string | null;
    };

    const polishedText = typeof payload.polishedText === "string" ? payload.polishedText : trimmed;
    const generatedTitle = typeof payload.generatedTitle === "string" ? normalizeText(payload.generatedTitle) : "";

    if (!polishedText && !generatedTitle) {
      return null;
    }

    return {
      polishedText,
      changed: Boolean(payload.changed),
      generatedTitle
    };
  }

  async function maybeOpenMagicFixes() {
    const trimmed = normalizeText(reviewText);
    if (!trimmed) {
      return false;
    }

    const reviewKey = getMagicFixReviewKey(trimmed);
    if (magicFixReviewedKey === reviewKey) {
      return false;
    }

    const requestId = magicFixRequestRef.current + 1;
    magicFixRequestRef.current = requestId;
    stopMagicFixAnimation();
    setMagicFixTitle(normalizeText(reviewTitle));
    setMagicFixSuggestion("");
    setMagicFixOpen(true);
    setMagicFixLoading(true);
    stopVoiceCapture();

    try {
      const polished = await requestMagicFixes(trimmed).catch(() => null);
      if (magicFixRequestRef.current !== requestId) {
        return false;
      }

      const cleaned = normalizeText(polished?.polishedText ?? "");
      const generatedTitle = normalizeText(polished?.generatedTitle ?? "");

      if (!polished) {
        return true;
      }

      setMagicFixTitle(generatedTitle || normalizeText(reviewTitle));

      if (cleaned) {
        if (cleaned !== trimmed) {
          animateMagicFixSuggestion(cleaned);
        } else {
          setMagicFixSuggestion(cleaned);
        }
      }
      return true;
    } finally {
      if (magicFixRequestRef.current === requestId) {
        setMagicFixLoading(false);
      }
    }
  }

  async function finalizeSubmission(
    finalReviewTitle: string | null,
    finalReviewText: string,
    polishedReviewText: string | null,
    nextAnswerPreviews: AnswerPreview[] = answerPreviews
  ) {
    setReviewTitle(finalReviewTitle ?? "");
    setReviewText(finalReviewText);

    const response = await fetch("/api/demo/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customerId: customer.id,
        stayId: selectedStay.stayId,
        reviewTitle: finalReviewTitle,
        reviewText: finalReviewText,
        polishedText: polishedReviewText,
        answerPreviews: nextAnswerPreviews,
        uploadedPhotoDataUrl: photos[0] ? await fileToDataUrl(photos[0].file) : null,
        uploadedPhotoAlt: photos[0] ? `Traveler photo from ${selectedProperty.displayName}` : null
      })
    });

    const payload = (await response.json()) as {
      customer?: DemoHydratedCustomer;
      error?: string;
    };

    if (!response.ok || !payload.customer) {
      throw new Error(payload.error ?? "Could not save this review for the demo customer.");
    }

    onCustomerUpdate(payload.customer);
    setNewStampStayId(selectedStay.stayId);
    setActiveTripId(`${selectedStay.tripId}:${selectedProperty.country}`);
    magicFixRequestRef.current += 1;
    setMagicFixOpen(false);
    setMagicFixTitle("");
    setMagicFixSuggestion("");
    stopMagicFixAnimation();
    setDoneModalOpen(true);
    setStage("done");
    stopVoiceCapture();
  }

  async function submitReview() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const openedMagicFix = await maybeOpenMagicFixes();
      if (openedMagicFix) {
        return;
      }

      const nextAnswerPreviews = await captureAnswerPreviews();
      await finalizeSubmission(normalizeText(reviewTitle) || null, reviewText, null, nextAnswerPreviews);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Could not submit this review.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function acceptMagicFixes() {
    const nextReviewTitle = normalizeText(magicFixTitle) || reviewTitle;
    const nextReviewText = normalizeText(magicFixSuggestion) || reviewText;
    magicFixRequestRef.current += 1;
    stopMagicFixAnimation();
    setReviewTitle(nextReviewTitle);
    setReviewText(nextReviewText);
    setMagicFixReviewedKey(getMagicFixReviewKey(nextReviewText));
    setMagicFixOpen(false);
    setMagicFixTitle("");
    setMagicFixSuggestion("");
    scrollViewportToTop();
  }

  function keepOriginalReview() {
    magicFixRequestRef.current += 1;
    stopMagicFixAnimation();
    setMagicFixReviewedKey(getMagicFixReviewKey(reviewText));
    setMagicFixOpen(false);
    setMagicFixTitle("");
    setMagicFixSuggestion("");
    scrollViewportToTop();
  }

  function moveToFollowUps() {
    setStage("questions");
    scrollViewportToTop();
    maybeOpenMagicFixes().catch(() => undefined);
  }

  async function handlePhotoSelection(files: FileList | null) {
    if (!files) {
      return;
    }

    const newPhotos = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, 4 - photos.length))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file)
      }));

    setPhotos((current) => [...current, ...newPhotos].slice(0, 4));
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => {
      const found = current.find((photo) => photo.id === photoId);
      if (found) {
        URL.revokeObjectURL(found.previewUrl);
      }

      return current.filter((photo) => photo.id !== photoId);
    });
  }

  function continueToStampedia() {
    if (typeof window === "undefined") {
      setDoneModalOpen(false);
      return;
    }

    setDoneModalOpen(false);
    window.requestAnimationFrame(() => {
      const targetTop = doneScreenRef.current
        ? doneScreenRef.current.getBoundingClientRect().top + window.scrollY - 112
        : 0;

      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "auto"
      });
    });
  }

  useEffect(() => {
    document.documentElement.lang = selectedLanguage.code;
    document.documentElement.dir = selectedLanguage.dir;
  }, [selectedLanguage]);

  useEffect(() => {
    if (!stampediaTrips.length) {
      return;
    }

    if (!stampediaTrips.some((trip) => trip.id === activeTripId)) {
      setActiveTripId(stampediaTrips[0].id);
    }
  }, [activeTripId, stampediaTrips]);

  useEffect(() => {
    if (!pendingStays.length) {
      return;
    }

    if (!pendingStays.some((stay) => stay.stayId === selectedStayId)) {
      setSelectedStayId(pendingStays[0].stayId);
    }
  }, [pendingStays, selectedStayId]);

  useEffect(() => {
    if (stage !== "done" || !newStampStayId || doneModalOpen) {
      return;
    }

    setStampAnimationActive(true);
    if (typeof window === "undefined") {
      return;
    }

    const timer = window.setTimeout(() => {
      setStampAnimationActive(false);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [doneModalOpen, newStampStayId, stage]);

  useEffect(() => {
    return () => {
      if (tripTurnTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(tripTurnTimerRef.current);
      }
      if (staySelectTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(staySelectTimerRef.current);
      }
      if (modeSelectTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(modeSelectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (stage !== "confirm") {
      if (staySelectTimerRef.current) {
        window.clearTimeout(staySelectTimerRef.current);
        staySelectTimerRef.current = null;
      }

      if (selectingStayId) {
        setSelectingStayId(null);
      }
    }

    if (stage !== "mode") {
      if (modeSelectTimerRef.current) {
        window.clearTimeout(modeSelectTimerRef.current);
        modeSelectTimerRef.current = null;
      }

      if (selectingMode) {
        setSelectingMode(null);
      }
    }
  }, [selectingMode, selectingStayId, stage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const RecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setVoiceSupported(false);
      return;
    }

    setVoiceSupported(true);
    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = selectedLanguage.locale;
    recognition.onresult = (event) => {
      const startIndex = (event as SpeechRecognitionEvent & { resultIndex?: number }).resultIndex ?? 0;
      let interim = "";
      let finalized = "";

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalized += transcript;
        } else {
          interim += transcript;
        }
      }

      const next = normalizeText(`${voiceBaseRef.current} ${finalized} ${interim}`);
      if (voiceTargetRef.current === "review") {
        setReviewText(next);
      }

      const voiceQuestionId = getVoiceQuestionId(voiceTargetRef.current);
      if (voiceQuestionId) {
        setQuestionDetailsValue(voiceQuestionId, next);
      }

      if (finalized) {
        voiceBaseRef.current = normalizeText(`${voiceBaseRef.current} ${finalized}`);
      }
    };
    recognition.onend = () => {
      voiceTargetRef.current = null;
      setVoiceActive(false);
      setVoiceTarget(null);
    };
    recognition.onerror = () => {
      voiceTargetRef.current = null;
      setVoiceActive(false);
      setVoiceTarget(null);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [selectedLanguage]);

  useEffect(() => {
    if (!selectedProperty) {
      resetInlinePromptState();
      return;
    }

    if (!reviewWordCount) {
      resetInlinePromptState();
      return;
    }

    const unresolvedKeys = new Set(completedGapEntries.map(({ gap }) => gap.attributeKey));
    const resolvedPromptKeys = inlinePromptKeys.filter((key) => !unresolvedKeys.has(key));
    const activePromptIsCovered = activeInlinePromptKey ? !unresolvedKeys.has(activeInlinePromptKey) : false;
    const nextResolvedPromptKeys =
      activePromptIsCovered && activeInlinePromptKey && !resolvedPromptKeys.includes(activeInlinePromptKey)
        ? [...resolvedPromptKeys, activeInlinePromptKey]
        : resolvedPromptKeys;

    if (nextResolvedPromptKeys.length !== inlinePromptKeys.length) {
      setInlinePromptKeys(nextResolvedPromptKeys);
    }

    const nextGap =
      nextResolvedPromptKeys.length >= INLINE_PROMPT_LIMIT
        ? null
        : completedGapEntries.find(({ gap }) => !nextResolvedPromptKeys.includes(gap.attributeKey))?.gap ?? null;
    const nextPromptKey = reviewWordCount >= 8 ? nextGap?.attributeKey ?? null : activeInlinePromptKey;

    if (activeInlinePromptKey !== nextPromptKey) {
      setActiveInlinePromptKey(nextPromptKey);
    }
  }, [
    activeInlinePromptKey,
    completedGapKeySignature,
    inlinePromptKeys,
    reviewWordCount,
    selectedProperty
  ]);

  useEffect(() => {
    if (stage !== "questions" || !selectedProperty || loadingQuestions) {
      return;
    }

    if (!remainingGapEntries.length) {
      setFollowUpQuestions([]);
      return;
    }

    if (followUpQuestions.length) {
      return;
    }

    const signature = `${selectedProperty.propertyId}:${selectedLanguage.locale}:${normalizeText(reviewText)}:${stars}`;
    if (questionRequestedKey === signature) {
      return;
    }

    const timer = window.setTimeout(() => {
      requestFollowUpQuestions(signature).catch(() => undefined);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [
    followUpQuestions.length,
    loadingQuestions,
    questionRequestedKey,
    remainingGapEntries.length,
    reviewText,
    selectedLanguage.locale,
    selectedProperty,
    stage,
    stars
  ]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && magicFixTimerRef.current) {
        window.clearTimeout(magicFixTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stage !== "review" || inputMode !== "voice" || !voiceSupported || spokenIntroRef.current || !selectedProperty) {
      return;
    }

    spokenIntroRef.current = true;
    speakText(formatUiCopy(uiCopy.reviewSpeechIntro, { property: selectedProperty.displayName }));
  }, [inputMode, selectedProperty, stage, uiCopy, voiceSupported]);

  useEffect(() => {
    if (
      stage !== "questions" ||
      !followUpQuestions.length ||
      inputMode !== "voice" ||
      !voiceSupported ||
      magicFixOpen ||
      magicFixLoading
    ) {
      return;
    }

    const firstQuestion = followUpQuestions[0];
    const signature = followUpQuestions.map((question) => question.sessionId).join(":");
    if (spokenQuestionRef.current === signature) {
      return;
    }

    spokenQuestionRef.current = signature;
    speakText(formatUiCopy(uiCopy.followUpSpeechIntro, { prompt: firstQuestion.prompt }));
  }, [followUpQuestions, inputMode, magicFixLoading, magicFixOpen, stage, uiCopy, voiceSupported]);

  if (!selectedStay || !selectedProperty || !propertyVisual || !tasteProfile) {
    return null;
  }

  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-brand">
              <img alt="Atlas logo" className="brand-atlas-image" src="/atlas_logo.png" />
              <span className="brand-by">by</span>
              <a className="brand-logo" href="#">
                <img alt="Expedia logo" className="brand-image" src="/ex_logo.svg" />
              </a>
            </div>

            <div className="app-meta">
              <button className="app-link" onClick={onBackToCustomers} type="button">
                {uiCopy.switchCustomer}
              </button>

              <div className="lang-btn">
                <button
                  aria-expanded={languageOpen}
                  className="lang-trigger app-link"
                  onClick={() => setLanguageOpen((current) => !current)}
                  type="button"
                >
                  <span className="lang-cur">{selectedLanguage.code.toUpperCase()}</span>
                  <span className="lang-caret">&#9660;</span>
                </button>
                <div className={cx("lang-dd", languageOpen && "open")}>
                  {LANGUAGES.map((language) => (
                    <button
                      className={cx("lang-opt", language.code === languageCode && "active")}
                      key={language.code}
                      onClick={() => {
                        setLanguageCode(language.code);
                        invalidateFollowUps();
                        setLanguageOpen(false);
                      }}
                      type="button"
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="app-main">
          <section className="content-shell">
            <div className="stepbar">
              <div className="steps">
                <div className={cx("stp", stage === "confirm" && "cur", stage !== "confirm" && "done")}>
                  <div className="stp-n">1</div>
                  <span className="stp-l">{uiCopy.stepChooseStay}</span>
                </div>
                <div className="stp-sep" />
                <div className={cx("stp", stage === "mode" && "cur", (stage === "review" || stage === "questions" || stage === "done") && "done")}>
                  <div className="stp-n">2</div>
                  <span className="stp-l">{uiCopy.stepInputStyle}</span>
                </div>
                <div className="stp-sep" />
                <div className={cx("stp", stage === "review" && "cur", (stage === "questions" || stage === "done") && "done")}>
                  <div className="stp-n">3</div>
                  <span className="stp-l">{uiCopy.stepReview}</span>
                </div>
                <div className="stp-sep" />
                <div className={cx("stp", stage === "questions" && "cur", stage === "done" && "done")}>
                  <div className="stp-n">4</div>
                  <span className="stp-l">{uiCopy.stepFollowUp}</span>
                </div>
                <div className="stp-sep" />
                <div className={cx("stp", stage === "done" && "cur")}>
                  <div className="stp-n">5</div>
                  <span className="stp-l">{uiCopy.stepProfile}</span>
                </div>
              </div>
            </div>

            <div className={cx("screen", stage === "confirm" && "on")}>
          <h1 className="pg-h1">{formatUiCopy(uiCopy.chooseStayHeading, { name: customer.firstName })}</h1>

          <div className="prop-grid">
            {pendingStays.map((stay) => {
              const property = stay.property;
              const visual = getPropertyVisual(property);
              const isSelected = stay.stayId === selectingStayId;
              return (
                <button
                  className={cx("prop-card", isSelected && "sel", selectingStayId && selectingStayId !== stay.stayId && "disabled")}
                  disabled={Boolean(selectingStayId)}
                  key={stay.stayId}
                  onClick={() => {
                    setSelectingStayId(stay.stayId);
                    if (typeof window === "undefined") {
                      setSelectedStayId(stay.stayId);
                      resetReviewState("confirm");
                      setActiveTripId(stay.tripId);
                      setStage("mode");
                      return;
                    }

                    if (staySelectTimerRef.current) {
                      window.clearTimeout(staySelectTimerRef.current);
                    }

                    staySelectTimerRef.current = window.setTimeout(() => {
                      setSelectedStayId(stay.stayId);
                      resetReviewState("confirm");
                      setActiveTripId(stay.tripId);
                      setStage("mode");
                    }, 220);
                  }}
                  type="button"
                >
                  <div className="prop-chk">&#10003;</div>
                  <div
                    aria-label={visual.photoAlt ?? `${property.displayName} preview`}
                    className="prop-photo-fb"
                    role="img"
                    style={{ background: visual.tile }}
                  />
                  <div className="prop-body">
                    <div className="prop-city stay-card-city">
                      {formatPropertyLocation(property)}
                    </div>
                    <div className="prop-name stay-card-name">{property.displayName}</div>
                    <div className="stay-mini-grid">
                      <div className="stay-mini-cell">
                        <div className="stay-cell-lbl">{uiCopy.checkIn}</div>
                        <div className="stay-mini-val">{formatStayDate(stay.checkIn, selectedLanguage.locale)}</div>
                      </div>
                      <div className="stay-mini-cell">
                        <div className="stay-cell-lbl">{uiCopy.checkOut}</div>
                        <div className="stay-mini-val">{formatStayDate(stay.checkOut, selectedLanguage.locale)}</div>
                      </div>
                      <div className="stay-mini-cell">
                        <div className="stay-cell-lbl">{uiCopy.roomType}</div>
                        <div className="stay-mini-val">{stay.roomType}</div>
                      </div>
                      <div className="stay-mini-cell">
                        <div className="stay-cell-lbl">{uiCopy.confirmation}</div>
                        <div className="stay-mini-val stay-code">{stay.confirmation}</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {!pendingStays.length ? (
            <div className="card">
              <div className="card-hd">
                <div className="card-title">{uiCopy.allStaysReviewed}</div>
              </div>
              <p className="pg-sub" style={{ margin: 0 }}>
                {formatUiCopy(uiCopy.emptyQueue, { name: customer.firstName })}
              </p>
              <div className="btn-row" style={{ marginTop: 18 }}>
                <button className="btn-p" onClick={() => setStage("done")} type="button">
                  {uiCopy.goToAtlasCapsule}
                </button>
              </div>
            </div>
          ) : null}

          <div className="btn-row">
            <button className="btn-s" onClick={onBackToCustomers} type="button">
              {uiCopy.backToCustomers}
            </button>
          </div>
            </div>

            <div className={cx("screen", stage === "mode" && "on")}>
          <h1 className="pg-h1">{formatUiCopy(uiCopy.shareHeading, { name: customer.firstName })}</h1>

          <div className="mode-grid">
            <button
              className={cx("mode-card", selectingMode === "type" && "sel", selectingMode && selectingMode !== "type" && "disabled")}
              disabled={Boolean(selectingMode)}
              onClick={() => {
                setSelectingMode("type");
                if (typeof window === "undefined") {
                  prepareDraftForInputMode("type");
                  return;
                }

                if (modeSelectTimerRef.current) {
                  window.clearTimeout(modeSelectTimerRef.current);
                }

                modeSelectTimerRef.current = window.setTimeout(() => {
                  prepareDraftForInputMode("type");
                }, 220);
              }}
              type="button"
            >
              <div className="mode-icon" aria-hidden="true">
                <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                  <path d="M4 20l4.2-1 9.5-9.5a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <path d="M13.5 6.5l4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <div className="mode-title">{uiCopy.writeYourReview}</div>
            </button>

            <button
              className={cx("mode-card", selectingMode === "voice" && "sel", selectingMode && selectingMode !== "voice" && "disabled")}
              disabled={Boolean(selectingMode)}
              onClick={() => {
                setSelectingMode("voice");
                if (typeof window === "undefined") {
                  prepareDraftForInputMode("voice");
                  return;
                }

                if (modeSelectTimerRef.current) {
                  window.clearTimeout(modeSelectTimerRef.current);
                }

                modeSelectTimerRef.current = window.setTimeout(() => {
                  prepareDraftForInputMode("voice");
                }, 220);
              }}
              type="button"
            >
              <div className="mode-icon" aria-hidden="true">
                <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                  <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 1 0 6 0V7a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M6 11a6 6 0 0 0 12 0" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  <path d="M12 17v3" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  <path d="M9 20h6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </div>
              <div className="mode-title">{uiCopy.speakYourReview}</div>
            </button>
          </div>

          <div className="btn-row">
            <button className="btn-s" onClick={() => setStage("confirm")} type="button">
              {uiCopy.back}
            </button>
          </div>
            </div>

            <div className={cx("screen", stage === "review" && "on")}>
          <div className="rev-layout">
            <div className="rev-main">
              <div className="rev-hero" style={{ background: propertyVisual.gradient }}>
                <div className="rev-grad" />
                <div className="rev-info">
                  <div>
                    <div className="rev-name">{selectedProperty.displayName}</div>
                    <div className="rev-loc">
                      {formatPropertyLocation(selectedProperty)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rev-body">
                <div className="card">
                  <div className="card-hd">
                    <div className="card-title">{uiCopy.overallImpression}</div>
                  </div>
                  <div className="star-row">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        className={cx("sb", value <= stars && "lit")}
                        key={value}
                        onClick={() => {
                          setStars(value);
                          invalidateFollowUps();
                        }}
                        type="button"
                      >
                        &#9733;
                      </button>
                    ))}
                  </div>
                  <div className="star-label">{STAR_LABELS_BY_LANGUAGE[selectedLanguage.code]?.[stars] ?? STAR_LABELS[stars]}</div>
                </div>

                <div className="review-section">
                  <div className="section-lbl">{uiCopy.yourReview}</div>
                  <div className={cx("nudge", "show", nudge.tone)}>
                    <div className="n-pip">{nudge.tone === "great" ? "OK" : "AI"}</div>
                    <div className="n-body">
                      <div className="n-tag">{uiCopy.reviewIqTip}</div>
                      <div className="n-txt">{nudge.text}</div>
                    </div>
                  </div>
                  {inputMode === "voice" ? (
                    <div className="voice-review-card">
                      <button
                        className={cx("voice-review-btn", voiceActive && voiceTarget === "review" && "rec")}
                        disabled={!voiceSupported}
                        onClick={() => toggleVoiceCapture("review")}
                        type="button"
                      >
                        <span className="voice-review-btn-dot" aria-hidden="true" />
                        <span>{voiceActive && voiceTarget === "review" ? uiCopy.stopRecording : uiCopy.recordReview}</span>
                      </button>
                      <div className="voice-review-helper">
                        {voiceSupported
                          ? voiceActive && voiceTarget === "review"
                            ? uiCopy.listeningNow
                            : uiCopy.tapRecordAndSpeak
                          : uiCopy.voiceUnavailable}
                      </div>
                      <div className="voice-review-transcript-wrap">
                        <div className="voice-review-transcript-lbl">{uiCopy.transcript}</div>
                        <textarea
                          className={cx("voice-review-transcript", !reviewText && "empty")}
                          onChange={(event) => {
                            setReviewText(event.target.value);
                            invalidateFollowUps();
                          }}
                          placeholder={uiCopy.reviewTranscriptPlaceholder}
                          value={reviewText}
                        />
                      </div>
                      <div className="ta-bar voice-review-meta">
                        <div className="ta-right">
                          <div className="sat-wrap">
                            <div className="sat-track">
                              <div className="sat-fill" style={{ width: `${coverageScore}%` }} />
                            </div>
                            <div className="sat-lbl">
                              {coverageScore >= 82
                                ? uiCopy.excellentDetail
                                : coverageScore >= 55
                                  ? uiCopy.gettingThere
                                  : coverageScore >= 25
                                    ? uiCopy.keepGoing
                                    : uiCopy.keepTalking}
                            </div>
                          </div>
                          <span className={cx("wc", reviewWordCount >= 30 && "ok")}>
                            {reviewWordCount} {reviewWordCount === 1 ? uiCopy.word : uiCopy.words}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="ta-wrap">
                      <textarea
                        className="main-ta"
                        onChange={(event) => {
                          setReviewText(event.target.value);
                          invalidateFollowUps();
                        }}
                        placeholder={uiCopy.writePlaceholder}
                        value={reviewText}
                      />
                      <div className="ta-bar">
                        <div className="ta-right">
                          <div className="sat-wrap">
                            <div className="sat-track">
                              <div className="sat-fill" style={{ width: `${coverageScore}%` }} />
                            </div>
                            <div className="sat-lbl">
                              {coverageScore >= 82
                                ? uiCopy.excellentDetail
                                : coverageScore >= 55
                                  ? uiCopy.gettingThere
                                  : coverageScore >= 25
                                    ? uiCopy.keepGoing
                                    : uiCopy.keepWriting}
                            </div>
                          </div>
                          <span className={cx("wc", reviewWordCount >= 30 && "ok")}>
                            {reviewWordCount} {reviewWordCount === 1 ? uiCopy.word : uiCopy.words}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="photo-upload-wrap">
                  <div className="section-lbl">{uiCopy.addPhotosOptional}</div>
                  <label
                    className="photo-drop"
                    onDragOver={(event: DragEvent<HTMLLabelElement>) => event.preventDefault()}
                    onDrop={(event: DragEvent<HTMLLabelElement>) => {
                      event.preventDefault();
                      handlePhotoSelection(event.dataTransfer.files).catch(() => undefined);
                    }}
                  >
                    <div className="photo-drop-txt">{uiCopy.dragPhotos}</div>
                    <div className="photo-drop-sub">{uiCopy.photoUploadSub}</div>
                    <input
                      accept="image/*"
                      multiple
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        handlePhotoSelection(event.target.files).catch(() => undefined);
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </label>

                  {photos.length ? (
                    <div className="photo-previews">
                      {photos.map((photo) => (
                        <div className="photo-prev" key={photo.id}>
                          <img alt={uiCopy.uploadedPhotoAlt} src={photo.previewUrl} />
                          <button className="photo-prev-rm" onClick={() => removePhoto(photo.id)} type="button">
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {error ? <div className="error-msg">{error}</div> : null}

                <div className="btn-row">
                  <button className="btn-s" onClick={() => setStage("mode")} type="button">
                    {uiCopy.back}
                  </button>
                  <button
                    className="btn-p"
                    disabled={!canContinueToQuestions}
                    onClick={() => {
                      if (!remainingGapEntries.length) {
                        submitReview().catch(() => undefined);
                        return;
                      }

                      moveToFollowUps();
                    }}
                    type="button"
                  >
                    {magicFixLoading
                      ? magicFixCopy.loading
                      : submitting
                        ? uiCopy.submitting
                        : remainingGapEntries.length
                          ? uiCopy.nextPage
                          : uiCopy.submitReview}
                  </button>
                </div>
              </div>
            </div>

            {renderPuzzlePanel()}
          </div>
            </div>

            <div className={cx("screen", stage === "questions" && "on")}>
          <div className="rev-layout">
            <div className="rev-main">
              <div className="rev-hero" style={{ background: propertyVisual.gradient }}>
                <div className="rev-grad" />
                <div className="rev-info">
                  <div>
                    <div className="rev-name">{selectedProperty.displayName}</div>
                    <div className="rev-loc">
                      {formatPropertyLocation(selectedProperty)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rev-body">
                <div className="followup-topbar">
                  <div>
                    <div className="section-lbl">{uiCopy.adaptiveQuestions}</div>
                    <div className="followup-topbar-copy">{uiCopy.adaptiveQuestionsCopy}</div>
                  </div>
                  <button className="btn-s" disabled={!canSubmit} onClick={() => submitReview().catch(() => undefined)} type="button">
                    {uiCopy.skip}
                  </button>
                </div>

                <div className="smart-q-section">
                  {loadingQuestions ? (
                    <div className="smart-q-card">
                      <div className="smart-q-dim">{uiCopy.findingBestFollowUp}</div>
                      <div className="smart-q-text">{uiCopy.followUpLoadingText}</div>
                    </div>
                  ) : null}

                  {!loadingQuestions && !followUpQuestions.length ? (
                    <div className="smart-q-card answered">
                      <div className="smart-q-dim">{uiCopy.noAdditionalQuestions}</div>
                      <div className="smart-q-text">{uiCopy.noAdditionalQuestionsBody}</div>
                      <div className="smart-q-helper">{uiCopy.noAdditionalQuestionsHelper}</div>
                    </div>
                  ) : null}

                  {!loadingQuestions
                    ? followUpQuestions.map((question, index) => {
                        const answer = questionAnswers[question.sessionId];
                        const combinedAnswer = composeAnswer(answer?.choice ?? "", answer?.details ?? "");
                        const questionChoices = buildQuestionChoices(question, uiCopy);
                        const questionTarget = questionVoiceTarget(question.sessionId);

                        return (
                          <div className="smart-q-card" key={question.sessionId}>
                            <div className="smart-q-dim">{formatUiCopy(uiCopy.questionOf, { current: index + 1, total: followUpQuestions.length, label: question.label })}</div>
                            <div className="smart-q-text">{question.prompt}</div>

                            {questionChoices.length ? (
                              <div className="choice-grid">
                                {questionChoices.map((choice) => (
                                  <button
                                    className={cx(
                                      "choice-btn",
                                      answer?.choice === choice && "sel",
                                      answer?.choice === choice && choiceVariant(choice, uiCopy) === "yes" && "sel-yes",
                                      answer?.choice === choice && choiceVariant(choice, uiCopy) === "no" && "sel-no"
                                    )}
                                    key={choice}
                                    onClick={() => setQuestionChoiceValue(question.sessionId, choice)}
                                    type="button"
                                  >
                                    {choice}
                                  </button>
                                ))}
                              </div>
                            ) : null}

                            {inputMode === "voice" ? (
                              <div className="voice-review-card">
                                <button
                                  className={cx("voice-review-btn", voiceActive && voiceTarget === questionTarget && "rec")}
                                  disabled={!voiceSupported}
                                  onClick={() => toggleVoiceCapture(questionTarget)}
                                  type="button"
                                >
                                  <span className="voice-review-btn-dot" aria-hidden="true" />
                                  <span>{voiceActive && voiceTarget === questionTarget ? uiCopy.stopRecording : uiCopy.recordAnswer}</span>
                                </button>
                                <div className="voice-review-helper">
                                  {voiceSupported
                                    ? voiceActive && voiceTarget === questionTarget
                                      ? uiCopy.answerListeningNow
                                      : uiCopy.answerIdle
                                    : uiCopy.voiceUnavailable}
                                </div>
                                <div className="voice-review-transcript-wrap">
                                  <div className="voice-review-transcript-lbl">{uiCopy.transcript}</div>
                                  <textarea
                                    className={cx("voice-review-transcript", !answer?.details && "empty")}
                                    onChange={(event) => setQuestionDetailsValue(question.sessionId, event.target.value)}
                                    placeholder={question.placeholder || uiCopy.answerTranscriptPlaceholder}
                                    value={answer?.details ?? ""}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className={cx("scale-expand", "open")}>
                                <label className="scale-expand-lbl">
                                  {question.placeholder || uiCopy.addDetailIfSpecific}
                                </label>
                                <textarea
                                  className="small-ta"
                                  onChange={(event) => setQuestionDetailsValue(question.sessionId, event.target.value)}
                                  placeholder={question.placeholder}
                                  value={answer?.details ?? ""}
                                />
                              </div>
                            )}

                            {combinedAnswer ? (
                              <div className="followup-status">{uiCopy.answerCaptured}</div>
                            ) : null}
                          </div>
                        );
                      })
                    : null}
                </div>

                {error ? <div className="error-msg">{error}</div> : null}

                <div className="btn-row">
                  <button className="btn-s" onClick={() => setStage("review")} type="button">
                    {uiCopy.back}
                  </button>
                  <button className="btn-p" disabled={!canSubmit} onClick={() => submitReview().catch(() => undefined)} type="button">
                    {magicFixLoading ? magicFixCopy.loading : submitting ? uiCopy.submitting : uiCopy.submitReview}
                  </button>
                </div>
              </div>
            </div>

            {renderPuzzlePanel()}
          </div>
            </div>

            <div className={cx("screen", stage === "done" && "on")} ref={doneScreenRef}>
          <StampediaJournal
            activeTripId={activeTripId}
            customerName={customer.firstName}
            languageCode={selectedLanguage.code}
            newStampStayId={newStampStayId}
            onTripRename={handleTripRename}
            onTripSelect={handleTripSelect}
            stampAnimationActive={stampAnimationActive}
            trips={stampediaTrips}
            turning={journalTurning}
          />

          <div className="taste-card">
            <div className="taste-eye">{uiCopy.travelerTasteProfile}</div>
            <div className="taste-lbl">
              {tasteProfile.label} {tasteProfile.archetype}
            </div>
            <div className="taste-sub">{uiCopy.tasteUpdated}</div>
            <div className="taste-row">
              <div className="taste-donut">
                <div className="taste-center">
                  <div className="taste-pname">{tasteProfile.label}</div>
                  <div className="taste-ptype">{tasteProfile.archetype}</div>
                </div>
              </div>
              <div className="taste-legend">
                {tasteProfile.segments.map((segment) => (
                  <div className="taste-leg-row" key={segment.label}>
                    <div className="taste-leg-dot" style={{ background: segment.color }} />
                    <span className="taste-leg-name">{segment.label}</span>
                    <div className="taste-leg-track">
                      <div className="taste-leg-fill" style={{ background: segment.color, width: `${segment.value}%` }} />
                    </div>
                    <span className="taste-leg-pct">{segment.value}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="taste-insight">{tasteProfile.insight}</div>
            <div className="taste-recs">
              <div className="taste-recs-lbl">{uiCopy.matchedProperties}</div>
              <div className="taste-chips">
                {tasteProfile.recommendations.map((recommendation) => (
                  <span className="taste-chip" key={recommendation}>
                    {recommendation}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="btn-row center">
            <button
              className="btn-p"
              onClick={() => {
                resetReviewState("confirm");
                setSelectedStayId(pendingStays[0]?.stayId ?? selectedStayId);
                setActiveTripId(stampediaTrips[0]?.id ?? activeTripId);
              }}
              type="button"
            >
              {uiCopy.reviewAnotherProperty}
            </button>
          </div>
            </div>
          </section>
        </main>

        <footer className="app-footer">
          <div className="app-footer-inner">
            <div className="app-footer-copy">
              <img alt="Atlas logo" className="atlas-signature atlas-signature-footer" src="/atlas_logo.png" />
              <p className="app-footer-subtitle">{uiCopy.footerSubtitle}</p>
            </div>
            <div className="app-footer-note">{uiCopy.footerNote}</div>
          </div>
        </footer>
      </div>

      {magicFixOpen ? (
        <div className="magicfix-overlay">
          <div className="magicfix-card">
            <h3 className="magicfix-title">{magicFixCopy.title}</h3>
            <p className="magicfix-body">
              {magicFixLoading
                ? `${magicFixCopy.loading} ${uiCopy.magicFixReady}`
                : magicFixAnimating
                  ? uiCopy.magicFixTyping
                  : magicFixCopy.body}
            </p>

            <div className="magicfix-grid">
              <div className="magicfix-panel">
                <div className="magicfix-panel-lbl">{uiCopy.magicFixYourVersion}</div>
                <div className="magicfix-panel-copy">{reviewText}</div>
              </div>
              <div className="magicfix-panel polished">
                <div className="magicfix-panel-lbl">{uiCopy.magicFixEnhancedVersion}</div>
                <div className="magicfix-title-wrap">
                  <div className="magicfix-title-lbl">{uiCopy.magicFixSuggestedTitle}</div>
                  <input
                    className="magicfix-title-input"
                    dir={selectedLanguage.dir}
                    disabled={magicFixLoading}
                    lang={selectedLanguage.locale}
                    onChange={(event) => setMagicFixTitle(event.target.value)}
                    placeholder={magicFixLoading ? uiCopy.magicFixGeneratingTitle : uiCopy.magicFixAddTitle}
                    value={magicFixTitle}
                  />
                </div>
                <div className="magicfix-status">
                  {magicFixLoading
                    ? uiCopy.magicFixStatusLoading
                    : magicFixAnimating
                      ? uiCopy.magicFixStatusApplying
                      : uiCopy.magicFixStatusEditable}
                </div>
                <textarea
                  className={cx("magicfix-edit", (magicFixLoading || magicFixAnimating) && "is-busy")}
                  dir={selectedLanguage.dir}
                  disabled={magicFixLoading || magicFixAnimating}
                  lang={selectedLanguage.locale}
                  onChange={(event) => setMagicFixSuggestion(event.target.value)}
                  placeholder={magicFixLoading ? uiCopy.magicFixTextareaPlaceholder : ""}
                  value={magicFixSuggestion}
                />
                {magicFixLoading || magicFixAnimating ? <div className="magicfix-cursor" aria-hidden="true" /> : null}
              </div>
            </div>

            <div className="btn-row">
              <button className="btn-s" onClick={keepOriginalReview} type="button">
                {magicFixCopy.keep}
              </button>
              <button className="btn-p" disabled={magicFixLoading || magicFixAnimating} onClick={acceptMagicFixes} type="button">
                {magicFixCopy.accept}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stage === "done" && doneModalOpen ? (
        <div className="done-modal-overlay">
          <div className="done-modal">
            <button
              aria-label={uiCopy.doneModalAria}
              className="done-modal-close"
              onClick={continueToStampedia}
              type="button"
            >
              &#10005;
            </button>
            <div className="done-tick">&#10003;</div>
            <h2 className="done-h">{uiCopy.reviewSubmitted}</h2>
            <p className="done-p">{uiCopy.reviewSubmittedBody}</p>
            <button className="btn-p done-modal-btn" onClick={continueToStampedia} type="button">
              {uiCopy.continueToAtlasCapsule}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
