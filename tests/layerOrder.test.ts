import test from "node:test";
import assert from "node:assert/strict";
import {
  orderedLayers,
  nextLayerOrder,
  frontLayerOrder,
} from "../lib/layerOrder";
import { createDefaultTextLayers } from "../lib/themeCustomization";
import type { StickerLayer } from "../types/collage";

const photos = [{ id: "photo-a" }, { id: "photo-b" }];
const text = createDefaultTextLayers()["scenic-fan"].slice(0, 2);
const sticker = { id: "sticker-a", kind: "heart" } as StickerLayer;

test("unmodified templates retain photo, text, and sticker order", () => {
  const stack = orderedLayers(photos, {}, text, [sticker]);
  assert.deepEqual(
    stack.map((l) => l.kind),
    ["photo", "photo", "text", "text", "sticker"],
  );
  assert.equal(frontLayerOrder(stack), 2001);
});

test("text moves behind photos, into the middle, and above stickers without changing geometry", () => {
  const original = JSON.stringify({ photos, text, sticker });
  const stack = orderedLayers(photos, {}, text, [sticker]);
  for (const [move, index] of [
    ["bottom", 0],
    ["middle", 2],
    ["top", 4],
  ] as const) {
    const zIndex = nextLayerOrder(stack, "text", text[0].id, move);
    const result = orderedLayers(
      photos,
      {},
      [{ ...text[0], zIndex }, text[1]],
      [sticker],
    );
    assert.equal(result[index].id, text[0].id);
  }
  assert.equal(JSON.stringify({ photos, text, sticker }), original);
});

test("single-step moves cross element types and stop at stack boundaries", () => {
  let nextText = [{ ...text[0] }];
  let stack = orderedLayers(photos, {}, nextText, [sticker]);
  const move = (direction: "forward" | "backward") => {
    nextText = [
      {
        ...nextText[0],
        zIndex: nextLayerOrder(stack, "text", text[0].id, direction),
      },
    ];
    stack = orderedLayers(photos, {}, nextText, [sticker]);
    return stack.findIndex((l) => l.id === text[0].id);
  };
  assert.equal(move("forward"), 3);
  assert.equal(move("forward"), 3);
  assert.equal(move("backward"), 2);
  assert.equal(move("backward"), 1);
  assert.equal(move("backward"), 0);
  assert.equal(move("backward"), 0);
});

test("new photo ranks match freeform layout resolution and explicit depths survive serialization", () => {
  const photoLayers = {
    "photo-a": { x: 0, y: 0, width: 0.4, height: 0.4, zIndex: 2004 },
  };
  const layers = [{ ...text[0], zIndex: 2.5 }];
  const stack = orderedLayers(photos, photoLayers, layers, [
    { ...sticker, zIndex: -1 },
  ]);
  assert.deepEqual(
    stack.map((l) => l.order),
    [-1, 2.5, 3, 2004],
  );
  assert.deepEqual(
    orderedLayers(photos, photoLayers, JSON.parse(JSON.stringify(layers)), [
      { ...sticker, zIndex: -1 },
    ]),
    stack,
  );
});
