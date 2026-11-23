import type { ImageFormat } from "@/types/collage";
import { renderCollage, type RenderOptions } from "@/lib/collageRenderer";
import { dimensionError } from "@/lib/settings";
import { ensureTextFonts } from "@/lib/fonts";
import { ensureStickerAssets } from "@/lib/flagEmoji";

export async function createExport(
  options: RenderOptions,
  format: ImageFormat,
  quality = 0.95,
): Promise<Blob> {
  const invalid = dimensionError(options);
  if (invalid) throw new Error(invalid);
  if (!options.photos.length && !options.images?.length)
    throw new Error("Add at least one photo to create your collage.");
  const canvas = document.createElement("canvas");
  try {
    await Promise.all([
      ensureTextFonts(options.textLayers ?? []),
      ensureStickerAssets(options.stickers ?? []),
    ]);
    renderCollage(canvas, { ...options, preview: false });
    const type = `image/${format}`;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(
                new Error(
                  "Export ran out of memory. Try a smaller output size.",
                ),
              ),
        type,
        quality,
      ),
    );
    if (blob.type !== type)
      throw new Error(
        `This browser cannot export ${format.toUpperCase()}. Please choose PNG or JPG.`,
      );
    return blob;
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
}
export function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
