import type { CollageLayout, PhotoSlot, Rect, ThemeId } from "@/types/collage";

export const BLENDED_TOUR_IDS = [
  "sunset-drift",
  "cloudline-escape",
  "prism-voyage",
  "midnight-mirage",
  "tidal-reverie",
] as const satisfies readonly ThemeId[];
export type BlendedTourId = (typeof BLENDED_TOUR_IDS)[number];
export function isBlendedTour(id: ThemeId): id is BlendedTourId {
  return (BLENDED_TOUR_IDS as readonly string[]).includes(id);
}

/** Filled rows with deliberate feather overlap. Every photo has a clear center. */
function dissolveTiles(
  count: number,
  region: Rect,
  offset: number,
  overlap = 0.23,
): PhotoSlot[] {
  if (!count) return [];
  const rows = Math.max(
    1,
    Math.min(
      count,
      Math.round(Math.sqrt((count * region.height) / region.width / 1.2)),
    ),
  );
  const result: PhotoSlot[] = [],
    height = region.height / (rows - overlap * (rows - 1));
  for (let row = 0; row < rows; row++) {
    const columns = Math.floor(count / rows) + (row < count % rows ? 1 : 0);
    const width = region.width / (columns - overlap * (columns - 1));
    for (let col = 0; col < columns; col++)
      result.push({
        index: offset + result.length,
        x: region.x + col * width * (1 - overlap),
        y: region.y + row * height * (1 - overlap),
        width,
        height,
        feather: 0.012,
        fadeEdges: { left: 0.21, right: 0.21, top: 0.21, bottom: 0.21 },
      });
  }
  return result;
}

export function createBlendedTourLayout(
  id: BlendedTourId,
  count: number,
  w: number,
  h: number,
): CollageLayout {
  const area = (x: number, y: number, width: number, height: number): Rect => ({
    x: x * w,
    y: y * h,
    width: width * w,
    height: height * h,
  });
  const backgrounds: Record<BlendedTourId, string> = {
    "sunset-drift": "#e6b69c",
    "cloudline-escape": "#edf4ef",
    "prism-voyage": "#172c3e",
    "midnight-mirage": "#121c32",
    "tidal-reverie": "#f4efdf",
  };
  const layout: CollageLayout = {
    kind: id,
    background: backgrounds[id],
    layered: true,
    slots: [],
    gapRegions: [],
  };
  if (!count) return layout;
  if (id === "sunset-drift") {
    layout.slots = [
      {
        index: 0,
        ...area(0, 0, 1, count === 1 ? 1 : 0.71),
        fadeEdges: { bottom: 0.32 },
      },
      ...dissolveTiles(count - 1, area(0, 0.43, 1, 0.57), 1).map((slot) => ({
        ...slot,
        fadeEdges: { ...slot.fadeEdges, top: 0.3, bottom: 0.18 },
      })),
    ];
    layout.gapRegions = [area(0, 0.43, 1, 0.57)];
  } else if (id === "cloudline-escape") {
    layout.slots = [
      {
        index: 0,
        ...area(0, 0.41, 1, 0.59),
        fadeEdges: { top: 0.3, bottom: 0.16 },
      },
      ...dissolveTiles(count - 1, area(0.415, 0.055, 0.57, 0.54), 1, 0.08).map(
        (slot) => ({
          ...slot,
          fadeEdges: undefined,
          blendMask: { kind: "oval" as const, softness: 0.3 },
          feather: 0.01,
        }),
      ),
    ];
    layout.gapRegions = [area(0.415, 0.055, 0.57, 0.54)];
  } else if (id === "prism-voyage") {
    layout.slots = [
      { index: 0, ...area(0, 0, 1, 1), fadeEdges: { bottom: 0.12 } },
    ];
    const n = count - 1;
    if (n) {
      const width = n === 1 ? 0.76 : Math.min(0.62, 1.95 / n);
      for (let i = 0; i < n; i++)
        layout.slots.push({
          index: i + 1,
          ...area(
            0.02 + (n === 1 ? 0.1 : (i * (0.96 - width)) / (n - 1)),
            0.055 + (i % 2) * 0.035,
            width,
            0.755,
          ),
          blendMask: { kind: "diagonal", softness: 0.17 },
          feather: 0.012,
          fadeEdges: { top: 0.06, bottom: 0.13 },
        });
    }
    layout.gapRegions = [area(0.02, 0.055, 0.96, 0.79)];
  } else if (id === "midnight-mirage") {
    layout.slots = [
      {
        index: 0,
        ...area(0, 0, 1, 1),
        opacity: 0.7,
        fadeEdges: { bottom: 0.35 },
      },
    ];
    if (count > 1)
      layout.slots.push({
        index: 1,
        ...area(0.12, 0.02, 0.76, 0.77),
        blendMask: { kind: "bloom", softness: 0.32 },
        feather: 0.015,
        opacity: 0.9,
        blendMode: "screen",
      });
    if (count > 2)
      layout.slots.push({
        index: 2,
        ...area(0, 0.47, 1, 0.53),
        feather: 0.01,
        fadeEdges: { top: 0.34, bottom: 0.2 },
        opacity: 0.95,
      });
    layout.slots.push(
      ...dissolveTiles(
        Math.max(0, count - 3),
        area(0.035, 0.28, 0.93, 0.4),
        3,
        0.11,
      ).map((slot) => ({
        ...slot,
        fadeEdges: undefined,
        blendMask: {
          kind: "bloom" as const,
          softness: 0.24,
          phase: slot.index * 0.7,
        },
        feather: 0.02,
      })),
    );
    layout.gapRegions = [area(0.035, 0.28, 0.93, 0.4)];
  } else {
    layout.slots = [
      {
        index: 0,
        ...area(0, 0.07, 1, count === 1 ? 0.82 : 0.63),
        blendMask: { kind: "wave", softness: 0.12, phase: -0.5 },
        feather: 0.005,
      },
    ];
    if (count > 1)
      layout.slots.push({
        index: 1,
        ...area(0, 0.38, 1, 0.49),
        blendMask: { kind: "wave", softness: 0.15, phase: 2.3 },
        feather: 0.005,
      });
    layout.slots.push(
      ...dissolveTiles(
        Math.max(0, count - 2),
        area(0.015, 0.61, 0.97, 0.29),
        2,
        0.19,
      ).map((slot) => ({
        ...slot,
        blendMask: {
          kind: "wave" as const,
          softness: 0.11,
          phase: slot.index % 2 ? 0 : 2,
        },
        fadeEdges: { left: 0.15, right: 0.15 },
        feather: 0.005,
      })),
    );
    layout.gapRegions = [area(0.015, 0.61, 0.97, 0.29)];
  }
  return layout;
}
