import type { Dimensions, LineLayer } from "@/types/collage";
import { drawTornPaperLine } from "@/lib/tornPaperLines";

/** Deterministic vector effects shared by gallery canvases and real exports. */
export function drawLineEffect(
  ctx: CanvasRenderingContext2D,
  line: LineLayer,
  size: Dimensions,
) {
  if (line.effect?.startsWith("paper-")) {
    drawTornPaperLine(ctx, line, size);
    return;
  }
  const effect = line.effect;
  // Canvas blur uses backing pixels, unlike paths and strokes. Compensate for
  // the preview transform so the same glow exports at every output size.
  const transform = ctx.getTransform();
  const paintScale = Math.hypot(transform.a, transform.b);
  const x1 = line.x1 * size.width,
    y1 = line.y1 * size.height;
  const dx = (line.x2 - line.x1) * size.width,
    dy = (line.y2 - line.y1) * size.height;
  const length = Math.hypot(dx, dy) || 1,
    unit = Math.min(size.width, size.height);
  const nx = -dy / length,
    ny = dx / length;
  const weight = Math.max(line.width * unit, length * 0.003);
  const ornament = Math.max(weight * 2.2, length * 0.022);
  const colors = [
    ...(line.palette ?? [line.color, line.secondaryColor ?? "#f8ddb3"]),
  ];
  colors[0] = line.color;
  colors[colors.length - 1] = line.secondaryColor ?? colors.at(-1)!;
  const gradient = ctx.createLinearGradient(x1, y1, x1 + dx, y1 + dy);
  colors.forEach((color, i) =>
    gradient.addColorStop(i / Math.max(1, colors.length - 1), color),
  );
  const point = (t: number) => {
    const curve = 4 * t * (1 - t) * line.curve * unit;
    const slope = 4 * (1 - 2 * t) * line.curve * unit;
    return {
      x: x1 + dx * t + nx * curve,
      y: y1 + dy * t + ny * curve,
      angle: Math.atan2(dy + ny * slope, dx + nx * slope),
    };
  };
  const rand = (i: number) => {
    const n = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const stroke = (
    offset = 0,
    wave = 0,
    color: string | CanvasGradient = gradient,
    thickness = weight,
  ) => {
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const t = i / 100,
        p = point(t),
        v = offset + Math.sin(t * Math.PI * 6) * wave;
      const x = p.x + nx * v,
        y = p.y + ny * v;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
  };
  const star = (x: number, y: number, r: number, color: string, points = 4) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2,
        radius = i % 2 ? r * 0.25 : r;
      const px = x + Math.cos(angle) * radius,
        py = y + Math.sin(angle) * radius;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  const disk = (
    x: number,
    y: number,
    r: number,
    color: string,
    glow = false,
  ) => {
    ctx.save();
    ctx.fillStyle = color;
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = r * 3 * paintScale;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const leaf = (
    x: number,
    y: number,
    r: number,
    angle: number,
    color: string,
    round = false,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    if (round) ctx.ellipse(r * 0.65, 0, r * 0.72, r * 0.58, 0, 0, Math.PI * 2);
    else {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(r * 0.3, -r * 0.68, r * 1.3, -r * 0.58, r * 1.7, 0);
      ctx.bezierCurveTo(r * 1.1, r * 0.6, r * 0.4, r * 0.68, 0, 0);
    }
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = colors.at(-1)!;
    ctx.lineWidth = weight * 0.25;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 1.35, 0);
    ctx.stroke();
    ctx.restore();
  };
  const bloom = (
    x: number,
    y: number,
    r: number,
    color: string,
    petals = 5,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    for (let i = 0; i < petals; i++) {
      ctx.rotate((Math.PI * 2) / petals);
      ctx.beginPath();
      ctx.ellipse(r * 0.62, 0, r * 0.65, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    disk(0, 0, r * 0.27, colors.at(-1)!);
    ctx.restore();
  };
  const heart = (x: number, y: number, r: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r / 12, r / 12);
    ctx.fillStyle = color;
    ctx.fill(
      new Path2D(
        "M0 9C-5 4-12 0-12-6C-12-14-3-15 0-9C4-15 12-13 12-6C12 0 5 5 0 9Z",
      ),
    );
    ctx.restore();
  };
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, line.opacity));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const botanical = [
    "eucalyptus",
    "olive",
    "fern",
    "ivy",
    "tropical",
    "sakura",
    "wildflower",
    "daisy",
    "rose-vine",
    "wheat",
    "citrus",
  ].includes(effect ?? "");
  if (botanical) {
    stroke(0, effect === "ivy" ? ornament * 0.5 : 0, line.color, weight * 0.55);
    const count =
      effect === "fern"
        ? 18
        : effect === "wheat"
          ? 16
          : effect === "tropical"
            ? 6
            : 10;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.6) / (count + 1),
        p = point(t),
        side = i % 2 ? 1 : -1;
      if (effect === "fern") {
        const r = ornament * (0.35 + Math.sin(t * Math.PI) * 1.4);
        leaf(p.x, p.y, r, p.angle - 1.05, colors[i % colors.length]);
        leaf(p.x, p.y, r, p.angle + 1.05, colors[(i + 1) % colors.length]);
      } else if (effect === "eucalyptus") {
        leaf(
          p.x,
          p.y,
          ornament * 0.95,
          p.angle + side * 1.35,
          colors[i % 2],
          true,
        );
      } else if (effect === "olive") {
        leaf(p.x, p.y, ornament * 0.9, p.angle + side * 1.1, colors[i % 2]);
        if (i % 3 === 0)
          disk(
            p.x + nx * ornament * 0.7,
            p.y + ny * ornament * 0.7,
            ornament * 0.23,
            colors.at(-1)!,
          );
      } else if (effect === "ivy") {
        heart(
          p.x + nx * side * ornament * 0.8,
          p.y + ny * side * ornament * 0.8,
          ornament * 0.8,
          colors[i % 2],
        );
      } else if (effect === "tropical") {
        for (let j = -2; j <= 2; j++)
          leaf(
            p.x,
            p.y,
            ornament * 1.05,
            p.angle + side * (0.65 + j * 0.25),
            colors[(i + j + 4) % 2],
          );
      } else if (effect === "wheat") {
        const r = ornament * (0.4 + 0.6 * Math.sin(t * Math.PI));
        leaf(p.x, p.y, r, p.angle - 1.05, colors[1]);
        leaf(p.x, p.y, r, p.angle + 1.05, colors[2]);
      } else if (effect === "citrus") {
        leaf(p.x, p.y, ornament * 0.7, p.angle + side * 1.1, colors.at(-1)!);
        if (i % 2 === 0) {
          const x = p.x + nx * ornament * 0.8,
            y = p.y + ny * ornament * 0.8;
          disk(x, y, ornament * 0.8, colors[0]);
          disk(x, y, ornament * 0.62, colors[1]);
          ctx.strokeStyle = colors[0];
          ctx.lineWidth = weight * 0.3;
          for (let j = 0; j < 6; j++) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
              x + Math.cos((j * Math.PI) / 3) * ornament * 0.56,
              y + Math.sin((j * Math.PI) / 3) * ornament * 0.56,
            );
            ctx.stroke();
          }
        }
      } else {
        leaf(p.x, p.y, ornament * 0.65, p.angle - side * 1.1, line.color);
        const x = p.x + nx * side * ornament,
          y = p.y + ny * side * ornament;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = line.color;
        ctx.lineWidth = weight * 0.4;
        ctx.stroke();
        if (effect === "rose-vine") {
          for (let j = 3; j > 0; j--)
            bloom(x, y, ornament * j * 0.3, colors[(j % 2) + 1], 7);
        } else
          bloom(
            x,
            y,
            ornament *
              (effect === "sakura"
                ? 0.9
                : effect === "wildflower"
                  ? 0.65
                  : 0.75),
            effect === "daisy"
              ? colors[1]
              : colors[1 + (i % (colors.length - 1))],
            effect === "daisy" ? 9 : 5,
          );
      }
    }
  } else if (effect === "aurora" || effect === "rainbow-ribbon") {
    colors.forEach((color, i) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = effect === "aurora" ? ornament * paintScale : 0;
      ctx.globalAlpha *= 0.7;
      stroke(
        (i - (colors.length - 1) / 2) * weight * 1.5,
        ornament * (effect === "aurora" ? 1.2 : 0.5),
        color,
        weight * (effect === "aurora" ? 1.6 : 1.2),
      );
      ctx.restore();
    });
  } else if (effect === "neon") {
    ctx.shadowColor = line.color;
    ctx.shadowBlur = weight * 7 * paintScale;
    stroke(0, 0, gradient, weight * 2.2);
    ctx.shadowBlur = weight * 3 * paintScale;
    stroke(0, 0, "#fff3fb", weight * 0.55);
  } else if (effect === "comet") {
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = line.opacity * (0.18 + i * 0.17);
      stroke((i - 1.5) * weight, ornament * 0.35, gradient, weight * 0.7);
    }
    ctx.globalAlpha = line.opacity;
    const p = point(0.9);
    star(p.x, p.y, ornament * 1.8, colors.at(-1)!, 5);
  } else if (effect === "ocean") {
    colors.forEach((color, i) =>
      stroke((i - 1) * weight * 2, ornament * 0.7, color, weight * 0.75),
    );
    for (let i = 0; i < 7; i++) {
      const p = point((i + 0.5) / 7);
      disk(
        p.x + nx * ornament,
        p.y + ny * ornament,
        weight * 0.5,
        colors.at(-1)!,
      );
    }
  } else {
    stroke(
      0,
      effect === "galaxy" ? ornament * 0.5 : 0,
      gradient,
      effect === "prism" ? weight * 0.5 : weight * 0.65,
    );
    const count =
      effect === "gold-glitter"
        ? 120
        : effect === "firefly"
          ? 28
          : effect === "confetti"
            ? 34
            : effect === "rose-glitter"
              ? 36
              : 14;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count,
        p = point(t),
        side = i % 2 ? 1 : -1,
        color = colors[i % colors.length];
      const spread = [
        "gold-glitter",
        "rose-glitter",
        "firefly",
        "confetti",
        "galaxy",
        "stardust",
      ].includes(effect ?? "")
        ? (rand(i + 9) - 0.5) * ornament * 3.4
        : 0;
      const x = p.x + nx * spread,
        y = p.y + ny * spread,
        r = ornament * (0.35 + rand(i + 3) * 0.45);
      if (effect === "prism") {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - r * 1.5, y);
        ctx.lineTo(x, y + side * r * 2);
        ctx.lineTo(x + r * 1.5, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = colors.at(-1)!;
        ctx.lineWidth = weight * 0.25;
        ctx.beginPath();
        ctx.moveTo(x - r * 1.5, y);
        ctx.lineTo(x, y + side * r * 2);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (effect === "gold-glitter") {
        // Fine grains retain a glitter texture even when the trail is enlarged.
        disk(x, y, weight * (0.08 + rand(i) * 0.23), color, i % 9 === 0);
        if (i % 17 === 0) star(x, y, r * 0.75, colors[1]);
      } else if (effect === "stardust" || effect === "galaxy") {
        if (i % 3 === 0) star(x, y, r, color, effect === "galaxy" ? 5 : 4);
        else disk(x, y, weight * 0.55, color, true);
      } else if (effect === "firefly")
        disk(x, y, weight * (0.4 + rand(i) * 0.65), color, true);
      else if (effect === "rose-glitter" || effect === "crystal") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.7, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = colors.at(-1)!;
        ctx.lineWidth = weight * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.moveTo(-r * 0.7, 0);
        ctx.lineTo(r * 0.7, 0);
        ctx.stroke();
        ctx.restore();
      } else if (effect === "confetti") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rand(i) * 6);
        ctx.fillStyle = color;
        ctx.fillRect(-weight, -r * 0.5, weight * 2, r);
        ctx.restore();
      } else if (effect === "pearls") {
        const shine = ctx.createRadialGradient(
          x - r * 0.3,
          y - r * 0.3,
          0,
          x,
          y,
          r,
        );
        shine.addColorStop(0, "#ffffff");
        shine.addColorStop(0.55, colors[1]);
        shine.addColorStop(1, line.color);
        ctx.fillStyle = shine;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect === "sequin") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(i % 2 ? Math.PI / 4 : 0);
        ctx.fillStyle = color;
        ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
        ctx.strokeStyle = "#fff8e9";
        ctx.lineWidth = weight * 0.3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.5);
        ctx.lineTo(r * 0.4, -r * 0.5);
        ctx.stroke();
        ctx.restore();
      } else if (effect === "heart-chain") heart(x, y, r, color);
      else if (effect === "butterfly") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * 0.35);
        for (const s of [-1, 1]) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.ellipse(
            s * r * 0.65,
            -r * 0.25,
            r * 0.65,
            r * 0.85,
            s * 0.4,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          disk(s * r * 0.5, r * 0.6, r * 0.4, colors[(i + 1) % colors.length]);
        }
        ctx.strokeStyle = line.color;
        ctx.lineWidth = weight * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.6);
        ctx.lineTo(0, r * 0.9);
        ctx.stroke();
        ctx.restore();
      } else if (effect === "celestial") {
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(x + r * 0.4, y - r);
          ctx.bezierCurveTo(
            x - r * 1.3,
            y - r,
            x - r * 1.3,
            y + r,
            x + r * 0.4,
            y + r,
          );
          ctx.bezierCurveTo(
            x - r * 0.35,
            y + r * 0.35,
            x - r * 0.35,
            y - r * 0.35,
            x + r * 0.4,
            y - r,
          );
          ctx.fillStyle = color;
          ctx.fill();
        } else star(x, y, r * 0.6, color);
      } else if (effect === "sunset") {
        disk(x, y, r * 0.65, color);
        ctx.strokeStyle = color;
        ctx.lineWidth = weight * 0.35;
        for (let j = 0; j < 8; j++) {
          const a = (j * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
          ctx.lineTo(x + Math.cos(a) * r * 1.25, y + Math.sin(a) * r * 1.25);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}
