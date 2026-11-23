import test from "node:test";
import assert from "node:assert/strict";
import {
  STICKER_STYLES,
  stickerStyle,
  stickerInks,
  stickerStyleScale,
} from "../lib/stickerStyles";
import { NOTE_CHARMS } from "../lib/newCreativeCharms";
import { noteTextPlacement } from "../lib/noteText";
import { constrainSticker } from "../lib/stickers";
import type { StickerLayer } from "../types/collage";

test("old drafts retain Classic artwork; all four named styles preserve editable custom inks", () => {
  assert.equal(STICKER_STYLES.length, 4);
  for (const unknown of [undefined, null, "old-style", 1, {}])
    assert.equal(stickerStyle(unknown), "classic");
  for (const style of STICKER_STYLES) {
    assert.equal(stickerStyle(style.id), style.id);
    const first = stickerInks(style.id, "#2674a1", "#ffeec1");
    const second = stickerInks(style.id, "#df283e", "#32cd89");
    assert.notDeepEqual(first, second);
    assert.ok(Object.values(first).every((ink) => /^#[a-f\d]{6}$/i.test(ink)));
  }
  assert.deepEqual(stickerInks(undefined, "#123456", "#abcdef"), {
    primary: "#123456",
    secondary: "#abcdef",
  });
});
test("all styled writing surfaces place readable text inside their scaled clear area", () => {
  for (const note of NOTE_CHARMS)
    for (const style of STICKER_STYLES) {
      const layer: StickerLayer = {
        id: "note",
        kind: note.id,
        style: style.id,
        x: 0.5,
        y: 0.5,
        size: 0.46,
        rotation: 0,
        color: note.color,
        secondaryColor: note.secondary,
        opacity: 1,
        flipped: false,
        outline: false,
      };
      for (const dimensions of [
        { width: 1080, height: 1920 },
        { width: 1920, height: 1080 },
        { width: 1080, height: 1080 },
      ]) {
        const text = noteTextPlacement(layer, dimensions)!;
        const scale =
          (layer.size * Math.min(dimensions.width, dimensions.height)) / 28;
        const artScale = stickerStyleScale(style.id);
        assert.ok(
          text.width! * dimensions.width <=
            note.textArea!.width * artScale * scale + 0.0001,
        );
        assert.ok(text.size! > 0);
        assert.ok(text.x! > 0 && text.x! < 1 && text.y! > 0 && text.y! < 1);
        const frame = constrainSticker(layer, dimensions);
        assert.deepEqual(
          { x: frame.x, y: frame.y, size: frame.size },
          { x: layer.x, y: layer.y, size: layer.size },
        );
        assert.equal(JSON.parse(JSON.stringify(frame)).style, style.id);
      }
    }
});
