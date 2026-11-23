import test from "node:test";
import assert from "node:assert/strict";
import { wrapText, textBoxLayout, textFontSize } from "../lib/textLayout";
import type { CanvasTextLayer } from "../types/collage";

const measure = (text: string) =>
  [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)]
    .length;
const layer: CanvasTextLayer = {
  id: "text",
  text: "A long trip story with many wonderful memories",
  x: 0.5,
  y: 0.5,
  width: 0.3,
  size: 0.06,
  color: "#ffffff",
  fontFamily: "Arial",
  bold: false,
  italic: false,
  align: "center",
  background: false,
  backgroundColor: "#000000",
};

test("text wraps words, preserves manual and empty lines, and ignores trailing spaces", () => {
  assert.deepEqual(wrapText("Hello world again", 7, measure), [
    "Hello",
    "world",
    "again",
  ]);
  assert.deepEqual(wrapText("Hello\n\nworld\n", 20, measure), [
    "Hello",
    "",
    "world",
    "",
  ]);
  assert.deepEqual(wrapText("Hello   ", 5, measure), ["Hello"]);
});
test("long words and unspaced scripts wrap without splitting emoji or combining characters", () => {
  assert.deepEqual(wrapText("abcdefghijkl", 5, measure), [
    "abcde",
    "fghij",
    "kl",
  ]);
  assert.deepEqual(wrapText("👨‍👩‍👧‍👦👨‍👩‍👧‍👦éé", 1, measure), ["👨‍👩‍👧‍👦", "👨‍👩‍👧‍👦", "é", "é"]);
  assert.deepEqual(wrapText("旅の思い出", 2, measure), ["旅の", "思い", "出"]);
});
test("typing and narrowing a box add lines without reducing its chosen font size", () => {
  const dimensions = { width: 1000, height: 1250 };
  const original = textBoxLayout(layer, dimensions);
  const longer = textBoxLayout(
    { ...layer, text: layer.text.repeat(2) },
    dimensions,
  );
  const narrow = textBoxLayout({ ...layer, width: 0.15 }, dimensions);
  assert.equal(textFontSize(layer, dimensions), 60);
  for (const box of [original, longer, narrow]) assert.equal(box.fontSize, 60);
  assert.ok(longer.lines.length > original.lines.length);
  assert.ok(narrow.lines.length > original.lines.length);
  assert.equal(original.width, 300);
});
test("minimum box height, alignment, and export scaling preserve the same wrapping geometry", () => {
  const dimensions = { width: 1000, height: 1250 };
  const base = textBoxLayout({ ...layer, height: 0.8 }, dimensions);
  assert.equal(base.height, 1000);
  for (const align of ["left", "center", "right"] as const) {
    const box = textBoxLayout({ ...layer, align }, dimensions);
    assert.equal(
      box.left,
      500 - (align === "left" ? 0 : align === "right" ? 300 : 150),
    );
  }
  const scaled = textBoxLayout(
    { ...layer, height: 0.8 },
    { width: 2000, height: 2500 },
  );
  assert.deepEqual(scaled.lines, base.lines);
  assert.equal(scaled.width, base.width * 2);
  assert.equal(scaled.height, base.height * 2);
  assert.equal(scaled.fontSize, base.fontSize * 2);
});
