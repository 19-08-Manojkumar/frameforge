"use client";
import {
  useRef,
  type PointerEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { CanvasTextLayer, Dimensions } from "@/types/collage";
import { textBoxLayout } from "@/lib/textLayout";

type Edge = "left" | "right" | "bottom-left" | "bottom-right";
type Gesture = {
  pointerId: number;
  layer: CanvasTextLayer;
  control: boolean;
  keepEditing: boolean;
  edge?: Edge;
  startX: number;
  startY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  moved: boolean;
};

export function useTextBoxEditing({
  stage,
  canvas,
  dimensions,
  disabled,
  onChange,
  onSelect,
}: {
  stage: RefObject<HTMLDivElement | null>;
  canvas: RefObject<HTMLCanvasElement | null>;
  dimensions: Dimensions;
  disabled: boolean;
  onChange: (id: string, patch: Partial<CanvasTextLayer>) => void;
  onSelect: (id: string, keepEditing: boolean) => void;
}) {
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const layout = (layer: CanvasTextLayer) =>
    textBoxLayout(
      layer,
      dimensions,
      canvas.current?.getContext("2d", { alpha: false }),
    );
  const position = (
    layer: CanvasTextLayer,
    left: number,
    top: number,
    width: number,
    height: number,
  ) => {
    const x = Math.max(0, Math.min(1 - width, left));
    const y = Math.max(0, Math.min(Math.max(0, 1 - height), top));
    return {
      x:
        x +
        (layer.align === "left"
          ? 0
          : layer.align === "right"
            ? width
            : width / 2),
      y: Math.max(0, Math.min(1, y + height / 2)),
    };
  };
  const begin = (
    event: PointerEvent<HTMLElement>,
    layer: CanvasTextLayer,
    control: boolean,
    keepEditing: boolean,
    edge?: Edge,
  ) => {
    event.stopPropagation();
    if (disabled || event.button !== 0) return;
    if (control) event.preventDefault();
    const target =
      event.target instanceof HTMLElement
        ? (event.target.closest("button") ?? event.currentTarget)
        : event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const box = layout(layer);
    suppressClick.current = false;
    gesture.current = {
      pointerId: event.pointerId,
      layer,
      control,
      keepEditing,
      edge,
      startX: event.clientX,
      startY: event.clientY,
      left: box.left / dimensions.width,
      top: box.top / dimensions.height,
      width: box.width / dimensions.width,
      height: box.height / dimensions.height,
      moved: false,
    };
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const moving = gesture.current;
    const rect = stage.current?.getBoundingClientRect();
    if (!moving || moving.pointerId !== event.pointerId || !rect) return;
    if (
      !moving.moved &&
      Math.hypot(event.clientX - moving.startX, event.clientY - moving.startY) <
        4
    )
      return;
    moving.moved = true;
    const dx = (event.clientX - moving.startX) / rect.width;
    const dy = (event.clientY - moving.startY) / rect.height;
    if (!moving.edge) {
      onChange(moving.layer.id, {
        width: moving.width,
        ...position(
          moving.layer,
          moving.left + dx,
          moving.top + dy,
          moving.width,
          moving.height,
        ),
      });
      return;
    }
    const right = moving.left + moving.width;
    const left = moving.edge.includes("left")
      ? Math.max(0, right - 0.95, Math.min(right - 0.02, moving.left + dx))
      : moving.left;
    const width = moving.edge.includes("left")
      ? right - left
      : Math.max(0.02, Math.min(0.95, 1 - left, moving.width + dx));
    const height = moving.edge.startsWith("bottom")
      ? Math.max(0.02, Math.min(1 - moving.top, moving.height + dy))
      : (moving.layer.height ?? 0);
    const next = { ...moving.layer, width, height };
    const box = layout(next);
    onChange(moving.layer.id, {
      width,
      height,
      ...position(
        next,
        left,
        moving.top,
        width,
        box.height / dimensions.height,
      ),
    });
  };
  const end = (event: PointerEvent<HTMLElement>) => {
    const moving = gesture.current;
    if (!moving || moving.pointerId !== event.pointerId) return;
    suppressClick.current = moving.moved && !moving.control;
    gesture.current = null;
    if (moving.moved) onSelect(moving.layer.id, moving.keepEditing);
  };
  const keyMove = (
    event: KeyboardEvent<HTMLElement>,
    layer: CanvasTextLayer,
    edge?: Edge,
  ) => {
    if (disabled || !event.key.startsWith("Arrow")) return;
    event.preventDefault();
    event.stopPropagation();
    const amount = event.shiftKey ? 0.03 : 0.01;
    const dx =
      event.key === "ArrowRight"
        ? amount
        : event.key === "ArrowLeft"
          ? -amount
          : 0;
    const dy =
      event.key === "ArrowDown"
        ? amount
        : event.key === "ArrowUp"
          ? -amount
          : 0;
    const box = layout(layer);
    if (!edge)
      onChange(layer.id, {
        width: box.width / dimensions.width,
        ...position(
          layer,
          box.left / dimensions.width + dx,
          box.top / dimensions.height + dy,
          box.width / dimensions.width,
          box.height / dimensions.height,
        ),
      });
    else {
      const width = Math.max(
        0.02,
        Math.min(
          0.95,
          box.width / dimensions.width + (edge.includes("left") ? -dx : dx),
        ),
      );
      const height = edge.startsWith("bottom")
        ? Math.max(0.02, Math.min(1, box.height / dimensions.height + dy))
        : layer.height;
      const next = { ...layer, width, height };
      const resized = layout(next);
      const left =
        box.left / dimensions.width +
        (edge.includes("left") ? box.width / dimensions.width - width : 0);
      onChange(layer.id, {
        width,
        height,
        ...position(
          next,
          left,
          box.top / dimensions.height,
          width,
          resized.height / dimensions.height,
        ),
      });
    }
  };
  const setWidth = (layer: CanvasTextLayer, width: number) => {
    const next = { ...layer, width: Math.max(0.02, Math.min(0.95, width)) };
    const box = layout(next);
    onChange(layer.id, {
      width: next.width,
      ...position(
        next,
        box.left / dimensions.width,
        box.top / dimensions.height,
        next.width,
        box.height / dimensions.height,
      ),
    });
  };
  return { begin, onPointerMove, end, keyMove, setWidth, suppressClick };
}
