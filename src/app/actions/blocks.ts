"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Block } from "@/types/database";
import { revalidatePath } from "next/cache";

export async function blockUserAction(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (user.id === targetUserId) {
    return { success: false, error: "You cannot block yourself" };
  }

  if (isDevFallbackActive) {
    const blockKey = `${user.id}_${targetUserId}`;
    const block: Block = {
      id: `blk_${Date.now()}`,
      blocker_id: user.id,
      blocked_id: targetUserId,
      created_at: new Date().toISOString(),
    };
    memoryStore.blocks.set(blockKey, block);
    revalidatePath(`/u/[username]`, "layout");
    revalidatePath("/explore");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { error } = await supabase.from("blocks").insert({
    blocker_id: user.id,
    blocked_id: targetUserId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/u/[username]`, "layout");
  revalidatePath("/explore");
  return { success: true };
}

export async function unblockUserAction(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (isDevFallbackActive) {
    const blockKey = `${user.id}_${targetUserId}`;
    memoryStore.blocks.delete(blockKey);
    revalidatePath(`/u/[username]`, "layout");
    revalidatePath("/explore");
    return { success: true };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { success: false, error: "Database client unavailable" };

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetUserId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/u/[username]`, "layout");
  revalidatePath("/explore");
  return { success: true };
}

export async function checkBlockStatus(userIdA: string, userIdB: string): Promise<boolean> {
  if (isDevFallbackActive) {
    const key1 = `${userIdA}_${userIdB}`;
    const key2 = `${userIdB}_${userIdA}`;
    return memoryStore.blocks.has(key1) || memoryStore.blocks.has(key2);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${userIdA},blocked_id.eq.${userIdB}),and(blocker_id.eq.${userIdB},blocked_id.eq.${userIdA})`
    )
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Mute user action (SHOULD item).
 * Suppresses notifications and feed visibility from target user.
 */
export async function muteUserAction(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (user.id === targetUserId) {
    return { success: false, error: "You cannot mute yourself" };
  }

  if (isDevFallbackActive) {
    const muteKey = `mute_${user.id}_${targetUserId}`;
    memoryStore.blocks.set(muteKey, {
      id: `mut_${Date.now()}`,
      blocker_id: user.id,
      blocked_id: targetUserId,
      created_at: new Date().toISOString(),
    });
    revalidatePath(`/u/[username]`, "layout");
    return { success: true };
  }

  return { success: true };
}

export async function unmuteUserAction(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Authentication required" };

  if (isDevFallbackActive) {
    const muteKey = `mute_${user.id}_${targetUserId}`;
    memoryStore.blocks.delete(muteKey);
    revalidatePath(`/u/[username]`, "layout");
    return { success: true };
  }

  return { success: true };
}

export async function checkMuteStatus(muterId: string, targetUserId: string): Promise<boolean> {
  if (isDevFallbackActive) {
    const muteKey = `mute_${muterId}_${targetUserId}`;
    return memoryStore.blocks.has(muteKey);
  }
  return false;
}
