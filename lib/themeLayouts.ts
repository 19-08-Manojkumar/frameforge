import type {
  CollageLayout,
  PhotoSlot,
  Rect,
  Theme,
  ThemeId,
} from "@/types/collage";
import { createTravelLayout, TOUR_THEME_IDS } from "@/lib/travelLayouts";
import { createTripLayout, TRIP_THEME_IDS } from "@/lib/tripLayouts";
import { NEW_TRIP_THEMES } from "@/lib/newTripThemes";
import { BLENDED_TOUR_THEMES } from "@/lib/blendedTourThemes";

export const THEMES: Theme[] = [
  ...BLENDED_TOUR_THEMES,
  ...NEW_TRIP_THEMES,
  {
    id: "route-diary",
    name: "Route Diary",
    description: "Map notes, paper prints, and a journey",
    category: "Trip",
  },
  {
    id: "coastal-exposure",
    name: "Coastal Exposure",
    description: "Airy portraits and a soft coastal panorama",
    category: "Trip",
  },
  {
    id: "golden-roadtrip",
    name: "Golden Road Trip",
    description: "Golden-hour layers in a paper poster",
    category: "Trip",
  },
  {
    id: "heritage-reverie",
    name: "Heritage Reverie",
    description: "Warm portraits, landmarks, and reflection",
    category: "Trip",
  },
  {
    id: "scenic-fan",
    name: "Scenic Fan",
    description: "Every path, one story",
    category: "Tour",
  },
  {
    id: "torn-travel",
    name: "Torn Travel Diary",
    description: "Pinned memories and torn paper",
    category: "Tour",
  },
  {
    id: "clean-grid",
    name: "Clean Grid",
    description: "Soft-edged color mosaic",
    category: "Grid",
  },
  {
    id: "magazine",
    name: "Magazine",
    description: "A warm, layered cover story",
    category: "Editorial",
  },
  {
    id: "polaroid",
    name: "Polaroid",
    description: "Floating prints on soft paper",
    category: "Creative",
  },
  {
    id: "film-strip",
    name: "Film Strip",
    description: "A cinematic frame sequence",
    category: "Editorial",
  },
  {
    id: "scrapbook",
    name: "Scrapbook",
    description: "A tactile, layered memory board",
    category: "Creative",
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    description: "Airy frames with a gentle glow",
    category: "Grid",
  },
  {
    id: "dark-editorial",
    name: "Dark Editorial",
    description: "Moody, immersive photo layers",
    category: "Editorial",
  },
  {
    id: "travel-journal",
    name: "Travel Journal",
    description: "A softly blended travel diary",
    category: "Creative",
  },
  {
    id: "retro-vintage",
    name: "Retro Vintage",
    description: "Warm film tones and paper grain",
    category: "Creative",
  },
  {
    id: "modern-gradient",
    name: "Modern Gradient",
    description: "A luminous, color-washed blend",
    category: "Grid",
  },
  {
    id: "tour-poster",
    name: "Tour Poster",
    description: "A bold travel-cover collage",
    category: "Tour",
  },
  {
    id: "sea-breeze",
    name: "Sea Breeze",
    description: "A breezy coastal moodboard",
    category: "Tour",
  },
  {
    id: "hike-poster",
    name: "Let’s Hike",
    description: "A pinned instant-photo story",
    category: "Tour",
  },
  {
    id: "wander-cutout",
    name: "Wander Cutout",
    description: "Travel memories in a bold stamp",
    category: "Tour",
  },
  {
    id: "postcard-stack",
    name: "Postcard Stack",
    description: "A keepsake from everywhere",
    category: "Tour",
  },
];

/** Variable rows use every cell, including prime image counts. Coordinates are output pixels. */
function grid(
  count: number,
  box: Rect,
  gap: number,
  offset = 0,
  target = 1,
  stagger = false,
): PhotoSlot[] {
  if (!count) return [];
  let rows = 1,
    best = Infinity;
  for (let r = 1; r <= count; r++) {
    const cols = Math.ceil(count / r);
    const cellRatio =
      (box.width - (cols - 1) * gap) /
      cols /
      ((box.height - (r - 1) * gap) / r);
    const score =
      Math.abs(Math.log(Math.max(0.001, cellRatio) / target)) +
      (count % r ? 0.08 : 0);
    if (score < best) {
      rows = r;
      best = score;
    }
  }
  const result: PhotoSlot[] = [];
  let index = offset;
  for (let row = 0; row < rows; row++) {
    const cols = Math.floor(count / rows) + (row < count % rows ? 1 : 0);
    const h = (box.height - (rows - 1) * gap) / rows;
    const weights = Array.from({ length: cols }, (_, i) =>
      stagger ? ((i + row) % 2 ? 0.82 : 1.18) : 1,
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    let x = box.x;
    for (let col = 0; col < cols; col++) {
      const w = ((box.width - (cols - 1) * gap) * weights[col]) / sum;
      result.push({
        index: index++,
        x,
        y: box.y + row * (h + gap),
        width: w,
        height: h,
      });
      x += w + gap;
    }
  }
  return result;
}
function hero(
  count: number,
  b: Rect,
  gap: number,
  fraction: number,
  vertical: boolean,
): PhotoSlot[] {
  if (count === 1) return [{ ...b, index: 0 }];
  if (vertical) {
    const h = (b.height - gap) * fraction;
    return [
      { x: b.x, y: b.y, width: b.width, height: h, index: 0 },
      ...grid(
        count - 1,
        {
          x: b.x,
          y: b.y + h + gap,
          width: b.width,
          height: b.height - h - gap,
        },
        gap,
        1,
        1.1,
        true,
      ),
    ];
  }
  const w = (b.width - gap) * fraction;
  return [
    { x: b.x, y: b.y, width: w, height: b.height, index: 0 },
    ...grid(
      count - 1,
      { x: b.x + w + gap, y: b.y, width: b.width - w - gap, height: b.height },
      gap,
      1,
      0.9,
      true,
    ),
  ];
}
function shrink(s: PhotoSlot, factor: number, angle = 0): PhotoSlot {
  return {
    ...s,
    x: s.x + (s.width * (1 - factor)) / 2,
    y: s.y + (s.height * (1 - factor)) / 2,
    width: s.width * factor,
    height: s.height * factor,
    rotation: angle,
  };
}
/** Pure, deterministic layout definitions shared by thumbnail, preview, and export. */
export function createLayout(
  id: ThemeId,
  count: number,
  width: number,
  height: number,
): CollageLayout {
  if (!Number.isInteger(count) || count < 0 || count > 10)
    throw new Error("Choose between 1 and 10 photos.");
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("Invalid canvas dimensions.");
  const u = Math.min(width, height);
  if (TRIP_THEME_IDS.includes(id))
    return createTripLayout(id, count, width, height);
  const box = (m: number): Rect => ({
    x: u * m,
    y: u * m,
    width: width - 2 * u * m,
    height: height - 2 * u * m,
  });
  let slots: PhotoSlot[] = [],
    background = "#ffffff";
  if (!count) return { slots, background, kind: id };
  if (TOUR_THEME_IDS.includes(id))
    return createTravelLayout(id, count, width, height);
  switch (id) {
    case "clean-grid":
      slots = grid(count, box(0.028), u * 0.014).map((s) => ({
        ...s,
        radius: 0.014,
        shadow: true,
      }));
      break;
    case "magazine":
      background = "#f5f0e6";
      slots = hero(
        count,
        box(0.045),
        u * 0.018,
        count > 4 ? 0.52 : 0.6,
        height > width * 1.2,
      ).map((s) => ({ ...s, radius: 0.018, shadow: true }));
      break;
    case "polaroid":
      background = "#e7e6df";
      slots = grid(count, box(0.034), u * 0.002, 0, 0.88).map((s, i) => ({
        ...shrink(s, 0.81, [-0.055, 0.045, -0.025, 0.055][i % 4]),
        mat: 0.045,
        bottomMat: 0.18,
        shadow: true,
      }));
      break;
    case "film-strip": {
      background = "#191a18";
      const b = box(0.055);
      slots = grid(count, b, u * 0.035, 0, width > height ? 0.85 : 1.65).map(
        (s) => ({ ...s, radius: 0.008 }),
      );
      break;
    }
    case "scrapbook":
      background = "#eee8da";
      slots = grid(count, box(0.035), u * 0.012, 0, 1.15, true).map((s, i) => ({
        ...shrink(s, i % 3 === 0 ? 0.83 : 0.87, [0.025, -0.045, 0.035][i % 3]),
        mat: 0.035,
        bottomMat: 0.06,
        shadow: true,
        tape: true,
      }));
      break;
    case "minimal-white": {
      const b = box(0.075);
      slots = grid(count, b, u * 0.035, 0, height > width ? 1.4 : 0.72).map(
        (s, i) => ({
          ...shrink(s, count === 1 ? 0.82 : i % 2 ? 0.9 : 1),
          radius: 0.014,
          shadow: true,
        }),
      );
      break;
    }
    case "dark-editorial":
      background = "#171e1c";
      slots = hero(
        count,
        box(0.027),
        u * 0.012,
        0.65,
        width <= height * 1.6,
      ).map((s) => ({ ...s, radius: 0.02, shadow: true }));
      break;
    case "travel-journal": {
      background = "#f6f1e5";
      const b = box(0.065);
      slots = hero(count, b, u * 0.055, 0.46, height > width * 1.4).map(
        (s, i) => ({
          ...shrink(s, i === 0 ? 1 : 0.91, i === 0 ? 0 : i % 2 ? 0.02 : -0.02),
          mat: 0.025,
          bottomMat: 0.075,
          shadow: true,
        }),
      );
      break;
    }
    case "retro-vintage":
      background = "#d7c4a2";
      slots = grid(count, box(0.06), u * 0.025, 0, 1.4, true).map((s, i) => ({
        ...shrink(s, 0.94, i % 2 ? 0.015 : -0.015),
        mat: 0.035,
        bottomMat: 0.045,
      }));
      break;
    case "modern-gradient":
      background = "gradient";
      slots = hero(count, box(0.065), u * 0.025, 0.5, height >= width).map(
        (s) => ({ ...s, radius: 0.045, shadow: true }),
      );
      break;
  }
  return { slots, background, kind: id };
}

/** Rotated frame bounds are used by layout tests to prevent off-canvas clipping. */
export function slotBounds(s: PhotoSlot): Rect {
  const a = Math.abs(s.rotation || 0),
    w = s.width * Math.cos(a) + s.height * Math.sin(a),
    h = s.height * Math.cos(a) + s.width * Math.sin(a);
  return {
    x: s.x + (s.width - w) / 2,
    y: s.y + (s.height - h) / 2,
    width: w,
    height: h,
  };
}
