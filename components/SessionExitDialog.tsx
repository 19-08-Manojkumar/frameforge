"use client";
import { useEffect, useId, useRef } from "react";
import {
  Download,
  LoaderCircle,
  PencilLine,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import type { SessionExitAction } from "@/components/useSessionGuard";

export function SessionExitDialog({
  action,
  busy,
  canDownload,
  downloaded,
  error,
  onCancel,
  onConfirm,
  onDownload,
}: {
  action: SessionExitAction;
  busy: boolean;
  canDownload: boolean;
  downloaded: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  onDownload: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    keepEditing = useRef<HTMLButtonElement>(null),
    id = useId();
  const refreshing = action === "refresh";
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    keepEditing.current?.focus();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="session-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onCancel();
      }}
    >
      <button
        className="session-dialog-close"
        aria-label="Close and keep editing"
        onClick={onCancel}
      >
        <X size={18} />
      </button>
      <div className="session-dialog-icon">
        <RotateCcw size={23} />
      </div>
      <span className="session-eyebrow">YOUR COLLAGE STAYS ON THIS DEVICE</span>
      <h2 id={`${id}-title`}>
        {refreshing
          ? "Refresh before your changes are saved?"
          : "Start a new collage?"}
      </h2>
      <p id={`${id}-description`}>
        {refreshing
          ? "Some recent changes haven’t been saved yet. Keep editing until the draft is saved, or download your finished image first. Refreshing now may lose those recent changes."
          : "Starting over removes your saved draft, photos, text, and edits so you can begin a fresh collage."}
      </p>
      <div className="session-download-hint">
        <Download size={17} />
        <p>
          Download first to keep a finished image. Your last saved draft stays
          in this browser until you start a new collage or clear browser data.
        </p>
      </div>
      {error && (
        <p className="session-dialog-error" role="alert">
          {error}
        </p>
      )}
      {downloaded && (
        <p className="session-dialog-saved" role="status">
          Your finished image has been downloaded. You can keep editing or start
          again when you’re ready.
        </p>
      )}
      <div className="session-dialog-actions">
        <button className="session-keep" ref={keepEditing} onClick={onCancel}>
          <PencilLine size={15} aria-hidden="true" /> Keep editing
        </button>
        <button
          className="session-download"
          disabled={!canDownload || busy}
          onClick={onDownload}
        >
          {busy ? (
            <LoaderCircle size={15} className="spin" />
          ) : (
            <Download size={15} />
          )}{" "}
          {busy ? "Preparing image…" : "Download first"}
        </button>
        <button className="session-confirm" disabled={busy} onClick={onConfirm}>
          {refreshing ? (
            <RotateCcw size={15} aria-hidden="true" />
          ) : (
            <Plus size={15} aria-hidden="true" />
          )}
          {refreshing ? "Refresh anyway" : "Start new collage"}
        </button>
      </div>
      {!canDownload && !busy && (
        <p className="session-dialog-footnote">
          To download first, keep editing, add your photos, and choose a valid
          export size.
        </p>
      )}
    </dialog>
  );
}
