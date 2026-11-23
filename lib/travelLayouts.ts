import type { CollageLayout, PhotoSlot, Rect, ThemeId } from "@/types/collage";
import {
  BLENDED_TOUR_IDS,
  createBlendedTourLayout,
  isBlendedTour,
} from "@/lib/blendedTourLayouts";

export const TOUR_THEME_IDS: ThemeId[] = [
  ...BLENDED_TOUR_IDS,
  "scenic-fan",
  "torn-travel",
  "tour-poster",
  "sea-breeze",
  "hike-poster",
  "wander-cutout",
  "postcard-stack",
];

// Each row is filled completely; no empty slots at any photo count or canvas ratio.
function tiles(
  count: number,
  b: Rect,
  gap: number,
  offset = 0,
  rotate = false,
): PhotoSlot[] {
  if (!count) return [];
  const rows = Math.max(
    1,
    Math.min(count, Math.round(Math.sqrt((count * b.height) / b.width))),
  );
  const slots: PhotoSlot[] = [];
  let index = offset;
  for (let r = 0; r < rows; r++) {
    const cols = Math.floor(count / rows) + (r < count % rows ? 1 : 0);
    const h = (b.height - gap * (rows - 1)) / rows;
    const w = (b.width - gap * (cols - 1)) / cols;
    for (let c = 0; c < cols; c++) {
      const inset = rotate ? Math.min(w, h) * 0.05 : 0;
      slots.push({
        index,
        x: b.x + c * (w + gap) + inset,
        y: b.y + r * (h + gap) + inset,
        width: w - 2 * inset,
        height: h - 2 * inset,
        rotation: rotate ? (index % 2 ? 0.025 : -0.025) : 0,
      });
      index++;
    }
  }
  return slots;
}

function wedge(index: number, points: [number, number][]): PhotoSlot {
  const x = Math.min(...points.map((p) => p[0])),
    y = Math.min(...points.map((p) => p[1]));
  const w = Math.max(...points.map((p) => p[0])) - x,
    h = Math.max(...points.map((p) => p[1])) - y;
  return {
    index,
    x,
    y,
    width: w,
    height: h,
    polygon: points.map((p) => [(p[0] - x) / w, (p[1] - y) / h]),
  };
}

export function createTravelLayout(
  id: ThemeId,
  count: number,
  w: number,
  h: number,
): CollageLayout {
  if (isBlendedTour(id)) return createBlendedTourLayout(id, count, w, h);
  const u = Math.min(w, h),
    gap = u * 0.018;
  let slots: PhotoSlot[] = [],
    background = "#ece6da";
  const gapRegions: Rect[] = [];
  const area = (x: number, y: number, width: number, height: number): Rect => ({
    x: w * x,
    y: h * y,
    width: w * width,
    height: h * height,
  });
  if (!count) return { slots, background, kind: id };
  switch (id) {
    case "scenic-fan": {
      background = "#3d4e4d";
      const inset = u * 0.018,
        topHeight = h * 0.77,
        rise = topHeight - inset,
        span = w - 2 * inset,
        length = 2 * rise + span;
      const boundary = (t: number): [number, number] =>
        t <= rise
          ? [inset, topHeight - t]
          : t <= rise + span
            ? [inset + t - rise, inset]
            : [w - inset, inset + t - rise - span];
      for (let i = 0; i < count; i++) {
        const start = (i * length) / count,
          end = ((i + 1) * length) / count;
        const points: [number, number][] = [
          [w * 0.5, topHeight],
          boundary(start),
        ];
        for (const corner of [rise, rise + span])
          if (corner > start && corner < end) points.push(boundary(corner));
        points.push(boundary(end));
        slots.push(wedge(i, points));
      }
      break;
    }
    case "torn-travel": {
      background = "#bacbce";
      const sideCount = count === 1 ? 0 : Math.max(1, Math.floor(count * 0.4)),
        mainCount = count - sideCount;
      const mainWidth = sideCount ? 0.62 : 0.84;
      slots = tiles(
        mainCount,
        area(0.055, 0.17, mainWidth, 0.62),
        u * 0.035,
        0,
        true,
      ).map((s) => ({
        ...s,
        mat: 0.025,
        bottomMat: 0.09,
        shadow: true,
        paperclip: true,
      }));
      if (mainCount === 3 && w / h > 0.6 && w / h < 1.5)
        slots = [
          {
            index: 0,
            ...area(0.065, 0.16, 0.255, 0.29),
            rotation: 0.07,
            mat: 0.025,
            bottomMat: 0.09,
            shadow: true,
            paperclip: true,
          },
          {
            index: 1,
            ...area(0.385, 0.28, 0.275, 0.285),
            rotation: -0.06,
            mat: 0.025,
            bottomMat: 0.09,
            shadow: true,
            paperclip: true,
          },
          {
            index: 2,
            ...area(0.19, 0.625, 0.38, 0.18),
            rotation: 0.065,
            mat: 0.025,
            bottomMat: 0.09,
            shadow: true,
            paperclip: true,
          },
        ];
      if (sideCount) {
        gapRegions.push(area(0.745, 0, 0.255, 1));
        const rail = tiles(
          sideCount,
          area(0.745, 0, 0.255, 1),
          u * 0.006,
          mainCount,
        );
        slots.push(
          ...rail.map((s): PhotoSlot => ({
            ...s,
            polygon: [
              [0.035, 0],
              [1, 0],
              [1, 1],
              [0.035, 1],
              ...Array.from(
                { length: 20 },
                (_, i) =>
                  [
                    i % 3 === 0 ? 0 : i % 3 === 1 ? 0.06 : 0.025,
                    1 - i / 19,
                  ] as [number, number],
              ),
            ],
          })),
        );
      }
      break;
    }
    case "tour-poster": {
      background = "#143c3a";
      if (count > 1) gapRegions.push(area(0.055, 0.71, 0.89, 0.235));
      slots = [
        {
          index: 0,
          ...area(0.43, 0.045, 0.52, count === 1 ? 0.91 : 0.58),
          radius: 0.018,
        },
      ];
      slots.push(
        ...tiles(count - 1, area(0.055, 0.71, 0.89, 0.235), gap, 1).map(
          (s) => ({ ...s, radius: 0.012, mat: 0.02, shadow: true }),
        ),
      );
      break;
    }
    case "sea-breeze": {
      background = "#f4f1e9";
      gapRegions.push(area(0.055, 0.27, 0.7, 0.66));
      slots = tiles(
        count,
        area(0.055, 0.27, 0.7, 0.66),
        u * 0.026,
        0,
        true,
      ).map((s, i) => ({
        ...s,
        radius: 0.025,
        mat: 0.025,
        bottomMat: 0.05,
        shadow: true,
        ...(i === 0 && count > 1
          ? { shape: "circle" as const, mat: 0, bottomMat: 0 }
          : {}),
      }));
      break;
    }
    case "hike-poster": {
      background = "#203b32";
      if (count > 1) gapRegions.push(area(0.045, 0.79, 0.91, 0.17));
      slots = [{ index: 0, ...area(0.045, 0.04, 0.91, 0.5), radius: 0.015 }];
      slots.push(
        ...tiles(count - 1, area(0.045, 0.79, 0.91, 0.17), gap, 1).map((s) => ({
          ...s,
          mat: 0.02,
          shadow: true,
        })),
      );
      break;
    }
    case "wander-cutout": {
      background = "#e9eadf";
      const firstCount = Math.ceil(count / 2);
      gapRegions.push(area(0.055, 0.12, 0.89, 0.34));
      if (count > firstCount) gapRegions.push(area(0.055, 0.72, 0.89, 0.23));
      slots = tiles(firstCount, area(0.055, 0.12, 0.89, 0.34), gap).map(
        (s) => ({
          ...s,
          polygon: [
            [0.06, 0],
            [1, 0],
            [0.94, 1],
            [0, 1],
          ],
        }),
      );
      slots.push(
        ...tiles(
          count - firstCount,
          area(0.055, 0.72, 0.89, 0.23),
          gap,
          firstCount,
        ).map((s) => ({ ...s, radius: 0.02 })),
      );
      break;
    }
    case "postcard-stack": {
      background = "#e8e0cf";
      gapRegions.push(area(0.06, 0.22, 0.88, 0.66));
      slots = tiles(
        count,
        area(0.06, 0.22, 0.88, 0.66),
        u * 0.025,
        0,
        true,
      ).map((s) => ({
        ...s,
        mat: 0.035,
        bottomMat: 0.11,
        shadow: true,
        paperclip: false,
      }));
      break;
    }
  }
  return { slots, gapRegions, background, kind: id };
}
