import React from "react";
import { requireAdmin } from "@/lib/auth/session";
import { memoryStore } from "@/lib/db/store";
import { isDevFallbackActive } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Shield, AlertCircle, FileText, Users, Swords } from "lucide-react";
import { AdminConsoleClient } from "./admin-console-client";
import { Report, AdminAuditLog, Profile, Challenge, Match } from "@/types/database";

async function getAdminData() {
  if (isDevFallbackActive) {
    const reports = Array.from(memoryStore.reports.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const r of reports) {
      r.reporter = memoryStore.profiles.get(r.reporter_id);
    }

    const auditLogs = Array.from(memoryStore.adminAuditLogs.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const profiles = Array.from(memoryStore.profiles.values());
    const challenges = Array.from(memoryStore.challenges.values());
    const matches = Array.from(memoryStore.matches.values());

    return { reports, auditLogs, profiles, challenges, matches };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { reports: [], auditLogs: [], profiles: [], challenges: [], matches: [] };
  }

  const { data: reports } = await supabase
    .from("reports")
    .select("*, reporter:profiles!reporter_id(*)")
    .order("created_at", { ascending: false });

  const { data: auditLogs } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: profiles } = await supabase.from("profiles").select("*").limit(100);
  const { data: challenges } = await supabase.from("challenges").select("*").limit(100);
  const { data: matches } = await supabase.from("matches").select("*").limit(100);

  return {
    reports: (reports as Report[]) || [],
    auditLogs: (auditLogs as AdminAuditLog[]) || [],
    profiles: (profiles as Profile[]) || [],
    challenges: (challenges as Challenge[]) || [],
    matches: (matches as Match[]) || [],
  };
}

export default async function AdminPage() {
  const adminSession = await requireAdmin();
  const { reports, auditLogs, profiles, challenges, matches } = await getAdminData();

  const pendingReportsCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-[#E4E0D8] pb-6">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded bg-[#6B5CE6] px-2 py-0.5 text-xs font-bold text-white">
            <Shield className="h-3.5 w-3.5" />
            ADMIN ACCESS
          </span>
          <span className="text-xs text-[#5B6472]">
            Signed in as {adminSession.profile.display_name}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-black text-[#0B0D10] tracking-tight">
          Platform Administration & Safety
        </h1>
        <p className="mt-1 text-sm text-[#5B6472]">
          Moderator queue, safety reports, audit logs, and compliance enforcement.
        </p>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5B6472]">
              Pending Reports
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-[#D93A47]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0B0D10]">{pendingReportsCount}</div>
            <p className="text-xs text-[#5B6472] mt-1">Requires review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5B6472]">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-[#0B0D10]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0B0D10]">{profiles.length}</div>
            <p className="text-xs text-[#5B6472] mt-1">Registered profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5B6472]">
              Active Challenges
            </CardTitle>
            <Swords className="h-4 w-4 text-[#C7F36B]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0B0D10]">{challenges.length}</div>
            <p className="text-xs text-[#5B6472] mt-1">Total created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#5B6472]">
              Audit Logs
            </CardTitle>
            <FileText className="h-4 w-4 text-[#6B5CE6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0B0D10]">{auditLogs.length}</div>
            <p className="text-xs text-[#5B6472] mt-1">Immutable logged events</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Admin Console Tabs */}
      <AdminConsoleClient
        initialReports={reports}
        initialAuditLogs={auditLogs}
        profiles={profiles}
        challenges={challenges}
        matches={matches}
      />
    </div>
  );
}
