import type {
  Dimensions,
  Photo,
  PhotoLayer,
  PhotoLayers,
  PhotoSlot,
  ThemeId,
} from "@/types/collage";
import { createLayout } from "@/lib/themeLayouts";

export function normalizeSlot(slot: PhotoSlot, size: Dimensions): PhotoLayer {
  const { index, ...rest } = slot;
  return {
    ...rest,
    x: slot.x / size.width,
    y: slot.y / size.height,
    width: slot.width / size.width,
    height: slot.height / size.height,
    zIndex: index,
  };
}

export function resolvePhotoSlots(
  theme: ThemeId,
  photos: Pick<Photo, "id">[],
  size: Dimensions,
  layers: PhotoLayers = {},
): PhotoSlot[] {
  const base = createLayout(
    theme,
    photos.length,
    size.width,
    size.height,
  ).slots;
  const freeform = photos.some((photo) => layers[photo.id]);
  return photos
    .map((photo, index) => {
      // A newly added photo gets an editable frame without disturbing existing layers.
      const stored =
        layers[photo.id] ??
        (freeform
          ? {
              x: 0.32 + (index % 3) * 0.025,
              y: 0.3 + (index % 3) * 0.025,
              width: 0.34,
              height: (0.34 * size.width) / size.height,
              zIndex: photos.length + index,
              customShape: "rounded" as const,
            }
          : normalizeSlot(base[index], size));
      let layer = freeform ? constrainLayer(stored, size) : stored;
      if (layer.customShape === "circle") {
        const diameter = Math.min(
          layer.width * size.width,
          layer.height * size.height,
        );
        const width = diameter / size.width,
          height = diameter / size.height;
        layer = {
          ...layer,
          x: layer.x + (layer.width - width) / 2,
          y: layer.y + (layer.height - height) / 2,
          width,
          height,
        };
      }
      const slot: PhotoSlot = {
        ...layer,
        index,
        x: layer.x * size.width,
        y: layer.y * size.height,
        width: layer.width * size.width,
        height: layer.height * size.height,
      };
      if (layer.customShape && layer.customShape !== "template") {
        slot.shape = undefined;
        slot.polygon = undefined;
        slot.radius = 0;
        slot.mat = 0;
        slot.bottomMat = 0;
        slot.tape = false;
        slot.paperclip = false;
        if (layer.customShape === "circle" || layer.customShape === "arch")
          slot.shape = layer.customShape;
        if (layer.customShape === "rounded")
          slot.radius =
            (Math.min(slot.width, slot.height) * 0.12) /
            Math.min(size.width, size.height);
        if (layer.customShape === "diamond")
          slot.polygon = [
            [0.5, 0],
            [1, 0.5],
            [0.5, 1],
            [0, 0.5],
          ];
      }
      return { slot, order: layer.zIndex };
    })
    .sort((a, b) => a.order - b.order)
    .map(({ slot }) => slot);
}

export function snapshotPhotoLayers(
  theme: ThemeId,
  photos: Pick<Photo, "id">[],
  size: Dimensions,
  layers: PhotoLayers,
): PhotoLayers {
  return Object.fromEntries(
    resolvePhotoSlots(theme, photos, size, layers).map((slot, zIndex) => {
      const id = photos[slot.index].id;
      const original = layers[id];
      return [
        id,
        original
          ? {
              ...original,
              x: slot.x / size.width,
              y: slot.y / size.height,
              width: slot.width / size.width,
              height: slot.height / size.height,
            }
          : { ...normalizeSlot(slot, size), zIndex },
      ];
    }),
  );
}

/** Keep a rotated frame inside the canvas, shrinking only when its bounds cannot fit. */
export function constrainLayer(
  layer: PhotoLayer,
  size: Dimensions,
): PhotoLayer {
  let w = Math.max(0.04, Math.min(1, layer.width)) * size.width;
  let h = Math.max(0.04, Math.min(1, layer.height)) * size.height;
  const rotation = layer.rotation ?? 0,
    c = Math.abs(Math.cos(rotation)),
    s = Math.abs(Math.sin(rotation));
  const scale = Math.min(
    1,
    size.width / (w * c + h * s),
    size.height / (w * s + h * c),
  );
  w *= scale;
  h *= scale;
  const halfW = (w * c + h * s) / 2,
    halfH = (w * s + h * c) / 2;
  const cx = Math.max(
    halfW,
    Math.min(size.width - halfW, (layer.x + layer.width / 2) * size.width),
  );
  const cy = Math.max(
    halfH,
    Math.min(size.height - halfH, (layer.y + layer.height / 2) * size.height),
  );
  return {
    ...layer,
    x: (cx - w / 2) / size.width,
    y: (cy - h / 2) / size.height,
    width: w / size.width,
    height: h / size.height,
  };
}

export function hitPhoto(slot: PhotoSlot, x: number, y: number): boolean {
  if (slot.opacity === 0) return false;
  const angle = -(slot.rotation ?? 0),
    dx = x - slot.x - slot.width / 2,
    dy = y - slot.y - slot.height / 2;
  const px = (dx * Math.cos(angle) - dy * Math.sin(angle)) / slot.width + 0.5;
  const py = (dx * Math.sin(angle) + dy * Math.cos(angle)) / slot.height + 0.5;
  if (px < 0 || py < 0 || px > 1 || py > 1) return false;
  if (slot.shape === "circle")
    return ((px - 0.5) * 2) ** 2 + ((py - 0.5) * 2) ** 2 <= 1;
  if (slot.shape === "arch" && py < 0.5)
    return ((px - 0.5) * 2) ** 2 + ((py - 0.5) * 2) ** 2 <= 1;
  if (!slot.polygon) return true;
  let inside = false;
  for (
    let i = 0, j = slot.polygon.length - 1;
    i < slot.polygon.length;
    j = i++
  ) {
    const [ax, ay] = slot.polygon[i],
      [bx, by] = slot.polygon[j];
    if (ay > py !== by > py && px < ((bx - ax) * (py - ay)) / (by - ay) + ax)
      inside = !inside;
  }
  return inside;
}
