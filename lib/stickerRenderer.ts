import type { Dimensions, StickerLayer } from "@/types/collage";
import { EMOJI_FONT } from "@/lib/fonts";
import { STICKERS, constrainSticker } from "@/lib/stickers";
import { flagImage } from "@/lib/flagEmoji";
import { drawStickerArtwork } from "@/lib/stickerArtwork";

export function drawStickers(
  ctx: CanvasRenderingContext2D,
  layers: StickerLayer[],
  dimensions: Dimensions,
) {
  for (const original of layers) {
    const layer = constrainSticker(original, dimensions);
    const size = layer.size * Math.min(dimensions.width, dimensions.height);
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.x * dimensions.width, layer.y * dimensions.height);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale((layer.flipped ? -size : size) / 28, size / 28);
    ctx.translate(-12, -12);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (layer.kind === "emoji") {
      const flag = flagImage(layer.emoji ?? "");
      if (flag) ctx.drawImage(flag, 0, 0, 24, 24);
      else {
        ctx.font = `21px ${EMOJI_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(layer.emoji ?? "😊", 12, 13);
      }
    } else {
      const definition = STICKERS.find((s) => s.id === layer.kind);
      if (definition) drawStickerArtwork(ctx, definition, layer);
    }
    ctx.restore();
  }
}
