import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_TRAVEL_DETAILS,
  TRAVEL_COLLECTIONS,
  TRAVEL_TEMPLATES,
  formatTripDate,
  personalizeTravelText,
  recommendedThemes,
} from "../lib/travelTemplates";
import { createDefaultTextLayers } from "../lib/themeCustomization";
import type { ThemeId } from "../types/collage";

test("recommendations suit the photo count and distinguish portrait-led designs from ready landscape collages", () => {
  assert.equal(
    recommendedThemes([{ width: 1600, height: 1000 }], "Recommended")[0],
    "scenic-fan",
  );
  assert.equal(
    recommendedThemes(
      Array.from({ length: 10 }, () => ({ width: 1600, height: 1000 })),
      "Recommended",
    )[0],
    "route-diary",
  );
  assert.equal(
    recommendedThemes(
      [
        { width: 1000, height: 1600 },
        { width: 1600, height: 1000 },
      ],
      "Recommended",
    )[0],
    "coastal-exposure",
  );
  assert.equal(
    recommendedThemes(
      [
        { width: 1600, height: 1000 },
        { width: 1600, height: 1000 },
      ],
      "Beach",
    )[0],
    "sea-breeze",
  );
  for (const collection of TRAVEL_COLLECTIONS.filter(
    (value) => !["Recommended", "All designs"].includes(value),
  )) {
    const themes = recommendedThemes([], collection);
    assert.ok(themes.length >= 2);
    assert.ok(
      themes.every((id) =>
        TRAVEL_TEMPLATES[id]!.collections.includes(collection),
      ),
    );
  }
});
test("trip fields bind to every travel design without altering photos, typography, position, or custom text", () => {
  const defaults = createDefaultTextLayers();
  for (const theme of Object.keys(TRAVEL_TEMPLATES) as ThemeId[]) {
    const before = defaults[theme].map((text) => ({
      ...text,
      x: 0.123,
      fontFamily: "'Studio Outfit', sans-serif",
    }));
    const details = {
      destination: "Goa",
      origin: "Mumbai",
      caption: "Every mile, a memory.",
      date: "2026-10-28",
    };
    let after = personalizeTravelText(before, theme, details, "destination");
    after = personalizeTravelText(after, theme, details, "caption");
    after = personalizeTravelText(after, theme, details, "origin");
    after = personalizeTravelText(after, theme, details, "date");
    assert.ok(after.some((text) => text.text === "Goa"));
    assert.ok(after.some((text) => text.text === details.caption));
    assert.equal(
      after.find((text) => text.id === "travel-date")?.text,
      "28 Oct 2026",
    );
    assert.ok(
      after
        .filter((text) => text.id !== "travel-date")
        .every(
          (text) =>
            text.x === 0.123 &&
            text.fontFamily === "'Studio Outfit', sans-serif",
        ),
    );
    assert.equal(
      personalizeTravelText(after, theme, EMPTY_TRAVEL_DETAILS, "date").some(
        (text) => text.id === "travel-date",
      ),
      false,
    );
    assert.deepEqual(
      defaults[theme].map((text) => text.id),
      before.map((text) => text.id),
    );
  }
});
test("dates are valid calendar dates and can be removed without deleting other text", () => {
  assert.equal(formatTripDate("2026-02-30"), "");
  assert.equal(formatTripDate("not a date"), "");
  assert.equal(formatTripDate("2028-02-29"), "29 Feb 2028");
  const defaults = createDefaultTextLayers();
  assert.equal(
    personalizeTravelText(
      defaults["clean-grid"],
      "clean-grid",
      EMPTY_TRAVEL_DETAILS,
      "destination",
    ),
    defaults["clean-grid"],
  );
});
