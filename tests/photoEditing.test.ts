import test from "node:test";
import assert from "node:assert/strict";
import {
  constrainLayer,
  hitPhoto,
  resolvePhotoSlots,
  snapshotPhotoLayers,
} from "../lib/photoEditing";
import { createLayout, THEMES } from "../lib/themeLayouts";
import type { PhotoLayer } from "../types/collage";

const size = { width: 1080, height: 1350 },
  photos = Array.from({ length: 5 }, (_, i) => ({ id: `photo-${i}` }));
test("freezing a theme preserves remaining frames when photos are removed or added", () => {
  for (const theme of THEMES) {
    const frozen = snapshotPhotoLayers(theme.id, photos, size, {});
    const remaining = photos.slice(1);
    const after = resolvePhotoSlots(theme.id, remaining, size, frozen);
    for (const slot of after) {
      const before = frozen[remaining[slot.index].id];
      assert.ok(Math.abs(slot.x / size.width - before.x) < 1e-9);
      assert.ok(Math.abs(slot.y / size.height - before.y) < 1e-9);
    }
    const added = resolvePhotoSlots(
      theme.id,
      [...remaining, { id: "new" }],
      size,
      frozen,
    ).find((slot) => slot.index === 4)!;
    assert.ok(
      added.width > 0 && added.x >= 0 && added.x + added.width <= size.width,
    );
  }
});
test("edited frames remain inside all supported aspect ratios after rotation and resizing", () => {
  const layer: PhotoLayer = {
    x: -0.2,
    y: 0.8,
    width: 0.9,
    height: 0.8,
    rotation: Math.PI / 3,
    zIndex: 0,
  };
  for (const [width, height] of [
    [1080, 1350],
    [1080, 1920],
    [1920, 1080],
    [6000, 1500],
    [1500, 6000],
  ]) {
    const result = constrainLayer(layer, { width, height });
    const w = result.width * width,
      h = result.height * height,
      a = result.rotation!;
    const extX = (w * Math.abs(Math.cos(a)) + h * Math.abs(Math.sin(a))) / 2;
    const extY = (w * Math.abs(Math.sin(a)) + h * Math.abs(Math.cos(a))) / 2;
    const cx = (result.x + result.width / 2) * width,
      cy = (result.y + result.height / 2) * height;
    assert.ok(cx - extX >= -1e-8 && cx + extX <= width + 1e-8);
    assert.ok(cy - extY >= -1e-8 && cy + extY <= height + 1e-8);
  }
});
test("hit testing follows masks and rotation rather than selecting empty shape corners", () => {
  const base = { index: 0, x: 100, y: 100, width: 200, height: 200 };
  assert.equal(hitPhoto({ ...base, shape: "circle" }, 110, 110), false);
  assert.equal(hitPhoto({ ...base, shape: "circle" }, 200, 200), true);
  assert.equal(hitPhoto({ ...base, shape: "arch" }, 110, 110), false);
  assert.equal(hitPhoto({ ...base, shape: "arch" }, 110, 290), true);
  const diamond = {
    ...base,
    polygon: [
      [0.5, 0],
      [1, 0.5],
      [0.5, 1],
      [0, 0.5],
    ] as [number, number][],
  };
  assert.equal(hitPhoto(diamond, 110, 110), false);
  assert.equal(hitPhoto({ ...diamond, rotation: Math.PI / 4 }, 150, 150), true);
});
test("custom shape and layer order survive resolution without changing theme definitions", () => {
  const frozen = snapshotPhotoLayers("scenic-fan", photos, size, {});
  frozen[photos[0].id] = {
    ...frozen[photos[0].id],
    customShape: "diamond",
    zIndex: 20,
  };
  const result = resolvePhotoSlots("scenic-fan", photos, size, frozen);
  assert.equal(result.at(-1)!.index, 0);
  assert.deepEqual(result.at(-1)!.polygon, [
    [0.5, 0],
    [1, 0.5],
    [0.5, 1],
    [0, 0.5],
  ]);
  assert.notDeepEqual(
    createLayout("scenic-fan", 5, size.width, size.height).slots[0].polygon,
    result.at(-1)!.polygon,
  );
});

test("a chosen circle stays circular after changing output aspect ratio", () => {
  const frozen = snapshotPhotoLayers("scenic-fan", photos, size, {});
  frozen[photos[0].id] = {
    ...frozen[photos[0].id],
    customShape: "circle",
    width: 0.3,
    height: 0.3,
  };
  for (const [width, height] of [
    [1080, 1080],
    [1080, 1920],
    [1920, 1080],
  ]) {
    const slot = resolvePhotoSlots(
      "scenic-fan",
      photos,
      { width, height },
      frozen,
    ).find((slot) => slot.index === 0)!;
    assert.ok(Math.abs(slot.width - slot.height) < 1e-8);
  }
});
