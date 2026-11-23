import type { CollageLayout, PhotoSlot, Rect, ThemeId } from "@/types/collage";

export const NEW_TRIP_THEME_IDS = [
  "departure-club",
  "alpine-atlas",
  "off-grid-zine",
  "horizon-cinema",
  "browser-getaway",
] as const satisfies readonly ThemeId[];
export type NewTripThemeId = (typeof NEW_TRIP_THEME_IDS)[number];
export function isNewTripTheme(id: ThemeId): id is NewTripThemeId {
  return (NEW_TRIP_THEME_IDS as readonly string[]).includes(id);
}

/** Balanced, fully occupied rows; no empty cells for odd photo counts. */
function contactSheet(
  count: number,
  area: Rect,
  gap: number,
  offset: number,
  target = 1.15,
): PhotoSlot[] {
  if (!count) return [];
  let rows = 1,
    best = Infinity;
  for (let candidate = 1; candidate <= count; candidate++) {
    const columns = Math.ceil(count / candidate);
    const width = (area.width - gap * (columns - 1)) / columns;
    const height = (area.height - gap * (candidate - 1)) / candidate;
    if (width <= 0 || height <= 0) continue;
    const score =
      Math.abs(Math.log(width / height / target)) +
      (count % candidate ? 0.12 : 0);
    if (score < best) {
      rows = candidate;
      best = score;
    }
  }
  const result: PhotoSlot[] = [];
  for (let row = 0; row < rows; row++) {
    const columns = Math.floor(count / rows) + (row < count % rows ? 1 : 0);
    const width = (area.width - gap * (columns - 1)) / columns;
    const height = (area.height - gap * (rows - 1)) / rows;
    for (let column = 0; column < columns; column++)
      result.push({
        index: offset + result.length,
        x: area.x + column * (width + gap),
        y: area.y + row * (height + gap),
        width,
        height,
      });
  }
  return result;
}

export function createNewTripLayout(
  id: NewTripThemeId,
  count: number,
  w: number,
  h: number,
): CollageLayout {
  const u = Math.min(w, h);
  const area = (x: number, y: number, width: number, height: number): Rect => ({
    x: x * w,
    y: y * h,
    width: width * w,
    height: height * h,
  });
  const backgrounds: Record<NewTripThemeId, string> = {
    "departure-club": "#e9e4d8",
    "alpine-atlas": "#173f36",
    "off-grid-zine": "#f3f0df",
    "horizon-cinema": "#131e27",
    "browser-getaway": "#ded7f3",
  };
  const layout: CollageLayout = {
    kind: id,
    background: backgrounds[id],
    slots: [],
    gapRegions: [],
  };
  if (!count) return layout;
  if (id === "departure-club") {
    // A photo ticket and a separate perforated itinerary stub.
    const main = area(0.065, 0.25, 0.61, 0.625);
    layout.gapRegions = [main];
    layout.slots =
      count === 1
        ? [{ index: 0, ...main }]
        : [
            { index: 0, ...area(0.065, 0.25, 0.61, 0.34) },
            ...contactSheet(
              count - 1,
              area(0.065, 0.607, 0.61, 0.268),
              u * 0.009,
              1,
            ),
          ];
  } else if (id === "alpine-atlas") {
    // A sculptural arch and true circular detail crops on a topographic field.
    layout.slots = [
      {
        index: 0,
        ...area(0.055, 0.14, count === 1 ? 0.57 : 0.52, 0.69),
        shape: "arch",
        mat: 0.009,
      },
    ];
    const details = contactSheet(
      count - 1,
      area(0.635, 0.49, 0.315, 0.345),
      u * 0.014,
      1,
      1,
    );
    layout.slots.push(
      ...details.map((slot) => {
        const diameter = Math.min(slot.width, slot.height);
        return {
          ...slot,
          x: slot.x + (slot.width - diameter) / 2,
          y: slot.y + (slot.height - diameter) / 2,
          width: diameter,
          height: diameter,
          shape: "circle" as const,
          mat: 0.018,
        };
      }),
    );
    // The contour field remains visible between circular photos.
    layout.gapRegions = details;
  } else if (id === "off-grid-zine") {
    const hero: PhotoSlot = {
      index: 0,
      ...area(0.045, 0.295, count === 1 ? 0.91 : 0.57, 0.55),
      polygon: [
        [0.035, 0],
        [1, 0.025],
        [0.96, 1],
        [0, 0.96],
      ],
      mat: 0.012,
    };
    const strips = contactSheet(
      count - 1,
      area(0.655, 0.32, 0.3, 0.525),
      u * 0.013,
      1,
      1.25,
    );
    layout.slots = [
      hero,
      ...strips.map((slot, index) => ({
        ...slot,
        polygon: (index % 2
          ? [
              [0, 0.035],
              [0.97, 0],
              [1, 0.965],
              [0.02, 1],
            ]
          : [
              [0.02, 0],
              [1, 0.035],
              [0.98, 1],
              [0, 0.97],
            ]) as [number, number][],
        mat: 0.018,
      })),
    ];
    layout.gapRegions = [area(0.04, 0.29, 0.92, 0.56)];
  } else if (id === "horizon-cinema") {
    layout.slots = [
      { index: 0, ...area(0.035, 0.12, 0.93, count === 1 ? 0.415 : 0.39) },
    ];
    const memories = contactSheet(
      count - 1,
      area(0.035, 0.735, 0.93, 0.19),
      u * 0.012,
      1,
      1.75,
    );
    layout.slots.push(...memories);
    layout.gapRegions = memories.length ? [area(0.035, 0.735, 0.93, 0.19)] : [];
  } else {
    // Desktop nostalgia: a large photo window and a cascade of smaller windows.
    const hero = area(0.06, 0.255, count === 1 ? 0.88 : 0.555, 0.635);
    const details = contactSheet(
      count - 1,
      area(0.68, 0.365, 0.26, 0.525),
      Math.min(u * 0.026, h * 0.035),
      1,
    );
    layout.slots = [
      { index: 0, ...hero, radius: 0.004 },
      ...details.map((slot) => ({ ...slot, radius: 0.003 })),
    ];
    // Individual window frames, rather than a rectangle covering the desktop.
    layout.gapRegions = layout.slots.map((slot) => ({
      x: slot.x - u * 0.003,
      y: slot.y - u * 0.003,
      width: slot.width + u * 0.006,
      height: slot.height + u * 0.006,
    }));
  }
  return layout;
}
