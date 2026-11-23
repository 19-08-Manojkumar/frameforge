import test from "node:test";
import assert from "node:assert/strict";
import { BLENDED_TOUR_IDS } from "../lib/blendedTourLayouts";
import { BLENDED_TOUR_THEMES } from "../lib/blendedTourThemes";
import { createLayout } from "../lib/themeLayouts";
import {
  createDefaultTextLayers,
  createDefaultThemeCustomizations,
  CUSTOMIZABLE_THEMES,
  THEME_SECTIONS,
} from "../lib/themeCustomization";
import { photoBlendAlpha } from "../lib/photoBlending";
import { normalizeSlot, resolvePhotoSlots } from "../lib/photoEditing";
import { recommendedThemes, TRAVEL_TEMPLATES } from "../lib/travelTemplates";
import type { PhotoBlendMask } from "../types/collage";

test("four alpha treatments have clear photo centers, continuous soft transitions, and distinct masks", () => {
  const fingerprints = new Set<string>();
  for (const kind of ["oval", "diagonal", "wave", "bloom"] as const) {
    const mask: PhotoBlendMask = { kind, softness: 0.24 };
    assert.equal(photoBlendAlpha(mask, 0.5, 0.5), 1);
    assert.equal(photoBlendAlpha(mask, -0.01, 0.5), 0);
    let clear = 0,
      translucent = 0,
      transparent = 0;
    const values: number[] = [];
    for (let y = 0; y <= 50; y++)
      for (let x = 0; x <= 50; x++) {
        const alpha = photoBlendAlpha(mask, x / 50, y / 50);
        assert.ok(Number.isFinite(alpha) && alpha >= 0 && alpha <= 1);
        alpha === 1 ? clear++ : alpha === 0 ? transparent++ : translucent++;
        values.push(Math.round(alpha * 255));
        const neighbor = photoBlendAlpha(mask, x / 50 + 0.0001, y / 50);
        if (x < 50) assert.ok(Math.abs(alpha - neighbor) < 0.005);
      }
    assert.ok(clear > 150 && translucent > 150 && transparent > 50, kind);
    fingerprints.add(values.join(","));
    // Wider softness never destroys the opaque central focal point.
    assert.equal(photoBlendAlpha({ ...mask, softness: 0.5 }, 0.5, 0.5), 1);
  }
  assert.equal(fingerprints.size, 4);
});

test("five blended Tour themes have editable text, independent area colors, and Quick Create bindings", () => {
  const text = createDefaultTextLayers(),
    colors = createDefaultThemeCustomizations();
  assert.equal(BLENDED_TOUR_THEMES.length, 5);
  for (const id of BLENDED_TOUR_IDS) {
    assert.ok(
      BLENDED_TOUR_THEMES.some(
        (theme) => theme.id === id && theme.category === "Tour",
      ),
    );
    assert.ok(CUSTOMIZABLE_THEMES.includes(id) && THEME_SECTIONS[id]);
    assert.match(colors[id].backgroundColor, /^#[a-f\d]{6}$/i);
    assert.ok(
      recommendedThemes(
        [{ width: 1600, height: 1080 }],
        "Recommended",
      ).includes(id),
    );
    assert.ok(text[id].length >= 3);
    assert.equal(
      new Set(text[id].map((layer) => layer.id)).size,
      text[id].length,
    );
    const binding = TRAVEL_TEMPLATES[id]!;
    for (const key of [...binding.destination, ...binding.caption])
      assert.ok(text[id].some((layer) => layer.id === key));
    text[id][0].text = "MY OWN TOUR";
    assert.notEqual(createDefaultTextLayers()[id][0].text, "MY OWN TOUR");
  }
});

test("custom edge blends survive photo snapshots, source crop changes, and draft serialization", () => {
  const size = { width: 1080, height: 1920 };
  for (const id of BLENDED_TOUR_IDS) {
    const layout = createLayout(id, 5, size.width, size.height);
    assert.equal(layout.layered, true);
    const photos = Array.from({ length: 5 }, (_, i) => ({ id: `photo-${i}` }));
    const layers = Object.fromEntries(
      layout.slots.map((slot) => [
        photos[slot.index].id,
        normalizeSlot(slot, size),
      ]),
    );
    const restored = JSON.parse(JSON.stringify(layers));
    for (const slot of resolvePhotoSlots(id, photos, size, restored)) {
      assert.deepEqual(slot.blendMask, layout.slots[slot.index].blendMask);
      assert.equal(slot.blendMode, layout.slots[slot.index].blendMode);
    }
  }
});
