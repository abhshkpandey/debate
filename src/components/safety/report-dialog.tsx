"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Flag, AlertCircle, CheckCircle2, X } from "lucide-react";
import { createReportAction } from "@/app/actions/reports";

interface ReportDialogProps {
  targetType: "user" | "challenge" | "message" | "match";
  targetId: string;
  targetLabel?: string;
  triggerButton?: React.ReactNode;
}

const REPORT_REASONS = [
  "Harassment, hate speech, or personal attacks",
  "Fabricated evidence or fake citations",
  "Bad faith conduct or trolling",
  "Spam, solicitation, or scam",
  "Impersonation or deceptive identity",
  "Violation of community guidelines",
  "Other",
];

export function ReportDialog({
  targetType,
  targetId,
  targetLabel,
  triggerButton,
}: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
    setIsSuccess(false);
    setDescription("");
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 10) {
      setError("Please describe the issue in at least 10 characters.");
      return;
    }

    startTransition(async () => {
      const res = await createReportAction({
        targetType,
        targetId,
        reason,
        description,
      });

      if (!res.success) {
        setError(res.error || "Failed to submit report.");
      } else {
        setIsSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setIsSuccess(false);
          setDescription("");
        }, 1800);
      }
    });
  };

  return (
    <>
      {triggerButton ? (
        <span onClick={handleOpen} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && handleOpen()}>
          {triggerButton}
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="text-[#5B6472] hover:text-[#D93A47] hover:border-[#D93A47]"
        >
          <Flag className="h-3.5 w-3.5 mr-1" />
          Report {targetLabel || targetType}
        </Button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-xl relative">
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-[#5B6472] hover:text-[#0B0D10] p-1 rounded-md"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#D93A47]">
              <Flag className="h-5 w-5" />
              <h3 className="text-lg font-bold text-[#0B0D10]">
                Report {targetLabel || targetType}
              </h3>
            </div>
            <p className="mt-1 text-xs text-[#5B6472]">
              Reports are audited by platform moderators. Submitting false reports is a violation of community guidelines.
            </p>

            {isSuccess ? (
              <div className="my-6 rounded-lg bg-[#1F9D61]/10 border border-[#1F9D61]/20 p-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-[#1F9D61] mx-auto mb-2" />
                <h4 className="font-bold text-[#1F9D61]">Report Submitted</h4>
                <p className="text-xs text-[#5B6472] mt-1">
                  Thank you for keeping Debate a safe and intellectually honest environment.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {error && (
                  <div className="rounded-lg bg-[#D93A47]/10 border border-[#D93A47]/20 p-3 text-xs text-[#D93A47] flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="report-reason" className="block text-xs font-bold text-[#0B0D10] mb-1">
                    Primary Reason
                  </label>
                  <select
                    id="report-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-md border border-[#E4E0D8] bg-[#FFFFFF] px-3 py-2 text-sm text-[#0B0D10] focus:outline-hidden focus:ring-2 focus:ring-[#C7F36B]"
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="report-desc" className="block text-xs font-bold text-[#0B0D10] mb-1">
                    Specific Evidence & Details
                  </label>
                  <textarea
                    id="report-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    maxLength={1500}
                    placeholder="Provide context, quote specific offending statements, or cite relevant timestamps..."
                    className="w-full rounded-md border border-[#E4E0D8] bg-[#FFFFFF] p-3 text-sm text-[#0B0D10] placeholder:text-[#5B6472]/60 focus:outline-hidden focus:ring-2 focus:ring-[#C7F36B]"
                  />
                  <div className="flex justify-between text-[11px] text-[#5B6472] mt-1">
                    <span>Minimum 10 characters</span>
                    <span>{description.length}/1500</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-[#E4E0D8]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="danger"
                    isLoading={isPending}
                    disabled={isPending || description.trim().length < 10}
                  >
                    Submit Report
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
