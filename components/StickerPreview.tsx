"use client";
import { memo, useEffect, useRef } from "react";
import type { StickerDefinition } from "@/lib/stickers";
import type { StickerStyle } from "@/types/collage";
import { drawStickerArtwork } from "@/lib/stickerArtwork";

const previews = new Map<string, ImageData>();
export const StickerPreview = memo(function StickerPreview({
  sticker,
  style = "classic",
  color = sticker.color,
  secondaryColor = sticker.secondary,
  outline = sticker.defaultOutline ?? true,
}: {
  sticker: StickerDefinition;
  style?: StickerStyle;
  color?: string;
  secondaryColor?: string;
  outline?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const key = JSON.stringify([
      sticker.id,
      style,
      color,
      secondaryColor,
      outline,
    ]);
    let preview = previews.get(key);
    if (!preview) {
      const surface = document.createElement("canvas");
      surface.width = surface.height = 112;
      const ctx = surface.getContext("2d")!;
      ctx.scale(4, 4);
      ctx.translate(2, 2);
      drawStickerArtwork(ctx, sticker, {
        style,
        color,
        secondaryColor,
        outline,
      });
      preview = ctx.getImageData(0, 0, 112, 112);
      if (previews.size >= 256) previews.delete(previews.keys().next().value!);
      previews.set(key, preview);
    }
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(preview, 0, 0);
  }, [sticker, style, color, secondaryColor, outline]);
  return (
    <canvas
      ref={ref}
      width={112}
      height={112}
      className="sticker-art-preview"
      data-sticker-kind={sticker.id}
      data-sticker-style={style}
      aria-hidden="true"
    />
  );
});
