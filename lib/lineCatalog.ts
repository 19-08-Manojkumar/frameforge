import type { LineLayer } from "@/types/collage";

export const LINE_EFFECTS = [
  ["prism", "Prismatic facets"],
  ["stardust", "Stardust sparkle"],
  ["gold-glitter", "Golden glitter dust"],
  ["rose-glitter", "Rose quartz shimmer"],
  ["aurora", "Aurora silk trails"],
  ["neon", "Electric neon glow"],
  ["comet", "Shooting comet"],
  ["galaxy", "Galaxy constellation"],
  ["firefly", "Firefly lights"],
  ["confetti", "Confetti celebration"],
  ["rainbow-ribbon", "Rainbow ribbon"],
  ["pearls", "Luminous pearl strand"],
  ["crystal", "Crystal garland"],
  ["sequin", "Disco sequins"],
  ["citrus", "Citrus blossom"],
  ["eucalyptus", "Eucalyptus branch"],
  ["olive", "Olive wreath"],
  ["fern", "Wild fern frond"],
  ["ivy", "Trailing ivy"],
  ["tropical", "Tropical palm garland"],
  ["sakura", "Sakura blossom branch"],
  ["wildflower", "Meadow wildflowers"],
  ["daisy", "Daisy chain"],
  ["rose-vine", "Climbing rose vine"],
  ["wheat", "Golden wheat sprig"],
  ["ocean", "Ocean wave crests"],
  ["sunset", "Sunset sunburst"],
  ["heart-chain", "Floating heart chain"],
  ["butterfly", "Butterfly garden"],
  ["celestial", "Moon and star garland"],
  ["paper-deckle", "Soft deckled tear"],
  ["paper-rip", "Jagged white rip"],
  ["paper-kraft", "Torn kraft ribbon"],
  ["paper-layered", "Layered paper seam"],
  ["paper-newsprint", "Newsprint tear"],
  ["paper-grid", "Graph paper edge"],
  ["paper-notebook", "Spiral page tear"],
  ["paper-washi", "Translucent washi rip"],
  ["paper-scallop", "Scalloped paper lace"],
  ["paper-burnt", "Burnt parchment edge"],
] as const;
const palettes = [
  ["#f275c2", "#92e9ed", "#b89bf5", "#f9d36a"],
  ["#9e91ef", "#ffd79f", "#fff4d9"],
  ["#c79425", "#fff0b2", "#e5ad32"],
  ["#cc7290", "#ffe8dc", "#d6a5cb"],
  ["#54bdb4", "#9b82e8", "#f6a4cc"],
  ["#d06de5", "#67e7ed", "#e4b7ff"],
  ["#f6b855", "#f49772", "#fff1be"],
  ["#9989e4", "#d5c4ff", "#f7b4d9"],
  ["#a2c95d", "#f5e8a5", "#edc956"],
  ["#f2769b", "#64bfcb", "#f0cb54"],
  ["#ee86a8", "#f0ca6f", "#7ec6bd", "#a89bdd"],
  ["#c8c2b3", "#fff6e5", "#eee1cd"],
  ["#8fbfc9", "#dfd7ff", "#d8f3e9"],
  ["#ae88ce", "#f2ca7d", "#85d2c8"],
  ["#e8a53f", "#ffeac3", "#4f8d65"],
  ["#4e897b", "#a6c4af", "#d7dfc5"],
  ["#78824d", "#bdc69b", "#d4bc68"],
  ["#3c7d59", "#8fbb77", "#bad391"],
  ["#48785e", "#9ab97b", "#d7dca4"],
  ["#2b8d70", "#8bc79c", "#c4db98"],
  ["#9b6d69", "#f2bbd3", "#fbe5e6"],
  ["#599675", "#e9a2be", "#eacc71"],
  ["#64906b", "#fff8e4", "#e9bb5a"],
  ["#568969", "#d78597", "#f3c4b9"],
  ["#b39356", "#e5cb8b", "#f8e7bc"],
  ["#459bb5", "#b0e1de", "#e8f5eb"],
  ["#ec9870", "#f6cb76", "#e9a5bb"],
  ["#cc7a93", "#edbac8", "#f3d6ba"],
  ["#a184ca", "#f2b3b7", "#e4d59b"],
  ["#ad8c48", "#e9cf83", "#fff0c3"],
  ["#fffbf2", "#e5d9c6", "#b7ab98"],
  ["#fffdf8", "#e6e1d8", "#c4b8a9"],
  ["#dfc197", "#e7d4b8", "#a3784f"],
  ["#f8e8de", "#e7c5bd", "#98b7b6"],
  ["#e8ddc9", "#cec3ac", "#746d61"],
  ["#f3f6ee", "#cee2da", "#85a69e"],
  ["#fff8e7", "#e5d7c3", "#889792"],
  ["#e9bfbe", "#f6dcd2", "#af8b9b"],
  ["#f9e9df", "#edd5c8", "#c59b8d"],
  ["#e3c391", "#b79566", "#6d4937"],
];
export const LINE_PRESETS: { name: string; layer: Omit<LineLayer, "id"> }[] =
  LINE_EFFECTS.map(([effect, name], i) => ({
    name,
    layer: {
      x1: i >= 30 ? 0 : 0.16,
      y1: 0.5,
      x2: i >= 30 ? 1 : 0.84,
      y2: 0.5,
      width: i >= 30 ? 0.025 : i === 5 ? 0.006 : 0.004,
      color: palettes[i][0],
      secondaryColor: palettes[i].at(-1),
      palette: palettes[i],
      effect,
      style: "solid",
      curve:
        i >= 15 && i <= 24 ? (i % 2 ? -0.065 : 0.065) : i === 6 ? -0.055 : 0,
      opacity: 1,
    },
  }));

export const LINE_COLLECTIONS = [
  "Torn paper",
  "Botanical",
  "Sparkle & ornaments",
];
const botanical = new Set([
  "eucalyptus",
  "olive",
  "fern",
  "ivy",
  "tropical",
  "sakura",
  "wildflower",
  "daisy",
  "rose-vine",
  "wheat",
  "citrus",
]);
export function lineCollection(effect = "") {
  return effect.startsWith("paper-")
    ? "Torn paper"
    : botanical.has(effect)
      ? "Botanical"
      : "Sparkle & ornaments";
}
export function filterLinePresets(query: string, collection = "All") {
  return LINE_PRESETS.filter(({ name, layer }) => {
    const group = lineCollection(layer.effect);
    const keywords =
      group === "Torn paper"
        ? "paper tear tearing torn ripped rip separator divider seam"
        : group === "Botanical"
          ? "leaf leaves branch floral flowers"
          : "sparkle multicolor decorative";
    const text = `${name} ${layer.effect} ${group} ${keywords}`.toLowerCase();
    return (
      (collection === "All" || collection === group) &&
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .every((term) => text.includes(term))
    );
  });
}
