const INDIA_TIME_ZONE = "Asia/Kolkata";

export function formatDateTimeIST(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${formatted} IST`;
}

export function formatTimeIST(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: INDIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${formatted} IST`;
}

export function formatTimestampIST(timestamp: string): string {
  const isTimeOnly = /^\d{2}:\d{2}(?::\d{2})?/.test(timestamp);
  const normalized = timestamp
    .replace(/\s+UTC$/i, "Z")
    .replace(" ", "T");

  if (isTimeOnly) {
    const time = normalized.replace(/Z$/i, "");
    const withSeconds = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
    return formatTimeIST(`1970-01-01T${withSeconds}Z`);
  }

  const isoTimestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
    ? normalized
    : `${normalized}Z`;
  return formatDateTimeIST(isoTimestamp);
}

export function formatMarkdownTimesIST(markdown: string): string {
  const utcTimestampPattern =
    /\b(?:\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?|\d{2}:\d{2}(?::\d{2})?)(?:\s?UTC|Z)\b/gi;

  return markdown.replace(utcTimestampPattern, formatTimestampIST);
}
