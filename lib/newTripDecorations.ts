import type { ThemeCustomization } from "@/types/collage";
import { createNewTripLayout, type NewTripThemeId } from "@/lib/newTripLayouts";

/** Resolution-independent artwork. Lettering lives in editable text layers. */
export function drawNewTripBackdrop(
  ctx: CanvasRenderingContext2D,
  id: NewTripThemeId,
  w: number,
  h: number,
  c: ThemeCustomization,
  count: number,
) {
  const u = Math.min(w, h),
    accent = c.accentColor;
  ctx.save();
  const fill = (
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * w, y * h, width * w, height * h);
  };
  if (id === "departure-club") {
    ctx.shadowColor = "#36413720";
    ctx.shadowBlur = u * 0.018 * ctx.getTransform().a;
    ctx.shadowOffsetY = u * 0.007 * ctx.getTransform().a;
    ctx.beginPath();
    ctx.roundRect(w * 0.035, h * 0.19, w * 0.93, h * 0.735, u * 0.015);
    ctx.fillStyle = c.sectionColor ?? "#fff9e9";
    ctx.fill();
    ctx.shadowBlur = ctx.shadowOffsetY = 0;
    fill(0.035, 0.19, 0.93, 0.018, accent);
    // Restrained paper flecks keep the boarding pass tactile at any size.
    ctx.fillStyle = "#5047280c";
    for (let i = 0; i < 550; i++)
      ctx.fillRect(
        w * (0.04 + (((i * 137.5) % 997) / 997) * 0.92),
        h * (0.212 + (((i * 73.7) % 991) / 991) * 0.7),
        u * 0.0014,
        u * 0.001,
      );
  } else if (id === "alpine-atlas") {
    // Contours follow different frequencies, rather than repeating straight lines.
    ctx.strokeStyle = `${accent}28`;
    ctx.lineWidth = u * 0.001;
    for (let ring = 0; ring < 24; ring++) {
      ctx.beginPath();
      for (let point = 0; point <= 150; point++) {
        const angle = (point / 150) * Math.PI * 2,
          radius = 0.04 + ring * 0.035;
        const wobble =
          1 +
          Math.sin(angle * 3 + ring * 0.12) * 0.12 +
          Math.cos(angle * 5) * 0.055;
        const x = w * 0.24 + Math.cos(angle) * w * radius * wobble;
        const y = h * 0.5 + Math.sin(angle) * h * radius * 0.7 * wobble;
        point ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    fill(0.625, 0.14, 0.33, 0.29, c.sectionColor ?? "#173f36");
  } else if (id === "off-grid-zine") {
    // Riso-print registration marks and rough cut edges frame the pictures.
    ctx.fillStyle = `${accent}10`;
    for (let i = 0; i < 1100; i++)
      ctx.fillRect(
        (((i * 173) % 997) / 997) * w,
        (((i * 293) % 991) / 991) * h,
        u * 0.001,
        u * 0.001,
      );
    fill(0.022, 0.29, 0.006, 0.57, accent);
    ctx.fillStyle = c.sectionColor ?? "#e96a36";
    ctx.beginPath();
    ctx.moveTo(w * 0.035, h * 0.885);
    for (let i = 0; i <= 35; i++)
      ctx.lineTo(
        w * (0.035 + (i / 35) * 0.93),
        h * (0.876 + Math.sin(i * 5.7) * 0.003),
      );
    ctx.lineTo(w * 0.965, h * 0.958);
    ctx.lineTo(w * 0.035, h * 0.966);
    ctx.closePath();
    ctx.fill();
  } else if (id === "horizon-cinema") {
    fill(0.025, 0.545, 0.95, 0.16, c.sectionColor ?? "#131e27");
    if (!c.backgroundCustomized) {
      const vignette = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        0,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.7,
      );
      vignette.addColorStop(0, "#60859015");
      vignette.addColorStop(1, "#00000020");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    if (!c.backgroundCustomized) {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "#e6e1f6");
      gradient.addColorStop(0.6, "#d0e3e0");
      gradient.addColorStop(1, "#f1c9b9");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = `${accent}25`;
    const step = u * 0.026;
    for (let x = step; x < w; x += step)
      for (let y = step; y < h; y += step)
        ctx.fillRect(x, y, u * 0.0014, u * 0.0014);
    const slots = createNewTripLayout(id, count, w, h).slots;
    for (const slot of slots) {
      const bar = slot.index === 0 ? h * 0.045 : Math.min(u * 0.017, h * 0.024);
      const edge = u * 0.006,
        x = slot.x - edge,
        y = slot.y - bar;
      ctx.fillStyle = `${accent}40`;
      ctx.fillRect(
        x + u * 0.008,
        y + u * 0.009,
        slot.width + edge * 2,
        slot.height + bar + edge,
      );
      ctx.fillStyle = c.sectionColor ?? "#f4efe7";
      ctx.fillRect(x, y, slot.width + edge * 2, slot.height + bar + edge);
      ctx.strokeStyle = accent;
      ctx.lineWidth = u * 0.0012;
      ctx.strokeRect(x, y, slot.width + edge * 2, slot.height + bar + edge);
      const dot = Math.min(bar * 0.115, u * 0.003);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(
          x + slot.width - (3 - i) * dot * 3,
          y + bar / 2,
          dot,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function drawNewTripOverlay(
  ctx: CanvasRenderingContext2D,
  id: NewTripThemeId,
  w: number,
  h: number,
  c: ThemeCustomization,
) {
  const u = Math.min(w, h),
    accent = c.accentColor;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = u * 0.0014;
  const rule = (x: number, y: number, width: number) => {
    ctx.beginPath();
    ctx.moveTo(w * x, h * y);
    ctx.lineTo(w * (x + width), h * y);
    ctx.stroke();
  };
  if (id === "departure-club") {
    ctx.setLineDash([u * 0.004, u * 0.006]);
    ctx.beginPath();
    ctx.moveTo(w * 0.71, h * 0.215);
    ctx.lineTo(w * 0.71, h * 0.904);
    ctx.stroke();
    ctx.setLineDash([]);
    // Punches and a decorative barcode, not an encoded ticket or fixed text.
    ctx.fillStyle = c.backgroundColor;
    for (const y of [0.19, 0.925]) {
      ctx.beginPath();
      ctx.arc(w * 0.71, h * y, u * 0.014, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = accent;
    for (let i = 0; i < 35; i++) {
      const thickness = (i % 4 === 0 ? 0.003 : 0.0012) * w;
      ctx.fillRect(
        w * (0.745 + i * 0.0048),
        h * 0.807,
        thickness,
        h * (i % 3 ? 0.045 : 0.06),
      );
    }
    rule(0.745, 0.414, 0.17);
  } else if (id === "alpine-atlas") {
    ctx.setLineDash([u * 0.003, u * 0.006]);
    ctx.beginPath();
    ctx.moveTo(w * 0.79, h * 0.439);
    ctx.bezierCurveTo(
      w * 0.98,
      h * 0.455,
      w * 0.58,
      h * 0.46,
      w * 0.61,
      h * 0.75,
    );
    ctx.stroke();
    ctx.setLineDash([]);
    // A tiny compass, kept outside the editable photographs.
    const x = w * 0.925,
      y = h * 0.918,
      r = u * 0.023;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.8);
    ctx.lineTo(x + r * 0.26, y + r * 0.6);
    ctx.lineTo(x, y + r * 0.2);
    ctx.lineTo(x - r * 0.26, y + r * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (id === "off-grid-zine") {
    // A small ink sunburst in the whitespace above the photo cutouts.
    const x = w * 0.91,
      y = h * 0.252,
      r = u * 0.025;
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        radius = r * (i % 2 ? 0.48 : 1);
      const px = x + Math.cos(a) * radius,
        py = y + Math.sin(a) * radius;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (id === "horizon-cinema") {
    ctx.globalAlpha = 0.6;
    rule(0.035, 0.535, 0.93);
    rule(0.035, 0.711, 0.93);
    ctx.globalAlpha = 1;
    for (const x of [0.035, 0.955])
      ctx.fillRect(w * x, h * 0.1, w * 0.01, h * 0.004);
    ctx.beginPath();
    ctx.arc(w * 0.955, h * 0.962, u * 0.003, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Desktop cursor, placed in the margin, never over a user's photo.
    ctx.save();
    ctx.translate(w * 0.963, h * 0.32);
    ctx.rotate(-0.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, u * 0.025);
    ctx.lineTo(u * 0.007, u * 0.019);
    ctx.lineTo(u * 0.012, u * 0.029);
    ctx.lineTo(u * 0.018, u * 0.026);
    ctx.lineTo(u * 0.012, u * 0.016);
    ctx.lineTo(u * 0.023, u * 0.016);
    ctx.closePath();
    ctx.fillStyle = "#fffefa";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
