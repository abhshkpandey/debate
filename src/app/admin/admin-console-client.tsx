"use client";

import React, { useState, useTransition } from "react";
import { Report, AdminAuditLog, Profile, Challenge, Match } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  resolveReportAction,
  AdminResolutionAction,
} from "@/app/actions/admin";
import {
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ban,
  EyeOff,
  User,
  Swords,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface AdminConsoleClientProps {
  initialReports: Report[];
  initialAuditLogs: AdminAuditLog[];
  profiles: Profile[];
  challenges: Challenge[];
  matches: Match[];
}

export function AdminConsoleClient({
  initialReports,
  initialAuditLogs,
  profiles,
  challenges,
  matches,
}: AdminConsoleClientProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "search" | "audit">("queue");
  const [queueFilter, setQueueFilter] = useState<"pending" | "action_taken" | "dismissed" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"users" | "challenges" | "matches">("users");

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionModal, setActionModal] = useState<AdminResolutionAction | null>(null);
  const [moderatorNotes, setModeratorNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredReports = initialReports.filter((r) => {
    if (queueFilter === "all") return true;
    return r.status === queueFilter;
  });

  const handleOpenAction = (report: Report, action: AdminResolutionAction) => {
    setSelectedReport(report);
    setActionModal(action);
    setModeratorNotes("");
    setActionError(null);
  };

  const handleConfirmAction = () => {
    if (!selectedReport || !actionModal) return;

    startTransition(async () => {
      const res = await resolveReportAction({
        reportId: selectedReport.id,
        action: actionModal,
        notes: moderatorNotes,
      });

      if (!res.success) {
        setActionError(res.error || "Failed to process admin action.");
      } else {
        setActionModal(null);
        setSelectedReport(null);
      }
    });
  };

  // Search filtering
  const filteredUsers = profiles.filter(
    (p) =>
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChallenges = challenges.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMatches = matches.filter(
    (m) =>
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-[#E4E0D8] gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === "queue"
              ? "border-[#0B0D10] text-[#0B0D10]"
              : "border-transparent text-[#5B6472] hover:text-[#0B0D10]"
          }`}
        >
          <AlertCircle className="h-4 w-4 text-[#D93A47]" />
          Report Triage Queue
          <span className="rounded-full bg-[#D93A47]/10 px-2 py-0.5 text-xs text-[#D93A47] font-extrabold">
            {initialReports.filter((r) => r.status === "pending").length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("search")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === "search"
              ? "border-[#0B0D10] text-[#0B0D10]"
              : "border-transparent text-[#5B6472] hover:text-[#0B0D10]"
          }`}
        >
          <Search className="h-4 w-4" />
          Entity Search & Moderation
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === "audit"
              ? "border-[#0B0D10] text-[#0B0D10]"
              : "border-transparent text-[#5B6472] hover:text-[#0B0D10]"
          }`}
        >
          <FileText className="h-4 w-4 text-[#6B5CE6]" />
          Immutable Audit Log
          <span className="rounded-full bg-[#F1EEE8] px-2 py-0.5 text-xs text-[#5B6472] font-semibold">
            {initialAuditLogs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Report Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#5B6472]">Filter Status:</span>
              {(["pending", "action_taken", "dismissed", "all"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setQueueFilter(st)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer capitalize transition-colors ${
                    queueFilter === st
                      ? "bg-[#0B0D10] text-[#FAF8F4]"
                      : "bg-[#F1EEE8] text-[#5B6472] hover:text-[#0B0D10]"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#5B6472]">
              Showing {filteredReports.length} reports
            </span>
          </div>

          {filteredReports.length > 0 ? (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-5 shadow-xs space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4E0D8] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#FAF8F4] border border-[#E4E0D8] text-[#0B0D10]">
                        Target: {report.target_type}
                      </span>
                      <span className="text-xs text-[#5B6472]">ID: {report.target_id}</span>
                      <Badge
                        variant={
                          report.status === "pending"
                            ? "default"
                            : report.status === "action_taken"
                            ? "scheduled"
                            : "outline"
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-[#5B6472]">
                      Reported by {report.reporter?.display_name || report.reporter_id} •{" "}
                      {new Date(report.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#0B0D10]">
                      Reason: <span className="font-semibold text-[#D93A47]">{report.reason}</span>
                    </h4>
                    <p className="mt-1 text-xs text-[#5B6472] bg-[#FAF8F4] p-3 rounded-md border border-[#E4E0D8]/60 leading-relaxed whitespace-pre-wrap">
                      {report.description}
                    </p>
                  </div>

                  {report.reviewed_at && (
                    <div className="text-[11px] text-[#5B6472] bg-emerald-50/50 p-2 rounded border border-emerald-100 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#1F9D61]" />
                      <span>
                        Reviewed on {new Date(report.reviewed_at).toLocaleDateString()}:{" "}
                        <strong className="text-[#0B0D10]">{report.review_notes}</strong>
                      </span>
                    </div>
                  )}

                  {report.status === "pending" && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E4E0D8]">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAction(report, "dismiss")}
                        className="text-xs"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1 text-[#5B6472]" />
                        Dismiss
                      </Button>

                      {(report.target_type === "challenge" || report.target_type === "message") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAction(report, "hide_content")}
                          className="text-xs text-amber-700 hover:border-amber-400"
                        >
                          <EyeOff className="h-3.5 w-3.5 mr-1" />
                          Hide Content
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAction(report, "warn_user")}
                        className="text-xs text-amber-800 hover:border-amber-500"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        Warn User
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleOpenAction(report, "suspend_user")}
                        className="text-xs"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" />
                        Suspend User
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No reports in this category"
              description="No safety violations or user reports matching the active filter."
            />
          )}
        </div>
      )}

      {/* Tab 2: Entity Search */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, username, title, or category..."
                className="w-full rounded-md border border-[#E4E0D8] bg-[#FFFFFF] px-3 py-2 text-sm text-[#0B0D10] focus:outline-hidden focus:ring-2 focus:ring-[#C7F36B]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(["users", "challenges", "matches"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSearchType(t)}
                  className={`px-3 py-2 rounded-md text-xs font-bold capitalize cursor-pointer transition-colors ${
                    searchType === t
                      ? "bg-[#0B0D10] text-white"
                      : "bg-[#F1EEE8] text-[#5B6472] hover:text-[#0B0D10]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {searchType === "users" && (
            <div className="space-y-3">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border border-[#E4E0D8] bg-[#FFFFFF] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#F1EEE8] flex items-center justify-center font-bold text-sm">
                        {u.display_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0B0D10]">{u.display_name}</span>
                          <span className="text-xs text-[#5B6472]">@{u.username}</span>
                          {u.is_suspended && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-700">
                              SUSPENDED
                            </span>
                          )}
                          {u.is_admin && (
                            <span className="rounded bg-[#6B5CE6]/10 px-1.5 py-0.5 text-[10px] font-extrabold text-[#6B5CE6]">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#5B6472]">{u.timezone} • ID: {u.id}</span>
                      </div>
                    </div>
                    <Link href={`/u/${u.username}`}>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <EmptyState icon={User} title="No users found" description="Try a different username or ID." />
              )}
            </div>
          )}

          {searchType === "challenges" && (
            <div className="space-y-3">
              {filteredChallenges.length > 0 ? (
                filteredChallenges.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-[#E4E0D8] bg-[#FFFFFF] p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0B0D10]">{c.title}</span>
                        <Badge variant={c.status === "open" ? "open" : "default"}>{c.status}</Badge>
                      </div>
                      <p className="text-xs text-[#5B6472] mt-1">{c.category} • Format: {c.format}</p>
                    </div>
                    <Link href={`/debate/${c.id}`}>
                      <Button variant="outline" size="sm">
                        View Challenge
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <EmptyState icon={Swords} title="No challenges found" description="Try a different query." />
              )}
            </div>
          )}

          {searchType === "matches" && (
            <div className="space-y-3">
              {filteredMatches.length > 0 ? (
                filteredMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-[#E4E0D8] bg-[#FFFFFF] p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0B0D10]">Match #{m.id}</span>
                        <Badge variant="scheduled">{m.status}</Badge>
                      </div>
                      <span className="text-xs text-[#5B6472] mt-1 block">
                        Participants: {m.creator_id} vs {m.opponent_id}
                      </span>
                    </div>
                    <Link href={`/debate-room/${m.id}`}>
                      <Button variant="outline" size="sm">
                        Open Room
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <EmptyState icon={Clock} title="No matches found" description="Try a different match ID." />
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Immutable Audit Log */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F4] border-b border-[#E4E0D8] text-[#5B6472] uppercase font-bold">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E0D8]">
                  {initialAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAF8F4]/50">
                      <td className="p-3 whitespace-nowrap text-[#5B6472]">
                        {new Date(log.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="p-3 font-semibold text-[#0B0D10]">{log.admin_id}</td>
                      <td className="p-3">
                        <span className="rounded bg-[#0B0D10] px-2 py-0.5 text-[10px] font-bold text-[#FAF8F4] uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-[#5B6472]">
                        <span className="font-semibold text-[#0B0D10]">{log.target_type}:</span> {log.target_id}
                      </td>
                      <td className="p-3 text-[#5B6472] font-mono text-[11px] max-w-xs truncate">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {initialAuditLogs.length === 0 && (
              <div className="p-8 text-center text-xs text-[#5B6472]">
                No admin audit logs recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resolution Action Confirmation Modal */}
      {actionModal && selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-[#0B0D10]">
              Confirm Moderator Action: <span className="uppercase text-[#D93A47]">{actionModal.replace("_", " ")}</span>
            </h3>
            <p className="text-xs text-[#5B6472]">
              This action will be executed immediately and recorded into the immutable administrative audit log.
            </p>

            {actionError && (
              <div className="rounded bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                {actionError}
              </div>
            )}

            <div>
              <label htmlFor="moderator-notes" className="block text-xs font-bold text-[#0B0D10] mb-1">
                Moderation Notes / Audit Justification:
              </label>
              <textarea
                id="moderator-notes"
                value={moderatorNotes}
                onChange={(e) => setModeratorNotes(e.target.value)}
                rows={3}
                placeholder="State the rule violation or justification for this decision..."
                className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] p-2.5 text-xs text-[#0B0D10] focus:outline-hidden focus:ring-2 focus:ring-[#C7F36B]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E4E0D8]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActionModal(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={actionModal === "suspend_user" ? "danger" : "primary"}
                size="sm"
                onClick={handleConfirmAction}
                isLoading={isPending}
              >
                Confirm Action
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
