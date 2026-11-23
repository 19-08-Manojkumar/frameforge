"use client";
import { useEffect, useRef } from "react";
import { Clock3, LoaderCircle, Plus, RotateCcw } from "lucide-react";
import type { DraftRecord } from "@/lib/draftStorage";

export function DraftRecoveryDialog({
  record,
  busy,
  error,
  progress,
  onRestore,
  onDiscard,
}: {
  record: DraftRecord;
  busy: boolean;
  error: string;
  progress: { current: number; total: number };
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const photoCount =
    record.photos.length +
    Object.values(record.themeImages).reduce(
      (sum, images) => sum + (images?.length ?? 0),
      0,
    );
  return (
    <dialog
      className="draft-recovery-dialog"
      ref={ref}
      aria-labelledby="draft-recovery-title"
      onCancel={(event) => event.preventDefault()}
    >
      {record.thumbnail?.startsWith("data:image/jpeg;") && (
        <img
          className="draft-recovery-thumbnail"
          src={record.thumbnail}
          alt="Preview of your saved collage"
        />
      )}
      <span className="eyebrow">SAVED ON THIS DEVICE</span>
      <h2 id="draft-recovery-title">Pick up where you left off.</h2>
      <p>Your photos, design, and edits are ready to continue.</p>
      <div className="draft-recovery-meta">
        <Clock3 size={14} />
        <span>
          {photoCount} {photoCount === 1 ? "photo" : "photos"} ·{" "}
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(record.updatedAt)}
        </span>
      </div>
      {error && (
        <p className="draft-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button primary"
        autoFocus
        disabled={busy}
        onClick={onRestore}
      >
        {busy ? (
          <LoaderCircle size={16} className="spin" />
        ) : (
          <RotateCcw size={16} />
        )}
        {busy
          ? progress.total
            ? `Restoring ${progress.current} of ${progress.total} photos…`
            : "Opening your draft…"
          : error
            ? "Retry opening draft"
            : "Continue editing"}
      </button>
      <button className="draft-start-fresh" disabled={busy} onClick={onDiscard}>
        <Plus size={14} aria-hidden="true" /> Start a new collage instead
      </button>
      <small>
        Starting new removes this saved draft. Nothing is uploaded to a server.
      </small>
    </dialog>
  );
}
