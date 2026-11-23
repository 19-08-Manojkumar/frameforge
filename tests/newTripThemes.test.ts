import test from "node:test";
import assert from "node:assert/strict";
import { NEW_TRIP_THEME_IDS, createNewTripLayout } from "../lib/newTripLayouts";
import { NEW_TRIP_THEMES, NEW_TRIP_TEXT } from "../lib/newTripThemes";
import {
  CUSTOMIZABLE_THEMES,
  createDefaultTextLayers,
  createDefaultThemeCustomizations,
  THEME_SECTIONS,
} from "../lib/themeCustomization";
import {
  recommendedThemes,
  TRAVEL_TEMPLATES,
  personalizeTravelText,
} from "../lib/travelTemplates";
import { normalizeSlot, resolvePhotoSlots } from "../lib/photoEditing";

test("five new Trip compositions have working personalization, colors, and independent text defaults", () => {
  const defaults = createDefaultTextLayers(),
    colors = createDefaultThemeCustomizations();
  assert.equal(NEW_TRIP_THEMES.length, 5);
  for (const id of NEW_TRIP_THEME_IDS) {
    assert.ok(
      NEW_TRIP_THEMES.some(
        (theme) => theme.id === id && theme.category === "Trip",
      ),
    );
    assert.ok(CUSTOMIZABLE_THEMES.includes(id));
    assert.ok(
      recommendedThemes(
        Array.from({ length: 5 }, () => ({ width: 1600, height: 1000 })),
        "Recommended",
      ).includes(id),
    );
    assert.match(colors[id].backgroundColor, /^#[a-f0-9]{6}$/i);
    assert.ok(THEME_SECTIONS[id]);
    const texts = defaults[id];
    assert.equal(new Set(texts.map((layer) => layer.id)).size, texts.length);
    assert.ok(texts.length >= 4);
    for (const layer of texts) {
      assert.ok(layer.width && layer.width > 0 && layer.width <= 1);
      assert.ok(layer.zIndex! >= 1000);
    }
    const caption = "A weekend to remember.";
    const edited = personalizeTravelText(
      texts,
      id,
      { destination: "Goa", origin: "Mumbai", date: "", caption },
      "caption",
    );
    assert.ok(edited.some((layer) => layer.text === caption));
    for (const key of [
      ...TRAVEL_TEMPLATES[id]!.destination,
      ...TRAVEL_TEMPLATES[id]!.caption,
      ...(TRAVEL_TEMPLATES[id]!.origin ?? []),
    ])
      assert.ok(
        texts.some((layer) => layer.id === key),
        `${id}: missing binding ${key}`,
      );
    texts[0].text = "CHANGED";
    assert.notEqual(createDefaultTextLayers()[id][0].text, "CHANGED");
    assert.notEqual(NEW_TRIP_TEXT[id][0].text, "CHANGED");
  }
});

test("new Trip photos remain selectable and editable across counts and portrait/landscape exports", () => {
  for (const id of NEW_TRIP_THEME_IDS)
    for (const size of [
      { width: 1080, height: 1920 },
      { width: 1920, height: 1080 },
    ])
      for (const count of [1, 2, 5, 10]) {
        const photos = Array.from({ length: count }, (_, index) => ({
          id: `photo-${index}`,
        }));
        const layout = createNewTripLayout(id, count, size.width, size.height);
        assert.equal(layout.slots.length, count);
        assert.deepEqual(
          resolvePhotoSlots(id, photos, size)
            .map((slot) => slot.index)
            .sort((a, b) => a - b),
          photos.map((_, i) => i),
        );
        const layer = {
          ...normalizeSlot(layout.slots[0], size),
          x: 0.1,
          y: 0.2,
          width: 0.3,
          height: 0.25,
          customShape: "rectangle" as const,
        };
        const edited = resolvePhotoSlots(id, photos, size, {
          "photo-0": layer,
        }).find((slot) => slot.index === 0)!;
        assert.equal(edited.x, size.width * 0.1);
        assert.equal(edited.shape, undefined);
        assert.equal(edited.polygon, undefined);
      }
});
