import type { CanvasTextLayer, Photo, ThemeId } from "@/types/collage";

export type TravelCollection =
  | "Recommended"
  | "Beach"
  | "Mountains"
  | "Road trips"
  | "City & heritage"
  | "All designs";
export interface TravelDetails {
  destination: string;
  origin: string;
  date: string;
  caption: string;
}
export const EMPTY_TRAVEL_DETAILS: TravelDetails = {
  destination: "",
  origin: "",
  date: "",
  caption: "",
};
export const TRAVEL_COLLECTIONS: TravelCollection[] = [
  "Recommended",
  "Beach",
  "Mountains",
  "Road trips",
  "City & heritage",
  "All designs",
];
export const TRAVEL_TEMPLATES: Partial<
  Record<
    ThemeId,
    {
      collections: TravelCollection[];
      counts: [number, number];
      hint: string;
      destination: string[];
      caption: string[];
      date: [number, number];
      origin?: string[];
    }
  >
> = {
  "scenic-fan": {
    collections: ["Road trips", "Mountains"],
    counts: [1, 7],
    hint: "A striking fan of landscapes. Best with 3–7 photos.",
    destination: ["fan-title"],
    caption: ["fan-caption"],
    date: [0.5, 0.79],
  },
  "torn-travel": {
    collections: ["Mountains", "Road trips"],
    counts: [3, 7],
    hint: "Pinned photo memories and a torn-paper strip.",
    destination: ["diary-place"],
    caption: ["diary-caption"],
    date: [0.35, 0.125],
  },
  "route-diary": {
    collections: ["Road trips", "City & heritage"],
    counts: [4, 10],
    hint: "A paper travel diary with a route and a central note.",
    destination: ["route-destination", "route-place"],
    origin: ["route-title", "route-origin"],
    caption: ["route-footer"],
    date: [0.5, 0.035],
  },
  "coastal-exposure": {
    collections: ["Beach"],
    counts: [2, 3],
    hint: "Start with a portrait, followed by coastal scenery. Transparent PNG portraits also work.",
    destination: ["coastal-place"],
    caption: ["coastal-caption"],
    date: [0.16, 0.335],
  },
  "golden-roadtrip": {
    collections: ["Road trips", "Beach"],
    counts: [2, 3],
    hint: "A warm, blended poster. Put your portrait or favorite scene first.",
    destination: ["road-title", "road-place"],
    caption: ["road-caption"],
    date: [0.5, 0.945],
  },
  "heritage-reverie": {
    collections: ["City & heritage"],
    counts: [2, 3],
    hint: "An atmospheric heritage poster. Portrait first, landmark second.",
    destination: ["heritage-title", "heritage-place"],
    caption: ["heritage-caption"],
    date: [0.5, 0.94],
  },
  "sea-breeze": {
    collections: ["Beach"],
    counts: [2, 6],
    hint: "Airy coastal colors with generous photo prints.",
    destination: ["sea-title"],
    caption: ["sea-caption"],
    date: [0.5, 0.97],
  },
  "hike-poster": {
    collections: ["Mountains"],
    counts: [2, 5],
    hint: "Your first photo is the hero; the rest complete the journey.",
    destination: ["hike-title"],
    caption: ["hike-caption"],
    date: [0.5, 0.98],
  },
  "tour-poster": {
    collections: ["City & heritage", "Road trips"],
    counts: [2, 5],
    hint: "A bold destination cover with your favorite photo first.",
    destination: ["tour-title"],
    caption: ["tour-caption"],
    date: [0.23, 0.665],
  },
  "wander-cutout": {
    collections: ["Mountains", "City & heritage"],
    counts: [3, 8],
    hint: "A bold keepsake with photo bands above and below the title.",
    destination: ["wander-title"],
    caption: ["wander-caption"],
    date: [0.5, 0.975],
  },
  "postcard-stack": {
    collections: ["Beach", "City & heritage"],
    counts: [2, 6],
    hint: "A personal postcard made from your own photographs.",
    destination: ["postcard-title"],
    caption: ["postcard-caption"],
    date: [0.8, 0.075],
  },
  "departure-club": {
    collections: ["Road trips", "City & heritage"],
    counts: [1, 10],
    hint: "A photo boarding pass with a separate itinerary stub. Add your departure and destination.",
    destination: ["departure-place"],
    origin: ["departure-origin"],
    caption: ["departure-caption"],
    date: [0.46, 0.225],
  },
  "alpine-atlas": {
    collections: ["Mountains", "Road trips"],
    counts: [1, 10],
    hint: "Your first photo fills the alpine arch; the others become round detail crops on a contour map.",
    destination: ["alpine-place"],
    caption: ["alpine-caption"],
    date: [0.8, 0.455],
  },
  "off-grid-zine": {
    collections: ["City & heritage", "Road trips"],
    counts: [1, 10],
    hint: "A bold travel cover with cut-paper photo panels, oversized type, and an ink-colored caption ribbon.",
    destination: ["zine-place"],
    caption: ["zine-caption"],
    date: [0.8, 0.05],
  },
  "horizon-cinema": {
    collections: ["Beach", "Mountains"],
    counts: [1, 10],
    hint: "Choose a wide scenic cover photo for the opening panorama; the rest form a memory reel below.",
    destination: ["cinema-place"],
    caption: ["cinema-caption"],
    date: [0.5, 0.102],
  },
  "browser-getaway": {
    collections: ["Beach", "City & heritage"],
    counts: [1, 10],
    hint: "A retro desktop for your camera roll, with a large photo window and smaller memory windows.",
    destination: ["browser-place"],
    caption: ["browser-caption"],
    date: [0.8, 0.31],
  },
  "sunset-drift": {
    collections: ["Beach", "Road trips"],
    counts: [1, 10],
    hint: "Start with your favorite landscape. Warm dissolves merge the remaining memories beneath it.",
    destination: ["sunset-place"],
    caption: ["sunset-caption"],
    date: [0.78, 0.112],
  },
  "cloudline-escape": {
    collections: ["Mountains", "Beach"],
    counts: [1, 10],
    hint: "Your first photo fills the landscape. The others float above it with soft cloud-shaped fades.",
    destination: ["cloud-place"],
    caption: ["cloud-caption"],
    date: [0.21, 0.451],
  },
  "prism-voyage": {
    collections: ["City & heritage", "Road trips"],
    counts: [1, 10],
    hint: "A full-scene cover with angled photo ribbons. Diagonal dissolves soften the transitions.",
    destination: ["prism-place"],
    caption: ["prism-caption"],
    date: [0.78, 0.12],
  },
  "midnight-mirage": {
    collections: ["City & heritage", "Mountains"],
    counts: [1, 10],
    hint: "Scenery first, then a portrait or landmark for the luminous double exposure. Darker photos give the strongest night effect.",
    destination: ["mirage-place"],
    caption: ["mirage-caption"],
    date: [0.5, 0.116],
  },
  "tidal-reverie": {
    collections: ["Beach", "Road trips"],
    counts: [1, 10],
    hint: "Wide coastal scenes flow together with soft wave dissolves. All image crops remain adjustable.",
    destination: ["tidal-place"],
    caption: ["tidal-caption"],
    date: [0.8, 0.05],
  },
};
export const CAPTION_SUGGESTIONS: Record<TravelCollection, string[]> = {
  Recommended: [
    "Collect moments, not things.",
    "A little escape. A lasting memory.",
    "Days worth remembering.",
  ],
  Beach: [
    "Salt air. Slow days.",
    "Chasing sunsets by the sea.",
    "Beach days, best days.",
  ],
  Mountains: [
    "Take the scenic route.",
    "Higher places. Quieter moments.",
    "Fresh air and a new perspective.",
  ],
  "Road trips": [
    "Every mile, a memory.",
    "The best stories happen along the way.",
    "Windows down. Adventure ahead.",
  ],
  "City & heritage": [
    "New streets. Timeless stories.",
    "A moment beyond time.",
    "A city worth getting lost in.",
  ],
  "All designs": [
    "Made of little moments.",
    "Our story, in pictures.",
    "A day to remember.",
  ],
};

export function recommendedThemes(
  photos: Pick<Photo, "width" | "height">[],
  collection: TravelCollection,
): ThemeId[] {
  const count = photos.length || 5;
  const portrait = !!photos[0] && photos[0].height > photos[0].width * 1.12;
  return (
    Object.entries(TRAVEL_TEMPLATES) as [
      ThemeId,
      NonNullable<(typeof TRAVEL_TEMPLATES)[ThemeId]>,
    ][]
  )
    .filter(
      ([, item]) =>
        collection === "Recommended" ||
        collection === "All designs" ||
        item.collections.includes(collection),
    )
    .map(([id, item], index) => ({
      id,
      score:
        (count >= item.counts[0] && count <= item.counts[1]
          ? 100
          : 30 -
            Math.min(
              Math.abs(count - item.counts[0]),
              Math.abs(count - item.counts[1]),
            ) *
              3) +
        (["coastal-exposure", "heritage-reverie", "golden-roadtrip"].includes(
          id,
        )
          ? portrait
            ? 15
            : -25
          : 0) -
        index * 0.1,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ id }) => id);
}

export function formatTripDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? ""
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

/** Update only the field being changed, preserving custom wording, styling, and geometry elsewhere. */
export function personalizeTravelText(
  layers: CanvasTextLayer[],
  theme: ThemeId,
  details: TravelDetails,
  field: keyof TravelDetails,
): CanvasTextLayer[] {
  const definition = TRAVEL_TEMPLATES[theme];
  if (!definition) return layers;
  if (field === "date") {
    const text = formatTripDate(details.date);
    const existing = layers.find((layer) => layer.id === "travel-date");
    if (!text) return layers.filter((layer) => layer.id !== "travel-date");
    if (existing)
      return layers.map((layer) =>
        layer.id === existing.id ? { ...layer, text } : layer,
      );
    return [
      ...layers,
      {
        id: "travel-date",
        text,
        x: definition.date[0],
        y: definition.date[1],
        size: 0.014,
        color: "#fffdf6",
        fontFamily: "Arial, sans-serif",
        bold: true,
        italic: false,
        align: "center",
        background: true,
        backgroundColor: "#243b36",
        zIndex:
          Math.max(1000, ...layers.map((layer) => layer.zIndex ?? 1000)) + 1,
      },
    ];
  }
  const ids =
    field === "origin" ? (definition.origin ?? []) : definition[field];
  return layers.map((layer) =>
    ids.includes(layer.id)
      ? {
          ...layer,
          text: details[field].trim().slice(0, field === "caption" ? 100 : 60),
        }
      : layer,
  );
}
