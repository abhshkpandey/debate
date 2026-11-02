"use client";

import React from "react";
import { Button } from "./button";
import { AlertCircle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  children,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-xl border border-[#E4E0D8] bg-[#FFFFFF] p-6 shadow-xl">
        <div className="flex items-start gap-3">
          {variant === "danger" && (
            <div className="rounded-full bg-[#D93A47]/10 p-2 text-[#D93A47]">
              <AlertCircle className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[#0B0D10]">{title}</h3>
            <p className="mt-2 text-sm text-[#5B6472] leading-relaxed">
              {description}
            </p>
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
