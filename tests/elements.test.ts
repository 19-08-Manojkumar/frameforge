import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import catalog from "../lib/emojiCatalog.json";
import manifest from "../lib/flagManifest.json";
import { flagAsset } from "../lib/flagEmoji";
import { defaultImageFrame } from "../lib/extraImages";
import {
  orderedLayers,
  nextLayerOrder,
  layerPosition,
} from "../lib/layerOrder";
import type { ImageElement } from "../types/collage";

test("every flag in the emoji catalog has bundled real artwork including regional and subdivision flags", () => {
  const flags = catalog.filter((e) => e.category === "Flags");
  assert.equal(flags.length, 270);
  assert.equal(Object.keys(manifest).length, flags.length);
  for (const flag of flags) {
    const asset = flagAsset(flag.emoji);
    assert.ok(asset, flag.name);
    const svg = fs.readFileSync(
      path.join(process.cwd(), "public", asset),
      "utf8",
    );
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /<script|https?:\/\/[^" ]+\.(?:png|jpg)/);
  }
  assert.equal(flagAsset("😊"), undefined);
});
test("independent image frames preserve aspect ratio, fit the canvas, and participate in the shared stack", () => {
  for (const size of [
    { width: 1080, height: 1920 },
    { width: 1920, height: 1080 },
  ]) {
    for (const photo of [
      { width: 3000, height: 2000 },
      { width: 100, height: 3000 },
    ]) {
      const frame = defaultImageFrame(photo, size, 2005);
      assert.ok(
        Math.abs(
          (frame.width * size.width) / (frame.height * size.height) -
            photo.width / photo.height,
        ) < 1e-8,
      );
      assert.ok(
        frame.x >= 0 &&
          frame.y >= 0 &&
          frame.x + frame.width <= 1 &&
          frame.y + frame.height <= 1,
      );
    }
  }
  const image = {
    photo: { id: "extra", width: 200, height: 100 },
    frame: defaultImageFrame(
      { width: 200, height: 100 },
      { width: 1080, height: 1350 },
      2005,
    ),
    crop: { x: 0.5, y: 0.5 },
  } as ImageElement;
  const photos = [{ id: "first" }, { id: "second" }];
  const stack = orderedLayers(photos, {}, [], [], [image]);
  assert.equal(layerPosition(stack, "image", "extra"), "top");
  for (const position of ["bottom", "middle", "top"] as const) {
    const frame = {
      ...image.frame,
      zIndex: nextLayerOrder(stack, "image", "extra", position),
    };
    assert.equal(
      layerPosition(
        orderedLayers(photos, {}, [], [], [{ ...image, frame }]),
        "image",
        "extra",
      ),
      position,
    );
  }
});
