import type { StickerStyle } from "@/types/collage";

export const STICKER_STYLES = [
  {
    id: "classic",
    name: "Classic",
    description: "Clean shapes and original colors.",
    scale: 1,
  },
  {
    id: "anime-pop",
    name: "Anime Pop",
    description: "Bold ink, cel shading, and comic highlights.",
    scale: 0.94,
  },
  {
    id: "trend-studio",
    name: "Trend Studio",
    description: "Glossy gradients, layered depth, and a holographic finish.",
    scale: 0.92,
  },
  {
    id: "vintage-paper",
    name: "Vintage Paper",
    description: "Faded ink, aged paper, and a textured print finish.",
    scale: 0.96,
  },
] as const;

export function stickerStyle(value: unknown): StickerStyle {
  return STICKER_STYLES.some((style) => style.id === value)
    ? (value as StickerStyle)
    : "classic";
}
export function stickerStyleScale(value: unknown) {
  return STICKER_STYLES.find((style) => style.id === stickerStyle(value))!
    .scale;
}
export function mixInk(a: string, b: string, amount: number) {
  const color = (value: string) =>
    /^#[a-f\d]{6}$/i.test(value) ? value : "#809080";
  a = color(a);
  b = color(b);
  return (
    "#" +
    [1, 3, 5]
      .map((start) =>
        Math.round(
          parseInt(a.slice(start, start + 2), 16) * (1 - amount) +
            parseInt(b.slice(start, start + 2), 16) * amount,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function fadedInk(value: string) {
  const valid = /^#[a-f\d]{6}$/i.test(value) ? value : "#809080";
  const channels = [1, 3, 5].map((start) =>
    parseInt(valid.slice(start, start + 2), 16),
  );
  const gray = Math.round(
    channels[0] * 0.3 + channels[1] * 0.59 + channels[2] * 0.11,
  )
    .toString(16)
    .padStart(2, "0");
  return mixInk(value, `#${gray}${gray}${gray}`, 0.65);
}
export function stickerInks(
  value: unknown,
  primary: string,
  secondary: string,
) {
  switch (stickerStyle(value)) {
    case "anime-pop":
      return { primary, secondary: mixInk(secondary, "#ffffff", 0.16) };
    case "trend-studio":
      return {
        primary: mixInk(primary, "#bfa5ff", 0.15),
        secondary: mixInk(secondary, "#b2fff3", 0.2),
      };
    case "vintage-paper":
      return {
        primary: mixInk(fadedInk(primary), "#d4b888", 0.44),
        secondary: mixInk(fadedInk(secondary), "#f5e7ca", 0.62),
      };
    default:
      return { primary, secondary };
  }
}
