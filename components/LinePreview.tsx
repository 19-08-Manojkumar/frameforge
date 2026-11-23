"use client";
import { useEffect, useRef } from "react";
import { drawLines } from "@/lib/lineRenderer";
import type { LineLayer } from "@/types/collage";
export function LinePreview({ line }: { line: Omit<LineLayer, "id"> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current!,
      ctx = element.getContext("2d")!;
    ctx.clearRect(0, 0, 400, 160);
    ctx.save();
    ctx.translate(0, -120);
    drawLines(
      ctx,
      [{ ...line, id: "preview", x1: 0.08, y1: 0.5, x2: 0.92, y2: 0.5 }],
      { width: 400, height: 400 },
    );
    ctx.restore();
  }, [line]);
  return (
    <canvas
      ref={canvas}
      className="line-preset-preview"
      width={400}
      height={160}
      aria-hidden="true"
    />
  );
}
