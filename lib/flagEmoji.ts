import manifest from "@/lib/flagManifest.json";
import names from "@/lib/flagNames.json";
import type { StickerLayer } from "@/types/collage";

const flags: Record<string, string> = manifest;
const labels: Record<string, string> = names;
export function flagName(emoji: string): string | undefined {
  return labels[emoji];
}
const images = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<void>>();
export function flagAsset(emoji: string): string | undefined {
  return flags[emoji] ? `/emoji/flags/${flags[emoji]}` : undefined;
}
export function flagImage(emoji: string): HTMLImageElement | undefined {
  return images.get(emoji);
}
/** Only selected flags are decoded. The picker and canvas use the same local SVGs. */
export async function ensureStickerAssets(
  layers: StickerLayer[],
): Promise<void> {
  await Promise.all(
    [
      ...new Set(
        layers.filter((l) => l.kind === "emoji").map((l) => l.emoji ?? ""),
      ),
    ].map(async (emoji) => {
      const url = flagAsset(emoji);
      if (!url || images.has(emoji)) return;
      if (!pending.has(emoji)) {
        const image = new Image();
        image.src = url;
        pending.set(
          emoji,
          image
            .decode()
            .then(() => {
              images.set(emoji, image);
            })
            .catch(() => {
              pending.delete(emoji);
              throw new Error(
                "A flag could not be loaded. Please try again before downloading.",
              );
            }),
        );
      }
      await pending.get(emoji);
    }),
  );
}
