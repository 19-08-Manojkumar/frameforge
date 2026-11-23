"use client";
import { Move } from "lucide-react";
import type { PointerEvent, KeyboardEvent } from "react";
type Edge = "left" | "right" | "bottom-left" | "bottom-right";
export function TextBoxControls({
  inside,
  disabled,
  onMove,
  onResize,
  onKeyMove,
}: {
  inside: boolean;
  disabled: boolean;
  onMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onResize: (event: PointerEvent<HTMLButtonElement>, edge: Edge) => void;
  onKeyMove: (event: KeyboardEvent<HTMLButtonElement>, edge?: Edge) => void;
}) {
  return (
    <>
      <span className="text-box-outline" aria-hidden="true" />
      <button
        type="button"
        data-text-control
        className={`text-box-move ${inside ? "inside" : ""}`}
        aria-label="Move text box"
        title="Drag to move text. Arrow keys move it precisely."
        disabled={disabled}
        onPointerDown={onMove}
        onKeyDown={(event) => onKeyMove(event)}
        onClick={(event) => event.stopPropagation()}
      >
        <Move size={12} /> Move
      </button>
      {(["left", "right", "bottom-left", "bottom-right"] as const).map(
        (edge) => (
          <button
            key={edge}
            type="button"
            data-text-control
            className={`text-box-resize ${edge}`}
            aria-label={`Resize text box ${edge.replace("-", " ")}`}
            title="Drag to resize the text area. Text wraps without changing font size."
            disabled={disabled}
            onPointerDown={(event) => onResize(event, edge)}
            onKeyDown={(event) => onKeyMove(event, edge)}
            onClick={(event) => event.stopPropagation()}
          />
        ),
      )}
    </>
  );
}
