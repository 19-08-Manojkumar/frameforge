import type {
  Dimensions,
  ImageElement,
  Photo,
  PhotoLayer,
} from "@/types/collage";

export const EMPTY_IMAGES: ImageElement[] = [];
export const MAX_EXTRA_IMAGES = 10;
export function defaultImageFrame(
  photo: Pick<Photo, "width" | "height">,
  size: Dimensions,
  zIndex: number,
): PhotoLayer {
  let width = 0.4,
    height = (width * size.width * photo.height) / photo.width / size.height;
  const fit = Math.min(1, 0.6 / height);
  width *= fit;
  height *= fit;
  return {
    x: 0.5 - width / 2,
    y: 0.5 - height / 2,
    width,
    height,
    zIndex,
    customShape: "rectangle",
  };
}
