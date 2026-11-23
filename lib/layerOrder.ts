import type {
  CanvasTextLayer,
  Photo,
  PhotoLayers,
  StickerLayer,
  ImageElement,
} from "@/types/collage";

export type LayerKind = "photo" | "text" | "sticker" | "image";
export type LayerMove = "top" | "middle" | "bottom" | "forward" | "backward";
export interface OrderedLayer {
  kind: LayerKind;
  id: string;
  index: number;
  order: number;
}

/** A single stack for canvas drawing and editor hit targets, from back to front. */
export function orderedLayers(
  photos: Pick<Photo, "id">[],
  photoLayers: PhotoLayers,
  text: CanvasTextLayer[],
  stickers: StickerLayer[],
  images: ImageElement[] = [],
): OrderedLayer[] {
  const freeform = photos.some((p) => photoLayers[p.id]);
  return [
    ...photos.map((p, index) => ({
      kind: "photo" as const,
      id: p.id,
      index,
      order:
        photoLayers[p.id]?.zIndex ?? (freeform ? photos.length + index : index),
    })),
    ...text.map((t, index) => ({
      kind: "text" as const,
      id: t.id,
      index,
      order: t.zIndex ?? 1000 + index,
    })),
    ...stickers.map((s, index) => ({
      kind: "sticker" as const,
      id: s.id,
      index,
      order: s.zIndex ?? 2000 + index,
    })),
    ...images.map((image, index) => ({
      kind: "image" as const,
      id: image.photo.id,
      index,
      order: image.frame.zIndex,
    })),
  ].sort((a, b) => a.order - b.order);
}

/** Change depth without changing a photo's geometry or reordering uploaded files. */
export function nextLayerOrder(
  stack: OrderedLayer[],
  kind: LayerKind,
  id: string,
  move: LayerMove,
): number {
  const current = stack.findIndex((l) => l.kind === kind && l.id === id);
  if (current < 0)
    throw new Error("Select a layer before changing its position.");
  const others = stack.filter((_, i) => i !== current);
  const at =
    move === "top"
      ? others.length
      : move === "bottom"
        ? 0
        : move === "middle"
          ? Math.floor(stack.length / 2)
          : move === "forward"
            ? Math.min(others.length, current + 1)
            : Math.max(0, current - 1);
  if (at === current && (move === "forward" || move === "backward"))
    return stack[current].order;
  const before = others[at - 1]?.order,
    after = others[at]?.order;
  if (before === undefined) return (after ?? 0) - 1;
  if (after === undefined) return before + 1;
  return before + (after - before) / 2;
}

export function frontLayerOrder(stack: OrderedLayer[]): number {
  return Math.max(2000, ...stack.map((l) => l.order)) + 1;
}

export function layerPosition(
  stack: OrderedLayer[],
  kind: LayerKind,
  id: string,
): "top" | "middle" | "bottom" {
  const at = stack.findIndex((l) => l.kind === kind && l.id === id);
  return at === stack.length - 1 ? "top" : at === 0 ? "bottom" : "middle";
}
