import type { ThemeCustomization, ThemeId } from "@/types/collage";
import { isNewTripTheme } from "@/lib/newTripLayouts";
import {
  drawNewTripBackdrop,
  drawNewTripOverlay,
} from "@/lib/newTripDecorations";

export function drawTripBackdrop(
  ctx: CanvasRenderingContext2D,
  theme: ThemeId,
  w: number,
  h: number,
  c: ThemeCustomization,
  count = 5,
) {
  if (isNewTripTheme(theme))
    return drawNewTripBackdrop(ctx, theme, w, h, c, count);
  const u = Math.min(w, h);
  ctx.save();
  if (theme === "route-diary") {
    ctx.fillStyle = c.sectionColor ?? "#e7dcc4";
    ctx.fillRect(w * 0.055, h * 0.065, w * 0.89, h * 0.88);
    // Fine paper fibres, drawn deterministically at every output resolution.
    ctx.fillStyle = "#6b553312";
    for (let i = 0; i < 850; i++) {
      const px = ((i * 137.508) % 997) / 997;
      const py = ((i * 81.731) % 991) / 991;
      ctx.fillRect(
        w * (0.055 + px * 0.89),
        h * (0.065 + py * 0.88),
        u * 0.0012,
        u * 0.0007,
      );
    }
    ctx.strokeStyle = `${c.accentColor}25`;
    ctx.lineWidth = u * 0.0015;
    // Deterministic map contours and a dotted route, with no flattened lettering.
    for (let row = 0; row < 11; row++) {
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const x = w * (0.06 + (0.88 * i) / 24),
          y = h * (0.1 + row * 0.075 + 0.025 * Math.sin(i * 0.65 + row * 0.8));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([u * 0.004, u * 0.008]);
    ctx.strokeStyle = c.accentColor;
    ctx.lineWidth = u * 0.002;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.09);
    ctx.bezierCurveTo(
      w * 0.75,
      h * 0.18,
      w * 0.17,
      h * 0.73,
      w * 0.86,
      h * 0.79,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (
    (theme === "coastal-exposure" ||
      theme === "golden-roadtrip" ||
      theme === "heritage-reverie") &&
    !c.backgroundCustomized
  ) {
    const glow = ctx.createLinearGradient(0, 0, w * 0.7, h);
    const colors =
      theme === "heritage-reverie"
        ? ["#e6d3af", "#bda06a", "#796043"]
        : theme === "golden-roadtrip"
          ? ["#f7f1e5", "#e5c68f", "#b88a56"]
          : ["#faf6f0", "#f7edda", "#c8d5ca"];
    colors.forEach((color, i) => glow.addColorStop(i / 2, color));
    ctx.fillStyle = glow;
    if (theme === "golden-roadtrip")
      ctx.fillRect(w * 0.085, h * 0.065, w * 0.83, h * 0.87);
    else ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

export function drawTripOverlay(
  ctx: CanvasRenderingContext2D,
  theme: ThemeId,
  w: number,
  h: number,
  c: ThemeCustomization,
) {
  if (isNewTripTheme(theme)) return drawNewTripOverlay(ctx, theme, w, h, c);
  const u = Math.min(w, h);
  ctx.save();
  if (theme === "route-diary") {
    const x = w * 0.31,
      y = h * 0.445,
      width = w * 0.39,
      height = h * 0.27;
    ctx.shadowColor = "#51452f45";
    ctx.shadowBlur = u * 0.012 * ctx.getTransform().a;
    ctx.shadowOffsetY = u * 0.006 * ctx.getTransform().a;
    ctx.beginPath();
    ctx.moveTo(x + u * 0.015, y);
    ctx.lineTo(x + width, y + u * 0.008);
    ctx.lineTo(x + width - u * 0.008, y + height);
    ctx.lineTo(x, y + height - u * 0.006);
    for (let i = 16; i >= 0; i--)
      ctx.lineTo(x + (i % 2 ? u * 0.008 : 0), y + (height * i) / 16);
    ctx.closePath();
    ctx.fillStyle = c.sectionColor ?? "#ede0c3";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "#8d735024";
    ctx.lineWidth = u * 0.0008;
    for (let line = 1; line < 12; line++) {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.09, y + (height * line) / 12);
      ctx.lineTo(x + width * 0.94, y + (height * line) / 12);
      ctx.stroke();
    }
    // Notebook perforations and translucent corner tape retain the handmade feel.
    for (let i = 1; i < 9; i++) {
      ctx.fillStyle = "#6e5e4355";
      ctx.beginPath();
      ctx.ellipse(
        x + width * 0.035,
        y + (height * i) / 9,
        u * 0.003,
        u * 0.004,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#c7b68d66";
    ctx.fillRect(w * 0.067, h * 0.075, w * 0.16, h * 0.015);
    ctx.fillRect(w * 0.78, h * 0.925, w * 0.15, h * 0.018);
    ctx.strokeStyle = `${c.accentColor}55`;
    ctx.lineWidth = u * 0.001;
    ctx.strokeRect(w * 0.052, h * 0.063, w * 0.896, h * 0.884);
    for (const [cx, cy] of [
      [0.12, 0.7],
      [0.87, 0.9],
    ]) {
      ctx.beginPath();
      ctx.ellipse(w * cx, h * cy, u * 0.036, u * 0.036, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w * cx, h * cy, u * 0.028, u * 0.028, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * cx - u * 0.015, h * cy);
      ctx.lineTo(w * cx + u * 0.015, h * cy);
      ctx.moveTo(w * cx, h * cy - u * 0.015);
      ctx.lineTo(w * cx, h * cy + u * 0.015);
      ctx.stroke();
    }
  } else if (theme === "golden-roadtrip" || theme === "heritage-reverie") {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = c.accentColor;
    ctx.fillRect(
      theme === "golden-roadtrip" ? w * 0.085 : 0,
      theme === "golden-roadtrip" ? h * 0.065 : 0,
      theme === "golden-roadtrip" ? w * 0.83 : w,
      theme === "golden-roadtrip" ? h * 0.87 : h,
    );
    ctx.restore();
    const color =
      c.sectionColor ?? (theme === "golden-roadtrip" ? "#292d21" : "#433423");
    const gradient = ctx.createLinearGradient(0, h * 0.44, 0, h * 0.72);
    gradient.addColorStop(0, `${color}00`);
    gradient.addColorStop(0.43, `${color}65`);
    gradient.addColorStop(0.65, `${color}70`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fillRect(
      theme === "golden-roadtrip" ? w * 0.085 : 0,
      h * 0.44,
      theme === "golden-roadtrip" ? w * 0.83 : w,
      h * 0.28,
    );
    if (theme === "golden-roadtrip") {
      ctx.strokeStyle = "#56463235";
      ctx.lineWidth = u * 0.001;
      ctx.strokeRect(w * 0.085, h * 0.065, w * 0.83, h * 0.87);
    } else {
      const shade = ctx.createLinearGradient(0, h * 0.89, 0, h);
      shade.addColorStop(0, "#3d321d00");
      shade.addColorStop(1, "#3d321da0");
      ctx.fillStyle = shade;
      ctx.fillRect(0, h * 0.89, w, h * 0.11);
    }
  } else if (theme === "coastal-exposure") {
    if (c.sectionColor) {
      ctx.fillStyle = c.sectionColor;
      ctx.fillRect(w * 0.055, h * 0.07, w * 0.3, h * 0.25);
    }
    ctx.strokeStyle = c.accentColor;
    ctx.lineWidth = u * 0.001;
    ctx.beginPath();
    ctx.moveTo(w * 0.09, h * 0.265);
    ctx.lineTo(w * 0.31, h * 0.265);
    ctx.stroke();
  }
  ctx.restore();
}
