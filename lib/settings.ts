import type { Dimensions } from "@/types/collage";
export const MAX_IMAGES = 10;
export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_SOURCE_PIXELS = 60_000_000;
export const MAX_TOTAL_PIXELS = 160_000_000;
export const MAX_OUTPUT_PIXELS = 24_000_000;
export const PRESETS = [
  {
    id: "square",
    name: "Instagram Square",
    detail: "Square post",
    width: 1080,
    height: 1080,
  },
  {
    id: "portrait",
    name: "Instagram Portrait",
    detail: "Portrait post",
    width: 1080,
    height: 1350,
  },
  {
    id: "story",
    name: "Instagram Story",
    detail: "Full-screen story",
    width: 1080,
    height: 1920,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Status",
    detail: "Full-screen status",
    width: 1080,
    height: 1920,
  },
  {
    id: "landscape",
    name: "Landscape",
    detail: "Wide canvas",
    width: 1920,
    height: 1080,
  },
  {
    id: "custom",
    name: "Custom size",
    detail: "Your dimensions",
    width: 1080,
    height: 1080,
  },
] as const;
export function dimensionError({ width, height }: Dimensions): string | null {
  if (![width, height].every(Number.isInteger))
    return "Enter a whole number for both dimensions.";
  if (width < 320 || height < 320 || width > 6000 || height > 6000)
    return "Each side must be between 320 and 6,000 pixels.";
  if (width * height > MAX_OUTPUT_PIXELS)
    return "Keep your canvas under 24 megapixels (for example, 4,000 × 6,000).";
  if (Math.max(width / height, height / width) > 4)
    return "Use an aspect ratio between 1:4 and 4:1 so every photo has room.";
  return null;
}
