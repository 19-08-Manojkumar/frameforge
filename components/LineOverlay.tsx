"use client";
import { useRef, type PointerEvent, type RefObject } from "react";
import { Trash2 } from "lucide-react";
import { linePaths } from "@/lib/lineRenderer";
import { LINE_EFFECTS } from "@/lib/lineCatalog";
import { lineGeometry, transformLine } from "@/lib/lineGeometry";
import type { Dimensions, LineLayer, LineStyle } from "@/types/collage";

const STYLES: { value: LineStyle; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
  { value: "wavy", label: "Wavy" },
  { value: "zigzag", label: "Zigzag" },
  { value: "arrow", label: "Arrow" },
  { value: "dash-dot", label: "Dash-dot" },
];

export function LineControls({
  line,
  onUpdate,
  onDelete,
  disabled,
  dimensions,
}: {
  line: LineLayer;
  onUpdate: (patch: Partial<LineLayer>) => void;
  onDelete: () => void;
  disabled: boolean;
  dimensions: Dimensions;
}) {
  const geometry = lineGeometry(line, dimensions);
  return (
    <div
      className="sticker-controls line-controls"
      role="toolbar"
      aria-label="Selected line controls"
    >
      <label>
        Design
        <select
          aria-label="Line effect"
          value={line.effect ?? "classic"}
          disabled={disabled}
          onChange={(event) =>
            onUpdate({
              effect:
                event.target.value === "classic"
                  ? undefined
                  : event.target.value,
            })
          }
        >
          <option value="classic">Classic stroke</option>
          {LINE_EFFECTS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {!line.effect && (
        <label>
          Stroke
          <select
            aria-label="Line style"
            value={line.style}
            disabled={disabled}
            onChange={(event) =>
              onUpdate({
                style: event.target.value as LineStyle,
                effect: undefined,
              })
            }
          >
            {STYLES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {line.effect && (
        <label>
          Accent
          <input
            type="color"
            aria-label="Line accent color"
            value={line.secondaryColor ?? "#fff0c3"}
            disabled={disabled}
            onChange={(event) =>
              onUpdate({ secondaryColor: event.target.value })
            }
          />
        </label>
      )}
      <label>
        Color
        <input
          type="color"
          aria-label="Line color"
          value={line.color}
          disabled={disabled}
          onChange={(event) => onUpdate({ color: event.target.value })}
        />
      </label>
      <label>
        {line.effect ? "Size" : "Width"}
        <input
          type="range"
          aria-label="Line width"
          min="2"
          max={line.effect?.startsWith("paper-") ? "120" : "30"}
          value={Math.round(line.width * 1000)}
          disabled={disabled}
          onChange={(event) =>
            onUpdate({ width: Number(event.target.value) / 1000 })
          }
        />
        <output>{Math.round(line.width * 1000)}</output>
      </label>
      <label>
        Length
        <input
          type="range"
          aria-label="Line length"
          min="10"
          max="100"
          value={Math.round(geometry.length * 100)}
          disabled={disabled}
          onChange={(event) =>
            onUpdate(
              transformLine(line, dimensions, {
                length: Number(event.target.value) / 100,
              }),
            )
          }
        />
        <output>{Math.round(geometry.length * 100)}%</output>
      </label>
      <label>
        Angle
        <input
          type="range"
          aria-label="Line angle"
          min="-180"
          max="180"
          step="5"
          value={Math.round(geometry.angle)}
          disabled={disabled}
          onChange={(event) =>
            onUpdate(
              transformLine(line, dimensions, {
                angle: Number(event.target.value),
              }),
            )
          }
        />
        <output>{Math.round(geometry.angle)}°</output>
      </label>
      <label>
        Curve
        <input
          type="range"
          aria-label="Line curve"
          min="-30"
          max="30"
          value={Math.round(line.curve * 100)}
          disabled={disabled}
          onChange={(event) =>
            onUpdate({ curve: Number(event.target.value) / 100 })
          }
        />
        <output>
          {line.curve === 0 ? "Straight" : `${Math.round(line.curve * 100)}%`}
        </output>
      </label>
      <label>
        Opacity
        <input
          type="range"
          aria-label="Line opacity"
          min="0"
          max="100"
          value={Math.round(line.opacity * 100)}
          disabled={disabled}
          onChange={(event) =>
            onUpdate({ opacity: Number(event.target.value) / 100 })
          }
        />
        <output>{Math.round(line.opacity * 100)}%</output>
      </label>
      <button
        aria-label="Delete line"
        title="Delete line"
        disabled={disabled}
        onClick={onDelete}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function LineOverlay({
  lines,
  dimensions,
  selectedId,
  onSelect,
  onLayers,
  stage,
  disabled,
}: {
  lines: LineLayer[];
  dimensions: Dimensions;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayers: (layers: LineLayer[]) => void;
  stage: RefObject<HTMLDivElement | null>;
  disabled: boolean;
}) {
  const gesture = useRef<{
    pointerId: number;
    line: LineLayer;
    x: number;
    y: number;
  } | null>(null);
  const changePosition = (event: PointerEvent<SVGPathElement>) => {
    const active = gesture.current;
    const rect = stage.current?.getBoundingClientRect();
    if (!active || active.pointerId !== event.pointerId || !rect || disabled)
      return;
    const dx = (event.clientX - active.x) / rect.width;
    const dy = (event.clientY - active.y) / rect.height;
    const line = active.line;
    const minX = Math.min(line.x1, line.x2);
    const maxX = Math.max(line.x1, line.x2);
    const minY = Math.min(line.y1, line.y2);
    const maxY = Math.max(line.y1, line.y2);
    const moveX = Math.max(-minX, Math.min(1 - maxX, dx));
    const moveY = Math.max(-minY, Math.min(1 - maxY, dy));
    onLayers(
      lines.map((item) =>
        item.id === line.id
          ? {
              ...line,
              x1: line.x1 + moveX,
              x2: line.x2 + moveX,
              y1: line.y1 + moveY,
              y2: line.y2 + moveY,
            }
          : item,
      ),
    );
  };
  return (
    <svg
      className="line-overlay"
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      preserveAspectRatio="none"
      aria-label="Editable collage lines"
      onPointerUp={() => {
        gesture.current = null;
      }}
      onPointerCancel={() => {
        gesture.current = null;
      }}
    >
      {lines.map((line) => {
        const selected = selectedId === line.id;
        return linePaths(line, dimensions).map((path, index) => (
          <g key={`${line.id}:${index}`}>
            {selected && !line.effect && (
              <path
                d={path.d}
                fill="none"
                stroke="#ffffff"
                strokeWidth={
                  line.width * Math.min(dimensions.width, dimensions.height) + 5
                }
                strokeDasharray={path.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
                pointerEvents="none"
              />
            )}
            {selected && !line.effect && (
              <path
                d={path.d}
                fill={
                  line.style === "arrow" && path.d.endsWith("Z")
                    ? line.color
                    : "none"
                }
                stroke={line.color}
                strokeWidth={
                  line.width * Math.min(dimensions.width, dimensions.height)
                }
                strokeDasharray={path.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={line.opacity}
                pointerEvents="none"
              />
            )}
            {selected && line.effect && (
              <path
                d={path.d}
                fill="none"
                stroke="#6c9c76"
                strokeWidth={1.5}
                strokeDasharray="5 7"
                opacity=".6"
                pointerEvents="none"
              />
            )}
            <path
              d={path.d}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(
                18,
                line.width *
                  Math.min(dimensions.width, dimensions.height) *
                  (line.effect?.startsWith("paper-") ? 2 : 1) +
                  12,
              )}
              className="line-hit-target"
              aria-label={`Select line ${lines.indexOf(line) + 1}`}
              tabIndex={selected ? 0 : -1}
              role="button"
              onPointerDown={(event) => {
                if (disabled) return;
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                gesture.current = {
                  pointerId: event.pointerId,
                  line,
                  x: event.clientX,
                  y: event.clientY,
                };
                onSelect(line.id);
              }}
              onPointerMove={changePosition}
              onPointerUp={() => {
                gesture.current = null;
              }}
              onClick={() => onSelect(line.id)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onSelect(null);
                if (event.key === "Delete" || event.key === "Backspace") {
                  event.preventDefault();
                  onLayers(lines.filter((item) => item.id !== line.id));
                  onSelect(null);
                }
              }}
            />
          </g>
        ));
      })}
    </svg>
  );
}
