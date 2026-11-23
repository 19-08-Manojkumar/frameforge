import test from "node:test";
import assert from "node:assert/strict";
import { createLayout, slotBounds, THEMES } from "../lib/themeLayouts";
import { coverCrop } from "../lib/collageRenderer";
import { dimensionError } from "../lib/settings";

const sizes = [
  [1080, 1080],
  [1080, 1350],
  [1080, 1920],
  [1920, 1080],
  [320, 1280],
  [1280, 320],
  [4000, 6000],
];
function polygon(s: import("../types/collage").PhotoSlot) {
  const points = s.polygon || [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const a = s.rotation || 0,
    cx = s.x + s.width / 2,
    cy = s.y + s.height / 2;
  return points.map(([x, y]) => {
    const dx = (x - 0.5) * s.width,
      dy = (y - 0.5) * s.height;
    return [
      cx + dx * Math.cos(a) - dy * Math.sin(a),
      cy + dx * Math.sin(a) + dy * Math.cos(a),
    ];
  });
}
function overlaps(a: number[][], b: number[][]) {
  for (const poly of [a, b])
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i],
        q = poly[(i + 1) % poly.length],
        axis = [-(q[1] - p[1]), q[0] - p[0]];
      if (Math.hypot(...axis) < 0.001) continue;
      const project = (pts: number[][]) =>
        pts.map((v) => (v[0] * axis[0] + v[1] * axis[1]) / Math.hypot(...axis));
      const ap = project(a),
        bp = project(b);
      if (
        Math.min(Math.max(...ap), Math.max(...bp)) -
          Math.max(Math.min(...ap), Math.min(...bp)) <
        0.01
      )
        return false;
    }
  return true;
}
for (const theme of THEMES) {
  test(`${theme.name}: every image is placed once and stays in bounds; only exposure layers may overlap`, () => {
    for (const [w, h] of sizes)
      for (let count = 1; count <= 10; count++) {
        const layout = createLayout(theme.id, count, w, h);
        assert.equal(layout.slots.length, count);
        assert.deepEqual(
          layout.slots.map((s) => s.index).sort((a, b) => a - b),
          Array.from({ length: count }, (_, i) => i),
        );
        for (const s of layout.slots) {
          assert.ok(s.width > 0 && s.height > 0);
          const b = slotBounds(s),
            context = `${theme.id} count=${count} ${w}x${h} index=${s.index}`;
          assert.ok(
            b.x >= -0.01 &&
              b.y >= -0.01 &&
              b.x + b.width <= w + 0.01 &&
              b.y + b.height <= h + 0.01,
            context,
          );
          for (const t of layout.slots.filter((t) => t.index > s.index)) {
            const a = slotBounds(t);
            const overlap =
              Math.min(b.x + b.width, a.x + a.width) - Math.max(b.x, a.x) >
                0.01 &&
              Math.min(b.y + b.height, a.y + a.height) - Math.max(b.y, a.y) >
                0.01;
            assert.equal(
              overlap && overlaps(polygon(s), polygon(t)),
              Boolean(
                layout.layered &&
                (s.feather || t.feather || s.fadeEdges || t.fadeEdges) &&
                overlap &&
                overlaps(polygon(s), polygon(t)),
              ),
              `${context}: overlaps ${t.index}`,
            );
          }
        }
      }
  });
}
test("cover crop preserves aspect ratio and never samples outside the original", () => {
  for (const [sw, sh] of [
    [4000, 3000],
    [3000, 4000],
    [100, 4000],
    [4000, 100],
  ])
    for (const [dw, dh] of sizes) {
      const c = coverCrop(sw, sh, dw, dh);
      assert.ok(Math.abs(c.sw / c.sh - dw / dh) < 1e-9);
      assert.ok(
        c.sx >= 0 &&
          c.sy >= 0 &&
          c.sx + c.sw <= sw + 0.001 &&
          c.sy + c.sh <= sh + 0.001,
      );
    }
});
test("invalid custom dimensions are rejected before allocating canvases", () => {
  for (const [width, height] of [
    [0, 1080],
    [NaN, 1000],
    [1080.5, 1080],
    [7000, 1080],
    [6000, 6000],
    [320, 6000],
  ])
    assert.ok(dimensionError({ width, height }));
  for (const [width, height] of sizes)
    assert.equal(dimensionError({ width, height }), null);
});
test("photo zoom unlocks both crop axes without stretching or sampling beyond the image", () => {
  for (const zoom of [1, 1.25, 2, 3])
    for (const x of [0, 0.5, 1])
      for (const y of [0, 0.5, 1]) {
        const crop = coverCrop(1000, 1000, 500, 500, { x, y, zoom });
        assert.equal(crop.sw, crop.sh);
        assert.equal(crop.sw, 1000 / zoom);
        assert.ok(crop.sx >= 0 && crop.sy >= 0);
        assert.ok(crop.sx + crop.sw <= 1000 && crop.sy + crop.sh <= 1000);
        assert.equal(crop.sx, (1000 - crop.sw) * x);
        assert.equal(crop.sy, (1000 - crop.sh) * y);
      }
  assert.deepEqual(
    coverCrop(1000, 800, 400, 600, { x: -2, y: 5, zoom: 0 }),
    coverCrop(1000, 800, 400, 600, { x: 0, y: 1, zoom: 1 }),
  );
});
test("all themes have distinct geometry at the five-photo acceptance case", () => {
  const fingerprints = THEMES.map((t) =>
    JSON.stringify(createLayout(t.id, 5, 1080, 1080).slots),
  );
  assert.equal(new Set(fingerprints).size, THEMES.length);
});
