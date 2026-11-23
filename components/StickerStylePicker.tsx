"use client";
import { Check, Palette } from "lucide-react";
import type { StickerDefinition } from "@/lib/stickers";
import type { StickerStyle } from "@/types/collage";
import { STICKER_STYLES } from "@/lib/stickerStyles";
import { StickerPreview } from "@/components/StickerPreview";

export function StickerStylePicker({
  value,
  onChange,
  sticker,
  disabled,
  compact = false,
  color,
  secondaryColor,
  outline,
}: {
  value: StickerStyle;
  onChange: (style: StickerStyle) => void;
  sticker: StickerDefinition;
  disabled: boolean;
  compact?: boolean;
  color?: string;
  secondaryColor?: string;
  outline?: boolean;
}) {
  return (
    <div
      className={`sticker-style-picker ${compact ? "compact" : ""}`}
      role="group"
      aria-label={compact ? "Sticker style" : "Sticker collection style"}
    >
      <div className="sticker-style-heading">
        <Palette size={12} aria-hidden="true" />
        <strong>{compact ? "Artwork style" : "Choose a style"}</strong>
        <span>4 looks</span>
      </div>
      <div className="sticker-style-options">
        {STICKER_STYLES.map((style) => (
          <button
            key={style.id}
            type="button"
            aria-label={style.name}
            aria-pressed={value === style.id}
            title={style.description}
            disabled={disabled}
            onClick={() => onChange(style.id)}
          >
            <StickerPreview
              sticker={sticker}
              style={style.id}
              color={color}
              secondaryColor={secondaryColor}
              outline={outline}
            />
            <span>{style.name}</span>
            {value === style.id && (
              <Check
                size={10}
                aria-hidden="true"
                className="sticker-style-check"
              />
            )}
          </button>
        ))}
      </div>
      {!compact && (
        <p className="sticker-style-caption" aria-live="polite">
          {STICKER_STYLES.find((style) => style.id === value)?.description}
        </p>
      )}
    </div>
  );
}
