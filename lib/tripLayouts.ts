import type { CollageLayout, PhotoSlot, Rect, ThemeId } from "@/types/collage";
import {
  createNewTripLayout,
  isNewTripTheme,
  NEW_TRIP_THEME_IDS,
} from "@/lib/newTripLayouts";

export const TRIP_THEME_IDS: ThemeId[] = [
  "route-diary",
  "coastal-exposure",
  "golden-roadtrip",
  "heritage-reverie",
  ...NEW_TRIP_THEME_IDS,
];

function tiles(
  count: number,
  area: Rect,
  gap: number,
  offset: number,
): PhotoSlot[] {
  if (!count) return [];
  const rows = Math.max(
    1,
    Math.min(count, Math.round(Math.sqrt((count * area.height) / area.width))),
  );
  const result: PhotoSlot[] = [];
  let index = offset;
  for (let row = 0; row < rows; row++) {
    const cols = Math.floor(count / rows) + (row < count % rows ? 1 : 0);
    const width = (area.width - gap * (cols - 1)) / cols,
      height = (area.height - gap * (rows - 1)) / rows;
    for (let col = 0; col < cols; col++)
      result.push({
        index: index++,
        x: area.x + col * (width + gap),
        y: area.y + row * (height + gap),
        width,
        height,
      });
  }
  return result;
}

export function createTripLayout(
  id: ThemeId,
  count: number,
  w: number,
  h: number,
): CollageLayout {
  if (isNewTripTheme(id)) return createNewTripLayout(id, count, w, h);
  const u = Math.min(w, h),
    area = (x: number, y: number, width: number, height: number): Rect => ({
      x: w * x,
      y: h * y,
      width: w * width,
      height: h * height,
    });
  const backgrounds: Partial<Record<ThemeId, string>> = {
    "route-diary": "#f4efe6",
    "coastal-exposure": "#faf5ec",
    "golden-roadtrip": "#f3eee6",
    "heritage-reverie": "#d7be91",
  };
  const layout: CollageLayout = {
    slots: [],
    background: backgrounds[id]!,
    kind: id,
    gapRegions: [],
    layered: id !== "route-diary",
  };
  if (!count) return layout;
  const paper = (slot: PhotoSlot): PhotoSlot => {
    const rotation = (slot.index % 2 ? 0.035 : -0.025) * Math.min(w / h, h / w);
    const inset = Math.max(slot.width, slot.height) * Math.abs(rotation) * 0.6;
    return {
      ...slot,
      x: slot.x + inset,
      y: slot.y + inset,
      width: slot.width - inset * 2,
      height: slot.height - inset * 2,
      rotation,
      mat: 0.025,
      bottomMat: 0.045,
      shadow: true,
    };
  };
  // Additional memories join the scene as generous crossfaded panels. They never
  // become tiny framed thumbnails competing with the main poster composition.
  const memories = (start: number, region: Rect) =>
    tiles(count - start, region, 0, start).map((slot) => ({
      ...slot,
      feather: 0.04,
      fadeEdges: { top: 0.22, left: 0.1, right: 0.1, bottom: 0.04 },
    }));
  if (id === "route-diary") {
    if (count === 1)
      layout.slots = [paper({ index: 0, ...area(0.065, 0.075, 0.87, 0.85) })];
    else {
      const top = count >= 3 ? 2 : 1,
        middle = Math.min(2, Math.max(0, count - 4));
      layout.slots.push(
        ...tiles(top, area(0.06, 0.08, 0.88, 0.35), u * 0.025, 0).map(paper),
      );
      if (middle)
        layout.slots.push(
          paper({ index: top, ...area(0.06, 0.45, 0.235, 0.265) }),
        );
      if (middle > 1)
        layout.slots.push(
          paper({ index: top + 1, ...area(0.715, 0.45, 0.225, 0.265) }),
        );
      layout.slots.push(
        ...tiles(
          count - top - middle,
          area(0.06, 0.735, 0.88, 0.205),
          u * 0.018,
          top + middle,
        ).map(paper),
      );
      layout.gapRegions = [
        area(0.06, 0.08, 0.88, 0.35),
        area(0.06, 0.735, 0.88, 0.205),
      ];
    }
  } else if (id === "coastal-exposure") {
    layout.slots.push({
      index: 0,
      ...area(0.29, 0.02, 0.69, count === 1 ? 0.94 : 0.72),
      feather: 0.035,
      fadeEdges: { left: 0.26, right: 0.12, top: 0.04, bottom: 0.4 },
    });
    if (count > 1)
      layout.slots.push({
        index: 1,
        ...area(0.015, 0.35, 0.97, 0.63),
        feather: 0.025,
        fadeEdges: { top: 0.42, left: 0.12, right: 0.12, bottom: 0.12 },
      });
    if (count > 2)
      layout.slots.push({
        index: 2,
        ...area(0.34, 0.6, 0.4, count > 3 ? 0.25 : 0.38),
        feather: 0.05,
        fadeEdges: { top: 0.2, left: 0.3, right: 0.3, bottom: 0.12 },
      });
    if (count > 3)
      layout.slots.push(...memories(3, area(0.045, 0.77, 0.91, 0.21)));
  } else if (id === "golden-roadtrip") {
    layout.slots.push({
      index: 0,
      ...area(0.085, 0.065, 0.83, count === 1 ? 0.87 : 0.61),
      fadeEdges: { bottom: 0.3 },
    });
    if (count > 1)
      layout.slots.push({
        index: 1,
        ...area(0.085, 0.37, 0.83, 0.565),
        fadeEdges: { top: 0.42 },
      });
    if (count > 2)
      layout.slots.push({
        index: 2,
        ...area(0.26, 0.63, 0.48, count > 3 ? 0.21 : 0.305),
        feather: 0.045,
        fadeEdges: { top: 0.22, left: 0.3, right: 0.3, bottom: 0.1 },
      });
    if (count > 3)
      layout.slots.push(...memories(3, area(0.085, 0.72, 0.83, 0.215)));
  } else {
    layout.slots.push({
      index: 0,
      ...area(0, 0, 1, count === 1 ? 1 : 0.75),
      fadeEdges: { bottom: 0.32 },
    });
    if (count > 1)
      layout.slots.push({
        index: 1,
        ...area(0, 0.24, 1, count > 2 ? 0.48 : 0.76),
        fadeEdges: { top: 0.45, bottom: count > 2 ? 0.3 : 0 },
        opacity: 0.92,
      });
    if (count > 2)
      layout.slots.push({
        index: 2,
        ...area(0, 0.59, 1, 0.41),
        fadeEdges: { top: 0.3 },
      });
    if (count > 3)
      layout.slots.push({
        index: 3,
        ...area(0.27, 0.66, 0.46, count > 4 ? 0.18 : 0.34),
        feather: 0.045,
        fadeEdges: { top: 0.2, left: 0.3, right: 0.3 },
      });
    if (count > 4) layout.slots.push(...memories(4, area(0, 0.77, 1, 0.23)));
  }
  return layout;
}
