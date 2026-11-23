"use client";
import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ImagePlus,
  LoaderCircle,
  Sparkles,
  PencilLine,
  LayoutTemplate,
} from "lucide-react";
import { collectionIcon, outputIcon } from "@/lib/uiIcons";
import type {
  CanvasTextLayer,
  CropPosition,
  Dimensions,
  ImageElement,
  ImageFormat,
  Photo,
  PhotoLayers,
  ThemeCustomization,
  ThemeId,
} from "@/types/collage";
import { THEMES } from "@/lib/themeLayouts";
import { PRESETS } from "@/lib/settings";
import { EMPTY_IMAGES } from "@/lib/extraImages";
import { EMPTY_STICKERS } from "@/lib/stickers";
import {
  CAPTION_SUGGESTIONS,
  recommendedThemes,
  TRAVEL_COLLECTIONS,
  TRAVEL_TEMPLATES,
  type TravelCollection,
  type TravelDetails,
} from "@/lib/travelTemplates";
import type { StickerLayer } from "@/types/collage";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageGallery } from "@/components/ImageGallery";
import { ThemeCard } from "@/components/ThemeCard";
import { TravelDetailsForm } from "@/components/TravelDetailsForm";

export function QuickCreatePanel({
  step,
  onStep,
  photos,
  samplePhotos,
  busy,
  exporting,
  onFiles,
  onSamples,
  onRemove,
  onReorder,
  onClear,
  selected,
  onTheme,
  dimensions,
  preset,
  onPreset,
  format,
  onFormat,
  onExport,
  downloaded,
  collection,
  onCollection,
  trip,
  onTrip,
  customizations,
  textLayers,
  photoLayers,
  stickers,
  images,
  cropPositions,
  onCustomize,
}: {
  step: number;
  onStep: (step: number) => void;
  photos: Photo[];
  samplePhotos: Photo[];
  busy: boolean;
  exporting: boolean;
  onFiles: (files: File[]) => void;
  onSamples: () => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onClear: () => void;
  selected: ThemeId;
  onTheme: (id: ThemeId) => void;
  dimensions: Dimensions;
  preset: string;
  onPreset: (id: string) => void;
  format: ImageFormat;
  onFormat: (format: ImageFormat) => void;
  onExport: () => void;
  downloaded: boolean;
  collection: TravelCollection;
  onCollection: (collection: TravelCollection) => void;
  trip: TravelDetails;
  onTrip: (field: keyof TravelDetails, value: string) => void;
  customizations: Record<ThemeId, ThemeCustomization>;
  textLayers: Record<ThemeId, CanvasTextLayer[]>;
  photoLayers: Partial<Record<ThemeId, PhotoLayers>>;
  stickers: Partial<Record<ThemeId, StickerLayer[]>>;
  images: Partial<Record<ThemeId, ImageElement[]>>;
  cropPositions: Record<string, CropPosition>;
  onCustomize: () => void;
}) {
  const ready = photos.length > 0 || !!images[selected]?.length;
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [step]);
  const recommended = recommendedThemes(photos, collection);
  const designs =
    collection === "All designs"
      ? [
          ...recommended,
          ...THEMES.map((theme) => theme.id).filter(
            (id) => !recommended.includes(id),
          ),
        ]
      : recommended;
  const previewPhotos = photos.length ? photos : samplePhotos;
  const theme = THEMES.find((theme) => theme.id === selected)!;
  return (
    <aside className="quick-panel" aria-label="Quick Create controls">
      <div className="quick-panel-intro">
        <span className="eyebrow">
          <Sparkles size={12} aria-hidden="true" /> QUICK CREATE
        </span>
        <h1>
          {step === 1
            ? "Start with your moments."
            : step === 2
              ? "Find your favorite story."
              : "Ready for your next post."}
        </h1>
        <p>
          {step === 1
            ? "Add photos. Pick a design. Make it yours."
            : step === 2
              ? "Ready-made designs, filled with your photos."
              : "Choose a size. Download. Open your social app and post."}
        </p>
      </div>
      <div className="quick-panel-scroll" ref={scroll}>
        {step === 1 && (
          <>
            {photos.length ? (
              <ImageGallery
                photos={photos}
                selectedId={photos[0]?.id ?? null}
                onSelect={(id) => {
                  const index = photos.findIndex((photo) => photo.id === id);
                  if (index > 0) onReorder(index, 0);
                }}
                busy={busy}
                onFiles={onFiles}
                onRemove={onRemove}
                onReorder={onReorder}
                onClear={onClear}
              />
            ) : (
              <>
                <ImageUploader onFiles={onFiles} busy={busy} count={0} />
                <button
                  className="quick-sample-button"
                  disabled={busy}
                  onClick={onSamples}
                >
                  <Sparkles size={15} /> Try sample photos
                </button>
              </>
            )}
            <div className="quick-promise">
              <Check size={15} />
              <span>
                Original photos stay on this device. No account or watermark.
              </span>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="quick-photo-summary">
              <ImagePlus size={16} />
              <span>{photos.length} photos added</span>
              <button disabled={busy} onClick={() => onStep(1)}>
                <PencilLine size={12} aria-hidden="true" /> Manage photos
              </button>
            </div>
            <div
              className="quick-collections"
              role="group"
              aria-label="Travel collections"
            >
              {TRAVEL_COLLECTIONS.map((item) => {
                const Icon = collectionIcon(item);
                return (
                  <button
                    key={item}
                    disabled={busy}
                    aria-pressed={collection === item}
                    onClick={() => onCollection(item)}
                  >
                    <Icon size={13} aria-hidden="true" /> {item}
                  </button>
                );
              })}
            </div>
            <p className="quick-recommendation">
              {collection === "Recommended"
                ? `Recommended for ${photos.length || 5} photos`
                : collection === "All designs"
                  ? "Every design, ready to make your own"
                  : `${collection} collection`}
            </p>
            <TravelDetailsForm
              theme={selected}
              details={trip}
              collection={collection}
              disabled={busy}
              onChange={onTrip}
            />
            <div
              className="quick-theme-gallery"
              aria-label="Recommended designs"
            >
              {designs.map((id, index) => (
                <div className="quick-theme-choice" key={id}>
                  <ThemeCard
                    theme={THEMES.find((theme) => theme.id === id)!}
                    photos={
                      !photos.length && images[id]?.length ? [] : previewPhotos
                    }
                    images={images[id] ?? EMPTY_IMAGES}
                    dimensions={dimensions}
                    cropPositions={cropPositions}
                    customization={customizations[id]}
                    textLayers={textLayers[id]}
                    photoLayers={photoLayers[id]}
                    stickers={stickers[id] ?? EMPTY_STICKERS}
                    selected={selected === id}
                    onSelect={onTheme}
                  />
                  {index === 0 && collection === "Recommended" && (
                    <span className="quick-best-fit">Great fit</span>
                  )}
                </div>
              ))}
            </div>
            {TRAVEL_TEMPLATES[selected] && (
              <p className="quick-design-hint">
                {TRAVEL_TEMPLATES[selected]!.hint}
              </p>
            )}
            <button
              className="quick-customize-link"
              disabled={busy}
              onClick={onCustomize}
            >
              Want to move photos, add stickers, or change colors? Customize{" "}
              <ArrowRight size={13} />
            </button>
          </>
        )}
        {step === 3 && (
          <>
            <div className="quick-chosen-design">
              <span>Your design</span>
              <strong>{theme.name}</strong>
              <button disabled={busy} onClick={() => onStep(2)}>
                <LayoutTemplate size={12} aria-hidden="true" /> Change
              </button>
            </div>
            <fieldset className="quick-output-sizes">
              <legend>Where are you posting?</legend>
              {PRESETS.filter((size) => size.id !== "custom").map((size) => {
                const Icon = outputIcon(size.id);
                return (
                  <button
                    key={size.id}
                    type="button"
                    disabled={busy}
                    aria-pressed={preset === size.id}
                    onClick={() => onPreset(size.id)}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span>{size.name}</span>
                    <small>
                      {size.width} × {size.height}
                    </small>
                    {preset === size.id && <Check size={15} />}
                  </button>
                );
              })}
            </fieldset>
            {preset === "custom" && (
              <p className="quick-design-hint">
                Your custom size is kept: {dimensions.width} ×{" "}
                {dimensions.height} px.
              </p>
            )}
            <label className="quick-format-label">
              Image format
              <select
                aria-label="Quick export format"
                disabled={busy}
                value={format}
                onChange={(e) => onFormat(e.target.value as ImageFormat)}
              >
                <option value="png">PNG · best clarity</option>
                <option value="jpeg">JPG · smaller file</option>
                <option value="webp">WEBP · compact image</option>
              </select>
            </label>
            <TravelDetailsForm
              theme={selected}
              details={trip}
              collection={collection}
              disabled={busy}
              onChange={onTrip}
            />
            {downloaded && (
              <div className="quick-export-success" role="status">
                <Check size={19} />
                <div>
                  <strong>Your collage is ready.</strong>
                  <p>
                    Open your social app and choose the downloaded image. Your
                    editable draft stays on this device.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="quick-panel-actions">
        {step > 1 && (
          <button
            className="quick-back"
            disabled={busy}
            onClick={() => onStep(step - 1)}
            aria-label="Previous Quick Create step"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        {step < 3 ? (
          <button
            className="button primary quick-primary"
            disabled={busy || !ready}
            onClick={() => onStep(step + 1)}
          >
            {step === 1 ? "Choose a design" : "Choose size & download"}
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="button primary quick-primary"
            disabled={busy || !ready}
            onClick={onExport}
          >
            {exporting ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Download size={17} />
            )}
            {exporting
              ? "Preparing your collage…"
              : downloaded
                ? "Download again"
                : "Download collage"}
          </button>
        )}
      </div>
    </aside>
  );
}
