import { NextResponse } from "next/server";
import { memoryStore } from "@/lib/db/store";
import { env, isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateIcsContent } from "@/lib/calendar/export";
import { Match } from "@/types/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let match: Match | null = null;

  if (isDevFallbackActive) {
    const m = memoryStore.matches.get(id);
    if (m) {
      m.challenge = memoryStore.challenges.get(m.challenge_id);
      m.creator = memoryStore.profiles.get(m.creator_id);
      m.opponent = memoryStore.profiles.get(m.opponent_id);
      match = m;
    }
  } else {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("matches")
        .select("*, challenge:challenges(*), creator:profiles!creator_id(*), opponent:profiles!opponent_id(*)")
        .eq("id", id)
        .single();
      match = data as Match | null;
    }
  }

  if (!match || !match.scheduled_slot_start || !match.scheduled_slot_end) {
    return new NextResponse("Match not found or not yet scheduled.", { status: 404 });
  }

  const ics = generateIcsContent({
    matchId: match.id,
    title: match.challenge?.title || "Debate Match",
    description: match.challenge?.description || "",
    start: new Date(match.scheduled_slot_start),
    end: new Date(match.scheduled_slot_end),
    matchUrl: `${env.NEXT_PUBLIC_APP_URL}/debate-room/${match.id}`,
    creatorName: match.creator?.display_name || "Creator",
    opponentName: match.opponent?.display_name || "Opponent",
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="debate-match-${match.id}.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
