import type { ThemeCustomization } from "@/types/collage";
import type { BlendedTourId } from "@/lib/blendedTourLayouts";
import { BLENDED_TOUR_SECTIONS } from "@/lib/blendedTourThemes";

export function drawBlendedTourBackdrop(
  ctx: CanvasRenderingContext2D,
  id: BlendedTourId,
  w: number,
  h: number,
  c: ThemeCustomization,
) {
  if (c.backgroundCustomized) return;
  ctx.save();
  const colors: Record<BlendedTourId, [string, string, string]> = {
    "sunset-drift": ["#efcdb0", "#dca18b", "#a86f6d"],
    "cloudline-escape": ["#edf4ef", "#d6e5e4", "#edf4ef"],
    "prism-voyage": ["#243b58", "#65767e", "#142536"],
    "midnight-mirage": ["#222c48", "#414966", "#101a30"],
    "tidal-reverie": ["#f4efdf", "#c4dad1", "#f4efdf"],
  };
  const gradient = ctx.createLinearGradient(0, 0, w * 0.3, h);
  colors[id].forEach((color, i) => gradient.addColorStop(i / 2, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Gentle tonal washes stay outside clear photo centers; all text is editable. */
export function drawBlendedTourOverlay(
  ctx: CanvasRenderingContext2D,
  id: BlendedTourId,
  w: number,
  h: number,
  c: ThemeCustomization,
) {
  const u = Math.min(w, h),
    section = BLENDED_TOUR_SECTIONS[id];
  const color = c.sectionColor ?? section.color;
  ctx.save();
  const footer = ctx.createLinearGradient(0, h * section.rect[1], 0, h);
  footer.addColorStop(0, `${color}00`);
  footer.addColorStop(0.55, `${color}b8`);
  footer.addColorStop(1, color);
  ctx.fillStyle = footer;
  ctx.fillRect(0, h * section.rect[1], w, h * section.rect[3]);
  if (
    id === "sunset-drift" ||
    id === "prism-voyage" ||
    id === "midnight-mirage"
  ) {
    const head = ctx.createLinearGradient(0, 0, 0, h * 0.16);
    head.addColorStop(0, id === "sunset-drift" ? "#38242a85" : "#0e1c3665");
    head.addColorStop(1, "#0e1c3600");
    ctx.fillStyle = head;
    ctx.fillRect(0, 0, w, h * 0.16);
  }
  if (id === "sunset-drift") {
    const flare = ctx.createRadialGradient(
      w * 0.97,
      h * 0.24,
      0,
      w * 0.97,
      h * 0.24,
      u * 0.7,
    );
    flare.addColorStop(0, "#ffd8a05c");
    flare.addColorStop(0.45, "#edb06d1a");
    flare.addColorStop(1, "#edb06d00");
    ctx.fillStyle = flare;
    ctx.fillRect(0, 0, w, h * 0.74);
  } else if (id === "cloudline-escape") {
    ctx.strokeStyle = `${c.accentColor}65`;
    ctx.lineWidth = u * 0.0012;
    ctx.setLineDash([u * 0.002, u * 0.006]);
    ctx.beginPath();
    ctx.moveTo(w * 0.075, h * 0.44);
    ctx.bezierCurveTo(
      w * 0.24,
      h * 0.48,
      w * 0.22,
      h * 0.33,
      w * 0.365,
      h * 0.35,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (id === "prism-voyage") {
    ctx.strokeStyle = `${c.accentColor}85`;
    ctx.lineWidth = u * 0.002;
    for (const x of [0.89, 0.925, 0.96]) {
      ctx.beginPath();
      ctx.moveTo(w * x, h * 0.882);
      ctx.lineTo(w * (x - 0.025), h * 0.918);
      ctx.stroke();
    }
  } else if (id === "midnight-mirage") {
    const glow = ctx.createRadialGradient(
      w * 0.21,
      h * 0.2,
      0,
      w * 0.21,
      h * 0.2,
      u * 0.65,
    );
    glow.addColorStop(0, "#a2a5f029");
    glow.addColorStop(1, "#7c9ce900");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h * 0.73);
    ctx.strokeStyle = c.accentColor;
    ctx.lineWidth = u * 0.001;
    for (const [x, y, r] of [
      [0.91, 0.17, 0.009],
      [0.08, 0.29, 0.005],
      [0.87, 0.65, 0.005],
    ]) {
      ctx.beginPath();
      ctx.moveTo(w * x - u * r, h * y);
      ctx.lineTo(w * x + u * r, h * y);
      ctx.moveTo(w * x, h * y - u * r);
      ctx.lineTo(w * x, h * y + u * r);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = `${c.accentColor}45`;
    ctx.lineWidth = u * 0.001;
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const x = w * (0.065 + (i / 90) * 0.87),
        y = h * 0.878 + Math.sin((i / 90) * Math.PI * 3) * u * 0.003;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
