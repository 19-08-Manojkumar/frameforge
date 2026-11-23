import type { PhotoBlendMask } from "@/types/collage";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
function falloff(distance: number, edge: number, softness: number) {
  const width = Math.min(edge * 0.98, softness);
  const t = clamp((distance - (edge - width)) / width);
  // Smooth derivatives at both ends avoid visible gradient rings and seams.
  return 1 - t * t * (3 - 2 * t);
}

/** Normalized alpha only: original photo colors and image detail are untouched. */
export function photoBlendAlpha(mask: PhotoBlendMask, x: number, y: number) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return 0;
  const softness = Math.max(
    0.04,
    Math.min(0.5, Number.isFinite(mask.softness) ? mask.softness : 0.22),
  );
  const phase = Number.isFinite(mask.phase) ? mask.phase! : 0;
  if (mask.kind === "diagonal")
    return falloff(Math.abs(x - 0.5 + 0.44 * (y - 0.5)), 0.46, softness);
  if (mask.kind === "wave")
    return falloff(
      Math.abs(y - 0.5 - 0.105 * Math.sin(x * Math.PI * 2 + phase)),
      0.43,
      softness,
    );
  const dx = (x - 0.5) * 2,
    dy = (y - 0.5) * 2;
  const radius = Math.hypot(dx, dy);
  if (mask.kind === "bloom") {
    const angle = Math.atan2(dy, dx);
    return falloff(
      radius /
        (0.94 +
          0.045 * Math.sin(angle * 5 + phase) +
          0.025 * Math.cos(angle * 3 - phase)),
      1,
      softness,
    );
  }
  return falloff(radius, 1, softness);
}

// Only masks are rasterized. A small alpha texture scales smoothly while the
// photograph is always drawn from its original source at the requested size.
const masks = new Map<string, HTMLCanvasElement>();
const MASK_SIZE = 384;
export function applyPhotoBlendMask(
  ctx: CanvasRenderingContext2D,
  mask: PhotoBlendMask,
  width: number,
  height: number,
) {
  const key = JSON.stringify([mask.kind, mask.softness, mask.phase ?? 0]);
  let canvas = masks.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = canvas.height = MASK_SIZE;
    const paint = canvas.getContext("2d")!;
    const data = paint.createImageData(MASK_SIZE, MASK_SIZE);
    for (let y = 0; y < MASK_SIZE; y++)
      for (let x = 0; x < MASK_SIZE; x++) {
        const i = (y * MASK_SIZE + x) * 4;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = 255;
        data.data[i + 3] = Math.round(
          255 *
            photoBlendAlpha(mask, (x + 0.5) / MASK_SIZE, (y + 0.5) / MASK_SIZE),
        );
      }
    paint.putImageData(data, 0, 0);
    if (masks.size >= 24) masks.delete(masks.keys().next().value!);
    masks.set(key, canvas);
  }
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, width, height);
  ctx.restore();
}
