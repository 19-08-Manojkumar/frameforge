"use client";
import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import type {
  CropPosition,
  Dimensions,
  Photo,
  PhotoLayer,
  PhotoLayers,
  PhotoShape,
  PhotoSlot,
  ThemeId,
} from "@/types/collage";
import {
  constrainLayer,
  hitPhoto,
  normalizeSlot,
  resolvePhotoSlots,
  snapshotPhotoLayers,
} from "@/lib/photoEditing";
import { createLayout } from "@/lib/themeLayouts";
import { coverCrop } from "@/lib/collageRenderer";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export function usePhotoEditing({
  photos,
  dimensions,
  theme,
  layers,
  onLayers,
  selectedId,
  onSelect,
  cropPositions,
  onCropPositions,
  stage,
  disabled,
  resetLayer,
}: {
  photos: Photo[];
  dimensions: Dimensions;
  theme: ThemeId;
  layers: PhotoLayers;
  onLayers: (layers: PhotoLayers) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  cropPositions: Record<string, CropPosition>;
  onCropPositions: (positions: Record<string, CropPosition>) => void;
  stage: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  resetLayer?: (photo: Photo) => PhotoLayer;
}) {
  const [mode, setMode] = useState<"move" | "crop">("move");
  const slots = useMemo(
    () => resolvePhotoSlots(theme, photos, dimensions, layers),
    [theme, photos, dimensions, layers],
  );
  const selectedSlot = slots.find(
    (slot) => photos[slot.index].id === selectedId,
  );
  const selectedPhoto = photos.find((photo) => photo.id === selectedId);
  const gesture = useRef<{
    pointer: number;
    kind: "move" | "crop" | "resize";
    id: string;
    clientX: number;
    clientY: number;
    slot: PhotoSlot;
    layers: PhotoLayers;
    crop: CropPosition;
    handle?: Handle;
  } | null>(null);
  const point = (event: PointerEvent<HTMLElement>) => {
    const rect = stage.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * dimensions.width,
      y: ((event.clientY - rect.top) / rect.height) * dimensions.height,
    };
  };
  const begin = (
    event: PointerEvent<HTMLElement>,
    slot: PhotoSlot,
    kind: "move" | "crop" | "resize",
    handle?: Handle,
  ) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const id = photos[slot.index].id;
    onSelect(id);
    gesture.current = {
      pointer: event.pointerId,
      kind,
      id,
      clientX: event.clientX,
      clientY: event.clientY,
      slot,
      layers: snapshotPhotoLayers(theme, photos, dimensions, layers),
      crop: cropPositions[id] ?? { x: 0.5, y: 0.5 },
      handle,
    };
  };
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (disabled) return;
    const p = point(event);
    // A layered Trip poster can cover the selected portrait with scenery. In
    // adjustment mode, keep working on that chosen frame instead of switching
    // to whichever overlapping photo is on top of it.
    const slot =
      mode === "crop" && selectedSlot && hitPhoto(selectedSlot, p.x, p.y)
        ? selectedSlot
        : [...slots].reverse().find((s) => hitPhoto(s, p.x, p.y));
    if (slot) begin(event, slot, mode);
    else onSelect(null);
  };
  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (
      !g ||
      g.pointer !== event.pointerId ||
      disabled ||
      Math.hypot(event.clientX - g.clientX, event.clientY - g.clientY) < 3
    )
      return;
    const bounds = stage.current!.getBoundingClientRect(),
      dx = ((event.clientX - g.clientX) / bounds.width) * dimensions.width,
      dy = ((event.clientY - g.clientY) / bounds.height) * dimensions.height;
    const angle = -(g.slot.rotation ?? 0),
      rx = dx * Math.cos(angle) - dy * Math.sin(angle),
      ry = dx * Math.sin(angle) + dy * Math.cos(angle);
    if (g.kind === "crop") {
      const photo = photos.find((photo) => photo.id === g.id)!;
      const u = Math.min(g.slot.width, g.slot.height),
        mat = (g.slot.mat ?? 0) * u;
      const pw = g.slot.width - 2 * mat,
        ph = g.slot.height - mat - (g.slot.bottomMat ?? g.slot.mat ?? 0) * u;
      const crop = coverCrop(photo.width, photo.height, pw, ph, g.crop);
      const ox = pw * (photo.width / crop.sw - 1),
        oy = ph * (photo.height / crop.sh - 1);
      onCropPositions({
        ...cropPositions,
        [g.id]: {
          ...g.crop,
          x: Math.max(0, Math.min(1, g.crop.x - (ox ? rx / ox : 0))),
          y: Math.max(0, Math.min(1, g.crop.y - (oy ? ry / oy : 0))),
        },
      });
      return;
    }
    const original = g.layers[g.id];
    let next = { ...original };
    if (g.kind === "move") {
      next.x += dx / dimensions.width;
      next.y += dy / dimensions.height;
    } else {
      const hx = g.handle!.includes("e") ? 1 : g.handle!.includes("w") ? -1 : 0;
      const hy = g.handle!.includes("s") ? 1 : g.handle!.includes("n") ? -1 : 0;
      let w = Math.max(dimensions.width * 0.04, g.slot.width + rx * hx),
        h = Math.max(dimensions.height * 0.04, g.slot.height + ry * hy);
      if (event.shiftKey || original.customShape === "circle") {
        if (hx) h = (w * g.slot.height) / g.slot.width;
        else w = (h * g.slot.width) / g.slot.height;
      }
      const shiftX = ((w - g.slot.width) * hx) / 2,
        shiftY = ((h - g.slot.height) * hy) / 2;
      const a = -angle,
        cx =
          g.slot.x +
          g.slot.width / 2 +
          shiftX * Math.cos(a) -
          shiftY * Math.sin(a);
      const cy =
        g.slot.y +
        g.slot.height / 2 +
        shiftX * Math.sin(a) +
        shiftY * Math.cos(a);
      next = {
        ...next,
        x: (cx - w / 2) / dimensions.width,
        y: (cy - h / 2) / dimensions.height,
        width: w / dimensions.width,
        height: h / dimensions.height,
      };
    }
    onLayers({ ...g.layers, [g.id]: constrainLayer(next, dimensions) });
  };
  const endGesture = () => {
    gesture.current = null;
  };
  const crop = cropPositions[selectedId ?? ""] ?? { x: 0.5, y: 0.5 };
  const updateCrop = (patch: Partial<CropPosition>) => {
    if (!selectedId || disabled) return;
    onCropPositions({
      ...cropPositions,
      [selectedId]: {
        x: Math.max(0, Math.min(1, patch.x ?? crop.x)),
        y: Math.max(0, Math.min(1, patch.y ?? crop.y)),
        zoom: Math.max(1, Math.min(3, patch.zoom ?? crop.zoom ?? 1)),
      },
    });
  };
  const update = (patch: Partial<PhotoLayer>) => {
    if (!selectedId || disabled) return;
    const snapshot = snapshotPhotoLayers(theme, photos, dimensions, layers);
    if (snapshot[selectedId].customShape === "circle") {
      if (patch.width !== undefined && patch.height === undefined)
        patch = {
          ...patch,
          height: (patch.width * dimensions.width) / dimensions.height,
        };
      else if (patch.height !== undefined && patch.width === undefined)
        patch = {
          ...patch,
          width: (patch.height * dimensions.height) / dimensions.width,
        };
    }
    onLayers({
      ...snapshot,
      [selectedId]: constrainLayer(
        { ...snapshot[selectedId], ...patch },
        dimensions,
      ),
    });
  };
  const changeShape = (customShape: PhotoShape) => {
    if (!selectedSlot) return;
    const patch: Partial<PhotoLayer> = { customShape };
    if (customShape === "circle") {
      const d = Math.min(selectedSlot.width, selectedSlot.height);
      patch.width = d / dimensions.width;
      patch.height = d / dimensions.height;
      patch.x =
        (selectedSlot.x + (selectedSlot.width - d) / 2) / dimensions.width;
      patch.y =
        (selectedSlot.y + (selectedSlot.height - d) / 2) / dimensions.height;
    }
    update(patch);
  };
  const resetPhoto = () => {
    if (!selectedPhoto || disabled) return;
    const snapshot = snapshotPhotoLayers(theme, photos, dimensions, layers);
    const slot = createLayout(
      theme,
      photos.length,
      dimensions.width,
      dimensions.height,
    ).slots.find((slot) => slot.index === photos.indexOf(selectedPhoto))!;
    onLayers({
      ...snapshot,
      [selectedPhoto.id]: resetLayer
        ? resetLayer(selectedPhoto)
        : normalizeSlot(slot, dimensions),
    });
    onCropPositions({
      ...cropPositions,
      [selectedPhoto.id]: { x: 0.5, y: 0.5 },
    });
  };
  return {
    slots,
    selectedSlot,
    selectedPhoto,
    mode,
    setMode,
    crop,
    updateCrop,
    update,
    changeShape,
    resetPhoto,
    onPointerDown,
    onPointerMove,
    endGesture,
    startResize: (event: PointerEvent<HTMLElement>, handle: Handle) =>
      selectedSlot && begin(event, selectedSlot, "resize", handle),
  };
}
