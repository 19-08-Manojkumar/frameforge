import test from "node:test";
import assert from "node:assert/strict";
import { STICKERS, EMOJIS, constrainSticker } from "../lib/stickers";
import { FONT_OPTIONS } from "../lib/fonts";
import type { StickerLayer } from "../types/collage";
import emojiData from "../lib/emojiCatalog.json";
import {
  EMOJI_COUNT,
  EMOJI_CATEGORIES,
  filterEmoji,
  filterStickers,
  stickerCategory,
  STICKER_CATEGORIES,
} from "../lib/decorationCatalog";
import { POST_STICKERS } from "../lib/postStickers";
import { PAPER_STICKERS } from "../lib/paperStickers";
import { LINE_PRESETS } from "../lib/lineCatalog";
import { linePaths } from "../lib/lineRenderer";

test("the editor provides one hundred sixty unique stickers and a complete emoji catalog", () => {
  assert.ok(FONT_OPTIONS.length > 15);
  assert.equal(
    new Set(FONT_OPTIONS.map((f) => f.family)).size,
    FONT_OPTIONS.length,
  );
  assert.equal(STICKERS.length, 160);
  assert.equal(new Set(STICKERS.map((s) => s.id)).size, 160);
  assert.equal(
    new Set(STICKERS.map((s) => s.name)).size,
    160,
    "Duplicate names: " +
      STICKERS.map((s) => s.name)
        .filter((n, i, all) => all.indexOf(n) !== i)
        .join(", "),
  );
  assert.equal(new Set(STICKERS.map((s) => JSON.stringify(s.paths))).size, 160);
  assert.equal(PAPER_STICKERS.length, 60);
  assert.ok(
    PAPER_STICKERS.every((sticker) => sticker.category === "Creative Charms"),
  );
  assert.equal(EMOJIS.length, 50);
  assert.equal(new Set(EMOJIS.map(([emoji]) => emoji)).size, 50);
  assert.equal(new Set(EMOJIS.map(([, name]) => name)).size, 50);
  assert.equal(emojiData.length, EMOJI_COUNT);
  assert.ok(emojiData.length > 3500);
  assert.equal(new Set(emojiData.map((e) => e.emoji)).size, EMOJI_COUNT);
  assert.equal(filterEmoji(emojiData, "", "Popular").length, 50);
  assert.equal(
    EMOJI_CATEGORIES.reduce(
      (n, c) => n + filterEmoji(emojiData, "", c).length,
      0,
    ),
    EMOJI_COUNT,
  );
});
test("fifty new post stickers include exactly twenty-five editable dotted trip routes", () => {
  assert.equal(POST_STICKERS.length, 50);
  const routes = POST_STICKERS.filter((s) => s.category === "Trip routes");
  assert.equal(routes.length, 25);
  assert.ok(
    routes.every((s) => s.paths.some((p) => p.dash?.length && p.stroke)),
  );
  assert.ok(
    STICKERS.every((s) => STICKER_CATEGORIES.includes(stickerCategory(s))),
  );
});
test("the line picker contains forty editable presets with unique named styles", () => {
  assert.equal(LINE_PRESETS.length, 40);
  assert.equal(new Set(LINE_PRESETS.map(({ name }) => name)).size, 40);
  assert.equal(new Set(LINE_PRESETS.map(({ layer }) => layer.effect)).size, 40);
  assert.deepEqual(
    linePaths(
      {
        ...LINE_PRESETS[3].layer,
        id: "double",
        style: "double",
        effect: undefined,
      },
      { width: 1080, height: 1080 },
    ).length,
    2,
  );
  const curve = linePaths(
    { ...LINE_PRESETS[0].layer, id: "curve", curve: 0.2 },
    { width: 1080, height: 1080 },
  );
  assert.match(curve[0].d, /Q/);
  assert.deepEqual(
    linePaths(
      { ...LINE_PRESETS[0].layer, id: "effect", style: "double", curve: 0.2 },
      { width: 1080, height: 1080 },
    ),
    curve,
  );
});
test("search and categories combine for stickers and all Unicode emoji variants", () => {
  assert.equal(filterStickers("", "Trip routes").length, 25);
  assert.ok(
    filterStickers("MOUNTAIN trail", "Trip routes").some(
      (s) => s.id === "mountain-trail",
    ),
  );
  assert.equal(filterStickers("coffee", "Nature").length, 0);
  assert.equal(filterStickers("coffee", "Food & drink")[0].id, "coffee");
  assert.ok(
    filterEmoji(emojiData, "flag india", "Flags").some((e) => e.emoji === "🇮🇳"),
  );
  assert.ok(
    filterEmoji(emojiData, "🦋", "Animals & Nature").some(
      (e) => e.name === "butterfly",
    ),
  );
  assert.ok(
    filterEmoji(emojiData, "dark skin tone", "People & Body").length > 100,
  );
  assert.equal(filterEmoji(emojiData, "no-such-emoji-xyz").length, 0);
});
test("stickers remain within the output after dragging, rotating, resizing, and changing aspect ratios", () => {
  for (const [width, height] of [
    [1080, 1080],
    [1080, 1920],
    [1920, 1080],
    [320, 1280],
    [1280, 320],
  ])
    for (const rotation of [-180, -45, 0, 15, 90, 225, 375])
      for (const size of [0.01, 0.18, 0.65, 3])
        for (const position of [-2, 0.5, 3]) {
          const raw: StickerLayer = {
            id: "test",
            kind: "heart",
            x: position,
            y: position,
            size,
            rotation,
            color: "#aa0000",
            secondaryColor: "#ffeeaa",
            opacity: 2,
            flipped: false,
            outline: true,
          };
          const layer = constrainSticker(raw, { width, height });
          const angle = (rotation * Math.PI) / 180;
          const half =
            (layer.size *
              Math.min(width, height) *
              (Math.abs(Math.sin(angle)) + Math.abs(Math.cos(angle)))) /
            2;
          assert.ok(layer.x * width - half >= -0.001);
          assert.ok(layer.y * height - half >= -0.001);
          assert.ok(layer.x * width + half <= width + 0.001);
          assert.ok(layer.y * height + half <= height + 0.001);
          assert.ok(layer.size >= 0.04 && layer.size <= 0.65);
          assert.equal(layer.opacity, 1);
          assert.equal(raw.opacity, 2);
        }
});
