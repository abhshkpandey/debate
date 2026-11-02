"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Download, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import { requestAccountDeletionAction, requestAccountDataExportAction } from "@/app/actions/admin";
import { submitModerationAppealAction } from "@/app/actions/reports";

export function DataRightsForm({ isSuspended = false }: { isSuspended?: boolean }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [appealReason, setAppealReason] = useState("Sanction Dispute");
  const [appealStatement, setAppealStatement] = useState("");
  const [showAppealForm, setShowAppealForm] = useState(isSuspended);
  const [isPending, startTransition] = useTransition();

  const handleExportData = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await requestAccountDataExportAction();
      if (res.success && res.data) {
        // Download as JSON file
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `debate-account-data-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setStatusMessage({ text: "Account data archive exported successfully.", type: "success" });
      } else {
        setStatusMessage({ text: res.error || "Failed to compile data archive.", type: "error" });
      }
    });
  };

  const handleConfirmDelete = () => {
    startTransition(async () => {
      const res = await requestAccountDeletionAction();
      setShowDeleteConfirm(false);
      setStatusMessage({ text: res.message, type: "success" });
    });
  };

  const handleSendAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (appealStatement.trim().length < 10) {
      setStatusMessage({ text: "Appeal statement must be at least 10 characters.", type: "error" });
      return;
    }

    startTransition(async () => {
      const res = await submitModerationAppealAction({
        reason: appealReason,
        statement: appealStatement,
      });

      if (res.success) {
        setStatusMessage({
          text: "Your appeal was submitted to the moderation queue for administrator review.",
          type: "success",
        });
        setAppealStatement("");
        setShowAppealForm(false);
      } else {
        setStatusMessage({ text: res.error || "Failed to submit appeal.", type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6 mt-6">
      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-lg p-3 text-xs font-semibold border ${
            statusMessage.type === "success"
              ? "bg-[#1F9D61]/10 text-[#1F9D61] border-[#1F9D61]/20"
              : "bg-[#D93A47]/10 text-[#D93A47] border-[#D93A47]/20"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Moderation Appeal Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#6B5CE6]" />
            Moderation Appeals
          </CardTitle>
          <CardDescription>
            If your account or debate was sanctioned or flagged unfairly, you may submit a formal appeal directly to platform administrators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showAppealForm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAppealForm(true)}
            >
              Submit Moderation Appeal
            </Button>
          ) : (
            <form onSubmit={handleSendAppeal} className="space-y-3">
              <div>
                <label htmlFor="appeal-reason" className="block text-xs font-bold text-[#0B0D10] mb-1">
                  Appeal Subject:
                </label>
                <select
                  id="appeal-reason"
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] px-3 py-2 text-xs text-[#0B0D10] focus:outline-hidden focus:ring-2 focus:ring-[#C7F36B]"
                >
                  <option value="Sanction Dispute">Sanction Dispute</option>
                  <option value="Warning Disagreement">Warning Disagreement</option>
                  <option value="Content Restoration Request">Content Restoration Request</option>
                  <option value="Misunderstood Context">Misunderstood Argumentative Context</option>
                </select>
              </div>

              <div>
                <label htmlFor="appeal-statement" className="block text-xs font-bold text-[#0B0D10] mb-1">
                  Appeal Statement & Justification:
                </label>
                <textarea
                  id="appeal-statement"
                  rows={3}
                  value={appealStatement}
                  onChange={(e) => setAppealStatement(e.target.value)}
                  placeholder="Explain why the sanction or warning was issued in error..."
                  className="w-full rounded-md border border-[#E4E0D8] bg-[#FAF8F4] p-2.5 text-xs text-[#0B0D10] focus:outline-hidden focus:ring-2 focus:ring-[#C7F36B]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAppealForm(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending || appealStatement.trim().length < 10}
                  isLoading={isPending}
                >
                  Send Appeal to Admins
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Account Data Rights & GDPR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Rights & Account Deletion</CardTitle>
          <CardDescription>
            Download an archive of your profile, challenges, arguments, and votes, or permanently request account deletion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E0D8] pb-4">
            <div>
              <h4 className="text-xs font-bold text-[#0B0D10]">Export My Debate History</h4>
              <p className="text-[11px] text-[#5B6472]">
                Download a JSON archive containing all your public challenges, debate messages, and profile preferences.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={isPending}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download Archive
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              <h4 className="text-xs font-bold text-[#D93A47]">Delete Account</h4>
              <p className="text-[11px] text-[#5B6472]">
                Permanently wipes your personal data, deactivates your profile, and cancels pending matches.
              </p>
            </div>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isPending}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Permanently Delete Account?"
        description="This action cannot be undone. Your profile will be deactivated, and your account will no longer be able to log in or participate in debates."
        confirmText="Confirm Permanent Deletion"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
