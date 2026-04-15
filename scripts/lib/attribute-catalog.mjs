export const ATTRIBUTE_CATALOG = [
  {
    key: "cleanliness",
    label: "Cleanliness",
    category: "experience",
    impact: 0.98,
    effort: 0.2,
    alwaysRelevant: true,
    keywords: [
      "clean",
      "dirty",
      "filthy",
      "housekeeping",
      "dust",
      "smell",
      "bathroom",
      "stain"
    ],
    ratingSignals: ["roomcleanliness"],
    descriptionKeys: [],
    question: {
      answerType: "single_select",
      text: "How clean did the room and bathroom feel when you arrived?",
      choices: [
        "Very clean",
        "Mostly clean",
        "Needed better cleaning"
      ],
      placeholder: ""
    },
    previewLabel: "arrival cleanliness"
  },
  {
    key: "service",
    label: "Service",
    category: "experience",
    impact: 0.94,
    effort: 0.18,
    alwaysRelevant: true,
    keywords: [
      "staff",
      "service",
      "friendly",
      "helpful",
      "rude",
      "front desk",
      "employee"
    ],
    ratingSignals: ["service", "communication"],
    descriptionKeys: ["check_in_instructions"],
    question: {
      answerType: "single_select",
      text: "How helpful was the staff when you needed something?",
      choices: [
        "Very helpful",
        "Mixed experience",
        "Not helpful"
      ],
      placeholder: ""
    },
    previewLabel: "staff helpfulness"
  },
  {
    key: "checkin",
    label: "Check-in",
    category: "policy",
    impact: 0.9,
    effort: 0.16,
    alwaysRelevant: true,
    keywords: [
      "check in",
      "check-in",
      "late arrival",
      "front desk",
      "arrival",
      "line",
      "wait"
    ],
    ratingSignals: ["checkin"],
    descriptionKeys: [
      "check_in_start_time",
      "check_in_end_time",
      "check_in_instructions"
    ],
    question: {
      answerType: "single_select",
      text: "Was check-in smooth for the time you arrived?",
      choices: [
        "Yes, very smooth",
        "A little slow",
        "No, there were issues"
      ],
      placeholder: ""
    },
    previewLabel: "check-in experience"
  },
  {
    key: "room_comfort",
    label: "Room comfort",
    category: "experience",
    impact: 0.88,
    effort: 0.22,
    alwaysRelevant: true,
    keywords: [
      "bed",
      "comfortable",
      "comfort",
      "mattress",
      "sleep",
      "pillow",
      "temperature"
    ],
    ratingSignals: ["roomcomfort", "roomquality"],
    descriptionKeys: ["property_description"],
    question: {
      answerType: "single_select",
      text: "How comfortable was the room for sleeping and relaxing?",
      choices: [
        "Very comfortable",
        "Fine overall",
        "Not very comfortable"
      ],
      placeholder: ""
    },
    previewLabel: "room comfort"
  },
  {
    key: "property_condition",
    label: "Property condition",
    category: "experience",
    impact: 0.92,
    effort: 0.24,
    alwaysRelevant: true,
    keywords: [
      "renovation",
      "dated",
      "updated",
      "condition",
      "paint",
      "broken",
      "maintenance"
    ],
    ratingSignals: ["hotelcondition"],
    descriptionKeys: ["property_description", "know_before_you_go"],
    question: {
      answerType: "single_select",
      text: "Did the property feel well-kept and up to date during your stay?",
      choices: [
        "Yes, it felt up to date",
        "Mixed / some wear",
        "No, it felt outdated"
      ],
      placeholder: ""
    },
    previewLabel: "property condition"
  },
  {
    key: "location",
    label: "Location",
    category: "location",
    impact: 0.86,
    effort: 0.18,
    alwaysRelevant: true,
    keywords: [
      "location",
      "walkable",
      "close",
      "far",
      "safe",
      "area",
      "neighborhood",
      "convenient"
    ],
    ratingSignals: ["location", "convenienceoflocation", "neighborhoodsatisfaction"],
    descriptionKeys: ["area_description", "city", "province", "country"],
    question: {
      answerType: "single_select",
      text: "How convenient was the location for what you planned to do?",
      choices: [
        "Very convenient",
        "Fine with tradeoffs",
        "Not convenient"
      ],
      placeholder: ""
    },
    previewLabel: "location convenience"
  },
  {
    key: "wifi",
    label: "Wi-Fi",
    category: "amenity",
    impact: 0.83,
    effort: 0.14,
    alwaysRelevant: false,
    keywords: [
      "wifi",
      "wi-fi",
      "internet",
      "connection",
      "signal"
    ],
    ratingSignals: ["roomamenitiesscore"],
    descriptionKeys: ["property_amenity_internet", "popular_amenities_list"],
    question: {
      answerType: "single_select",
      text: "How reliable was the Wi-Fi where you needed it?",
      choices: [
        "Reliable",
        "Worked sometimes",
        "Poor / unusable"
      ],
      placeholder: ""
    },
    previewLabel: "Wi-Fi reliability"
  },
  {
    key: "breakfast",
    label: "Breakfast",
    category: "amenity",
    impact: 0.8,
    effort: 0.16,
    alwaysRelevant: false,
    keywords: [
      "breakfast",
      "buffet",
      "coffee",
      "food",
      "continental"
    ],
    ratingSignals: ["roomamenitiesscore", "valueformoney"],
    descriptionKeys: ["property_amenity_food_and_drink", "popular_amenities_list"],
    question: {
      answerType: "single_select",
      text: "If you used breakfast, how was it for quality and convenience?",
      choices: [
        "Worth having",
        "Average",
        "Not worth it / unavailable"
      ],
      placeholder: ""
    },
    previewLabel: "breakfast experience"
  },
  {
    key: "parking",
    label: "Parking",
    category: "amenity",
    impact: 0.82,
    effort: 0.14,
    alwaysRelevant: false,
    keywords: [
      "parking",
      "park",
      "garage",
      "valet",
      "lot"
    ],
    ratingSignals: ["valueformoney"],
    descriptionKeys: ["property_amenity_parking", "popular_amenities_list"],
    question: {
      answerType: "single_select",
      text: "How easy was parking during your stay?",
      choices: [
        "Easy and clear",
        "Manageable",
        "Difficult / confusing"
      ],
      placeholder: ""
    },
    previewLabel: "parking experience"
  },
  {
    key: "pool",
    label: "Pool",
    category: "amenity",
    impact: 0.84,
    effort: 0.12,
    alwaysRelevant: false,
    keywords: [
      "pool",
      "hot tub",
      "swim",
      "spa"
    ],
    ratingSignals: ["roomamenitiesscore", "hotelcondition"],
    descriptionKeys: ["property_amenity_things_to_do", "popular_amenities_list"],
    question: {
      answerType: "single_select",
      text: "Was the pool area open and usable during your stay?",
      choices: [
        "Yes, fully open",
        "Partly available",
        "No, closed / unusable"
      ],
      placeholder: ""
    },
    previewLabel: "pool availability"
  },
  {
    key: "pet_policy",
    label: "Pet policy",
    category: "policy",
    impact: 0.72,
    effort: 0.14,
    alwaysRelevant: false,
    keywords: [
      "pet",
      "dog",
      "cat",
      "service animal"
    ],
    ratingSignals: [],
    descriptionKeys: ["pet_policy"],
    question: {
      answerType: "single_select",
      text: "If you traveled with a pet, how clear and workable was the pet policy?",
      choices: [
        "Clear and easy",
        "Somewhat clear",
        "Confusing / restrictive"
      ],
      placeholder: ""
    },
    previewLabel: "pet policy clarity"
  },
  {
    key: "family_policy",
    label: "Family friendliness",
    category: "policy",
    impact: 0.74,
    effort: 0.18,
    alwaysRelevant: false,
    keywords: [
      "kids",
      "children",
      "family",
      "crib",
      "extra bed"
    ],
    ratingSignals: [],
    descriptionKeys: ["children_and_extra_bed_policy", "property_amenity_family_friendly"],
    question: {
      answerType: "single_select",
      text: "If you stayed with children, how well did the property work for families?",
      choices: [
        "Very family-friendly",
        "Works with tradeoffs",
        "Not very family-friendly"
      ],
      placeholder: ""
    },
    previewLabel: "family-friendliness"
  },
  {
    key: "noise",
    label: "Noise level",
    category: "experience",
    impact: 0.79,
    effort: 0.15,
    alwaysRelevant: true,
    keywords: [
      "noise",
      "noisy",
      "quiet",
      "loud",
      "traffic",
      "sleep"
    ],
    ratingSignals: ["roomcomfort"],
    descriptionKeys: ["area_description"],
    question: {
      answerType: "single_select",
      text: "How quiet was the room and surrounding area at night?",
      choices: [
        "Quiet",
        "Some noise",
        "Too noisy"
      ],
      placeholder: ""
    },
    previewLabel: "nighttime noise"
  }
];
