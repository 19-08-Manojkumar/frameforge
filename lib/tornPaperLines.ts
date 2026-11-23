import type { Dimensions, LineLayer } from "@/types/collage";

/** Filled paper ribbons, with reproducible torn edges at every render size. */
export function drawTornPaperLine(
  ctx: CanvasRenderingContext2D,
  line: LineLayer,
  size: Dimensions,
) {
  const kind = line.effect ?? "paper-deckle";
  const unit = Math.min(size.width, size.height);
  const dx = (line.x2 - line.x1) * size.width,
    dy = (line.y2 - line.y1) * size.height;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length,
    ny = dx / length;
  const half = Math.max(unit * line.width, length * 0.004);
  const transform = ctx.getTransform(),
    paintScale = Math.hypot(transform.a, transform.b);
  const seed = Array.from(kind).reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const noise = (i: number) => {
    const n = Math.sin((i + seed) * 127.1) * 43758.5453;
    return n - Math.floor(n);
  };
  const point = (t: number, offset = 0) => {
    const bend = 4 * t * (1 - t) * line.curve * unit;
    const slope = 4 * (1 - 2 * t) * line.curve * unit;
    const angle = Math.atan2(dy + ny * slope, dx + nx * slope);
    return {
      x: line.x1 * size.width + dx * t + nx * bend - Math.sin(angle) * offset,
      y: line.y1 * size.height + dy * t + ny * bend + Math.cos(angle) * offset,
      angle,
    };
  };
  const steps = kind === "paper-rip" ? 76 : 160;
  const edge = (i: number, side: number, shift = 0) => {
    const t = i / steps;
    let rough = (noise(i * 3 + (side > 0 ? 8 : 1)) - 0.5) * half;
    if (kind === "paper-deckle") rough *= 0.24;
    else if (kind === "paper-rip") rough *= 0.9;
    else if (kind === "paper-scallop")
      rough = Math.abs(Math.sin(t * Math.PI * 22)) * half * 0.45;
    else if (kind === "paper-washi") rough *= 0.15;
    else if (kind === "paper-notebook" && side < 0) rough = 0;
    else rough *= 0.5;
    return point(t, shift + side * half + rough);
  };
  const ribbon = (shift = 0) => {
    const path = new Path2D();
    for (let i = 0; i <= steps; i++) {
      const p = edge(i, -1, shift);
      i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y);
    }
    for (let i = steps; i >= 0; i--) {
      const p = edge(i, 1, shift);
      path.lineTo(p.x, p.y);
    }
    path.closePath();
    return path;
  };
  const seam = ribbon();
  const primary = line.color,
    accent = line.secondaryColor ?? "#b5a58d";
  ctx.save();
  ctx.globalAlpha = line.opacity;
  if (kind === "paper-layered") {
    ctx.fillStyle = accent;
    ctx.fill(ribbon(half * 0.55));
    ctx.globalAlpha = line.opacity * 0.65;
    ctx.fillStyle = primary;
    ctx.fill(ribbon(-half * 0.65));
    ctx.globalAlpha = line.opacity;
  }
  ctx.shadowColor = "#27312624";
  ctx.shadowBlur = unit * 0.003 * paintScale;
  ctx.shadowOffsetY = unit * 0.0015 * paintScale;
  ctx.fillStyle = primary;
  if (kind === "paper-washi") ctx.globalAlpha *= 0.78;
  ctx.fill(seam);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.save();
  ctx.clip(seam);
  // Sparse fibers and flecks, rather than a repeating raster texture.
  ctx.strokeStyle = accent;
  ctx.lineWidth = unit * 0.00045;
  ctx.globalAlpha = line.opacity * 0.12;
  for (let i = 0; i < 150; i++) {
    const p = point(noise(i + 17), (noise(i + 33) * 2 - 1) * half);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(
      p.x + Math.cos(p.angle) * half * 0.13,
      p.y + Math.sin(p.angle) * half * 0.13,
    );
    ctx.stroke();
  }
  const local = (t: number, draw: () => void) => {
    const p = point(t);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    draw();
    ctx.restore();
  };
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  if (kind === "paper-newsprint") {
    ctx.globalAlpha = line.opacity * 0.47;
    for (let row = -2; row <= 2; row++)
      for (let i = 0; i < 36; i++)
        local((i + 0.3) / 36, () =>
          ctx.fillRect(
            0,
            row * half * 0.31,
            (length / 65) * (0.4 + noise(i + row + 2)),
            half * 0.075,
          ),
        );
  } else if (kind === "paper-grid") {
    ctx.globalAlpha = line.opacity * 0.35;
    ctx.lineWidth = half * 0.025;
    for (let row = -2; row <= 2; row++) {
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const p = point(i / 80, row * half * 0.4);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 50; i++)
      local(i / 50, () => {
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(0, half);
        ctx.stroke();
      });
  } else if (kind === "paper-notebook") {
    ctx.globalAlpha = line.opacity * 0.22;
    ctx.lineWidth = half * 0.03;
    for (const row of [0.1, 0.65]) {
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const p = point(i / 80, row * half);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
    }
  } else if (kind === "paper-washi") {
    ctx.globalAlpha = line.opacity * 0.3;
    ctx.lineWidth = half * 0.25;
    for (let i = 0; i < 32; i++)
      local(i / 32, () => {
        ctx.beginPath();
        ctx.moveTo(-half, half);
        ctx.lineTo(half, -half);
        ctx.stroke();
      });
  } else if (kind === "paper-burnt") {
    ctx.globalAlpha = line.opacity * 0.8;
    ctx.lineWidth = half * 0.3;
    ctx.stroke(seam);
    ctx.globalAlpha = line.opacity * 0.12;
    ctx.lineWidth = half * 0.6;
    ctx.stroke(seam);
  } else if (kind === "paper-kraft") {
    ctx.globalAlpha = line.opacity * 0.22;
    for (let i = 0; i < 45; i++)
      local(noise(i), () =>
        ctx.fillRect(
          0,
          (noise(i + 23) - 0.5) * half,
          half * 0.045,
          half * 0.045,
        ),
      );
  } else if (kind === "paper-scallop") {
    ctx.globalAlpha = line.opacity * 0.6;
    for (let i = 0; i < 23; i++)
      local((i + 0.5) / 23, () => {
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(0, side * half * 0.64, half * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      });
  }
  ctx.restore();
  if (kind === "paper-notebook") {
    ctx.strokeStyle = accent;
    ctx.lineWidth = half * 0.085;
    ctx.globalAlpha = line.opacity * 0.9;
    for (let i = 0; i < 26; i++)
      local((i + 0.5) / 26, () => {
        ctx.beginPath();
        ctx.ellipse(
          0,
          -half * 0.8,
          half * 0.16,
          half * 0.48,
          -0.18,
          0.1,
          Math.PI * 1.9,
        );
        ctx.stroke();
      });
  }
  // Short fibers along both edges make the paper read as a tear at full size.
  if (!["paper-washi", "paper-scallop", "paper-burnt"].includes(kind)) {
    ctx.strokeStyle = primary;
    ctx.lineWidth = unit * 0.00075;
    ctx.globalAlpha = line.opacity * 0.65;
    for (let i = 2; i < steps - 2; i += 3)
      for (const side of [-1, 1]) {
        const p = edge(i, side),
          p2 = point(i / steps, side * half * (1.08 + noise(i) * 0.15));
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
  }
  ctx.restore();
}
