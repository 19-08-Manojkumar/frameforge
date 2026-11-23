"use client";
import { useEffect, useState } from "react";
import {
  Crop,
  Move,
  RotateCcw,
  RotateCw,
  Trash2,
  ImagePlus,
  X,
  WandSparkles,
} from "lucide-react";
import type {
  CropPosition,
  Photo,
  PhotoLayer,
  PhotoShape,
} from "@/types/collage";
import { PhotoAdjustments } from "@/components/PhotoAdjustments";

function SizeField({
  name,
  value,
  disabled,
  onChange,
}: {
  name: "width" | "height";
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(value * 100)));
  useEffect(() => setDraft(String(Math.round(value * 100))), [value]);
  return (
    <label>
      {name === "width" ? "W" : "H"}
      <input
        aria-label={`Photo ${name} percent`}
        type="number"
        min="4"
        max="100"
        step="1"
        disabled={disabled}
        value={draft}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const number = Number(text);
          if (text && number >= 4 && number <= 100) onChange(number / 100);
        }}
        onBlur={() => setDraft(String(Math.round(value * 100)))}
      />
      <span>%</span>
    </label>
  );
}

export function PhotoControls({
  photo,
  photos,
  layer,
  mode,
  disabled,
  onMode,
  onUpdate,
  onShape,
  onReset,
  layerControl,
  onSelect,
  onRemove,
  onReplace,
  onAIEdit,
  crop,
  onCrop,
}: {
  photo: Photo;
  photos: Photo[];
  layer: PhotoLayer;
  mode: "move" | "crop";
  disabled: boolean;
  onMode: (mode: "move" | "crop") => void;
  onUpdate: (patch: Partial<PhotoLayer>) => void;
  onShape: (shape: PhotoShape) => void;
  onReset: () => void;
  layerControl: React.ReactNode;
  onSelect: (id: string | null) => void;
  onRemove: () => void;
  onReplace: () => void;
  onAIEdit?: () => void;
  crop: CropPosition;
  onCrop: (patch: Partial<CropPosition>) => void;
}) {
  return (
    <div className="photo-controls" aria-label="Selected photo controls">
      <div className="photo-controls-row photo-controls-primary">
        <select
          aria-label="Selected photo"
          value={photo.id}
          disabled={disabled}
          onChange={(event) => onSelect(event.target.value)}
        >
          {photos.map((photo, index) => (
            <option key={photo.id} value={photo.id}>
              {index + 1}. {photo.name}
            </option>
          ))}
        </select>
        <div
          className="photo-mode"
          role="group"
          aria-label="Photo drag behavior"
        >
          <button
            aria-pressed={mode === "move"}
            disabled={disabled}
            onClick={() => onMode("move")}
          >
            <Move size={13} /> Move frame
          </button>
          <button
            aria-pressed={mode === "crop"}
            disabled={disabled}
            onClick={() => onMode("crop")}
          >
            <Crop size={13} /> Adjust photo
          </button>
        </div>
        {layerControl}
        {onAIEdit && (
          <button
            aria-label="Edit photo with AI"
            disabled={disabled}
            onClick={onAIEdit}
          >
            <WandSparkles size={13} /> AI edit
          </button>
        )}
        <button aria-label="Deselect photo" onClick={() => onSelect(null)}>
          <X size={13} />
        </button>
      </div>
      {mode === "crop" ? (
        <PhotoAdjustments crop={crop} disabled={disabled} onChange={onCrop} />
      ) : (
        <>
          <div className="photo-controls-row">
            <select
              aria-label="Photo shape"
              value={layer.customShape ?? "template"}
              disabled={disabled}
              onChange={(e) => onShape(e.target.value as PhotoShape)}
            >
              <option value="template">Original shape</option>
              <option value="rectangle">Rectangle</option>
              <option value="rounded">Rounded</option>
              <option value="circle">Circle</option>
              <option value="diamond">Diamond</option>
              <option value="arch">Arch</option>
            </select>
            <SizeField
              name="width"
              value={layer.width}
              disabled={disabled}
              onChange={(width) => onUpdate({ width })}
            />
            <SizeField
              name="height"
              value={layer.height}
              disabled={disabled}
              onChange={(height) => onUpdate({ height })}
            />
            <button
              aria-label="Rotate photo left"
              title="Rotate left 15°"
              disabled={disabled}
              onClick={() =>
                onUpdate({ rotation: (layer.rotation ?? 0) - Math.PI / 12 })
              }
            >
              <RotateCcw size={13} />
            </button>
            <button
              aria-label="Rotate photo right"
              title="Rotate right 15°"
              disabled={disabled}
              onClick={() =>
                onUpdate({ rotation: (layer.rotation ?? 0) + Math.PI / 12 })
              }
            >
              <RotateCw size={13} />
            </button>
            <button disabled={disabled} onClick={onReplace}>
              <ImagePlus size={13} /> Replace
            </button>
            <button
              aria-label="Remove selected photo"
              title="Remove photo"
              disabled={disabled}
              onClick={onRemove}
            >
              <Trash2 size={13} />
            </button>
            <button
              aria-label="Reset selected photo"
              title="Restore photo to the theme"
              disabled={disabled}
              onClick={onReset}
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
          </div>
          <details className="photo-effects">
            <summary>Opacity & soft edges</summary>
            <div className="photo-controls-row">
              <label>
                Edge blend
                <select
                  aria-label="Photo edge blend"
                  value={layer.blendMask?.kind ?? "standard"}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdate({
                      blendMask:
                        event.target.value === "standard"
                          ? undefined
                          : {
                              kind: event.target.value as NonNullable<
                                PhotoLayer["blendMask"]
                              >["kind"],
                              softness: layer.blendMask?.softness ?? 0.24,
                            },
                    })
                  }
                >
                  <option value="standard">Soft edges</option>
                  <option value="oval">Cloud fade</option>
                  <option value="diagonal">Diagonal dissolve</option>
                  <option value="wave">Wave dissolve</option>
                  <option value="bloom">Organic dissolve</option>
                </select>
              </label>
              {layer.blendMask && (
                <label>
                  Blend softness
                  <input
                    aria-label="Photo blend softness"
                    type="range"
                    min="4"
                    max="50"
                    value={Math.round(layer.blendMask.softness * 100)}
                    disabled={disabled}
                    onChange={(event) =>
                      onUpdate({
                        blendMask: {
                          ...layer.blendMask!,
                          softness: Number(event.target.value) / 100,
                        },
                      })
                    }
                  />
                  <span>{Math.round(layer.blendMask.softness * 100)}%</span>
                </label>
              )}
              <label>
                Opacity{" "}
                <input
                  aria-label="Photo opacity"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((layer.opacity ?? 1) * 100)}
                  disabled={disabled}
                  onChange={(e) =>
                    onUpdate({ opacity: Number(e.target.value) / 100 })
                  }
                />
                <span>{Math.round((layer.opacity ?? 1) * 100)}%</span>
              </label>
              <label>
                Soft edge{" "}
                <input
                  aria-label="Photo soft edge"
                  type="range"
                  min="0"
                  max="50"
                  value={Math.round((layer.feather ?? 0) * 100)}
                  disabled={disabled}
                  onChange={(e) =>
                    onUpdate({
                      feather: Number(e.target.value) / 100,
                      fadeEdges: undefined,
                    })
                  }
                />
                <span>{Math.round((layer.feather ?? 0) * 100)}%</span>
              </label>
              <select
                aria-label="Photo blend mode"
                value={layer.blendMode ?? "source-over"}
                disabled={disabled}
                onChange={(e) =>
                  onUpdate({
                    blendMode: e.target.value as PhotoLayer["blendMode"],
                  })
                }
              >
                <option value="source-over">Normal blend</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="soft-light">Soft light</option>
              </select>
            </div>
          </details>
        </>
      )}
      <p id="photo-drag-help">
        {mode === "move"
          ? "Drag to move · drag handles to resize · Shift keeps the ratio"
          : "Frame locked. Drag the photo inside it. Zoom in for more room to adjust."}
      </p>
    </div>
  );
}
