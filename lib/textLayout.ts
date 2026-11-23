import type { CanvasTextLayer, Dimensions } from "@/types/collage";

export function textFontSize(layer: CanvasTextLayer, dimensions: Dimensions) {
  return Math.max(
    1,
    layer.size * Math.min(dimensions.width, dimensions.height),
  );
}

/** Wrap words and explicit newlines, splitting long words at whole graphemes. */
export function wrapText(
  text: string,
  width: number,
  measure: (s: string) => number,
): string[] {
  const lines: string[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    for (const token of paragraph.trimEnd().match(/\s+|\S+/gu) ?? []) {
      if (measure(line + token) <= width) {
        line += token;
        continue;
      }
      if (/^\s+$/u.test(token)) {
        lines.push(line.trimEnd());
        line = "";
        continue;
      }
      if (line) {
        lines.push(line.trimEnd());
        line = "";
      }
      for (const { segment } of segmenter.segment(token)) {
        if (line && measure(line + segment) > width) {
          lines.push(line);
          line = "";
        }
        line += segment;
      }
    }
    lines.push(line);
  }
  return lines.length ? lines : [""];
}

/** Logical geometry shared by native editing, selection, thumbnails and export. */
export function textBoxLayout(
  layer: CanvasTextLayer,
  dimensions: Dimensions,
  ctx?: CanvasRenderingContext2D | null,
) {
  const fontSize = textFontSize(layer, dimensions);
  const available =
    layer.align === "left"
      ? 1 - layer.x
      : layer.align === "right"
        ? layer.x
        : 2 * Math.min(layer.x, 1 - layer.x);
  const width =
    Math.max(
      0.02,
      Math.min(
        0.95,
        layer.width ?? Math.max(0.08, Math.min(0.9, available) - 0.03),
      ),
    ) * dimensions.width;
  ctx?.save();
  if (ctx)
    ctx.font = [
      layer.italic ? "italic" : "",
      layer.bold ? "700" : "400",
      fontSize + "px",
      layer.fontFamily,
    ].join(" ");
  const lines = wrapText(layer.text, width, (text) =>
    ctx
      ? ctx.measureText(text).width
      : Array.from(text).length * fontSize * 0.6,
  );
  ctx?.restore();
  const lineHeight = fontSize * 1.12;
  const contentHeight = lineHeight * lines.length;
  const height = Math.max(
    contentHeight,
    (layer.height ?? 0) * dimensions.height,
  );
  const left =
    layer.x * dimensions.width -
    (layer.align === "left" ? 0 : layer.align === "right" ? width : width / 2);
  const top = layer.y * dimensions.height - height / 2;
  return {
    fontSize,
    width,
    height,
    contentHeight,
    lineHeight,
    lines,
    left,
    top,
  };
}
