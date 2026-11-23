import test from "node:test";
import assert from "node:assert/strict";
import { previewDock, previewFit } from "../lib/previewLayout";

test("tools use a portrait side gutter only when the full-height canvas still fits", () => {
  for (const [width, height] of [
    [940, 940],
    [757, 1050],
    [870, 690],
    [590, 690],
    [440, 690],
  ]) {
    const dock = previewDock(width, height, 9 / 16, true);
    if (dock) {
      const full = previewFit(width, height - 54, 9 / 16);
      assert.equal(previewFit(width - dock - 10, height - 54, 9 / 16), full);
      assert.ok(dock >= 184 && dock <= 232);
    }
  }
  assert.equal(previewDock(390, 600, 9 / 16, false), 0);
  assert.equal(previewDock(940, 940, 16 / 9, true), 0);
  assert.equal(previewDock(1800, 600, 16 / 9, true), 0);
});
test("fit sizing preserves aspect ratio and zoom enlarges the real scrollable stage", () => {
  for (const ratio of [1, 9 / 16, 4 / 5, 16 / 9, 4]) {
    const width = previewFit(840, 620, ratio);
    assert.ok(width <= 840 && width / ratio <= 620 + 0.00001);
    assert.equal(previewFit(840, 620, ratio, 2), width * 2);
  }
  assert.equal(previewFit(0, 0, 1), 1);
});
