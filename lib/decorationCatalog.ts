import { EMOJIS, STICKERS, type StickerDefinition } from "@/lib/stickers";
export {
  EMOJI_COUNT,
  EMOJI_VERSION,
  EMOJI_CATEGORIES,
} from "@/lib/emojiMetadata";

export interface EmojiDefinition {
  emoji: string;
  name: string;
  category: string;
  keywords: string;
}
export const STICKER_CATEGORIES = [
  "Trip routes",
  "Travel & places",
  "Nature",
  "Food & drink",
  "Celebration",
  "Frames & labels",
  "Music & film",
  "Creative Charms",
];
const nature = new Set([
  "palm",
  "sun",
  "cloud",
  "rainbow",
  "flower",
  "mountains",
  "seashell",
  "wave",
  "fish",
  "turtle",
  "butterfly",
  "leaf",
  "daisy",
  "moon",
  "shooting-star",
  "snowflake",
]);
const food = new Set(["coffee", "ice-cream", "cocktail", "coconut"]);
const celebrations = new Set([
  "heart",
  "star",
  "sparkles",
  "gift",
  "party-hat",
  "balloon",
  "smiley",
]);
export function stickerCategory(sticker: StickerDefinition) {
  if (sticker.category) return sticker.category;
  if (nature.has(sticker.id)) return "Nature";
  if (food.has(sticker.id)) return "Food & drink";
  if (celebrations.has(sticker.id)) return "Celebration";
  if (["music-note", "headphones"].includes(sticker.id)) return "Music & film";
  if (sticker.id === "speech-bubble") return "Frames & labels";
  return "Travel & places";
}
function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[-_]/g, " ");
}
function matches(query: string, fields: string) {
  const normalized = normalize(fields);
  return normalize(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => normalized.includes(term));
}
export function filterStickers(query: string, category = "All") {
  return STICKERS.filter(
    (s) =>
      (category === "All" || stickerCategory(s) === category) &&
      matches(
        query,
        `${s.name} ${s.id} ${stickerCategory(s)} ${s.keywords ?? ""}`,
      ),
  );
}
const favorites = new Map<string, string>(
  EMOJIS.map(([emoji, name]) => [emoji, name]),
);
const aliases: Record<string, string> = {
  "Smileys & Emotion": "face smile happy love feeling",
  "People & Body": "person human people gesture hand",
  "Animals & Nature": "wildlife plant flower nature",
  "Food & Drink": "food eat drink snack",
  "Travel & Places": "travel trip tour vacation holiday journey",
  Activities: "party celebration sport activity",
  Objects: "object item tool music",
  Symbols: "symbol sign heart arrow direction",
  Flags: "flag country national",
};
export function filterEmoji(
  data: EmojiDefinition[],
  query: string,
  category = "All",
) {
  return data.filter(
    (e) =>
      (category === "All" ||
        (category === "Popular"
          ? favorites.has(e.emoji)
          : e.category === category)) &&
      matches(
        query,
        `${e.emoji} ${e.name} ${e.keywords} ${e.category} ${favorites.get(e.emoji) ?? ""} ${aliases[e.category] ?? ""}`,
      ),
  );
}
let cached: Promise<EmojiDefinition[]> | null = null;
/** The full catalog loads as a local chunk only when the Emoji tab is opened. */
export function loadEmojiCatalog(): Promise<EmojiDefinition[]> {
  if (!cached)
    cached = import("@/lib/emojiCatalog.json")
      .then((module) => module.default)
      .catch((error) => {
        cached = null;
        throw error;
      });
  return cached;
}
