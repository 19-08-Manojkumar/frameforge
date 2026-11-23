import type { Dimensions, LineLayer } from "@/types/collage";
import { drawLineEffect } from "@/lib/decorativeLines";

export interface LinePath {
  d: string;
  dash: string;
}

export function linePaths(line: LineLayer, dimensions: Dimensions): LinePath[] {
  // Decorative art has its own geometry; a previous classic stroke must not
  // change its selection path after switching designs.
  const style = line.effect ? "solid" : line.style;
  const { width, height } = dimensions;
  const min = Math.min(width, height);
  const x1 = line.x1 * width;
  const y1 = line.y1 * height;
  const x2 = line.x2 * width;
  const y2 = line.y2 * height;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const dash =
    style === "dashed"
      ? `${line.width * min * 4} ${line.width * min * 2.5}`
      : style === "dotted"
        ? `0 ${line.width * min * 2.2}`
        : style === "dash-dot"
          ? `${line.width * min * 3} ${line.width * min * 1.5} ${line.width * min * 0.5} ${line.width * min * 1.5}`
          : "";
  let d: string;
  if (style === "wavy" || style === "zigzag") {
    const steps = 24;
    const amplitude =
      style === "wavy" ? line.width * min * 3 : line.width * min * 2.5;
    const points = Array.from({ length: steps + 1 }, (_, step) => {
      const t = step / steps;
      const curveOffset = 4 * t * (1 - t) * line.curve * min * 2;
      const wave =
        style === "wavy"
          ? Math.sin(t * Math.PI * 8) * amplitude
          : Math.round(t * 12) % 2 === 0
            ? amplitude
            : -amplitude;
      return `${x1 + dx * t + nx * (wave + curveOffset)} ${y1 + dy * t + ny * (wave + curveOffset)}`;
    });
    d = `M${points.join(" L")}`;
  } else {
    const cx = (x1 + x2) / 2 + nx * line.curve * min * 2;
    const cy = (y1 + y2) / 2 + ny * line.curve * min * 2;
    d = line.curve
      ? `M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`
      : `M${x1} ${y1} L${x2} ${y2}`;
  }
  if (style === "double") {
    const offset = line.width * min * 1.8;
    return [
      { d: offsetPath(d, nx * offset, ny * offset), dash: "" },
      { d: offsetPath(d, -nx * offset, -ny * offset), dash: "" },
    ];
  }
  const paths = [{ d, dash }];
  if (style === "arrow") {
    const angle = Math.atan2(dy, dx);
    const size = line.width * min * 5;
    const bx = x2 - Math.cos(angle) * size;
    const by = y2 - Math.sin(angle) * size;
    paths.push({
      d: `M${x2} ${y2} L${bx - Math.sin(angle) * size * 0.65} ${by + Math.cos(angle) * size * 0.65} L${bx + Math.sin(angle) * size * 0.65} ${by - Math.cos(angle) * size * 0.65} Z`,
      dash: "",
    });
  }
  return paths;
}

function offsetPath(path: string, dx: number, dy: number) {
  const match =
    /^M(-?[\d.]+) (-?[\d.]+) (?:(?:L)|(?:Q(-?[\d.]+) (-?[\d.]+) ))(-?[\d.]+) (-?[\d.]+)$/.exec(
      path,
    );
  if (!match) return path;
  const [, x1, y1, cx, cy, x2, y2] = match;
  return cx && cy
    ? `M${Number(x1) + dx} ${Number(y1) + dy} Q${Number(cx) + dx} ${Number(cy) + dy} ${Number(x2) + dx} ${Number(y2) + dy}`
    : `M${Number(x1) + dx} ${Number(y1) + dy} L${Number(x2) + dx} ${Number(y2) + dy}`;
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: LineLayer[],
  dimensions: Dimensions,
) {
  for (const line of lines) {
    if (line.effect) {
      drawLineEffect(ctx, line, dimensions);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, line.opacity));
    ctx.strokeStyle = line.color;
    ctx.fillStyle = line.color;
    ctx.lineWidth = line.width * Math.min(dimensions.width, dimensions.height);
    ctx.lineCap = line.style === "dotted" ? "round" : "round";
    ctx.lineJoin = "round";
    for (const path of linePaths(line, dimensions)) {
      ctx.setLineDash(path.dash ? path.dash.split(" ").map(Number) : []);
      const shape = new Path2D(path.d);
      if (line.style === "arrow" && path.d.endsWith("Z")) ctx.fill(shape);
      else ctx.stroke(shape);
    }
    ctx.restore();
  }
}
