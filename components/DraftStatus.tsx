"use client";
import { Check, CloudOff, LoaderCircle, RotateCcw, Save } from "lucide-react";
import type { DraftStatus as Status } from "@/components/useLocalDraft";
export function DraftStatus({
  status,
  hasWork,
  error,
  updatedAt,
  onRetry,
  onSave,
}: {
  status: Status;
  hasWork: boolean;
  error: string;
  updatedAt: number | null;
  onRetry: () => void;
  onSave: () => void;
}) {
  const label =
    status === "checking"
      ? "Checking for a draft…"
      : status === "error"
        ? "Draft not saved"
        : !hasWork
          ? "Drafts save on this device"
          : status === "saving"
            ? "Saving draft…"
            : status === "saved"
              ? "Draft saved on this device"
              : "Changes waiting to save";
  return (
    <div
      className={`draft-status draft-status-${status}`}
      data-testid="draft-status"
      aria-live="polite"
    >
      {status === "checking" || status === "saving" ? (
        <LoaderCircle size={13} className="spin" />
      ) : status === "error" ? (
        <CloudOff size={13} />
      ) : status === "saved" && hasWork ? (
        <Check size={13} />
      ) : (
        <Save size={13} />
      )}
      <span
        title={
          error ||
          (updatedAt
            ? `Last saved ${new Date(updatedAt).toLocaleTimeString()}. Browser storage can be cleared by device settings.`
            : "Photos and edits are saved in this browser only.")
        }
      >
        {label}
      </span>
      {status === "error" ? (
        <button onClick={onRetry}>
          <RotateCcw size={11} aria-hidden="true" /> Retry
        </button>
      ) : hasWork && status === "unsaved" ? (
        <button onClick={onSave}>
          <Save size={11} aria-hidden="true" /> Save now
        </button>
      ) : null}
      {status === "error" && <p role="alert">{error}</p>}
    </div>
  );
}
