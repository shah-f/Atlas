export type QuestionAnswerType = "single_select" | "short_text";

export type EvidenceSnippet = {
  reviewId?: string;
  chunkId?: string;
  date: string | null;
  source: "review" | "rating" | "property";
  sentiment: "positive" | "negative" | "mixed";
  score: number;
  snippet: string;
  daysAgo: number | null;
  semanticScore?: number;
};

export type CandidateGap = {
  attributeKey: string;
  label: string;
  category: string;
  baseScore: number;
  confidence: number;
  staticCoverage: boolean;
  contradiction: boolean;
  lastMentionedAt: string | null;
  recentEvidenceCount: number;
  evidence: EvidenceSnippet[];
  keywords: string[];
  ratingSignals: string[];
  question: {
    answerType: QuestionAnswerType;
    text: string;
    choices: string[];
    placeholder: string;
    previewLabel: string;
  };
  rationale: string;
};

export type PropertySummary = {
  propertyId: string;
  displayName: string;
  city: string;
  province: string;
  country: string;
  starRating: number | null;
  guestRatingAvg: number | null;
  tagline: string;
  areaDescription: string;
  popularAmenities: string[];
  policies: {
    checkInWindow: string;
    checkOutTime: string;
    petPolicy: string;
    childrenPolicy: string;
  };
  reviewStats: {
    totalReviews: number;
    withTextCount: number;
    recentReviewCount: number;
    lastReviewAt: string | null;
  };
  candidateGaps: CandidateGap[];
  reviewHighlights: Array<{
    reviewId: string;
    acquisitionDate: string | null;
    summary: string;
    ratingOverall: number | null;
  }>;
};

export type ReviewRecord = {
  reviewId: string;
  propertyId: string;
  acquisitionDate: string | null;
  lob: string;
  ratings: Record<string, number | null>;
  title: string;
  text: string;
  normalizedText: string;
  tokens: string[];
  summary: string;
};

export type CatalogData = {
  generatedAt: string;
  properties: PropertySummary[];
  reviewsByProperty: Record<string, ReviewRecord[]>;
};

export type RagChunk = {
  chunkId: string;
  propertyId: string;
  source: "review" | "rating" | "property";
  reviewId?: string;
  date: string | null;
  label: string;
  summary: string;
  text: string;
  attributeHints: string[];
  sentiment: "positive" | "negative" | "mixed";
  vector: number[];
};

export type RagIndex = {
  generatedAt: string;
  embeddingModel: string;
  dimensions: number;
  chunkCount: number;
  chunksByProperty: Record<string, RagChunk[]>;
};

export type ReviewDraft = {
  reviewText: string;
  ratings: Record<string, number | null>;
  locale: string;
};

export type SessionQuestion = {
  sessionId: string;
  propertyId: string;
  propertyName: string;
  attributeKey: string;
  label: string;
  prompt: string;
  answerType: QuestionAnswerType;
  choices: string[];
  placeholder: string;
  rationale: string;
  whyNow: string;
  evidence: EvidenceSnippet[];
  previewLabel: string;
  confidence: number;
  retrievalMode: "heuristic" | "custom_rag";
};

export type AnswerPreview = {
  attributeKey: string;
  label: string;
  previewLabel: string;
  proposedValue: string;
  confidence: number;
  impactSummary: string;
  internalNote: string;
};

export type DemoTrip = {
  tripId: string;
  title: string;
  coverCountry: string;
  subtitle: string;
};

export type DemoStay = {
  stayId: string;
  tripId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  confirmation: string;
  staleFocus: string;
  staleReason: string;
};

export type DemoReviewSubmission = {
  stayId: string;
  propertyId: string;
  submittedAt: string;
  reviewTitle?: string | null;
  reviewText: string;
  polishedText: string | null;
  answerPreviews: AnswerPreview[];
  answerPreview?: AnswerPreview | null;
  uploadedPhotoDataUrl?: string | null;
  uploadedPhotoAlt?: string | null;
};

export type DemoCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  companion: string;
  traits: string[];
  trips: DemoTrip[];
  stays: DemoStay[];
  journal: {
    reviewedStayIds: string[];
  };
  submissions: DemoReviewSubmission[];
};

export type DemoHydratedStay = DemoStay & {
  property: PropertySummary;
};

export type DemoHydratedCustomer = Omit<DemoCustomer, "stays"> & {
  name: string;
  stays: DemoHydratedStay[];
};
