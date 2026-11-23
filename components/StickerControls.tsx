"use client";
import {
  Copy,
  FlipHorizontal2,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { STICKERS, stickerName } from "@/lib/stickers";
import type { StickerLayer } from "@/types/collage";
import { stickerStyle } from "@/lib/stickerStyles";
import { StickerStylePicker } from "@/components/StickerStylePicker";

export function StickerControls({
  layer,
  layers,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  layerControl,
  disabled,
}: {
  layer: StickerLayer;
  layers: StickerLayer[];
  onSelect: (id: string | null) => void;
  onUpdate: (patch: Partial<StickerLayer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  layerControl: React.ReactNode;
  disabled: boolean;
}) {
  const definition = STICKERS.find((sticker) => sticker.id === layer.kind);
  return (
    <div
      className="sticker-controls"
      role="toolbar"
      aria-label="Selected sticker controls"
    >
      {definition && (
        <StickerStylePicker
          compact
          value={stickerStyle(layer.style)}
          onChange={(style) => onUpdate({ style })}
          sticker={definition}
          disabled={disabled}
          color={layer.color}
          secondaryColor={layer.secondaryColor}
          outline={layer.outline}
        />
      )}
      {STICKERS.find((sticker) => sticker.id === layer.kind)?.textArea && (
        <p>Use Add text to write inside this note.</p>
      )}
      <div className="sticker-controls-row">
        <select
          aria-label="Selected sticker"
          value={layer.id}
          disabled={disabled}
          onChange={(e) => onSelect(e.target.value)}
        >
          {layers.map((s, i) => (
            <option key={s.id} value={s.id}>
              {i + 1}. {stickerName(s)}
            </option>
          ))}
        </select>
        {layer.kind !== "emoji" && (
          <>
            <label>
              Color
              <input
                type="color"
                aria-label="Sticker color"
                value={layer.color}
                disabled={disabled}
                onChange={(e) => onUpdate({ color: e.target.value })}
              />
            </label>
            <label>
              Accent
              <input
                type="color"
                aria-label="Sticker accent color"
                value={layer.secondaryColor}
                disabled={disabled}
                onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
              />
            </label>
            <label className="sticker-outline">
              <input
                type="checkbox"
                aria-label="Sticker white outline"
                checked={layer.outline}
                disabled={disabled}
                onChange={(e) => onUpdate({ outline: e.target.checked })}
              />
              Outline
            </label>
          </>
        )}
        <button aria-label="Deselect sticker" onClick={() => onSelect(null)}>
          <X size={14} />
        </button>
      </div>
      <div className="sticker-controls-row">
        <label>
          Size
          <input
            aria-label="Sticker size"
            type="range"
            min="4"
            max="65"
            step="1"
            value={Math.round(layer.size * 100)}
            disabled={disabled}
            onChange={(e) => onUpdate({ size: Number(e.target.value) / 100 })}
          />
          <output>{Math.round(layer.size * 100)}%</output>
        </label>
        <label>
          Opacity
          <input
            aria-label="Sticker opacity"
            type="range"
            min="0"
            max="100"
            step="1"
            value={Math.round(layer.opacity * 100)}
            disabled={disabled}
            onChange={(e) =>
              onUpdate({ opacity: Number(e.target.value) / 100 })
            }
          />
          <output>{Math.round(layer.opacity * 100)}%</output>
        </label>
        <button
          title="Rotate left 15°"
          aria-label="Rotate sticker left"
          disabled={disabled}
          onClick={() => onUpdate({ rotation: layer.rotation - 15 })}
        >
          <RotateCcw size={14} />
        </button>
        <button
          title="Rotate right 15°"
          aria-label="Rotate sticker right"
          disabled={disabled}
          onClick={() => onUpdate({ rotation: layer.rotation + 15 })}
        >
          <RotateCw size={14} />
        </button>
        <button
          title="Flip horizontally"
          aria-label="Flip sticker horizontally"
          aria-pressed={layer.flipped}
          disabled={disabled}
          onClick={() => onUpdate({ flipped: !layer.flipped })}
        >
          <FlipHorizontal2 size={14} />
        </button>
        {layerControl}
        <button
          title="Duplicate"
          aria-label="Duplicate sticker"
          disabled={disabled || layers.length >= 50}
          onClick={onDuplicate}
        >
          <Copy size={14} />
        </button>
        <button
          title="Delete"
          aria-label="Delete sticker"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <p>
        Drag to move · drag the corner to resize · arrow keys nudge · Delete
        removes
      </p>
    </div>
  );
}
