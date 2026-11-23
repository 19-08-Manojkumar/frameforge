import type { StickerDefinition, StickerPath } from "@/lib/stickers";
import type { StickerStyle } from "@/types/collage";
import {
  mixInk,
  stickerInks,
  stickerStyle,
  stickerStyleScale,
} from "@/lib/stickerStyles";

interface Appearance {
  style?: StickerStyle;
  color: string;
  secondaryColor: string;
  outline: boolean;
}
const paths = new Map<string, Path2D>();
function shapeFor(path: StickerPath) {
  let shape = paths.get(path.d);
  if (!shape) {
    shape = new Path2D(path.d);
    paths.set(path.d, shape);
  }
  return shape;
}

/** Shared vector artwork for library thumbnails, the live canvas, and export. */
export function drawStickerArtwork(
  ctx: CanvasRenderingContext2D,
  definition: StickerDefinition,
  appearance: Appearance,
) {
  const style = stickerStyle(appearance.style);
  const ink = stickerInks(style, appearance.color, appearance.secondaryColor);
  const alpha = ctx.globalAlpha;
  const color = (name: "primary" | "secondary") => ink[name];
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (style !== "classic") {
    ctx.beginPath();
    ctx.rect(-2, -2, 28, 28);
    ctx.clip();
    const scale = stickerStyleScale(style);
    ctx.translate(12, 12);
    ctx.scale(scale, scale);
    ctx.translate(-12, -12);
  }

  const silhouette = (
    fill: string,
    stroke: string,
    width: number,
    dx = 0,
    dy = 0,
  ) => {
    ctx.save();
    ctx.translate(dx, dy);
    for (const path of definition.paths) {
      ctx.globalAlpha = alpha * (path.opacity ?? 1);
      ctx.setLineDash(path.dash ?? []);
      const shape = shapeFor(path);
      if (path.fill) {
        ctx.fillStyle = fill;
        ctx.fill(shape);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = (path.stroke ? (path.width ?? 1) : 0) + width;
      ctx.stroke(shape);
    }
    ctx.restore();
  };

  if (style === "anime-pop") {
    silhouette("#26233d", "#26233d", 0.85, 0.6, 0.7);
    if (appearance.outline) silhouette("#fffdf7", "#fffdf7", 2.1);
    silhouette("#26233d", "#26233d", 1.05);
  } else if (style === "trend-studio") {
    silhouette(
      mixInk(ink.primary, "#6653bb", 0.56),
      "#8a74ce",
      0.6,
      0.75,
      0.95,
    );
    silhouette(
      mixInk(ink.secondary, "#8ddce2", 0.55),
      "#c2a6ee",
      0.45,
      0.4,
      0.5,
    );
    if (appearance.outline) silhouette("#fffdfd", "#fffdfd", 1.65);
  } else if (style === "vintage-paper") {
    silhouette("#d9c5a1", "#b69565", 0.4, -0.24, 0.2);
    if (appearance.outline) silhouette("#f8edda", "#f8edda", 1.65);
  } else if (appearance.outline) {
    // Match existing drafts' original outline and paint order exactly.
    for (const path of definition.paths) {
      ctx.setLineDash(path.dash ?? []);
      ctx.strokeStyle = "#fffdf7";
      ctx.lineWidth = (path.width ?? 0) + 2;
      ctx.stroke(shapeFor(path));
    }
  }

  for (const path of definition.paths) {
    const shape = shapeFor(path);
    ctx.globalAlpha = alpha * (path.opacity ?? 1);
    ctx.setLineDash(path.dash ?? []);
    if (path.fill) {
      if (style === "trend-studio") {
        const gradient = ctx.createLinearGradient(2, 0, 21, 24);
        gradient.addColorStop(0, mixInk(color(path.fill), "#ffffff", 0.48));
        gradient.addColorStop(0.43, color(path.fill));
        gradient.addColorStop(1, mixInk(color(path.fill), ink.secondary, 0.55));
        ctx.fillStyle = gradient;
      } else ctx.fillStyle = color(path.fill);
      ctx.fill(shape);
      if (style === "anime-pop") {
        ctx.strokeStyle = "#29263e";
        ctx.lineWidth = 0.48;
        ctx.stroke(shape);
      } else if (style === "vintage-paper") {
        ctx.strokeStyle = mixInk(color(path.fill), "#6f573b", 0.5);
        ctx.lineWidth = 0.34;
        ctx.setLineDash([0.58, 0.19, 0.22, 0.13]);
        ctx.stroke(shape);
      }
    }
    if (path.stroke) {
      ctx.setLineDash(path.dash ?? []);
      ctx.strokeStyle = color(path.stroke);
      ctx.lineWidth = path.width ?? 1;
      if (style === "trend-studio") {
        const gradient = ctx.createLinearGradient(0, 0, 24, 24);
        gradient.addColorStop(0, color(path.stroke));
        gradient.addColorStop(
          0.55,
          mixInk(color(path.stroke), "#9982e3", 0.45),
        );
        gradient.addColorStop(1, mixInk(color(path.stroke), "#65cbc5", 0.5));
        ctx.strokeStyle = gradient;
      }
      ctx.stroke(shape);
    }
  }

  if (style !== "classic") {
    const mask = new Path2D();
    definition.paths
      .filter((path) => path.fill)
      .forEach((path) => mask.addPath(shapeFor(path)));
    ctx.save();
    ctx.clip(mask);
    ctx.setLineDash([]);
    const area = definition.textArea;
    const writing = (x: number, y: number) =>
      area &&
      x >= area.left - 0.3 &&
      x <= area.left + area.width + 0.3 &&
      y >= area.top - 0.3 &&
      y <= area.top + area.height + 0.3;
    if (style === "anime-pop") {
      ctx.globalAlpha = alpha * 0.42;
      ctx.fillStyle = "#ffffff";
      ctx.fill(new Path2D("M-2 2L26 -2L26 .2L-2 6Z M-2 7L26 1.2L26 1.8L-2 8Z"));
      // Small cel-shaded corner accents keep notes' writing space clear.
      ctx.globalAlpha = alpha * 0.16;
      ctx.fillStyle = "#27243d";
      ctx.fill(new Path2D("M-2 22L26 17.8L26 27L-2 27Z"));
    } else if (style === "trend-studio") {
      ctx.globalAlpha = alpha * 0.32;
      ctx.fillStyle = "#ffffff";
      ctx.fill(
        new Path2D("M-3 9L27 -4L27 -.8L-3 13Z M-3 14L27 1L27 1.8L-3 14.8Z"),
      );
      ctx.globalAlpha = alpha * 0.16;
      ctx.fillStyle = "#d6a8ff";
      ctx.fill(new Path2D("M-2 23L26 14L26 18L-2 27Z"));
    } else {
      ctx.fillStyle = "#674d31";
      for (let row = 0; row < 18; row++)
        for (let column = 0; column < 18; column++) {
          const seed =
            (row * 53 + column * 97 + definition.id.length * 17) % 101;
          const x = column * 1.5 + (seed % 7) * 0.09;
          const y = row * 1.45 + (seed % 5) * 0.11;
          if (writing(x, y)) continue;
          ctx.globalAlpha = alpha * (0.11 + (seed % 4) * 0.035);
          ctx.beginPath();
          ctx.arc(x, y, 0.07 + (seed % 3) * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
      ctx.globalAlpha = alpha * 0.11;
      ctx.strokeStyle = "#fff8e9";
      ctx.lineWidth = 0.12;
      for (let y = 1; y < 25; y += 3.3) {
        if (area && y > area.top && y < area.top + area.height) continue;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(24, y + 0.3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
