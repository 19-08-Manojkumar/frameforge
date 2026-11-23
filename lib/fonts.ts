import type { CanvasTextLayer } from "@/types/collage";

export const FONT_OPTIONS = [
  { name: "Arial", family: "Arial, sans-serif" },
  { name: "Georgia", family: "Georgia, serif" },
  { name: "Handwritten", family: "'Segoe Script', 'Brush Script MT', cursive" },
  { name: "Impact", family: "Impact, sans-serif" },
  { name: "Times New Roman", family: "'Times New Roman', serif" },
  { name: "Trebuchet MS", family: "'Trebuchet MS', sans-serif" },
  { name: "Monospace", family: "monospace" },
  ...[
    ["Outfit", "outfit", "sans-serif"],
    ["Playfair Display", "playfairdisplay", "serif"],
    ["Cormorant Garamond", "cormorantgaramond", "serif"],
    ["Libre Baskerville", "librebaskerville", "serif"],
    ["Caveat", "caveat", "cursive"],
    ["Dancing Script", "dancingscript", "cursive"],
    ["Pacifico", "pacifico", "cursive"],
    ["Lobster", "lobster", "cursive"],
    ["Bebas Neue", "bebasneue", "sans-serif"],
    ["Anton", "anton", "sans-serif"],
    ["Oswald", "oswald", "sans-serif"],
    ["Quicksand", "quicksand", "sans-serif"],
    ["Space Mono", "spacemono", "monospace"],
    ["Abril Fatface", "abrilfatface", "serif"],
    ["Permanent Marker", "permanentmarker", "cursive"],
    ["Satisfy", "satisfy", "cursive"],
  ].map(([name, id, fallback]) => ({
    name,
    id,
    family: `'Studio ${name}', ${fallback}`,
  })),
];

export const EMOJI_FONT =
  "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif";

/** Canvas must wait for the chosen local face before measuring or exporting text. */
export async function ensureTextFonts(layers: CanvasTextLayer[]) {
  if (typeof document === "undefined" || !document.fonts) return;
  const faces = new Map<string, string>();
  for (const layer of layers) {
    const font = `${layer.italic ? "italic " : ""}${layer.bold ? "700" : "400"} 32px ${layer.fontFamily}`;
    faces.set(font, `${faces.get(font) ?? ""}${layer.text}`);
  }
  const pending = [...faces].some(
    ([font, text]) => !document.fonts.check(font, text || "Aa"),
  );
  if (!pending) {
    // Other gallery fonts can still be settling while the selected face is cached.
    await document.fonts.ready;
    return false;
  }
  try {
    await Promise.all(
      [...faces].map(([font, text]) => document.fonts.load(font, text || "Aa")),
    );
    await document.fonts.ready;
  } catch {
    throw new Error(
      "This font could not be loaded. Choose another font or try again.",
    );
  }
  return pending;
}
