export function fmtNumber(value, options = {}) {
  const num = Number(value);
  if (Number.isNaN(num)) return "-";
  return num.toLocaleString(undefined, options);
}

export function fmtDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function readingTimeMinutes(text = "") {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function wordsCount(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
