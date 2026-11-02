import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Challenge, CATEGORIES } from "@/types/database";
import { DebateCard } from "@/components/debate/debate-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Swords } from "lucide-react";

async function getExploreChallenges(
  viewerId?: string,
  category?: string,
  format?: string,
  q?: string
): Promise<Challenge[]> {
  if (isDevFallbackActive) {
    let list = Array.from(memoryStore.challenges.values()).filter(
      (c) => c.status === "open" && c.visibility === "public"
    );

    // Filter out blocked creators
    if (viewerId) {
      list = list.filter((c) => {
        const key1 = `${viewerId}_${c.creator_id}`;
        const key2 = `${c.creator_id}_${viewerId}`;
        return !memoryStore.blocks.has(key1) && !memoryStore.blocks.has(key2);
      });
    }

    if (category) {
      list = list.filter((c) => c.category.toLowerCase() === category.toLowerCase());
    }

    if (format) {
      list = list.filter((c) => c.format === format);
    }

    if (q) {
      const lower = q.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(lower) ||
          c.description.toLowerCase().includes(lower) ||
          c.position_a.toLowerCase().includes(lower) ||
          c.position_b.toLowerCase().includes(lower)
      );
    }

    for (const c of list) {
      c.creator = memoryStore.profiles.get(c.creator_id);
    }
    return list;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  let query = supabase
    .from("challenges")
    .select("*, creator:profiles(*)")
    .eq("status", "open")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }
  if (format) {
    query = query.eq("format", format);
  }
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data } = await query;
  return (data as Challenge[]) || [];
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; format?: string; q?: string }>;
}) {
  const { category, format, q } = await searchParams;
  const currentUser = await getCurrentUser();
  const challenges = await getExploreChallenges(currentUser?.id, category, format, q);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D8] pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#0B0D10] tracking-tight">
            Explore Open Challenges
          </h1>
          <p className="mt-1 text-sm text-[#5B6472]">
            Find an open debate, choose the counter-argument, and schedule your showdown.
          </p>
        </div>

        <Link href="/challenges/new">
          <Button variant="primary" className="font-bold">
            Start a Challenge
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/explore${format ? `?format=${format}` : ""}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              !category
                ? "bg-[#0B0D10] text-[#FFFFFF]"
                : "bg-[#FFFFFF] text-[#0B0D10] border border-[#E4E0D8] hover:bg-[#F1EEE8]"
            }`}
          >
            All Categories
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/explore?category=${encodeURIComponent(cat)}${format ? `&format=${format}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                category === cat
                  ? "bg-[#0B0D10] text-[#FFFFFF]"
                  : "bg-[#FFFFFF] text-[#0B0D10] border border-[#E4E0D8] hover:bg-[#F1EEE8]"
              }`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Search and Format Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <form method="GET" action="/explore" className="flex items-center gap-1.5">
            {category && <input type="hidden" name="category" value={category} />}
            {format && <input type="hidden" name="format" value={format} />}
            <input
              type="text"
              name="q"
              defaultValue={q || ""}
              placeholder="Search debates by title or topic..."
              className="rounded-lg border border-[#E4E0D8] bg-[#FFFFFF] px-3 py-1 text-xs text-[#0B0D10] focus:outline-hidden focus:ring-2 focus:ring-[#C7F36B] w-48 sm:w-64"
            />
            <Button type="submit" variant="secondary" size="sm" className="h-7 text-xs px-2.5">
              Search
            </Button>
          </form>

          {/* Format Toggle */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-[#5B6472]">Format:</span>
          <Link
            href={`/explore?${category ? `category=${encodeURIComponent(category)}&` : ""}format=quick_clash`}
            className={`rounded px-2.5 py-1 border transition-colors ${
              format === "quick_clash"
                ? "bg-[#0B0D10] text-[#C7F36B] border-[#0B0D10]"
                : "bg-[#FFFFFF] text-[#0B0D10] border-[#E4E0D8] hover:bg-[#F1EEE8]"
            }`}
          >
            ⚡ Quick Clash
          </Link>
          <Link
            href={`/explore?${category ? `category=${encodeURIComponent(category)}&` : ""}format=standard`}
            className={`rounded px-2.5 py-1 border transition-colors ${
              format === "standard"
                ? "bg-[#0B0D10] text-[#C7F36B] border-[#0B0D10]"
                : "bg-[#FFFFFF] text-[#0B0D10] border-[#E4E0D8] hover:bg-[#F1EEE8]"
            }`}
          >
            ⏱ Standard
          </Link>
          {format && (
            <Link
              href={`/explore${category ? `?category=${encodeURIComponent(category)}` : ""}`}
              className="text-[#5B6472] underline hover:text-[#0B0D10] ml-1"
            >
              Clear
            </Link>
          )}
          </div>
        </div>
      </div>

      {/* Challenge Grid */}
      <div className="mt-8">
        {challenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((c) => (
              <DebateCard key={c.id} challenge={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Swords}
            title={
              category || format
                ? "No matching challenges found"
                : "No open public challenges right now"
            }
            description="Try clearing your filters or create a new topic to challenge someone."
            action={
              <Link href="/challenges/new">
                <Button variant="primary">Create Challenge</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
