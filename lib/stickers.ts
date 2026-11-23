import type { Dimensions, StickerKind, StickerLayer } from "@/types/collage";
import { EXTRA_STICKERS } from "@/lib/extraStickers";
import { POST_STICKERS } from "@/lib/postStickers";
import { CREATIVE_CHARMS } from "@/lib/creativeCharms";
import { flagName } from "@/lib/flagEmoji";
export const EMPTY_STICKERS: StickerLayer[] = [];
export type StickerInk = "primary" | "secondary";
export interface StickerPath {
  d: string;
  fill?: StickerInk;
  stroke?: StickerInk;
  width?: number;
  dash?: number[];
  opacity?: number;
}
export interface StickerDefinition {
  id: StickerKind;
  name: string;
  color: string;
  secondary: string;
  paths: StickerPath[];
  category?: string;
  keywords?: string;
  collection?: string;
  defaultSize?: number;
  defaultOutline?: boolean;
  /** Clear writing rectangle in the artwork's 0–24 coordinate space. */
  textArea?: { left: number; top: number; width: number; height: number };
}
export const STICKERS: StickerDefinition[] = [
  {
    id: "heart",
    name: "Heart",
    color: "#e46c76",
    secondary: "#ffd6d9",
    paths: [
      {
        d: "M12 21C9 18 2 13.5 2 8A5 5 0 0 1 12 6A5 5 0 0 1 22 8C22 13.5 15 18 12 21Z",
        fill: "primary",
      },
      { d: "M5 8Q5 5 8 5", stroke: "secondary", width: 1.5 },
    ],
  },
  {
    id: "star",
    name: "Star",
    color: "#e9ad42",
    secondary: "#fff1b5",
    paths: [
      {
        d: "M12 1.5L15.2 8.2L22.6 9.2L17.2 14.4L18.5 21.8L12 18.3L5.5 21.8L6.8 14.4L1.4 9.2L8.8 8.2Z",
        fill: "primary",
      },
      { d: "M12 5L10.2 9.8L5.7 10.4", stroke: "secondary", width: 1.3 },
    ],
  },
  {
    id: "sparkles",
    name: "Sparkles",
    color: "#d4a34b",
    secondary: "#f1cf80",
    paths: [
      {
        d: "M13 2L15.8 9.2L23 12L15.8 14.8L13 22L10.2 14.8L3 12L10.2 9.2Z",
        fill: "primary",
      },
      {
        d: "M4 1L5.2 4.8L9 6L5.2 7.2L4 11L2.8 7.2L0 6L2.8 4.8Z M4 17L5 19L7 20L5 21L4 23L3 21L1 20L3 19Z",
        fill: "secondary",
      },
    ],
  },
  {
    id: "pin",
    name: "Location pin",
    color: "#d9684a",
    secondary: "#fff0d6",
    paths: [
      {
        d: "M12 23S3 14 3 9A9 9 0 1 1 21 9C21 14 12 23 12 23Z",
        fill: "primary",
      },
      { d: "M16 9A4 4 0 1 1 8 9A4 4 0 1 1 16 9Z", fill: "secondary" },
    ],
  },
  {
    id: "palm",
    name: "Palm tree",
    color: "#287b5d",
    secondary: "#cf9b5a",
    paths: [
      {
        d: "M12 8Q14 16 10 23H16Q16 14 13 8Z M3 23Q12 19 22 23Z",
        fill: "secondary",
      },
      {
        d: "M12 8Q2 1 1 11Q6 7 11 9Q2 8 4 16Q7 10 12 9Q15 1 22 5Q16 5 13 8Q22 5 23 13Q18 9 13 9Q19 11 18 18Q16 13 12 9Q7 4 6 2Q12 2 12 8Z",
        fill: "primary",
      },
    ],
  },
  {
    id: "sun",
    name: "Sunshine",
    color: "#edb640",
    secondary: "#fff1ad",
    paths: [
      {
        d: "M12 1V3 M12 21V23 M1 12H3 M21 12H23 M4.2 4.2L5.7 5.7 M18.3 18.3L19.8 19.8 M4.2 19.8L5.7 18.3 M18.3 5.7L19.8 4.2",
        stroke: "primary",
        width: 2,
      },
      { d: "M19 12A7 7 0 1 1 5 12A7 7 0 1 1 19 12Z", fill: "primary" },
      { d: "M8 11Q8 8 11 8", stroke: "secondary", width: 1.5 },
    ],
  },
  {
    id: "cloud",
    name: "Cloud",
    color: "#8bbfc9",
    secondary: "#e4f2f0",
    paths: [
      {
        d: "M6 19A5 5 0 0 1 4 9A7 7 0 0 1 17 7A6 6 0 0 1 19 19Z",
        fill: "primary",
      },
      { d: "M5 10Q6 5 10 5 M5 15H15", stroke: "secondary", width: 1.5 },
    ],
  },
  {
    id: "rainbow",
    name: "Rainbow",
    color: "#cf7863",
    secondary: "#e8b568",
    paths: [
      { d: "M2 21V12A10 10 0 0 1 22 12V21", stroke: "primary", width: 3 },
      { d: "M6 21V12A6 6 0 0 1 18 12V21", stroke: "secondary", width: 3 },
      { d: "M10 21V12A2 2 0 0 1 14 12V21", stroke: "primary", width: 2 },
    ],
  },
  {
    id: "flower",
    name: "Flower",
    color: "#d993a4",
    secondary: "#f1c55b",
    paths: [
      {
        d: "M12 7C5-2 0 6 7 10C-3 12 2 21 9 16C9 27 19 24 16 16C26 21 28 10 18 10C25 3 16-2 12 7Z",
        fill: "primary",
      },
      { d: "M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12Z", fill: "secondary" },
    ],
  },
  {
    id: "plane",
    name: "Airplane",
    color: "#4e8592",
    secondary: "#c8e6e6",
    paths: [
      {
        d: "M2 12L10 8V3Q12-1 14 3V8L22 12V15L14 12V19L17 21V23L12 21L7 23V21L10 19V12L2 15Z",
        fill: "primary",
      },
      { d: "M12 4V17", stroke: "secondary", width: 1.2 },
    ],
  },
  {
    id: "camera",
    name: "Camera",
    color: "#496961",
    secondary: "#d5c69d",
    paths: [
      { d: "M2 6H7L9 3H15L17 6H22V21H2Z", fill: "primary" },
      {
        d: "M17 13A5 5 0 1 1 7 13A5 5 0 1 1 17 13Z M18 8H20V10H18Z",
        fill: "secondary",
      },
      {
        d: "M14.5 13A2.5 2.5 0 1 1 9.5 13A2.5 2.5 0 1 1 14.5 13Z",
        fill: "primary",
      },
    ],
  },
  {
    id: "mountains",
    name: "Mountains",
    color: "#52745c",
    secondary: "#e5dbc3",
    paths: [
      { d: "M0 22L9 3L17 22Z M11 22L18 7L24 22Z", fill: "primary" },
      {
        d: "M5.2 11L9 3L12.6 11L9 9Z M15.5 12.3L18 7L20.2 12.3L18 11Z",
        fill: "secondary",
      },
    ],
  },
  {
    id: "compass",
    name: "Compass",
    color: "#546d70",
    secondary: "#efd8a5",
    paths: [
      {
        d: "M23 12A11 11 0 1 1 1 12A11 11 0 1 1 23 12Z",
        fill: "secondary",
        stroke: "primary",
        width: 1.2,
      },
      { d: "M17 6L14 14L6 18L10 10Z", fill: "primary" },
      { d: "M12 2V4 M12 20V22 M2 12H4 M20 12H22", stroke: "primary", width: 1 },
    ],
  },
  {
    id: "arrow",
    name: "Adventure arrow",
    color: "#b86e4f",
    secondary: "#eed8a8",
    paths: [
      { d: "M1 10H14V5L23 12L14 19V14H1Z", fill: "primary" },
      { d: "M4 12H17", stroke: "secondary", width: 1 },
    ],
  },
  {
    id: "ticket",
    name: "Travel ticket",
    color: "#cfaa6c",
    secondary: "#f7ecd2",
    paths: [
      {
        d: "M1 5H23V9A3 3 0 0 0 23 15V19H1V15A3 3 0 0 0 1 9Z",
        fill: "primary",
      },
      {
        d: "M16 7V9 M16 11V13 M16 15V17 M5 10H12 M5 14H10",
        stroke: "secondary",
        width: 1.5,
      },
    ],
  },
  ...EXTRA_STICKERS,
  ...POST_STICKERS,
  ...CREATIVE_CHARMS,
];
export const EMOJIS = [
  ["😊", "Smile"],
  ["😍", "Heart eyes"],
  ["😎", "Sunglasses"],
  ["❤️", "Love"],
  ["✨", "Sparkles"],
  ["🔥", "Fire"],
  ["🌴", "Palm tree"],
  ["✈️", "Airplane"],
  ["🌍", "Globe"],
  ["📸", "Camera"],
  ["🎉", "Celebration"],
  ["🌈", "Rainbow"],
  ["☀️", "Sun"],
  ["🌸", "Blossom"],
  ["📍", "Location"],
  ["😁", "Grinning"],
  ["😂", "Joy"],
  ["🥰", "Smiling hearts"],
  ["😘", "Kiss"],
  ["😇", "Angel"],
  ["🤩", "Star struck"],
  ["🥳", "Party face"],
  ["🤗", "Hug"],
  ["🤔", "Thinking"],
  ["🤍", "White heart"],
  ["💙", "Blue heart"],
  ["💚", "Green heart"],
  ["💛", "Yellow heart"],
  ["💜", "Purple heart"],
  ["🧡", "Orange heart"],
  ["💖", "Sparkling heart"],
  ["💯", "Hundred"],
  ["👍", "Thumbs up"],
  ["👏", "Applause"],
  ["🙌", "Hooray"],
  ["✌️", "Peace"],
  ["🤙", "Call me"],
  ["🌊", "Ocean wave"],
  ["🏖️", "Beach"],
  ["🏕️", "Camping"],
  ["🏔️", "Snowy mountain"],
  ["🚗", "Road trip"],
  ["🚀", "Rocket"],
  ["🧳", "Luggage"],
  ["☕", "Coffee"],
  ["🍦", "Ice cream"],
  ["🎂", "Birthday cake"],
  ["🎁", "Gift"],
  ["🎵", "Music"],
  ["🦋", "Butterfly"],
] as const;

export function stickerName(layer: StickerLayer) {
  return layer.kind === "emoji"
    ? (flagName(layer.emoji ?? "") ?? layer.emoji ?? "Emoji")
    : (STICKERS.find((s) => s.id === layer.kind)?.name ?? "Sticker");
}
export function constrainSticker(
  layer: StickerLayer,
  dimensions: Dimensions,
): StickerLayer {
  const angle = (layer.rotation * Math.PI) / 180;
  const extent = Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle));
  const min = Math.min(dimensions.width, dimensions.height);
  const size = Math.max(0.04, Math.min(0.65, layer.size, 1 / extent));
  const radius = (size * min * extent) / 2;
  return {
    ...layer,
    size,
    x: Math.max(
      radius / dimensions.width,
      Math.min(1 - radius / dimensions.width, layer.x),
    ),
    y: Math.max(
      radius / dimensions.height,
      Math.min(1 - radius / dimensions.height, layer.y),
    ),
    opacity: Math.max(0, Math.min(1, layer.opacity)),
  };
}
