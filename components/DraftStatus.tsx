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
  const tooltip =
    [
      "Collage editing and drafts stay in this browser on this device.",
      "Optional Cloudflare AI sends your chosen reference image to Cloudflare.",
      error ||
        (status === "checking"
          ? "Checking for drafts."
          : status === "saving"
            ? "Saving photos and edits."
            : status === "error"
              ? "The draft could not be saved. You can retry."
              : hasWork && status === "unsaved"
                ? "Changes are waiting to save. Use Save now to keep them on this device."
                : updatedAt
                  ? `Last saved ${new Date(updatedAt).toLocaleTimeString()}.`
                  : ""),
    ]
      .filter(Boolean)
      .join(" ");
  const label =
    status === "checking"
      ? "Local editing · Checking for drafts…"
      : status === "error"
        ? "Local editing · Draft not saved"
        : !hasWork
          ? "Local editing · Drafts save on this device"
          : status === "saving"
            ? "Local editing · Saving draft…"
            : status === "saved"
              ? "Local editing · Draft saved on this device"
              : "Local editing · Changes waiting to save";
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
        className="draft-status-tooltip"
        data-tooltip={tooltip}
        tabIndex={0}
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
