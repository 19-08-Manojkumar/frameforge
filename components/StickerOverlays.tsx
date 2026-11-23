"use client";
import { useRef, type PointerEvent, type RefObject } from "react";
import type { Dimensions, StickerLayer } from "@/types/collage";
import { constrainSticker, stickerName } from "@/lib/stickers";

export function StickerOverlays({
  layers,
  dimensions,
  selectedId,
  onSelect,
  onLayers,
  stage,
  disabled,
  textEditing = false,
  layerOrder,
}: {
  layers: StickerLayer[];
  dimensions: Dimensions;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayers: (layers: StickerLayer[]) => void;
  stage: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  textEditing?: boolean;
  layerOrder: Map<string, number>;
}) {
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    layer: StickerLayer;
    resize: boolean;
  } | null>(null);
  const update = (layer: StickerLayer) =>
    onLayers(
      layers.map((s) =>
        s.id === layer.id ? constrainSticker(layer, dimensions) : s,
      ),
    );
  const begin = (
    event: PointerEvent<HTMLElement>,
    layer: StickerLayer,
    resize = false,
  ) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(layer.id);
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      layer,
      resize,
    };
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current,
      rect = stage.current?.getBoundingClientRect();
    if (!g || event.pointerId !== g.id || !rect || disabled) return;
    const dx = event.clientX - g.x,
      dy = event.clientY - g.y;
    if (Math.hypot(dx, dy) < 3) return;
    if (g.resize) {
      const a = (-g.layer.rotation * Math.PI) / 180;
      const localX = dx * Math.cos(a) - dy * Math.sin(a);
      const localY = dx * Math.sin(a) + dy * Math.cos(a);
      update({
        ...g.layer,
        size:
          g.layer.size + (localX + localY) / Math.min(rect.width, rect.height),
      });
    } else
      update({
        ...g.layer,
        x: g.layer.x + dx / rect.width,
        y: g.layer.y + dy / rect.height,
      });
  };
  const end = () => {
    gesture.current = null;
  };
  return (
    <div
      className={`sticker-overlay ${textEditing ? "suspend-interaction" : ""}`}
      aria-label="Editable stickers and emoji"
    >
      {layers.map((original) => {
        const layer = constrainSticker(original, dimensions);
        const selected = layer.id === selectedId;
        const size = layer.size * Math.min(dimensions.width, dimensions.height);
        return (
          <div
            key={layer.id}
            className={`sticker-overlay-item ${selected ? "selected" : ""}`}
            data-testid={selected ? "sticker-selection" : undefined}
            style={{
              zIndex: layerOrder.get(`sticker:${layer.id}`),
              left: `${layer.x * 100}%`,
              top: `${layer.y * 100}%`,
              width: `${(size / dimensions.width) * 100}%`,
              height: `${(size / dimensions.height) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
            }}
          >
            <button
              className="sticker-hit-target"
              autoFocus={selected}
              aria-label={`Select ${stickerName(layer)} ${layer.kind === "emoji" ? "emoji" : "sticker"}`}
              disabled={disabled}
              onPointerDown={(e) => begin(e, layer)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onClick={() => onSelect(layer.id)}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === "Escape") {
                  e.preventDefault();
                  onSelect(null);
                } else if (e.key === "Delete" || e.key === "Backspace") {
                  e.preventDefault();
                  onLayers(layers.filter((s) => s.id !== layer.id));
                  onSelect(null);
                } else if (e.key.startsWith("Arrow")) {
                  e.preventDefault();
                  const amount = e.shiftKey ? 20 : 5;
                  update({
                    ...layer,
                    x:
                      layer.x +
                      (e.key === "ArrowRight"
                        ? amount
                        : e.key === "ArrowLeft"
                          ? -amount
                          : 0) /
                        dimensions.width,
                    y:
                      layer.y +
                      (e.key === "ArrowDown"
                        ? amount
                        : e.key === "ArrowUp"
                          ? -amount
                          : 0) /
                        dimensions.height,
                  });
                }
              }}
            />
            {selected && (
              <button
                className="sticker-resize-handle"
                aria-label="Resize sticker"
                disabled={disabled}
                onPointerDown={(e) => begin(e, layer, true)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                onKeyDown={(e) => {
                  if (e.key.startsWith("Arrow")) {
                    e.preventDefault();
                    update({
                      ...layer,
                      size:
                        layer.size +
                        (["ArrowRight", "ArrowDown"].includes(e.key)
                          ? 0.01
                          : -0.01),
                    });
                  }
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
