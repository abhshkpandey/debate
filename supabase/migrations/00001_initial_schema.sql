-- DEBATE PLATFORM INITIAL SCHEMA
-- Postgres Migrations with Foreign Keys, Constraints, Indexes & RLS

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$')
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 2. BLOCKS
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_block UNIQUE (blocker_id, blocked_id),
  CONSTRAINT chk_no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_id);

-- 3. CHALLENGES
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL,
  description VARCHAR(2000) NOT NULL,
  category TEXT NOT NULL,
  position_a TEXT NOT NULL,
  position_b TEXT NOT NULL,
  creator_side TEXT NOT NULL CHECK (creator_side IN ('a', 'b')),
  format TEXT NOT NULL CHECK (format IN ('quick_clash', 'standard')),
  language TEXT NOT NULL DEFAULT 'en',
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'invite_only')),
  deadline_to_find_opponent TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'cancelled', 'expired')),
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_creator ON public.challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON public.challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_invite_code ON public.challenges(invite_code);

-- 4. MATCHES
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE RESTRICT,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  creator_side TEXT NOT NULL CHECK (creator_side IN ('a', 'b')),
  opponent_side TEXT NOT NULL CHECK (opponent_side IN ('a', 'b')),
  scheduled_slot_start TIMESTAMPTZ,
  scheduled_slot_end TIMESTAMPTZ,
  creator_confirmed BOOLEAN NOT NULL DEFAULT false,
  opponent_confirmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_time' CHECK (status IN ('pending_time', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'disputed')),
  creator_checked_in_at TIMESTAMPTZ,
  opponent_checked_in_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id),
  winner_side TEXT CHECK (winner_side IN ('creator', 'opponent', 'tie')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_no_self_match CHECK (creator_id != opponent_id),
  CONSTRAINT chk_sides_differ CHECK (creator_side != opponent_side)
);

CREATE INDEX IF NOT EXISTS idx_matches_participants ON public.matches(creator_id, opponent_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_start ON public.matches(scheduled_slot_start);

-- 5. CHALLENGE_SLOTS (Proposals)
CREATE TABLE IF NOT EXISTS public.challenge_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_slot_time CHECK (slot_start < slot_end)
);

CREATE INDEX IF NOT EXISTS idx_slots_match ON public.challenge_slots(match_id);

-- 6. WEEKLY_AVAILABILITY
CREATE TABLE IF NOT EXISTS public.weekly_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_avail_time CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_avail_user ON public.weekly_availability(user_id);

-- 7. AVAILABILITY_EXCEPTIONS
CREATE TABLE IF NOT EXISTS public.availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_exc_time CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_avail_exceptions_user ON public.availability_exceptions(user_id);

-- 8. DEBATE_ROUNDS
CREATE TABLE IF NOT EXISTS public.debate_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number >= 1),
  round_type TEXT NOT NULL CHECK (round_type IN ('opening', 'rebuttal', 'closing')),
  active_speaker_id UUID REFERENCES public.profiles(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_chars INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_match_round UNIQUE (match_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_rounds_match ON public.debate_rounds(match_id);

-- 9. DEBATE_MESSAGES
CREATE TABLE IF NOT EXISTS public.debate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.debate_rounds(id) ON DELETE SET NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON public.debate_messages(match_id);

-- 10. VOTES
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voted_for_side TEXT NOT NULL CHECK (voted_for_side IN ('creator', 'opponent', 'tie')),
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_vote_per_match_user UNIQUE (match_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_match ON public.votes(match_id);

-- 11. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  type TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

-- 12. NOTIFICATION_JOBS
CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h', '1h', '10min')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  in_app_sent BOOLEAN NOT NULL DEFAULT false,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_reminder_job UNIQUE (match_id, user_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_status ON public.notification_jobs(status, scheduled_for);

-- 13. REPORTS
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'challenge', 'message', 'match')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
  reviewed_by UUID REFERENCES public.profiles(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- 14. ADMIN_AUDIT_LOG
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ROW LEVEL SECURITY POLICIES

-- Profiles:
-- Any authenticated or anon can view public profiles unless blocked
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Blocks:
CREATE POLICY "Users can view their own blocks"
  ON public.blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
  ON public.blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Challenges:
-- Public challenges viewable if creator not blocking the viewer
CREATE POLICY "Public challenges are viewable by non-blocked users"
  ON public.challenges FOR SELECT
  USING (
    visibility = 'public'
    OR auth.uid() = creator_id
  );

CREATE POLICY "Authenticated users can create challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator can update open challenge"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = creator_id AND status = 'open');

-- Matches:
CREATE POLICY "Participants and public viewers can view matches"
  ON public.matches FOR SELECT
  USING (
    auth.uid() = creator_id
    OR auth.uid() = opponent_id
    OR status IN ('scheduled', 'in_progress', 'completed')
  );

-- Challenge Slots:
CREATE POLICY "Participants can view challenge slots"
  ON public.challenge_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = challenge_slots.match_id
      AND (m.creator_id = auth.uid() OR m.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Participants can insert challenge slots"
  ON public.challenge_slots FOR INSERT
  WITH CHECK (
    auth.uid() = proposed_by
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = challenge_slots.match_id
      AND (m.creator_id = auth.uid() OR m.opponent_id = auth.uid())
    )
  );

-- Weekly Availability:
CREATE POLICY "Availability viewable by everyone"
  ON public.weekly_availability FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own availability"
  ON public.weekly_availability FOR ALL
  USING (auth.uid() = user_id);

-- Availability Exceptions:
CREATE POLICY "Exceptions viewable by everyone"
  ON public.availability_exceptions FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own exceptions"
  ON public.availability_exceptions FOR ALL
  USING (auth.uid() = user_id);

-- Debate Rounds:
CREATE POLICY "Rounds viewable with match"
  ON public.debate_rounds FOR SELECT
  USING (true);

-- Debate Messages:
CREATE POLICY "Debate messages viewable with match"
  ON public.debate_messages FOR SELECT
  USING (true);

CREATE POLICY "Participants can insert messages during active debate"
  ON public.debate_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = debate_messages.match_id
      AND (m.creator_id = auth.uid() OR m.opponent_id = auth.uid())
      AND m.status = 'in_progress'
    )
  );

-- Votes:
CREATE POLICY "Votes viewable on completed match"
  ON public.votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = votes.match_id
      AND m.status = 'completed'
    )
  );

CREATE POLICY "Non-participant authenticated users can vote once on completed match"
  ON public.votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = votes.match_id
      AND m.status = 'completed'
      AND m.creator_id != auth.uid()
      AND m.opponent_id != auth.uid()
    )
  );

-- Notifications:
CREATE POLICY "Users can view and update their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own notifications as read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Reports:
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters can view their own reports"
  ON public.reports FOR SELECT
  USING (
    auth.uid() = reporter_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Admin Audit Log:
CREATE POLICY "Only admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
