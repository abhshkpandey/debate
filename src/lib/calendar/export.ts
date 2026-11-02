import { formatInTimeZone } from "date-fns-tz";

function formatIcsDate(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export interface CalendarEventDetails {
  matchId: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  matchUrl: string;
  creatorName: string;
  opponentName: string;
}

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) string with a stable UID and UTC timestamps.
 */
export function generateIcsContent(details: CalendarEventDetails): string {
  const uid = `match-${details.matchId}@debate.app`;
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(details.start);
  const dtEnd = formatIcsDate(details.end);

  const summary = escapeIcsText(`Debate: ${details.title}`);
  const descriptionText = escapeIcsText(
    `${details.description}\n\nParticipants:\n- ${details.creatorName}\n- ${details.opponentName}\n\nJoin live debate room:\n${details.matchUrl}`
  );
  const location = escapeIcsText(details.matchUrl);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Debate Platform//Match Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${descriptionText}`,
    `LOCATION:${location}`,
    `URL:${details.matchUrl}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/**
 * Constructs a direct Google Calendar web event creation link (no OAuth).
 */
export function generateGoogleCalendarUrl(details: CalendarEventDetails): string {
  const startStr = formatIcsDate(details.start);
  const endStr = formatIcsDate(details.end);
  const title = `Debate: ${details.title}`;
  const description = `${details.description}\n\nDebate Room: ${details.matchUrl}\nParticipants: ${details.creatorName} vs ${details.opponentName}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    details: description,
    location: details.matchUrl,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Constructs a direct Outlook Live Web event link (no OAuth).
 */
export function generateOutlookCalendarUrl(details: CalendarEventDetails): string {
  const title = `Debate: ${details.title}`;
  const description = `${details.description}\n\nDebate Room: ${details.matchUrl}\nParticipants: ${details.creatorName} vs ${details.opponentName}`;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    startdt: details.start.toISOString(),
    enddt: details.end.toISOString(),
    body: description,
    location: details.matchUrl,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
