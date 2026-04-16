import fs from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, get, put } from "@vercel/blob";
import { getCatalogData, getPropertyById, normalizePropertyDisplayName } from "./runtime-data";
import type { AnswerPreview, DemoCustomer, DemoHydratedCustomer, DemoStay, PropertySummary } from "./types";

const demoDataDir = path.join(process.cwd(), "data", "demo");
const demoDbPath = path.join(demoDataDir, "demo-db.json");
const demoDbBlobPath = process.env.REVIEWIQ_DEMO_BLOB_PATH ?? "reviewiq/demo/demo-db.json";
const blobEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

type DemoStore = { customers: DemoCustomer[] };

type SeedStay = Omit<DemoStay, "staleFocus" | "staleReason">;

function buildStay(property: PropertySummary, details: SeedStay): DemoStay {
  const topGap = property.candidateGaps[0];

  return {
    ...details,
    staleFocus: topGap?.label ?? "Fresh details needed",
    staleReason: topGap?.rationale ?? "This stay was chosen because the listing has stale or conflicting guest evidence."
  };
}

function requirePropertyByName(name: string) {
  const normalizedName = normalizePropertyDisplayName(name);
  const property = getCatalogData().properties.find((item) => item.displayName === normalizedName);
  if (!property) {
    throw new Error(`Could not seed demo customer data. Missing property named "${name}".`);
  }

  return property;
}

function createSeedCustomers(): DemoCustomer[] {
  const monterey = requirePropertyByName("Monterey California Inn");
  const bellGardens = requirePropertyByName("Bell Gardens California Motel");
  const broomfield = requirePropertyByName("Broomfield Colorado Resort");

  const rome = requirePropertyByName("Rome RM Hotel");
  const pompei = requirePropertyByName("Pompei Hotel");
  const freudenstadt = requirePropertyByName("Freudenstadt Baden-Wurttemberg Hotel");
  const bochum = requirePropertyByName("Bochum Hotel");

  const sanIsidro = requirePropertyByName("San Isidro de El General San José Hotel");
  const newSmyrna = requirePropertyByName("New Smyrna Beach Florida Inn");
  const ocala = requirePropertyByName("Ocala Florida Inn");

  return [
    {
      id: "maya-chen",
      firstName: "Maya",
      lastName: "Chen",
      email: "maya.chen@example.com",
      headline: "Remote product lead who notices check-in flow, cleanliness, and Wi-Fi quality fast.",
      companion: "Traveling with her corgi, Nori.",
      traits: ["Dog parent", "Late arrivals", "Quiet-room seeker"],
      trips: [
        {
          tripId: "maya-work-anywhere-loop",
          title: "California to Colorado Loop",
          coverCountry: "United States",
          subtitle: "Three western U.S. stays with stale cleanliness, noise, and property-condition details."
        }
      ],
      stays: [
        buildStay(monterey, {
          stayId: "maya-stay-monterey",
          tripId: "maya-work-anywhere-loop",
          propertyId: monterey.propertyId,
          checkIn: "2026-03-02",
          checkOut: "2026-03-05",
          roomType: "Premium King",
          confirmation: "#EX-MAYA-3182"
        }),
        buildStay(bellGardens, {
          stayId: "maya-stay-bell-gardens",
          tripId: "maya-work-anywhere-loop",
          propertyId: bellGardens.propertyId,
          checkIn: "2026-03-05",
          checkOut: "2026-03-07",
          roomType: "Classic Double",
          confirmation: "#EX-MAYA-4028"
        }),
        buildStay(broomfield, {
          stayId: "maya-stay-broomfield",
          tripId: "maya-work-anywhere-loop",
          propertyId: broomfield.propertyId,
          checkIn: "2026-03-07",
          checkOut: "2026-03-10",
          roomType: "Corner Studio",
          confirmation: "#EX-MAYA-5106"
        })
      ],
      journal: {
        reviewedStayIds: []
      },
      submissions: []
    },
    {
      id: "luca-rossi",
      firstName: "Luca",
      lastName: "Rossi",
      email: "luca.rossi@example.com",
      headline: "Design director on a winter rail loop who always notices noise, check-in, and room comfort.",
      companion: "Traveling solo with a camera and a very late espresso habit.",
      traits: ["Sleeps light", "Trains over taxis", "Design-focused"],
      trips: [
        {
          tripId: "luca-euro-loop",
          title: "Italy to Germany Rail Loop",
          coverCountry: "Italy & Germany",
          subtitle: "Two Italian stops and two German stays with stale check-in, noise, and room-comfort details."
        }
      ],
      stays: [
        buildStay(rome, {
          stayId: "luca-stay-rome",
          tripId: "luca-euro-loop",
          propertyId: rome.propertyId,
          checkIn: "2026-02-14",
          checkOut: "2026-02-17",
          roomType: "Deluxe Room",
          confirmation: "#EX-LUCA-1901"
        }),
        buildStay(pompei, {
          stayId: "luca-stay-pompei",
          tripId: "luca-euro-loop",
          propertyId: pompei.propertyId,
          checkIn: "2026-02-17",
          checkOut: "2026-02-19",
          roomType: "Ocean View Room",
          confirmation: "#EX-LUCA-2447"
        }),
        buildStay(freudenstadt, {
          stayId: "luca-stay-freudenstadt",
          tripId: "luca-euro-loop",
          propertyId: freudenstadt.propertyId,
          checkIn: "2026-02-20",
          checkOut: "2026-02-22",
          roomType: "Classic Double",
          confirmation: "#EX-LUCA-3279"
        }),
        buildStay(bochum, {
          stayId: "luca-stay-bochum",
          tripId: "luca-euro-loop",
          propertyId: bochum.propertyId,
          checkIn: "2026-02-22",
          checkOut: "2026-02-25",
          roomType: "Double Queen Suite",
          confirmation: "#EX-LUCA-3884"
        })
      ],
      journal: {
        reviewedStayIds: []
      },
      submissions: []
    },
    {
      id: "sofia-alvarez",
      firstName: "Sofia",
      lastName: "Alvarez",
      email: "sofia.alvarez@example.com",
      headline: "Adventure planner who travels with her dog and notices stale amenity details immediately.",
      companion: "Traveling with her rescue pup, Sol.",
      traits: ["Pet owner", "Nature-first", "Practical reviewer"],
      trips: [
        {
          tripId: "sofia-adventure-hop",
          title: "Costa Rica to Florida Nature Loop",
          coverCountry: "Costa Rica & Florida",
          subtitle: "A pet-friendly route centered on Costa Rica and Florida stays that need fresh traveler confirmation."
        }
      ],
      stays: [
        buildStay(sanIsidro, {
          stayId: "sofia-stay-san-isidro",
          tripId: "sofia-adventure-hop",
          propertyId: sanIsidro.propertyId,
          checkIn: "2026-03-18",
          checkOut: "2026-03-20",
          roomType: "Premium King",
          confirmation: "#EX-SOFIA-1382"
        }),
        buildStay(newSmyrna, {
          stayId: "sofia-stay-new-smyrna",
          tripId: "sofia-adventure-hop",
          propertyId: newSmyrna.propertyId,
          checkIn: "2026-03-22",
          checkOut: "2026-03-24",
          roomType: "Ocean View Room",
          confirmation: "#EX-SOFIA-4470"
        }),
        buildStay(ocala, {
          stayId: "sofia-stay-ocala",
          tripId: "sofia-adventure-hop",
          propertyId: ocala.propertyId,
          checkIn: "2026-03-24",
          checkOut: "2026-03-27",
          roomType: "King Suite",
          confirmation: "#EX-SOFIA-5218"
        })
      ],
      journal: {
        reviewedStayIds: []
      },
      submissions: []
    }
  ];
}

async function writeLocalStore(store: DemoStore) {
  await fs.mkdir(demoDataDir, { recursive: true });
  await fs.writeFile(demoDbPath, JSON.stringify(store, null, 2), "utf8");
}

async function readLocalStore(): Promise<DemoStore> {
  let raw: string;

  try {
    raw = await fs.readFile(demoDbPath, "utf8");
  } catch (error) {
    const seeded = createSeedCustomers();

    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      try {
        await writeLocalStore({ customers: seeded });
      } catch {
        return { customers: seeded };
      }
    } else {
      return { customers: seeded };
    }

    return { customers: seeded };
  }

  const parsed = JSON.parse(raw) as DemoStore;

  if (!parsed.customers?.length) {
    const seeded = createSeedCustomers();

    try {
      await writeLocalStore({ customers: seeded });
    } catch {
      return { customers: seeded };
    }

    return { customers: seeded };
  }

  return { customers: parsed.customers };
}

async function writeBlobStore(store: DemoStore) {
  await put(demoDbBlobPath, JSON.stringify(store, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    contentType: "application/json"
  });
}

async function readBlobStore(): Promise<DemoStore> {
  try {
    const blob = await get(demoDbBlobPath, {
      access: "public",
      useCache: false
    });

    if (!blob || blob.statusCode !== 200) {
      const seeded = createSeedCustomers();
      await writeBlobStore({ customers: seeded });
      return { customers: seeded };
    }

    const parsed = (await new Response(blob.stream).json()) as DemoStore;

    if (!parsed.customers?.length) {
      const seeded = createSeedCustomers();
      await writeBlobStore({ customers: seeded });
      return { customers: seeded };
    }

    return { customers: parsed.customers };
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      const seeded = createSeedCustomers();
      await writeBlobStore({ customers: seeded });
      return { customers: seeded };
    }

    throw error;
  }
}

async function readStore(): Promise<DemoStore> {
  if (!blobEnabled) {
    return readLocalStore();
  }

  try {
    return await readBlobStore();
  } catch {
    return readLocalStore();
  }
}

async function writeStore(store: DemoStore) {
  if (blobEnabled) {
    await writeBlobStore(store);
    return;
  }

  await writeLocalStore(store);
}

function extensionForContentType(contentType: string) {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  if (contentType === "image/gif") {
    return "gif";
  }

  return "jpg";
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Unsupported photo payload.");
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

async function persistUploadedPhoto(customerId: string, stayId: string, photoDataUrl: string) {
  if (!blobEnabled || !photoDataUrl.startsWith("data:")) {
    return photoDataUrl;
  }

  const { contentType, buffer } = parseDataUrl(photoDataUrl);
  const extension = extensionForContentType(contentType);
  const pathname = `reviewiq/demo-photos/${customerId}/${stayId}.${extension}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31536000,
    contentType
  });

  return blob.url;
}

function hydrateCustomer(customer: DemoCustomer): DemoHydratedCustomer {
  return {
    ...customer,
    name: `${customer.firstName} ${customer.lastName}`,
    stays: customer.stays.map((stay) => {
      const property = getPropertyById(stay.propertyId);
      if (!property) {
        throw new Error(`Property ${stay.propertyId} for demo stay ${stay.stayId} no longer exists.`);
      }

      return {
        ...stay,
        staleFocus: property.candidateGaps[0]?.label ?? stay.staleFocus,
        staleReason: property.candidateGaps[0]?.rationale ?? stay.staleReason,
        property
      };
    })
  };
}

export async function getDemoCustomers() {
  const store = await readStore();
  return store.customers.map(hydrateCustomer);
}

export async function getDemoCustomer(customerId: string) {
  const customers = await getDemoCustomers();
  return customers.find((customer) => customer.id === customerId) ?? null;
}

export async function resetDemoStore() {
  const seeded = createSeedCustomers();
  await writeStore({ customers: seeded });
  return seeded.map(hydrateCustomer);
}

export async function markDemoStayReviewed(input: {
  customerId: string;
  stayId: string;
  reviewTitle: string | null;
  reviewText: string;
  polishedText: string | null;
  answerPreviews: AnswerPreview[];
  uploadedPhotoDataUrl: string | null;
  uploadedPhotoAlt: string | null;
}) {
  const store = await readStore();
  const customer = store.customers.find((item) => item.id === input.customerId);
  if (!customer) {
    throw new Error("Customer not found.");
  }

  const stay = customer.stays.find((item) => item.stayId === input.stayId);
  if (!stay) {
    throw new Error("Stay not found.");
  }

  if (!customer.journal.reviewedStayIds.includes(input.stayId)) {
    customer.journal.reviewedStayIds.push(input.stayId);
  }

  const existingSubmission = customer.submissions.find((item) => item.stayId === input.stayId);
  const uploadedPhotoDataUrl = input.uploadedPhotoDataUrl
    ? await persistUploadedPhoto(input.customerId, input.stayId, input.uploadedPhotoDataUrl)
    : null;
  const nextSubmission = {
    stayId: input.stayId,
    propertyId: stay.propertyId,
    submittedAt: new Date().toISOString(),
    reviewTitle: input.reviewTitle,
    reviewText: input.reviewText,
    polishedText: input.polishedText,
    answerPreviews: input.answerPreviews,
    answerPreview: input.answerPreviews[0] ?? null,
    uploadedPhotoDataUrl,
    uploadedPhotoAlt: input.uploadedPhotoAlt
  };

  if (existingSubmission) {
    Object.assign(existingSubmission, nextSubmission);
  } else {
    customer.submissions.push(nextSubmission);
  }

  await writeStore(store);
  return hydrateCustomer(customer);
}

export async function renameDemoTrip(input: { customerId: string; tripId: string; title: string }) {
  const store = await readStore();
  const customer = store.customers.find((item) => item.id === input.customerId);
  if (!customer) {
    throw new Error("Customer not found.");
  }

  const trip = customer.trips.find((item) => item.tripId === input.tripId);
  if (!trip) {
    throw new Error("Trip not found.");
  }

  const nextTitle = input.title.trim();
  if (nextTitle) {
    trip.title = nextTitle;
  }

  await writeStore(store);
  return hydrateCustomer(customer);
}
