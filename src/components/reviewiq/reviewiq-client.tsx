"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { StampediaJournal, type StampediaTrip } from "@/components/reviewiq/stampedia-journal";
import { getRemainingGaps } from "@/lib/reviewiq/gap-coverage";
import type { AnswerPreview, CandidateGap, DemoHydratedCustomer, DemoHydratedStay, PropertySummary, SessionQuestion } from "@/lib/reviewiq/types";

type ReviewIqClientProps = {
  customer: DemoHydratedCustomer;
  onBackToCustomers: () => void;
  onCustomerUpdate: (customer: DemoHydratedCustomer) => void;
};

type Stage = "confirm" | "mode" | "review" | "questions" | "done";
type InputMode = "type" | "voice";
type TravelParty = "solo" | "couple" | "family" | "friends" | "business";

type ReviewPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type PhotoInsight = {
  id: string;
  label: string;
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

type MagicFixCopy = {
  title: string;
  body: string;
  accept: string;
  keep: string;
  loading: string;
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
};

type PropertyVisual = {
  gradient: string;
  tile: string;
  hasPhoto: boolean;
  photoAlt: string | null;
};

const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", locale: "en-US", dir: "ltr" },
  { code: "es", label: "Espanol", locale: "es-ES", dir: "ltr" },
  { code: "fr", label: "Francais", locale: "fr-FR", dir: "ltr" },
  { code: "de", label: "Deutsch", locale: "de-DE", dir: "ltr" },
  { code: "it", label: "Italiano", locale: "it-IT", dir: "ltr" },
  { code: "pt", label: "Portugues", locale: "pt-BR", dir: "ltr" },
  { code: "ja", label: "Japanese", locale: "ja-JP", dir: "ltr" },
  { code: "zh", label: "Chinese", locale: "zh-CN", dir: "ltr" },
  { code: "ar", label: "Arabic", locale: "ar-SA", dir: "rtl" },
  { code: "hi", label: "Hindi", locale: "hi-IN", dir: "ltr" },
  { code: "nl", label: "Dutch", locale: "nl-NL", dir: "ltr" }
];

const PARTY_OPTIONS: Array<{ value: TravelParty; label: string }> = [
  { value: "solo", label: "Solo" },
  { value: "couple", label: "Couple" },
  { value: "family", label: "Family with kids" },
  { value: "friends", label: "Group of friends" },
  { value: "business", label: "Business trip" }
];

const STAR_LABELS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];
const INLINE_PROMPT_LIMIT = 2;

const PROPERTY_PHOTOS: Record<string, PropertyPhoto> = {
  fa014137b3ea9af6a90c0a86a1d099e46f7e56d6eb33db1ad1ec4bdac68c3caa: {
    url: "/reviewiq-hotels/monterey-california-inn.jpg",
    alt: "Waterfront inn exterior for Monterey California Inn"
  },
  "3216b1b7885bffdb336265a8de7322ba0cd477cfb3d4f99d19acf488f76a1941": {
    url: "/reviewiq-hotels/bell-gardens-california-motel.jpg",
    alt: "Roadside motel exterior for Bell Gardens California Motel"
  },
  db38b19b897dbece3e34919c662b3fd66d23b615395d11fb69264dd3a9b17723: {
    url: "/reviewiq-hotels/broomfield-colorado-resort.jpg",
    alt: "Resort exterior with mountain setting for Broomfield Colorado Resort"
  },
  "5f5a0cd8662f0ddf297f2d27358f680daab5d3ac22fd45a4e1c3c3ec2c101a12": {
    url: "/reviewiq-hotels/freudenstadt-baden-wurttemberg-hotel.jpg",
    alt: "Black Forest style hotel exterior for Freudenstadt Baden-Wurttemberg Hotel"
  },
  "9a0043fd4258a1286db1e253ca591662b3aac849da12d0d4f67e08b8f59be65f": {
    url: "/reviewiq-hotels/bochum-hotel-room.jpg",
    alt: "Hotel room interior for Bochum Hotel"
  },
  "3b984f3ba8df55b2609a1e33fd694cf8407842e1d833c9b4d993b07fc83a2820": {
    url: "/reviewiq-hotels/san-isidro-hotel-room.jpg",
    alt: "Hotel room interior for San Isidro de El General San Jose Hotel"
  },
  f2d8d9557208d58577e9df7ff34e42bf86fb5b10fdfae0c3040d14c374a2a2b9: {
    url: "/reviewiq-hotels/new-smyrna-beach-florida-inn.jpg",
    alt: "Beachside inn exterior for New Smyrna Beach Florida Inn"
  },
  "7d027ef72c02eaa17af3c993fd5dba50d17b41a6280389a46c13c7e2c32a5b06": {
    url: "/reviewiq-hotels/ocala-florida-inn.jpg",
    alt: "Florida roadside inn exterior for Ocala Florida Inn"
  },
  "110f01b8ae518a0ee41047bce5c22572988a435e10ead72dc1af793bba8ce0b0": {
    url: "/reviewiq-hotels/pompei-hotel.jpg",
    alt: "Pompeii area hotel exterior for Pompei Hotel Hotel"
  },
  "823fb2499b4e37d99acb65e7198e75965d6496fd1c579f976205c0e6179206df": {
    url: "/reviewiq-hotels/rome-rm-hotel.jpg",
    alt: "Rome boutique hotel exterior for Rome RM Hotel"
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

const MAGIC_FIX_COPY_BY_LANGUAGE: Record<string, MagicFixCopy> = {
  en: {
    title: "Magic fixes are ready",
    body: "We cleaned up grammar and punctuation without changing what you meant. Want to submit the polished version?",
    accept: "Accept magic fixes",
    keep: "Keep my version",
    loading: "Polishing your review..."
  },
  es: {
    title: "Tus arreglos magicos ya estan listos",
    body: "Arreglamos la gramatica y la puntuacion sin cambiar lo que quisiste decir. Quieres enviar la version pulida?",
    accept: "Aceptar arreglos magicos",
    keep: "Mantener mi version",
    loading: "Puliendo tu resena..."
  },
  fr: {
    title: "Les corrections magiques sont pretes",
    body: "Nous avons corrige la grammaire et la ponctuation sans changer ton sens. Veux-tu envoyer la version corrigee ?",
    accept: "Accepter les corrections magiques",
    keep: "Garder ma version",
    loading: "Polissage de votre avis..."
  },
  de: {
    title: "Deine magischen Korrekturen sind fertig",
    body: "Wir haben Grammatik und Zeichensetzung verbessert, ohne deine Bedeutung zu andern. Mochtest du die uberarbeitete Version senden?",
    accept: "Magische Korrekturen akzeptieren",
    keep: "Meine Version behalten",
    loading: "Deine Bewertung wird uberarbeitet..."
  },
  it: {
    title: "Le correzioni magiche sono pronte",
    body: "Abbiamo sistemato grammatica e punteggiatura senza cambiare il tuo significato. Vuoi inviare la versione ripulita?",
    accept: "Accetta correzioni magiche",
    keep: "Tieni la mia versione",
    loading: "Sto migliorando la tua recensione..."
  },
  pt: {
    title: "Seus ajustes magicos estao prontos",
    body: "Corrigimos gramatica e pontuacao sem mudar o que voce quis dizer. Quer enviar a versao revisada?",
    accept: "Aceitar ajustes magicos",
    keep: "Manter minha versao",
    loading: "Aprimorando sua avaliacao..."
  },
  ja: {
    title: "Magic fixes ga dekimashita",
    body: "Imi wa sono mama de bunpo to kutoten dake o totonoemashita. Migaki naoshita ban de teishutsu shimasu ka?",
    accept: "Magic fixes o tsukau",
    keep: "Genbun no mama",
    loading: "Review o migaki naoshiteimasu..."
  },
  zh: {
    title: "Mo fa xiu zheng yi zhun bei hao",
    body: "Wo men zai bu gai bian yuan yi de qing kuang xia xiu zheng le yu fa he biao dian. Yao ti jiao run se hou de ban ben ma?",
    accept: "Jie shou mo fa xiu zheng",
    keep: "Bao liu wo de ban ben",
    loading: "Zheng zai run se ni de ping lun..."
  },
  ar: {
    title: "al islahat al sihriya جاهزة",
    body: "قمنا بتحسين القواعد وعلامات الترقيم من دون تغيير المعنى. هل تريد ارسال النسخة المنقحة؟",
    accept: "اقبل الاصلاحات السحرية",
    keep: "احتفظ بنسختي",
    loading: "نجري تنقيحا لمراجعتك..."
  },
  hi: {
    title: "Magic fixes taiyar hain",
    body: "Humne meaning badle bina grammar aur punctuation saaf ki hai. Kya aap polished version submit karna chahenge?",
    accept: "Magic fixes svikar karein",
    keep: "Meri version rakhen",
    loading: "Aapki review ko polish kiya ja raha hai..."
  },
  nl: {
    title: "Je magic fixes staan klaar",
    body: "We hebben grammatica en leestekens verbeterd zonder je betekenis te veranderen. Wil je de opgeschoonde versie versturen?",
    accept: "Magic fixes accepteren",
    keep: "Mijn versie behouden",
    loading: "Je review wordt opgeschoond..."
  }
};

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function hashString(input: string) {
  return Array.from(input).reduce((sum, character) => sum + character.charCodeAt(0), 0);
}

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
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
      hasPhoto: false,
      photoAlt: null
    };
  }

  return {
    gradient: `url("${photo.url}") center/cover no-repeat, ${theme.gradient}`,
    tile: `linear-gradient(180deg, rgba(16, 24, 63, 0.16), rgba(16, 24, 63, 0.04)), url("${photo.url}") center/cover no-repeat, ${theme.tile}`,
    hasPhoto: true,
    photoAlt: photo.alt
  };
}

function buildPropertyFacts(property: PropertySummary) {
  const facts = [
    property.tagline,
    property.areaDescription,
    property.popularAmenities.length
      ? `Travelers most often mention ${property.popularAmenities.slice(0, 3).join(", ")} here.`
      : "",
    property.policies.checkInWindow ? `Current listing says check-in runs ${property.policies.checkInWindow}.` : "",
    property.policies.checkOutTime ? `Check-out is listed as ${property.policies.checkOutTime}.` : "",
    property.reviewStats.lastReviewAt
      ? `The latest review in the dataset was captured on ${new Date(property.reviewStats.lastReviewAt).toLocaleDateString("en-US")}.`
      : "",
    property.reviewHighlights[0]?.summary
      ? `A recent guest said: ${property.reviewHighlights[0].summary}`
      : "",
    property.reviewStats.recentReviewCount
      ? `${property.reviewStats.recentReviewCount} reviews in the recent slice help ground the follow-up question.`
      : "",
    property.candidateGaps[0]?.label
      ? `One of the highest-value info gaps is ${property.candidateGaps[0].label.toLowerCase()}.`
      : "",
    property.candidateGaps[1]?.label
      ? `Another likely stale topic is ${property.candidateGaps[1].label.toLowerCase()}.`
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

function buildTasteProfile(reviewText: string, previews: AnswerPreview[], property: PropertySummary): TasteProfile {
  const lower = reviewText.toLowerCase();
  const previewKeys = new Set(previews.map((preview) => preview.attributeKey));
  const seeds = [
    {
      label: "Value",
      archetype: "Optimizer",
      color: "#7B9FD4",
      keywords: ["value", "price", "worth", "deal", "cost", previewKeys.has("value_formoney") ? "value" : ""]
    },
    {
      label: "Location",
      archetype: "Seeker",
      color: "#5BC4A8",
      keywords: ["location", "walk", "transit", "neighborhood", "close"]
    },
    {
      label: "Comfort",
      archetype: "Nester",
      color: "#C8B87A",
      keywords: ["bed", "sleep", "quiet", "noise", "comfort", "room"]
    },
    {
      label: "Service",
      archetype: "Loyalist",
      color: "#D47B8A",
      keywords: ["staff", "service", "friendly", "helpful", "desk"]
    },
    {
      label: "Amenities",
      archetype: "Indulger",
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
    insight: `Your answers leaned hardest toward ${leader.label.toLowerCase()}, with ${runnerUp.label.toLowerCase()} close behind. That profile is exactly the kind of signal Expedia can use to personalize future ranking and highlight the facts you care about most.`,
    recommendations: [
      `${leader.label}-forward stays`,
      `Top-rated ${runnerUp.label.toLowerCase()} picks`,
      "Freshly updated listings"
    ],
    segments: normalized
  };
}

function describeNudge(reviewText: string, coverageScore: number, nextGap: CandidateGap | null, promptCount: number, remainingGapCount: number) {
  const words = countWords(reviewText);
  if (words < 8) {
    return {
      tone: "probe",
      text: "Start with what stood out most: the room, the staff, the location, or the overall feel."
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
      text: "Thank you for your valuable input!"
    };
  }

  return {
    tone: "great",
    text: "Thank you for your valuable input!"
  };
}

function composeAnswer(choice: string, details: string) {
  if (choice && details.trim()) {
    return `${choice}. ${details.trim()}`;
  }

  return normalizeText(choice || details);
}

function choiceVariant(label: string) {
  const lower = label.toLowerCase();
  if (lower === "yes") {
    return "yes";
  }

  if (lower === "no") {
    return "no";
  }

  return "default";
}

function buildQuestionChoices(question: SessionQuestion) {
  if (question.answerType === "short_text") {
    return [];
  }

  return question.choices.length ? question.choices : ["Yes", "No", "Not sure"];
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function travelHelpedCount(answerPreviewCount: number, photos: ReviewPhoto[]) {
  return 27 + answerPreviewCount * 12 + photos.length * 4;
}

function parseIsoDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`);
}

function formatStayDate(isoDate: string) {
  return parseIsoDate(isoDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getFirstPendingStayId(customer: DemoHydratedCustomer) {
  const reviewedStayIds = new Set(customer.journal.reviewedStayIds);
  return customer.stays.find((stay) => !reviewedStayIds.has(stay.stayId))?.stayId ?? customer.stays[0]?.stayId ?? "";
}

function formatTripDateRange(start: Date, end: Date) {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" })
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return `${startLabel} - ${endLabel}`;
}

function formatTripDuration(start: Date, end: Date) {
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  return `${days} day${days === 1 ? "" : "s"}`;
}

function buildStampediaTrips(
  customer: DemoHydratedCustomer,
  selectedStayId: string
): StampediaTrip[] {
  const reviewedStayIds = new Set(customer.journal.reviewedStayIds);
  const reviewedStays = customer.stays.filter((stay) => reviewedStayIds.has(stay.stayId));

  if (!reviewedStays.length) {
    const trip = customer.trips[0];
    const tripStays = customer.stays.filter((stay) => stay.tripId === trip?.tripId);
    const start = tripStays[0] ? parseIsoDate(tripStays[0].checkIn) : new Date();
    const end = tripStays[tripStays.length - 1] ? parseIsoDate(tripStays[tripStays.length - 1].checkOut) : start;

    return [
      {
        id: `${trip?.tripId ?? "journal"}:blank`,
        tripId: trip?.tripId ?? "journal",
        title: trip?.title ?? "Stampedia Journal",
        country: trip?.coverCountry ?? "No stamps yet",
        subtitle: trip?.subtitle ?? "Submit your first review to start collecting stamps.",
        dateRange: formatTripDateRange(start, end),
        durationLabel: formatTripDuration(start, end),
        collectedCount: 0,
        stampCount: 0,
        stamps: []
      }
    ];
  }

  const grouped = new Map<
    string,
    {
      title: string;
      country: string;
      subtitle?: string;
      stays: DemoHydratedStay[];
    }
  >();

  for (const stay of reviewedStays) {
    const trip = customer.trips.find((item) => item.tripId === stay.tripId);
    const key = `${stay.tripId}:${stay.property.country}`;
    const group = grouped.get(key) ?? {
      title: trip?.title ?? `${stay.property.country} Journal`,
      country: stay.property.country,
      subtitle: trip?.subtitle,
      stays: []
    };
    group.stays.push(stay);
    grouped.set(key, group);
  }

  return Array.from(grouped.entries())
    .map(([id, group]) => {
      const sortedStays = group.stays.sort((left, right) => parseIsoDate(left.checkIn).getTime() - parseIsoDate(right.checkIn).getTime());
      const start = parseIsoDate(sortedStays[0].checkIn);
      const end = parseIsoDate(sortedStays[sortedStays.length - 1].checkOut);

      return {
        id,
        tripId: sortedStays[0].tripId,
        title: group.title,
        country: group.country,
        subtitle: group.subtitle,
        dateRange: formatTripDateRange(start, end),
        durationLabel: formatTripDuration(start, end),
        collectedCount: sortedStays.length,
        stampCount: sortedStays.length,
        stamps: sortedStays.map((stay) => ({
          stayId: stay.stayId,
          propertyId: stay.propertyId,
          tripId: stay.tripId,
          displayName: stay.property.displayName,
          city: stay.property.city,
          country: stay.property.country,
          checkIn: formatStayDate(stay.checkIn),
          checkOut: formatStayDate(stay.checkOut),
          room: stay.roomType,
          confirmation: stay.confirmation,
          dateLabel: formatStayDate(stay.checkIn),
          durationLabel: formatTripDuration(parseIsoDate(stay.checkIn), parseIsoDate(stay.checkOut)),
          visual: getPropertyVisual(stay.property),
          collected: true,
          selected: stay.stayId === selectedStayId
        }))
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
  const [travelParty, setTravelParty] = useState<TravelParty | null>(null);
  const [stars, setStars] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [activeInlinePromptKey, setActiveInlinePromptKey] = useState<string | null>(null);
  const [inlinePromptKeys, setInlinePromptKeys] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<SessionQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, QuestionInputState>>({});
  const [answerPreviews, setAnswerPreviews] = useState<AnswerPreview[]>([]);
  const [photoInsights, setPhotoInsights] = useState<PhotoInsight[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
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
  const [magicFixSuggestion, setMagicFixSuggestion] = useState("");
  const [selectingStayId, setSelectingStayId] = useState<string | null>(null);
  const [selectingMode, setSelectingMode] = useState<InputMode | null>(null);
  const [doneModalOpen, setDoneModalOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceBaseRef = useRef("");
  const spokenIntroRef = useRef(false);
  const spokenQuestionRef = useRef("");
  const tripTurnTimerRef = useRef<number | null>(null);
  const staySelectTimerRef = useRef<number | null>(null);
  const modeSelectTimerRef = useRef<number | null>(null);
  const doneScreenRef = useRef<HTMLDivElement | null>(null);
  const selectedLanguage = LANGUAGES.find((language) => language.code === languageCode) ?? LANGUAGES[0];
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
  const visibleInlinePrompt =
    activeInlinePrompt ??
    (reviewWordCount >= 8 && inlinePromptKeys.length < INLINE_PROMPT_LIMIT
      ? completedGapEntries.find(({ gap }) => !inlinePromptKeys.includes(gap.attributeKey))?.gap ?? null
      : null);
  const nudge = describeNudge(
    reviewText,
    coverageScore,
    visibleInlinePrompt,
    inlinePromptKeys.length,
    completedGapEntries.length
  );
  const puzzleFacts = selectedProperty ? buildPropertyFacts(selectedProperty) : [];
  const answeredFollowUpCount = followUpQuestions.filter((question) => {
    const answer = questionAnswers[question.sessionId];
    return Boolean(normalizeText(composeAnswer(answer?.choice ?? "", answer?.details ?? "")));
  }).length;
  const tasteProfile = selectedProperty ? buildTasteProfile(reviewText, answerPreviews, selectedProperty) : null;
  const puzzlePieces = [
    Boolean(travelParty),
    stars > 0,
    reviewWordCount >= 8,
    reviewWordCount >= 20,
    reviewWordCount >= 40,
    photos.length > 0,
    stage === "questions" || remainingGapEntries.length === 0,
    answeredFollowUpCount > 0 || answerPreviews.length > 0
  ].filter(Boolean).length;
  const helpedCount = travelHelpedCount(answerPreviews.length, photos);
  const stampediaTrips = buildStampediaTrips(customer, selectedStayId);
  const magicFixCopy = MAGIC_FIX_COPY_BY_LANGUAGE[selectedLanguage.code] ?? MAGIC_FIX_COPY_BY_LANGUAGE.en;
  const canContinueToQuestions = normalizeText(reviewText).length > 0 && stars > 0 && !submitting && !magicFixLoading;
  const canSubmit = canContinueToQuestions && !loadingQuestions && !savingAnswers;

  function resetInlinePromptState() {
    setActiveInlinePromptKey((current) => (current === null ? current : null));
    setInlinePromptKeys((current) => (current.length ? [] : current));
  }

  function resetReviewState(nextStage: Stage = "confirm") {
    setStage(nextStage);
    setInputMode(null);
    setTravelParty(null);
    setStars(0);
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
    setPhotoInsights([]);
    setError("");
    setQuestionRequestedKey("");
    setStampAnimationActive(false);
    setNewStampStayId(null);
    setMagicFixOpen(false);
    setMagicFixLoading(false);
    setMagicFixSuggestion("");
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

  function stopVoiceCapture() {
    if (recognitionRef.current && voiceActive) {
      recognitionRef.current.stop();
    }

    setVoiceActive(false);
    setVoiceTarget(null);
  }

  function speakText(text: string, afterSpeak?: () => void) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      afterSpeak?.();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage.locale;
    utterance.rate = 1;
    utterance.onend = () => afterSpeak?.();
    window.speechSynthesis.speak(utterance);
  }

  function startVoiceCapture(target: string) {
    if (!recognitionRef.current) {
      return;
    }

    stopVoiceCapture();
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
      stopVoiceCapture();
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

  async function requestMagicFixes() {
    const trimmed = normalizeText(reviewText);
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
    };

    if (!payload.polishedText) {
      return null;
    }

    return {
      polishedText: payload.polishedText,
      changed: Boolean(payload.changed)
    };
  }

  async function finalizeSubmission(
    finalReviewText: string,
    polishedReviewText: string | null,
    nextAnswerPreviews: AnswerPreview[] = answerPreviews
  ) {
    setReviewText(finalReviewText);

    const response = await fetch("/api/demo/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        customerId: customer.id,
        stayId: selectedStay.stayId,
        reviewText: finalReviewText,
        polishedText: polishedReviewText,
        answerPreviews: nextAnswerPreviews
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
    setMagicFixOpen(false);
    setMagicFixSuggestion("");
    setDoneModalOpen(true);
    setStage("done");
    stopVoiceCapture();
  }

  async function submitReview() {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setMagicFixLoading(true);
    setError("");

    try {
      const nextAnswerPreviews = await captureAnswerPreviews();

      const polished = await requestMagicFixes().catch(() => null);
      const cleaned = normalizeText(polished?.polishedText ?? "");
      const original = normalizeText(reviewText);

      if (polished?.changed && cleaned && cleaned !== original) {
        setMagicFixSuggestion(polished.polishedText);
        setMagicFixOpen(true);
        stopVoiceCapture();
        return;
      }

      await finalizeSubmission(reviewText, null, nextAnswerPreviews);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Could not submit this review.";
      setError(message);
    } finally {
      setSubmitting(false);
      setMagicFixLoading(false);
    }
  }

  function acceptMagicFixes() {
    finalizeSubmission(magicFixSuggestion || reviewText, magicFixSuggestion || reviewText).catch((submitError) => {
      const message = submitError instanceof Error ? submitError.message : "Could not save the polished review.";
      setError(message);
    });
  }

  function keepOriginalReview() {
    finalizeSubmission(reviewText, null).catch((submitError) => {
      const message = submitError instanceof Error ? submitError.message : "Could not save the original review.";
      setError(message);
    });
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
      let interim = "";
      let finalized = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalized += transcript;
        } else {
          interim += transcript;
        }
      }

      const next = normalizeText(`${voiceBaseRef.current} ${finalized} ${interim}`);
      if (voiceTarget === "review") {
        setReviewText(next);
      }

      const voiceQuestionId = getVoiceQuestionId(voiceTarget);
      if (voiceQuestionId) {
        setQuestionDetailsValue(voiceQuestionId, next);
      }

      if (finalized) {
        voiceBaseRef.current = normalizeText(`${voiceBaseRef.current} ${finalized}`);
      }
    };
    recognition.onend = () => {
      setVoiceActive(false);
      setVoiceTarget(null);
    };
    recognition.onerror = () => {
      setVoiceActive(false);
      setVoiceTarget(null);
    };
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [selectedLanguage, voiceTarget]);

  useEffect(() => {
    if (!selectedProperty) {
      resetInlinePromptState();
      return;
    }

    if (!reviewWordCount) {
      resetInlinePromptState();
      return;
    }

    if (reviewWordCount < 8) {
      if (activeInlinePromptKey) {
        setActiveInlinePromptKey(null);
      }
      return;
    }

    const activePromptStillNeedsCoverage = activeInlinePromptKey
      ? completedGapEntries.some(({ gap }) => gap.attributeKey === activeInlinePromptKey)
      : false;

    if (activePromptStillNeedsCoverage) {
      return;
    }

    if (inlinePromptKeys.length >= INLINE_PROMPT_LIMIT || !completedGapEntries.length) {
      if (activeInlinePromptKey) {
        setActiveInlinePromptKey(null);
      }
      return;
    }

    const nextGap = completedGapEntries.find(({ gap }) => !inlinePromptKeys.includes(gap.attributeKey))?.gap ?? null;
    if (!nextGap) {
      if (activeInlinePromptKey) {
        setActiveInlinePromptKey(null);
      }
      return;
    }

    if (activeInlinePromptKey === nextGap.attributeKey) {
      return;
    }

    setActiveInlinePromptKey(nextGap.attributeKey);
    setInlinePromptKeys((current) => (current.includes(nextGap.attributeKey) ? current : [...current, nextGap.attributeKey]));
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
    if (stage !== "review" || inputMode !== "voice" || !voiceSupported || spokenIntroRef.current || !selectedProperty) {
      return;
    }

    spokenIntroRef.current = true;
    speakText(`Tell me about your stay at ${selectedProperty.displayName}. I will listen after this prompt.`, () =>
      startVoiceCapture("review")
    );
  }, [stage, inputMode, voiceSupported, selectedProperty]);

  useEffect(() => {
    if (stage !== "questions" || !followUpQuestions.length || inputMode !== "voice" || !voiceSupported) {
      return;
    }

    const firstQuestion = followUpQuestions[0];
    const signature = followUpQuestions.map((question) => question.sessionId).join(":");
    if (spokenQuestionRef.current === signature) {
      return;
    }

    spokenQuestionRef.current = signature;
    speakText(`Smart follow up. ${firstQuestion.prompt}`, () => startVoiceCapture(questionVoiceTarget(firstQuestion.sessionId)));
  }, [followUpQuestions, inputMode, questionVoiceTarget, stage, voiceSupported]);

  useEffect(() => {
    if (stage !== "done" || !photos.length || photoInsights.length || loadingPhotos) {
      return;
    }

    let cancelled = false;

    async function classifyPhotos() {
      setLoadingPhotos(true);

      try {
        const images = await Promise.all(
          photos.slice(0, 3).map(async (photo) => ({
            id: photo.id,
            dataUrl: await fileToDataUrl(photo.file)
          }))
        );

        const response = await fetch("/api/photos/classify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ images })
        });

        const payload = (await response.json()) as {
          labels?: Array<{ id: string; label: string }>;
        };

        if (!cancelled && payload.labels?.length) {
          setPhotoInsights(payload.labels);
        }
      } catch {
        if (!cancelled) {
          setPhotoInsights(
            photos.slice(0, 3).map((photo, index) => ({
              id: photo.id,
              label: index === 0 ? "Guest room" : index === 1 ? "Property amenity" : "On-site detail"
            }))
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPhotos(false);
        }
      }
    }

    classifyPhotos().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [stage, photos, photoInsights.length, loadingPhotos]);

  if (!selectedStay || !selectedProperty || !propertyVisual || !tasteProfile) {
    return null;
  }

  return (
    <>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="app-brand">
              <a className="brand-logo" href="#">
                <span className="brand-mark">↗</span>
                <span className="brand-word">Expedia</span>
              </a>
              <div className="app-brand-copy">
                <span className="app-badge">ReviewIQ</span>
                <span className="app-subtitle">{customer.name}&apos;s adaptive hotel review capture</span>
              </div>
            </div>

            <div className="app-meta">
              <button className="app-link" onClick={onBackToCustomers} type="button">
                Switch customer
              </button>
              <div className="ok-pill" title="Travelers helped">
                <div className="ok-pip" />
                <span className="ok-lbl">Helped</span>
                <span className="ok-val">{helpedCount}</span>
              </div>

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
            {stage !== "done" ? (
              <div className="intro-panel">
                <p className="pg-eye">Review Invitation</p>
                <h1 className="pg-h1">{customer.firstName}, share your thoughts here</h1>
                <p className="pg-sub">
                  Tell us about a recent stay. ReviewIQ will suggest stale or missing topics while you write, then use
                  a short next page for up to two follow-ups only if anything important still needs fresh confirmation.
                </p>
              </div>
            ) : null}

            <div className="stepbar">
              <div className="steps">
                <div className={cx("stp", stage === "confirm" && "cur", stage !== "confirm" && "done")}>
                  <div className="stp-n">1</div>
                  <span className="stp-l">Choose Stay</span>
                </div>
                <div className="stp-sep" />
                <div className={cx("stp", stage === "mode" && "cur", (stage === "review" || stage === "questions" || stage === "done") && "done")}>
                  <div className="stp-n">2</div>
                  <span className="stp-l">Input Style</span>
                </div>
                <div className="stp-sep" />
                <div className={cx("stp", stage === "review" && "cur", (stage === "questions" || stage === "done") && "done")}>
                  <div className="stp-n">3</div>
                  <span className="stp-l">Review</span>
                </div>
                <div className="stp-sep" />
                <div className={cx("stp", stage === "questions" && "cur", stage === "done" && "done")}>
                  <div className="stp-n">4</div>
                  <span className="stp-l">Follow-up</span>
                </div>
                <div className="stp-sep" />
                <div className={cx("stp", stage === "done" && "cur")}>
                  <div className="stp-n">5</div>
                  <span className="stp-l">Profile</span>
                </div>
              </div>
            </div>

            <div className={cx("screen", stage === "confirm" && "on")}>
          <p className="pg-eye">Step 1 of 5</p>
          <h1 className="pg-h1">Hi, {customer.firstName}! Choose one of your recent stays to review.</h1>
          <p className="pg-sub">
            Pick the stay you want to review first. Every completed review unlocks a new stamp in {customer.firstName}
            &apos;s Stampedia journal.
          </p>

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
                  >
                    {!visual.hasPhoto ? initials(property.displayName) : null}
                  </div>
                  <div className="prop-body">
                    <div className="prop-city stay-card-city">
                      {[property.city, property.province].filter(Boolean).join(", ")}
                    </div>
                    <div className="prop-name stay-card-name">{property.displayName}</div>
                    <div className="stay-mini-grid">
                      <div className="stay-mini-cell">
                        <div className="stay-cell-lbl">Check-in</div>
                        <div className="stay-mini-val">{formatStayDate(stay.checkIn)}</div>
                      </div>
                      <div className="stay-mini-cell">
                        <div className="stay-cell-lbl">Check-out</div>
                        <div className="stay-mini-val">{formatStayDate(stay.checkOut)}</div>
                      </div>
                      <div className="stay-mini-cell">
                        <div className="stay-cell-lbl">Room type</div>
                        <div className="stay-mini-val">{stay.roomType}</div>
                      </div>
                      <div className="stay-mini-cell">
                        <div className="stay-cell-lbl">Confirmation</div>
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
                <div className="card-ico">S</div>
                <div className="card-title">All stays reviewed</div>
              </div>
              <p className="pg-sub" style={{ margin: 0 }}>
                {customer.firstName}&apos;s review queue is empty. The rest of the journey now lives in Stampedia.
              </p>
              <div className="btn-row" style={{ marginTop: 18 }}>
                <button className="btn-p" onClick={() => setStage("done")} type="button">
                  Go to Stampedia
                </button>
              </div>
            </div>
          ) : null}

          <div className="btn-row">
            <button className="btn-s" onClick={onBackToCustomers} type="button">
              Back to customers
            </button>
          </div>
            </div>

            <div className={cx("screen", stage === "mode" && "on")}>
          <p className="pg-eye">Step 2 of 5</p>
          <h1 className="pg-h1">How would you like to share?</h1>

          <div className="mode-grid">
            <button
              className={cx("mode-card", selectingMode === "type" && "sel", selectingMode && selectingMode !== "type" && "disabled")}
              disabled={Boolean(selectingMode)}
              onClick={() => {
                setSelectingMode("type");
                if (typeof window === "undefined") {
                  setInputMode("type");
                  setError("");
                  setStage("review");
                  return;
                }

                if (modeSelectTimerRef.current) {
                  window.clearTimeout(modeSelectTimerRef.current);
                }

                modeSelectTimerRef.current = window.setTimeout(() => {
                  setInputMode("type");
                  setError("");
                  setStage("review");
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
              <div className="mode-title">Write your review</div>
            </button>

            <button
              className={cx("mode-card", selectingMode === "voice" && "sel", selectingMode && selectingMode !== "voice" && "disabled")}
              disabled={Boolean(selectingMode)}
              onClick={() => {
                setSelectingMode("voice");
                if (typeof window === "undefined") {
                  setInputMode("voice");
                  setError("");
                  setStage("review");
                  return;
                }

                if (modeSelectTimerRef.current) {
                  window.clearTimeout(modeSelectTimerRef.current);
                }

                modeSelectTimerRef.current = window.setTimeout(() => {
                  setInputMode("voice");
                  setError("");
                  setStage("review");
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
              <div className="mode-title">Speak your review</div>
            </button>
          </div>

          <div className="btn-row">
            <button className="btn-s" onClick={() => setStage("confirm")} type="button">
              Back
            </button>
          </div>
            </div>

            <div className={cx("screen", stage === "review" && "on")}>
          <div className="rev-layout">
            <div className="rev-main">
              <div className="rev-hero" style={{ background: propertyVisual.gradient }}>
                <div className="rev-grad" />
                <div className="rev-info">
                  <div className="rev-av">{initials(selectedProperty.displayName)}</div>
                  <div>
                    <div className="rev-name">{selectedProperty.displayName}</div>
                    <div className="rev-loc">
                      {[selectedProperty.city, selectedProperty.province, selectedProperty.country].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rev-body">
                <div className="card">
                  <div className="card-hd">
                    <div className="card-ico">T</div>
                    <div className="card-title">Who did you travel with?</div>
                  </div>
                  <div className="chips">
                    {PARTY_OPTIONS.map((option) => (
                      <button
                        className={cx("chip", travelParty === option.value && "on")}
                        key={option.value}
                        onClick={() => setTravelParty(option.value)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-hd">
                    <div className="card-ico">S</div>
                    <div className="card-title">Overall impression</div>
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
                  <div className="star-label">{STAR_LABELS[stars]}</div>
                </div>

                <div className="review-section">
                  <div className="section-lbl">Your review</div>
                  <p className="review-intro">
                    {inputMode === "voice"
                      ? "Voice mode is active. Dictate your review here, then continue to the next page for any follow-up questions."
                      : "Write freely. ReviewIQ reads along and suggests stale or missing details to cover before the adaptive follow-up page."}
                  </p>
                  <div className="ta-wrap">
                    <textarea
                      className="main-ta"
                      onChange={(event) => {
                        setReviewText(event.target.value);
                        invalidateFollowUps();
                      }}
                      placeholder="What stood out most about your stay? Start anywhere."
                      value={reviewText}
                    />
                    <div className="ta-bar">
                      <button
                        className={cx("voice-btn", voiceActive && voiceTarget === "review" && "rec")}
                        onClick={() => toggleVoiceCapture("review")}
                        type="button"
                      >
                        {voiceActive && voiceTarget === "review" ? "Stop recording" : "Voice input"}
                      </button>
                      <div className="ta-right">
                        <div className="sat-wrap">
                          <div className="sat-track">
                            <div className="sat-fill" style={{ width: `${coverageScore}%` }} />
                          </div>
                          <div className="sat-lbl">
                            {coverageScore >= 82
                              ? "Excellent detail"
                              : coverageScore >= 55
                                ? "Getting there"
                                : coverageScore >= 25
                                  ? "Keep going"
                                  : "Keep writing"}
                          </div>
                        </div>
                        <span className={cx("wc", reviewWordCount >= 30 && "ok")}>
                          {reviewWordCount} {reviewWordCount === 1 ? "word" : "words"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={cx("nudge", "show", nudge.tone)}>
                    <div className="n-pip">{nudge.tone === "great" ? "OK" : "AI"}</div>
                    <div className="n-body">
                      <div className="n-tag">ReviewIQ</div>
                      <div className="n-txt">{nudge.text}</div>
                    </div>
                  </div>
                </div>

                <div className="photo-upload-wrap">
                  <div className="section-lbl">Add photos (optional)</div>
                  <label
                    className="photo-drop"
                    onDragOver={(event: DragEvent<HTMLLabelElement>) => event.preventDefault()}
                    onDrop={(event: DragEvent<HTMLLabelElement>) => {
                      event.preventDefault();
                      handlePhotoSelection(event.dataTransfer.files).catch(() => undefined);
                    }}
                  >
                    <div className="photo-drop-txt">Drag photos here or click to upload</div>
                    <div className="photo-drop-sub">
                      JPG, PNG or HEIC. Uploaded photos can be classified server-side on the impact screen.
                    </div>
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
                          <img alt="Uploaded property evidence" src={photo.previewUrl} />
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
                    Back
                  </button>
                  <button
                    className="btn-p"
                    disabled={!canContinueToQuestions}
                    onClick={() => {
                      if (!remainingGapEntries.length) {
                        submitReview().catch(() => undefined);
                        return;
                      }

                      setStage("questions");
                    }}
                    type="button"
                  >
                    {magicFixLoading
                      ? magicFixCopy.loading
                      : submitting
                        ? "Submitting..."
                        : remainingGapEntries.length
                          ? "Next page"
                          : "Submit review"}
                  </button>
                </div>
              </div>
            </div>

            <div className="puzzle-panel">
              <div className="puzzle-header">
                <span className="puzzle-title">Reveal the property</span>
                <span className="puzzle-prog">{puzzlePieces} / 8</span>
              </div>
              <div className="puzzle-grid">
                {Array.from({ length: 8 }, (_, index) => (
                  <div
                    className={cx("pp", index < puzzlePieces ? "revealed" : "unrevealed")}
                    key={index}
                    style={{ background: propertyVisual.tile }}
                  >
                    {index >= puzzlePieces ? (
                      <div className="pp-lock">
                        <div className="pp-num">{index + 1}</div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="puzzle-fact">
                <strong>Did you know?</strong> {puzzleFacts[Math.max(0, Math.min(puzzlePieces - 1, puzzleFacts.length - 1))] || "Answer questions to reveal pieces and unlock property facts."}
              </div>
            </div>
          </div>
            </div>

            <div className={cx("screen", stage === "questions" && "on")}>
          <div className="rev-layout">
            <div className="rev-main">
              <div className="rev-hero" style={{ background: propertyVisual.gradient }}>
                <div className="rev-grad" />
                <div className="rev-info">
                  <div className="rev-av">{initials(selectedProperty.displayName)}</div>
                  <div>
                    <div className="rev-name">{selectedProperty.displayName}</div>
                    <div className="rev-loc">
                      {[selectedProperty.city, selectedProperty.province, selectedProperty.country].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rev-body">
                <div className="followup-topbar">
                  <div>
                    <div className="section-lbl">Adaptive questions</div>
                    <div className="followup-topbar-copy">Answer the last 1-2 gaps, or skip if you don&apos;t want to add more.</div>
                  </div>
                  <button className="btn-s" disabled={!canSubmit} onClick={() => submitReview().catch(() => undefined)} type="button">
                    Skip
                  </button>
                </div>

                <div className="card">
                  <div className="card-hd">
                    <div className="card-ico">R</div>
                    <div className="card-title">Your review draft</div>
                  </div>
                  <div className="followup-review-preview">{reviewText}</div>
                </div>

                <div className="smart-q-section">
                  <div className="smart-q-header">
                    <span className="smart-q-pill">Adaptive follow-up</span>
                    <span className="smart-q-subtitle">
                      {loadingQuestions
                        ? "Choosing the last 1-2 confirmations to ask"
                        : followUpQuestions.length
                          ? "Only asking about details the draft still leaves stale or missing"
                          : "No extra questions needed before submission."}
                    </span>
                  </div>

                  {loadingQuestions ? (
                    <div className="smart-q-card">
                      <div className="smart-q-dim">Finding the best follow-up</div>
                      <div className="smart-q-text">
                        Looking at missing, stale, and conflicting property details to decide what still matters most.
                      </div>
                    </div>
                  ) : null}

                  {!loadingQuestions && !followUpQuestions.length ? (
                    <div className="smart-q-card answered">
                      <div className="smart-q-dim">No additional questions</div>
                      <div className="smart-q-text">Your review already closed the highest-value gaps for this property.</div>
                      <div className="smart-q-helper">You can submit from here without answering anything else.</div>
                    </div>
                  ) : null}

                  {!loadingQuestions
                    ? followUpQuestions.map((question, index) => {
                        const answer = questionAnswers[question.sessionId];
                        const combinedAnswer = composeAnswer(answer?.choice ?? "", answer?.details ?? "");
                        const questionChoices = buildQuestionChoices(question);
                        const questionTarget = questionVoiceTarget(question.sessionId);

                        return (
                          <div className="smart-q-card" key={question.sessionId}>
                            <div className="smart-q-dim">
                              Question {index + 1} of {followUpQuestions.length} • {question.label}
                            </div>
                            <div className="smart-q-text">{question.prompt}</div>
                            <div className="smart-q-helper">{question.whyNow}</div>

                            {questionChoices.length ? (
                              <div className="choice-grid">
                                {questionChoices.map((choice) => (
                                  <button
                                    className={cx(
                                      "choice-btn",
                                      answer?.choice === choice && "sel",
                                      answer?.choice === choice && choiceVariant(choice) === "yes" && "sel-yes",
                                      answer?.choice === choice && choiceVariant(choice) === "no" && "sel-no"
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

                            <div className={cx("scale-expand", "open")}>
                              <label className="scale-expand-lbl">
                                {question.placeholder || "Add a little detail if you noticed anything specific."}
                              </label>
                              <textarea
                                className="small-ta"
                                onChange={(event) => setQuestionDetailsValue(question.sessionId, event.target.value)}
                                placeholder={question.placeholder}
                                value={answer?.details ?? ""}
                              />
                            </div>

                            {voiceSupported ? (
                              <div className="voice-inline">
                                <button
                                  className={cx("voice-btn", voiceActive && voiceTarget === questionTarget && "rec")}
                                  onClick={() => toggleVoiceCapture(questionTarget)}
                                  type="button"
                                >
                                  {voiceActive && voiceTarget === questionTarget ? "Stop recording" : "Answer by voice"}
                                </button>
                              </div>
                            ) : null}

                            {combinedAnswer ? (
                              <div className="followup-status">Answer captured. You can still edit it before submitting.</div>
                            ) : null}
                          </div>
                        );
                      })
                    : null}
                </div>

                {error ? <div className="error-msg">{error}</div> : null}

                <div className="btn-row">
                  <button className="btn-s" onClick={() => setStage("review")} type="button">
                    Back
                  </button>
                  <button className="btn-p" disabled={!canSubmit} onClick={() => submitReview().catch(() => undefined)} type="button">
                    {magicFixLoading ? magicFixCopy.loading : submitting ? "Submitting..." : "Submit review"}
                  </button>
                </div>
              </div>
            </div>

            <div className="puzzle-panel">
              <div className="puzzle-header">
                <span className="puzzle-title">Reveal the property</span>
                <span className="puzzle-prog">{puzzlePieces} / 8</span>
              </div>
              <div className="puzzle-grid">
                {Array.from({ length: 8 }, (_, index) => (
                  <div
                    className={cx("pp", index < puzzlePieces ? "revealed" : "unrevealed")}
                    key={index}
                    style={{ background: propertyVisual.tile }}
                  >
                    {index >= puzzlePieces ? (
                      <div className="pp-lock">
                        <div className="pp-num">{index + 1}</div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="puzzle-fact">
                <strong>Did you know?</strong> {puzzleFacts[Math.max(0, Math.min(puzzlePieces - 1, puzzleFacts.length - 1))] || "Answer questions to reveal pieces and unlock property facts."}
              </div>
            </div>
          </div>
            </div>

            <div className={cx("screen", stage === "done" && "on")} ref={doneScreenRef}>
          <StampediaJournal
            activeTripId={activeTripId}
            newStampStayId={newStampStayId}
            onTripRename={handleTripRename}
            onTripSelect={handleTripSelect}
            stampAnimationActive={stampAnimationActive}
            trips={stampediaTrips}
            turning={journalTurning}
          />

          <div className="helped-bar-wrap">
            <div className="helped-bar-top">
              <span className="helped-bar-label">Travelers you have helped</span>
              <div className="helped-count">
                <span>{helpedCount}</span> <span>people</span>
              </div>
            </div>
            <div className="helped-track">
              <div className="helped-fill" style={{ width: `${Math.min(100, helpedCount)}%` }} />
            </div>
            <div className="helped-milestones">
              {[25, 50, 100].map((milestone) => (
                <div className="helped-milestone" key={milestone}>
                  <div className={cx("helped-milestone-dot", helpedCount >= milestone && "reached")} />
                  <span>{milestone}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="taste-card">
            <div className="taste-eye">Traveler Taste Profile</div>
            <div className="taste-lbl">
              {tasteProfile.label} {tasteProfile.archetype}
            </div>
            <div className="taste-sub">Updated after this review. Recalculates with every stay.</div>
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
              <div className="taste-recs-lbl">Matched properties for your next trip</div>
              <div className="taste-chips">
                {tasteProfile.recommendations.map((recommendation) => (
                  <span className="taste-chip" key={recommendation}>
                    {recommendation}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="photo-ai-section">
            <div className="photo-ai-lbl">Evidence classification</div>
            {loadingPhotos ? (
              <div className="photo-ai-loading">Analyzing uploaded photos...</div>
            ) : photoInsights.length ? (
              <div className="photo-ai-grid">
                {photoInsights.map((insight) => {
                  const photo = photos.find((item) => item.id === insight.id);
                  if (!photo) {
                    return null;
                  }

                  return (
                    <div className="photo-ai-item" key={insight.id}>
                      <img alt={insight.label} className="photo-ai-img" src={photo.previewUrl} />
                      <div className="photo-ai-tag">{insight.label}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="photo-ai-loading">No photo evidence uploaded for this review.</div>
            )}
          </div>

          <div className="my-impact-grid">
            <div className="impact-stat-card blue">
              <div className="impact-stat-num">{answerPreviews.length}</div>
              <div className="impact-stat-lbl">Gaps closed</div>
            </div>
            <div className="impact-stat-card green">
              <div className="impact-stat-num">1</div>
              <div className="impact-stat-lbl">Reviews submitted</div>
            </div>
          </div>

          {answerPreviews.length ? (
            <div className="quest-card">
              <div className="quest-card-top">
                <span className="quest-badge">Closed gaps</span>
                <span className="quest-title">Fresh traveler evidence</span>
              </div>
              <div className="quest-desc">
                {answerPreviews.map((preview) => preview.previewLabel).join(", ")} refreshed from this review.
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-hd">
              <div className="card-ico">I</div>
              <div className="card-title">What you shared</div>
            </div>

            <div className="ans-item">
              <div className="ans-ck">&#10003;</div>
              <div>
                <div className="ans-q">Your review</div>
                <div className="ans-a">{reviewText}</div>
              </div>
            </div>

            {answerPreviews.map((preview) => (
              <div className="ans-item" key={`${preview.attributeKey}:${preview.proposedValue}`}>
                <div className="ans-ck">&#10003;</div>
                <div>
                  <div className="ans-q">{preview.label}</div>
                  <div className="ans-a">{preview.proposedValue}</div>
                </div>
              </div>
            ))}

            {photos.length ? (
              <div className="ans-item">
                <div className="ans-ck">&#10003;</div>
                <div>
                  <div className="ans-q">Photos</div>
                  <div className="ans-a">
                    {photos.length} photo{photos.length === 1 ? "" : "s"} uploaded
                  </div>
                </div>
              </div>
            ) : null}
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
              Review another property
            </button>
          </div>
            </div>
          </section>
        </main>
      </div>

      {magicFixOpen ? (
        <div className="magicfix-overlay">
          <div className="magicfix-card">
            <div className="magicfix-kicker">Magic polish</div>
            <h3 className="magicfix-title">{magicFixCopy.title}</h3>
            <p className="magicfix-body">{magicFixCopy.body}</p>

            <div className="magicfix-grid">
              <div className="magicfix-panel">
                <div className="magicfix-panel-lbl">Original</div>
                <div className="magicfix-panel-copy">{reviewText}</div>
              </div>
              <div className="magicfix-panel polished">
                <div className="magicfix-panel-lbl">Polished</div>
                <div className="magicfix-panel-copy">{magicFixSuggestion}</div>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn-s" onClick={keepOriginalReview} type="button">
                {magicFixCopy.keep}
              </button>
              <button className="btn-p" onClick={acceptMagicFixes} type="button">
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
              aria-label="Close review submitted"
              className="done-modal-close"
              onClick={continueToStampedia}
              type="button"
            >
              &#10005;
            </button>
            <div className="done-tick">&#10003;</div>
            <h2 className="done-h">Review submitted</h2>
            <p className="done-p">Your review is in. Continue to Stampedia to see your new stamp arrive.</p>
            <button className="btn-p done-modal-btn" onClick={continueToStampedia} type="button">
              Continue to Stampedia
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
