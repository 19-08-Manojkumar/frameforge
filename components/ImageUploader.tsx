"use client";
import { useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Plus, Upload } from "lucide-react";

export function ImageUploader({
  onFiles,
  busy,
  count,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  busy: boolean;
  count: number;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null),
    id = useId();
  const [dragging, setDragging] = useState(false),
    depth = useRef(0);
  const disabled = busy || count >= 10;
  return (
    <div
      className={`${compact ? "upload-compact" : "upload-zone"} ${dragging ? "dragging" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        if (!disabled) setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        if (--depth.current <= 0) {
          depth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (!disabled) onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={input}
        id={id}
        data-testid="photo-input"
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple
        disabled={disabled}
        onChange={(e) => {
          onFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
        aria-label="Upload photos"
      />
      {compact ? (
        <button
          className="add-photo"
          onClick={() => input.current?.click()}
          disabled={disabled}
          aria-label="Add more photos"
        >
          {busy ? (
            <LoaderCircle className="spin" size={19} />
          ) : (
            <Plus size={21} />
          )}
          <span>
            {busy ? "Loading" : count >= 10 ? "10 / 10" : "Add photos"}
          </span>
        </button>
      ) : (
        <>
          <div className="upload-icon">
            {busy ? (
              <LoaderCircle size={23} className="spin" />
            ) : (
              <ImagePlus size={23} strokeWidth={1.5} />
            )}
          </div>
          <h3>
            {busy
              ? "Preparing your photos…"
              : dragging
                ? "Drop your photos here"
                : "Start with your favorite photos"}
          </h3>
          <p>Drag & drop up to 10 photos, or choose from your device.</p>
          <button
            className="button primary"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            <Upload size={16} /> Choose photos
          </button>
          <span className="upload-formats">
            JPG, PNG or WEBP · Up to 30 MB each
          </span>
        </>
      )}
    </div>
  );
}
