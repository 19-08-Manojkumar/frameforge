"use client";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Scan,
  RotateCcw,
} from "lucide-react";
import type { CropPosition } from "@/types/collage";

/** These controls change the source crop only; the frame geometry stays untouched. */
export function PhotoAdjustments({
  crop,
  disabled,
  onChange,
}: {
  crop: CropPosition;
  disabled: boolean;
  onChange: (patch: Partial<CropPosition>) => void;
}) {
  return (
    <div className="photo-adjustments" aria-label="Adjust photo inside frame">
      <div className="photo-adjustment-sliders">
        {(
          [
            ["zoom", "Zoom", 100, 300, Math.round((crop.zoom ?? 1) * 100)],
            ["x", "Left / right", 0, 100, Math.round(crop.x * 100)],
            ["y", "Top / bottom", 0, 100, Math.round(crop.y * 100)],
          ] as const
        ).map(([key, label, min, max, value]) => (
          <label key={key}>
            <span>
              {label}
              <output>{value}%</output>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step="1"
              value={value}
              disabled={disabled}
              aria-label={
                key === "zoom"
                  ? "Photo zoom"
                  : key === "x"
                    ? "Horizontal photo position"
                    : "Vertical photo position"
              }
              onChange={(e) =>
                onChange({ [key]: Number(e.target.value) / 100 })
              }
            />
          </label>
        ))}
      </div>
      <div
        className="photo-controls-row photo-align-row"
        role="group"
        aria-label="Align photo inside frame"
      >
        <span>Show</span>
        <button
          title="Show the left edge of the photo"
          aria-label="Align photo left"
          disabled={disabled}
          onClick={() => onChange({ x: 0 })}
        >
          <ArrowLeftToLine size={13} />
        </button>
        <button
          title="Show the top of the photo"
          aria-label="Align photo top"
          disabled={disabled}
          onClick={() => onChange({ y: 0 })}
        >
          <ArrowUpToLine size={13} />
        </button>
        <button
          title="Center the photo"
          aria-label="Center photo in frame"
          disabled={disabled}
          onClick={() => onChange({ x: 0.5, y: 0.5 })}
        >
          <Scan size={13} />
        </button>
        <button
          title="Show the bottom of the photo"
          aria-label="Align photo bottom"
          disabled={disabled}
          onClick={() => onChange({ y: 1 })}
        >
          <ArrowDownToLine size={13} />
        </button>
        <button
          title="Show the right edge of the photo"
          aria-label="Align photo right"
          disabled={disabled}
          onClick={() => onChange({ x: 1 })}
        >
          <ArrowRightToLine size={13} />
        </button>
        <button
          aria-label="Reset photo adjustment"
          disabled={disabled}
          onClick={() => onChange({ x: 0.5, y: 0.5, zoom: 1 })}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  );
}
