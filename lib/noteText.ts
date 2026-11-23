import { STICKERS } from "@/lib/stickers";
import { stickerInks, stickerStyleScale } from "@/lib/stickerStyles";
import type {
  CanvasTextLayer,
  Dimensions,
  StickerLayer,
} from "@/types/collage";

/** Place independent, editable text inside a selected note's clear writing area. */
export function noteTextPlacement(
  layer: StickerLayer,
  dimensions: Dimensions,
): Partial<CanvasTextLayer> | null {
  const originalArea = STICKERS.find((s) => s.id === layer.kind)?.textArea;
  if (!originalArea) return null;
  const artScale = stickerStyleScale(layer.style);
  const area = {
    left: 12 + (originalArea.left - 12) * artScale,
    top: 12 + (originalArea.top - 12) * artScale,
    width: originalArea.width * artScale,
    height: originalArea.height * artScale,
  };
  const unit = Math.min(dimensions.width, dimensions.height);
  const scale = (layer.size * unit) / 28;
  const angle = (layer.rotation * Math.PI) / 180;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const localX =
    (area.left + area.width / 2 - 12) * scale * (layer.flipped ? -1 : 1);
  const localY = (area.top + area.height / 2 - 12) * scale;
  const w = area.width * scale,
    h = area.height * scale;
  const fit = Math.min(
    w / (w * Math.abs(cos) + h * Math.abs(sin)),
    h / (w * Math.abs(sin) + h * Math.abs(cos)),
  );
  const width = w * fit,
    height = h * fit;
  const hex = stickerInks(
    layer.style,
    layer.color,
    layer.secondaryColor,
  ).primary.replace("#", "");
  const luminance =
    (0.2126 * parseInt(hex.slice(0, 2), 16) +
      0.7152 * parseInt(hex.slice(2, 4), 16) +
      0.0722 * parseInt(hex.slice(4, 6), 16)) /
    255;
  return {
    x: layer.x + (localX * cos - localY * sin) / dimensions.width,
    y: layer.y + (localX * sin + localY * cos) / dimensions.height,
    width: width / dimensions.width,
    size: Math.min(0.032, width / (9 * unit), height / (4 * 1.12 * unit)),
    color: luminance > 0.48 ? "#353e37" : "#fffdf5",
    fontFamily: "'Studio Caveat', cursive",
    bold: true,
  };
}
