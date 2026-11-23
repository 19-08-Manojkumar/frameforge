import type { Photo } from "@/types/collage";
import { MAX_FILE_BYTES, MAX_SOURCE_PIXELS } from "@/lib/settings";

export async function decodePhoto(
  url: string,
  name: string,
  sample = false,
): Promise<Photo> {
  const source = new Image();
  source.decoding = "async";
  source.src = url;
  try {
    await source.decode();
  } catch {
    throw new Error(
      `${name}: this image could not be read. Try another JPG, PNG, or WEBP.`,
    );
  }
  const width = source.naturalWidth,
    height = source.naturalHeight;
  if (!width || !height || width * height > MAX_SOURCE_PIXELS)
    throw new Error(`${name}: please use an image under 60 megapixels.`);
  const preview = document.createElement("canvas");
  const scale = Math.min(1, 1600 / Math.max(width, height));
  preview.width = Math.max(1, Math.round(width * scale));
  preview.height = Math.max(1, Math.round(height * scale));
  const ctx = preview.getContext("2d");
  if (!ctx)
    throw new Error(
      "Your browser is low on memory. Try fewer or smaller photos.",
    );
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, preview.width, preview.height);
  return {
    id: crypto.randomUUID(),
    name,
    url,
    source,
    preview,
    width,
    height,
    sample,
  };
}
export async function loadPhoto(file: File): Promise<Photo> {
  if (!file.size) throw new Error(`${file.name}: this file is empty.`);
  if (file.size > MAX_FILE_BYTES)
    throw new Error(`${file.name}: the file exceeds 30 MB.`);
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!png && !jpg && !webp)
    throw new Error(`${file.name}: choose a JPG, PNG, or WEBP image.`);
  const url = URL.createObjectURL(file);
  try {
    const photo = await decodePhoto(url, file.name);
    photo.originalBlob = file;
    return photo;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
export function disposePhoto(photo: Photo) {
  if (photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
  photo.source.src = "";
  photo.preview.width = 1;
  photo.preview.height = 1;
}
export const SAMPLES = [
  { file: "lake", name: "Desert light.jpg" },
  { file: "mountains", name: "Earth from above.jpg" },
  { file: "coast", name: "Above the fjord.jpg" },
  { file: "forest", name: "A castle in the trees.jpg" },
  { file: "river", name: "The waterfall.jpg" },
];
