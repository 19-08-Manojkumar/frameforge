"use client";
import { memo, useEffect, useRef } from "react";
import { Check, LayoutGrid } from "lucide-react";
import { renderCollage } from "@/lib/collageRenderer";
import { ensureTextFonts } from "@/lib/fonts";
import { isBlendedTour } from "@/lib/blendedTourLayouts";
import { TOUR_BLEND_LABELS } from "@/lib/blendedTourThemes";
import { ensureStickerAssets } from "@/lib/flagEmoji";
import type {
  CropPosition,
  CanvasTextLayer,
  Dimensions,
  Photo,
  PhotoLayers,
  StickerLayer,
  Theme,
  ThemeCustomization,
  ImageElement,
  LineLayer,
} from "@/types/collage";

interface Props {
  theme: Theme;
  photos: Photo[];
  dimensions: Dimensions;
  cropPositions: Record<string, CropPosition>;
  customization: ThemeCustomization;
  textLayers: CanvasTextLayer[];
  photoLayers?: PhotoLayers;
  stickers: StickerLayer[];
  lines?: LineLayer[];
  selected: boolean;
  onSelect: (id: Theme["id"]) => void;
  images: ImageElement[];
}
export const ThemeCard = memo(function ThemeCard({
  theme,
  photos,
  dimensions,
  cropPositions,
  customization,
  textLayers,
  photoLayers,
  stickers,
  lines = [],
  selected,
  onSelect,
  images,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(async () => {
      try {
        await Promise.all([
          ensureTextFonts(textLayers),
          ensureStickerAssets(stickers),
        ]);
        if (cancelled) return;
        if (ref.current && (photos.length || images.length))
          renderCollage(
            ref.current,
            {
              ...dimensions,
              photos,
              theme: theme.id,
              preview: true,
              cropPositions,
              customization,
              textLayers,
              photoLayers,
              stickers,
              lines,
              images,
            },
            Math.min(260, (260 * dimensions.width) / dimensions.height),
          );
      } catch {
        ref.current
          ?.getContext("2d")
          ?.clearRect(0, 0, ref.current.width, ref.current.height);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [
    photos,
    dimensions,
    theme.id,
    cropPositions,
    customization,
    textLayers,
    photoLayers,
    stickers,
    lines,
    images,
  ]);
  return (
    <button
      className={`theme-card ${selected ? "selected" : ""}`}
      onClick={() => onSelect(theme.id)}
      aria-pressed={selected}
      aria-label={`Select ${theme.name}`}
    >
      <div className={`theme-art theme-${theme.id}`}>
        {photos.length || images.length ? (
          <canvas ref={ref} aria-hidden="true" />
        ) : (
          <div className="empty-theme">
            <LayoutGrid size={24} strokeWidth={1} />
            <span>Add your photos</span>
          </div>
        )}
        {selected && (
          <span className="theme-check">
            <Check size={11} strokeWidth={3} />
          </span>
        )}
        {isBlendedTour(theme.id) &&
          (photos.length > 0 || images.length > 0) && (
            <span className="theme-blend-label">
              {TOUR_BLEND_LABELS[theme.id]}
            </span>
          )}
      </div>
      <span className="theme-name">{theme.name}</span>
    </button>
  );
});
