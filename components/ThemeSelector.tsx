"use client";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { collectionIcon } from "@/lib/uiIcons";
import { THEMES } from "@/lib/themeLayouts";
import { EMPTY_STICKERS } from "@/lib/stickers";
import { EMPTY_IMAGES } from "@/lib/extraImages";
import { ThemeCard } from "@/components/ThemeCard";
import type {
  CropPosition,
  CanvasTextLayer,
  Dimensions,
  Photo,
  PhotoLayers,
  StickerLayer,
  ThemeCustomization,
  ThemeId,
  ImageElement,
  LineLayer,
} from "@/types/collage";

export function ThemeSelector({
  photos,
  dimensions,
  cropPositions,
  customizations,
  textLayersByTheme,
  photoLayersByTheme,
  stickersByTheme,
  linesByTheme,
  selected,
  onSelect,
  imagesByTheme,
  templateOnly,
}: {
  photos: Photo[];
  dimensions: Dimensions;
  cropPositions: Record<string, CropPosition>;
  customizations: Record<ThemeId, ThemeCustomization>;
  textLayersByTheme: Record<ThemeId, CanvasTextLayer[]>;
  photoLayersByTheme: Partial<Record<ThemeId, PhotoLayers>>;
  stickersByTheme: Partial<Record<ThemeId, StickerLayer[]>>;
  linesByTheme: Partial<Record<ThemeId, LineLayer[]>>;
  selected: ThemeId;
  onSelect: (id: ThemeId) => void;
  imagesByTheme: Partial<Record<ThemeId, ImageElement[]>>;
  templateOnly: boolean;
}) {
  const [filter, setFilter] = useState("Tour");
  return (
    <section
      id="themes"
      className="theme-selector"
      aria-labelledby="theme-heading"
    >
      <div className="section-title">
        <div>
          <span className="eyebrow">01 / PICK A READY DESIGN</span>
          <h2 id="theme-heading">
            Choose a theme <span className="count-pill">{THEMES.length}</span>
          </h2>
        </div>
        <SlidersHorizontal size={16} className="muted" />
      </div>
      <p className="section-description">
        Choose a template. Make it your story.
      </p>
      <div className="theme-filters" aria-label="Filter themes">
        {["Tour", "Trip", "Grid", "Editorial", "Creative", "All themes"].map(
          (item) => {
            const Icon = collectionIcon(item);
            return (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
              >
                <Icon size={12} aria-hidden="true" /> {item}
              </button>
            );
          },
        )}
      </div>
      {filter === "Tour" && (
        <p className="trip-theme-tip">
          Five new blends. Start with your favourite scene, then add your
          memories. Every photo, soft edge, and title stays editable.
        </p>
      )}
      {filter === "Trip" && (
        <p className="trip-theme-tip">
          Nine ways to tell your trip. Your first photo is the cover; add your
          favourite moments around it. Select a photo → Adjust photo to align
          the image inside its frame. Every title is editable.
        </p>
      )}
      <div
        className="theme-scroll"
        tabIndex={0}
        aria-label="Scrollable theme gallery"
      >
        <div className="theme-grid">
          {THEMES.filter(
            (t) => filter === "All themes" || t.category === filter,
          ).map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              photos={
                templateOnly && imagesByTheme[theme.id]?.length ? [] : photos
              }
              images={imagesByTheme[theme.id] ?? EMPTY_IMAGES}
              dimensions={dimensions}
              cropPositions={cropPositions}
              customization={customizations[theme.id]}
              textLayers={textLayersByTheme[theme.id]}
              photoLayers={photoLayersByTheme[theme.id]}
              stickers={stickersByTheme[theme.id] ?? EMPTY_STICKERS}
              lines={linesByTheme[theme.id] ?? []}
              selected={selected === theme.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
      <div className="sidebar-tip">
        <span className="tip-spark">✧</span>
        <p>
          Ready-made layouts. Your photos.
          <br />
          <strong>Switch themes to find your favorite.</strong>
        </p>
      </div>
    </section>
  );
}
