import fs from "node:fs/promises";
import { parse } from "csv-parse/sync";
import {
  normalizeWhitespace,
  parseMaybeJsonArray,
  safeLower,
  stripHtml,
  summarizeText,
  tokenize
} from "./text.mjs";

function parseNumber(value) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const [month, day, year] = value.split("/");
  if (!month || !day || !year) {
    return null;
  }

  const parsed = new Date(Date.UTC(Number(`20${year.slice(-2)}`), Number(month) - 1, Number(day)));
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
}

function parseRatings(value) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return Object.fromEntries(
      Object.entries(parsed).map(([key, rating]) => {
        const numeric = Number(rating);
        return [key, Number.isFinite(numeric) && numeric > 0 ? numeric : null];
      })
    );
  } catch (error) {
    return {};
  }
}

export async function readDescriptions(filePath) {
  const csv = await fs.readFile(filePath, "utf8");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true
  });

  return rows.map((row) => {
    const amenityBuckets = Object.fromEntries(
      Object.entries(row)
        .filter(([key]) => key.startsWith("property_amenity_"))
        .map(([key, value]) => [key, parseMaybeJsonArray(value)])
    );

    return {
      propertyId: row.eg_property_id,
      guestRatingAvg: parseNumber(row.guestrating_avg_expedia),
      city: normalizeWhitespace(row.city || ""),
      province: normalizeWhitespace(row.province || ""),
      country: normalizeWhitespace(row.country || ""),
      starRating: parseNumber(row.star_rating),
      areaDescription: stripHtml(row.area_description || ""),
      propertyDescription: stripHtml(row.property_description || ""),
      popularAmenities: parseMaybeJsonArray(row.popular_amenities_list),
      amenityBuckets,
      checkInStartTime: normalizeWhitespace(row.check_in_start_time || ""),
      checkInEndTime: normalizeWhitespace(row.check_in_end_time || ""),
      checkOutTime: normalizeWhitespace(row.check_out_time || ""),
      checkOutPolicy: parseMaybeJsonArray(row.check_out_policy),
      petPolicy: parseMaybeJsonArray(row.pet_policy),
      childrenAndExtraBedPolicy: parseMaybeJsonArray(row.children_and_extra_bed_policy),
      checkInInstructions: parseMaybeJsonArray(row.check_in_instructions),
      knowBeforeYouGo: parseMaybeJsonArray(row.know_before_you_go)
    };
  });
}

export async function readReviews(filePath) {
  const csv = await fs.readFile(filePath, "utf8");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true
  });

  return rows.map((row, index) => {
    const title = normalizeWhitespace(row.review_title || "");
    const text = stripHtml(row.review_text || "");
    const mergedText = normalizeWhitespace([title, text].filter(Boolean).join(". "));

    return {
      reviewId: `${row.eg_property_id}-${index + 1}`,
      propertyId: row.eg_property_id,
      acquisitionDate: parseDate(row.acquisition_date),
      lob: normalizeWhitespace(row.lob || ""),
      ratings: parseRatings(row.rating),
      title,
      text,
      normalizedText: safeLower(mergedText),
      tokens: tokenize(mergedText),
      summary: summarizeText(mergedText, "Guest left a rating-only review.")
    };
  });
}
