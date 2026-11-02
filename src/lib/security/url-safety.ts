/**
 * URL Safety Validation Utility
 * Rejects unsafe protocols (javascript:, data:, vbscript:, file:, etc.)
 * Strictly allows only http: and https: protocols.
 */

const BLOCKED_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "about:",
];

export function isSafeUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  const trimmed = urlString.trim().toLowerCase();

  for (const blocked of BLOCKED_PROTOCOLS) {
    if (trimmed.startsWith(blocked)) return false;
  }

  try {
    const parsed = new URL(urlString);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    // If not a full URL, ensure it does not contain protocol injection
    return !trimmed.includes(":");
  }
}

/**
 * Validates text content (e.g. description) to ensure no embedded unsafe protocol URLs exist.
 */
export function validateTextForUnsafeUrls(text: string): {
  isValid: boolean;
  rejectedProtocol?: string;
} {
  const lower = text.toLowerCase();
  for (const proto of BLOCKED_PROTOCOLS) {
    if (lower.includes(proto)) {
      return { isValid: false, rejectedProtocol: proto };
    }
  }
  return { isValid: true };
}

/**
 * Sanitizes redirect target URLs to prevent Open Redirect vulnerabilities.
 * Strictly permits only relative internal application paths (e.g. /dashboard, /challenges/new).
 * Rejects external URLs, scheme-relative // URLs, and backslash evasions.
 */
export function sanitizeRedirectUrl(url: string | null | undefined): string {
  if (!url) return "/dashboard";
  if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\") && !url.includes(":")) {
    return url;
  }
  return "/dashboard";
}
