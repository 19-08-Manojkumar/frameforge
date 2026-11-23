import type { Dimensions, LineLayer } from "@/types/collage";

export function lineGeometry(line: LineLayer, size: Dimensions) {
  const dx = (line.x2 - line.x1) * size.width,
    dy = (line.y2 - line.y1) * size.height;
  const angle = Math.atan2(dy, dx);
  const maximum = Math.min(
    size.width / Math.max(0.000001, Math.abs(Math.cos(angle))),
    size.height / Math.max(0.000001, Math.abs(Math.sin(angle))),
  );
  return {
    angle: (angle * 180) / Math.PI,
    length: Math.hypot(dx, dy) / maximum,
  };
}
export function transformLine(
  line: LineLayer,
  size: Dimensions,
  change: { angle?: number; length?: number },
): Partial<LineLayer> {
  const current = lineGeometry(line, size);
  const angle = ((change.angle ?? current.angle) * Math.PI) / 180;
  const ratio = Math.max(0.1, Math.min(1, change.length ?? current.length));
  const maximum = Math.min(
    size.width / Math.max(0.000001, Math.abs(Math.cos(angle))),
    size.height / Math.max(0.000001, Math.abs(Math.sin(angle))),
  );
  const dx = (Math.cos(angle) * maximum * ratio) / size.width / 2;
  const dy = (Math.sin(angle) * maximum * ratio) / size.height / 2;
  const x = Math.max(
    Math.abs(dx),
    Math.min(1 - Math.abs(dx), (line.x1 + line.x2) / 2),
  );
  const y = Math.max(
    Math.abs(dy),
    Math.min(1 - Math.abs(dy), (line.y1 + line.y2) / 2),
  );
  return { x1: x - dx, x2: x + dx, y1: y - dy, y2: y + dy };
}
