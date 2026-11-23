"use client";
import { useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Info,
  Trash2,
  X,
} from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import type { Photo } from "@/types/collage";

export function ImageGallery({
  photos,
  busy,
  onRemove,
  onReorder,
  onFiles,
  onClear,
  selectedId,
  onSelect,
}: {
  photos: Photo[];
  busy: boolean;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onFiles: (files: File[]) => void;
  onClear: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const dragIndex = useRef<number | null>(null);
  return (
    <section
      className="photo-tray"
      id="photos"
      aria-labelledby="photos-heading"
    >
      <div className="tray-heading">
        <h2 id="photos-heading">
          Your photos <span className="count-pill">{photos.length}/10</span>
        </h2>
        <button
          className="text-button"
          onClick={onClear}
          disabled={busy || !photos.length}
        >
          <Trash2 size={11} aria-hidden="true" /> Clear all
        </button>
      </div>
      <div className="photo-list" aria-label="Uploaded photos in collage order">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="photo-item"
            draggable={!busy}
            onDragStart={(e) => {
              dragIndex.current = index;
              e.dataTransfer.setData("text/plain", photo.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragEnd={() => {
              dragIndex.current = null;
            }}
            onDragOver={(e) => {
              if (dragIndex.current !== null) e.preventDefault();
            }}
            onDrop={(e) => {
              if (dragIndex.current !== null) {
                e.preventDefault();
                onReorder(dragIndex.current, index);
                dragIndex.current = null;
              }
            }}
          >
            {/* Local blob URLs must stay in the browser, outside Next's image optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <button
              className="select-photo-thumbnail"
              aria-label={`Select photo ${index + 1}: ${photo.name}`}
              aria-pressed={selectedId === photo.id}
              disabled={busy}
              onClick={() => onSelect(photo.id)}
            >
              <img src={photo.url} alt={photo.name} draggable={false} />
            </button>
            <span className="photo-number">{index + 1}</span>
            <button
              className="remove-photo"
              aria-label={`Remove ${photo.name}`}
              onClick={() => onRemove(photo.id)}
              disabled={busy}
            >
              <X size={12} />
            </button>
            <div className="reorder-actions">
              <button
                aria-label={`Move ${photo.name} earlier`}
                disabled={busy || index === 0}
                onClick={() => onReorder(index, index - 1)}
              >
                <ArrowLeft size={12} />
              </button>
              <GripVertical size={12} />
              <button
                aria-label={`Move ${photo.name} later`}
                disabled={busy || index === photos.length - 1}
                onClick={() => onReorder(index, index + 1)}
              >
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}
        <ImageUploader
          compact
          onFiles={onFiles}
          busy={busy}
          count={photos.every((p) => p.sample) ? 0 : photos.length}
        />
      </div>
      <p className="tray-note">
        <GripVertical size={12} /> Drag to reorder, or use the arrows. Your
        first photo leads the layout.
      </p>
      <p className="session-notice">
        <Info size={12} />
        <span>
          <strong>Uploads stay on this device.</strong> Check the draft status before
          leaving. Clearing browser data removes saved drafts.
        </span>
      </p>
    </section>
  );
}
