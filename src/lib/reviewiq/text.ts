export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function safeLower(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

export function tokenize(value: string) {
  return safeLower(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function formatLocation(city: string, province: string, country: string) {
  return [city, province, country].filter(Boolean).join(", ");
}

export function formatDateLabel(isoDate: string | null) {
  if (!isoDate) {
    return "No recent signal";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(isoDate));
}
