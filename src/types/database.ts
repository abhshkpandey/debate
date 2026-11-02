export type UserRole = "user" | "admin";

export type ChallengeCategory =
  | "Pop Culture"
  | "Technology"
  | "Motorcycles & Cars"
  | "Sports & Gaming"
  | "Business & Money"
  | "Politics & World Affairs"
  | "Philosophy"
  | "Anything Goes";

export const CATEGORIES: ChallengeCategory[] = [
  "Pop Culture",
  "Technology",
  "Motorcycles & Cars",
  "Sports & Gaming",
  "Business & Money",
  "Politics & World Affairs",
  "Philosophy",
  "Anything Goes",
];

export type DebateFormat = "quick_clash" | "standard";

export interface FormatConfig {
  name: string;
  totalTimeMinutes: number;
  rounds: {
    number: number;
    type: "opening" | "rebuttal" | "closing";
    durationSeconds: number;
    maxChars: number;
    label: string;
  }[];
}

export const FORMAT_CONFIGS: Record<DebateFormat, FormatConfig> = {
  quick_clash: {
    name: "Quick Clash",
    totalTimeMinutes: 2,
    rounds: [
      { number: 1, type: "opening", durationSeconds: 60, maxChars: 500, label: "Opening Statement" },
      { number: 2, type: "closing", durationSeconds: 60, maxChars: 500, label: "Closing Verdict" },
    ],
  },
  standard: {
    name: "Standard Debate",
    totalTimeMinutes: 10,
    rounds: [
      { number: 1, type: "opening", durationSeconds: 60, maxChars: 500, label: "Opening Statement" },
      { number: 2, type: "rebuttal", durationSeconds: 60, maxChars: 500, label: "Rebuttal & Cross" },
      { number: 3, type: "closing", durationSeconds: 30, maxChars: 300, label: "Closing Remarks" },
    ],
  },
};

export type MatchStatus =
  | "pending_time"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "disputed";

export type ChallengeStatus = "open" | "matched" | "cancelled" | "expired";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  is_public: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  position_a: string;
  position_b: string;
  creator_side: "a" | "b";
  format: DebateFormat;
  language: string;
  visibility: "public" | "invite_only";
  deadline_to_find_opponent: string | null;
  status: ChallengeStatus;
  invite_code: string;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface Match {
  id: string;
  challenge_id: string;
  creator_id: string;
  opponent_id: string;
  creator_side: "a" | "b";
  opponent_side: "a" | "b";
  scheduled_slot_start: string | null;
  scheduled_slot_end: string | null;
  creator_confirmed: boolean;
  opponent_confirmed: boolean;
  status: MatchStatus;
  creator_checked_in_at: string | null;
  opponent_checked_in_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;
  winner_side: "creator" | "opponent" | "tie" | null;
  created_at: string;
  updated_at: string;
  challenge?: Challenge;
  creator?: Profile;
  opponent?: Profile;
}

export interface ChallengeSlot {
  id: string;
  match_id: string;
  proposed_by: string;
  slot_start: string;
  slot_end: string;
  status: "proposed" | "accepted" | "rejected" | "expired";
  created_at: string;
  proposer?: Profile;
}

export interface WeeklyAvailability {
  id: string;
  user_id: string;
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  is_enabled: boolean;
  created_at: string;
}

export interface AvailabilityException {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface DebateRound {
  id: string;
  match_id: string;
  round_number: number;
  round_type: "opening" | "rebuttal" | "closing";
  active_speaker_id: string | null;
  starts_at: string;
  ends_at: string;
  max_chars: number;
  status: "pending" | "active" | "completed";
  created_at: string;
}

export interface DebateMessage {
  id: string;
  match_id: string;
  round_id: string | null;
  sender_id: string;
  content: string;
  submitted_at: string;
  sender?: Profile;
}

export interface Vote {
  id: string;
  match_id: string;
  voter_id: string;
  voted_for_side: "creator" | "opponent" | "tie";
  rationale: string | null;
  created_at: string;
  voter?: Profile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
}

export interface NotificationJob {
  id: string;
  match_id: string;
  user_id: string;
  reminder_type: "24h" | "1h" | "10min";
  scheduled_for: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  email_sent: boolean;
  in_app_sent: boolean;
  last_error: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: "user" | "challenge" | "message" | "match" | "appeal";
  target_id: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "dismissed" | "action_taken";
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  reporter?: Profile;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}
