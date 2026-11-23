"use client";
import { Layers } from "lucide-react";
import type { LayerMove } from "@/lib/layerOrder";

export type LayerPosition = "top" | "middle" | "bottom";
export function LayerCycleButton({
  label,
  position,
  disabled,
  onMove,
  count = 3,
}: {
  label: string;
  position: LayerPosition;
  disabled?: boolean;
  onMove: (move: LayerMove) => void;
  count?: number;
}) {
  const next =
    position === "top"
      ? "bottom"
      : position === "bottom" && count > 2
        ? "middle"
        : "top";
  return (
    <button
      type="button"
      className="layer-cycle-button"
      aria-label={`Cycle ${label} layer`}
      data-position={position}
      title={`Layer: ${position}. Click to move to ${next}.`}
      disabled={disabled}
      onClick={() => onMove(next)}
    >
      <Layers size={13} /> Layer:{" "}
      {position[0].toUpperCase() + position.slice(1)}
    </button>
  );
}
