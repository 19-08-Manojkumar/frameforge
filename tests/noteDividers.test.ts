import test from "node:test";
import assert from "node:assert/strict";
import { NEW_CREATIVE_CHARMS, NOTE_CHARMS } from "../lib/newCreativeCharms";
import { noteTextPlacement } from "../lib/noteText";
import { lineGeometry, transformLine } from "../lib/lineGeometry";
import { LINE_PRESETS, filterLinePresets } from "../lib/lineCatalog";
import { textBoxLayout } from "../lib/textLayout";
import type { StickerLayer } from "../types/collage";

test("thirty additional charms include ten distinct writing surfaces with bounded, legible default text", () => {
  assert.equal(NEW_CREATIVE_CHARMS.length, 30);
  assert.equal(NOTE_CHARMS.length, 10);
  assert.equal(
    new Set(NEW_CREATIVE_CHARMS.map((charm) => JSON.stringify(charm.paths)))
      .size,
    30,
  );
  for (const note of NOTE_CHARMS) {
    assert.equal(note.collection, "Notes & journals");
    assert.equal(note.defaultOutline, false);
    const a = note.textArea!;
    assert.ok(
      a.left >= 0 &&
        a.top >= 0 &&
        a.left + a.width <= 24 &&
        a.top + a.height <= 24,
    );
    for (const [width, height] of [
      [1080, 1350],
      [1080, 1920],
      [1920, 1080],
      [1280, 320],
    ]) {
      const layer: StickerLayer = {
        id: "note",
        kind: note.id,
        x: 0.5,
        y: 0.5,
        size: note.defaultSize!,
        rotation: 0,
        color: note.color,
        secondaryColor: note.secondary,
        opacity: 1,
        flipped: false,
        outline: false,
      };
      const placement = noteTextPlacement(layer, { width, height })!;
      const box = textBoxLayout(
        {
          id: "text",
          text: "Our trip",
          size: 0.02,
          x: 0.5,
          y: 0.5,
          width: 0.3,
          align: "center",
          color: "#333333",
          fontFamily: "Arial",
          bold: false,
          italic: false,
          background: false,
          backgroundColor: "#ffffff",
          ...placement,
        },
        { width, height },
      );
      const scale = (layer.size * Math.min(width, height)) / 28;
      assert.ok(Math.abs(box.width - a.width * scale) < 0.01);
      assert.ok(box.contentHeight <= a.height * scale);
      assert.equal(placement.color, "#353e37");
      assert.equal(
        noteTextPlacement({ ...layer, color: "#123525" }, { width, height })!
          .color,
        "#fffdf5",
      );
    }
  }
});

test("paper-divider filtering separates ten tearing effects and keeps botanical search intact", () => {
  assert.equal(filterLinePresets("", "Torn paper").length, 10);
  assert.equal(filterLinePresets("tearing").length, 10);
  assert.equal(filterLinePresets("leaf", "Botanical").length, 11);
  assert.equal(
    filterLinePresets("spiral", "Torn paper")[0].layer.effect,
    "paper-notebook",
  );
  assert.equal(filterLinePresets("glitter", "Torn paper").length, 0);
});

test("dividers resize and turn horizontally, vertically, or diagonally within all output shapes", () => {
  const original = { ...LINE_PRESETS[30].layer, id: "divider" };
  for (const [width, height] of [
    [1080, 1350],
    [1080, 1920],
    [1920, 1080],
    [1280, 320],
  ]) {
    for (const angle of [-180, -90, -45, 0, 30, 90, 180])
      for (const length of [0.1, 0.6, 1]) {
        const changed = {
          ...original,
          ...transformLine(original, { width, height }, { angle, length }),
        };
        for (const value of [changed.x1, changed.x2, changed.y1, changed.y2])
          assert.ok(value >= -0.0001 && value <= 1.0001);
        assert.ok(
          Math.abs(lineGeometry(changed, { width, height }).length - length) <
            0.0001,
        );
        assert.equal(changed.effect, original.effect);
        assert.equal(changed.width, original.width);
      }
  }
});
