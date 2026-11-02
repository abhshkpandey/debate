/**
 * Timezone helpers and validators using Intl and IANA specifications.
 */

let supportedTzSet: Set<string> | null = null;

function getSupportedSet(): Set<string> {
  if (!supportedTzSet) {
    try {
      supportedTzSet = new Set(Intl.supportedValuesOf("timeZone"));
    } catch {
      supportedTzSet = new Set(COMMON_TIMEZONES);
    }
  }
  return supportedTzSet;
}

export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") return false;
  const set = getSupportedSet();
  if (set.has(timeZone) || timeZone === "UTC") return true;

  // Verify format (Area/Location)
  if (!timeZone.includes("/")) return false;

  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function getAllIanaTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return COMMON_TIMEZONES;
  }
}

export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];
