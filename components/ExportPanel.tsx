"use client";
import {
  ArrowDownToLine,
  Check,
  CheckCheck,
  ChevronDown,
  Download,
  Square,
  LoaderCircle,
  LockKeyhole,
  Maximize2,
  Monitor,
  Smartphone,
  Info,
  Type,
  Scaling,
  FileImage,
} from "lucide-react";
import { PRESETS } from "@/lib/settings";
import type {
  CanvasTextLayer,
  Dimensions,
  ImageFormat,
  ThemeCustomization,
  ThemeId,
} from "@/types/collage";
import { ThemeColors } from "@/components/ThemeColors";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";

interface Props {
  preset: string;
  onPreset: (value: string) => void;
  custom: { width: string; height: string };
  onCustom: (field: "width" | "height", value: string) => void;
  dimensions: Dimensions;
  invalid: string | null;
  format: ImageFormat;
  onFormat: (value: ImageFormat) => void;
  quality: number;
  onQuality: (value: number) => void;
  busy: boolean;
  disabled: boolean;
  downloaded: boolean;
  onExport: () => void;
  textLayers: CanvasTextLayer[];
  onTextLayers: (layers: CanvasTextLayer[]) => void;
  theme: ThemeId;
  customization: ThemeCustomization;
  onCustomizationChange: (patch: Partial<ThemeCustomization>) => void;
}
export function ExportPanel({
  preset,
  onPreset,
  custom,
  onCustom,
  dimensions,
  invalid,
  format,
  onFormat,
  quality,
  onQuality,
  busy,
  disabled,
  downloaded,
  onExport,
  textLayers,
  onTextLayers,
  theme,
  customization,
  onCustomizationChange,
}: Props) {
  const selected = PRESETS.find((p) => p.id === preset)!;
  return (
    <aside
      className="export-panel"
      id="export"
      aria-labelledby="export-heading"
    >
      <div className="export-settings">
        <div className="section-title">
          <div>
            <span className="eyebrow">03 / READY TO POST</span>
            <h2 id="export-heading">Make it ready to share</h2>
          </div>
        </div>
        <p className="section-description">
          Your memories, in the perfect size.
        </p>
        <p className="session-notice">
          <Info size={12} />
          <span>
            <strong>Your draft stays on this device.</strong> Check its save
            status before leaving. Download to keep the finished image too.
          </span>
        </p>
        <ThemeColors
          theme={theme}
          customization={customization}
          onChange={onCustomizationChange}
          disabled={busy}
        />
        {!!textLayers.length && (
          <details className="template-copy">
            <summary>
              <Type size={13} aria-hidden="true" /> Edit template wording{" "}
              <span>Optional</span>
            </summary>
            <div>
              {textLayers.map((layer, index) => (
                <label key={layer.id}>
                  {index === 0 ? "Heading" : index === 1 ? "Title" : "Caption"}
                  <AutoGrowTextarea
                    aria-label={`Template wording ${index + 1}`}
                    rows={2}
                    maxLength={140}
                    value={layer.text}
                    disabled={busy}
                    onChange={(e) =>
                      onTextLayers(
                        textLayers.map((t) =>
                          t.id === layer.id
                            ? { ...t, text: e.target.value }
                            : t,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </details>
        )}
        <div className="export-block">
          <label className="field-label" htmlFor="canvas-size">
            <Scaling size={13} aria-hidden="true" /> Canvas size
          </label>
          <div className="select-wrap">
            <select
              id="canvas-size"
              disabled={busy}
              value={preset}
              onChange={(e) => onPreset(e.target.value)}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <div className="size-shortcuts">
            {[
              { id: "square", name: "Square", Icon: Square },
              { id: "story", name: "Story", Icon: Smartphone },
              { id: "landscape", name: "Wide", Icon: Monitor },
            ].map(({ id, name, Icon }) => (
              <button
                key={id}
                disabled={busy}
                className={preset === id ? "active" : ""}
                onClick={() => onPreset(id)}
                aria-pressed={preset === id}
              >
                <Icon size={17} strokeWidth={1.5} />
                <span>{name}</span>
              </button>
            ))}
          </div>
          <div className="dimensions-input">
            <label>
              Width
              <div>
                <input
                  type="number"
                  aria-label="Output width"
                  disabled={busy}
                  value={preset === "custom" ? custom.width : selected.width}
                  readOnly={preset !== "custom"}
                  min={320}
                  max={6000}
                  step={1}
                  onChange={(e) => onCustom("width", e.target.value)}
                />
                <span>px</span>
              </div>
            </label>
            <span className="dimension-x">×</span>
            <label>
              Height
              <div>
                <input
                  type="number"
                  aria-label="Output height"
                  disabled={busy}
                  value={preset === "custom" ? custom.height : selected.height}
                  readOnly={preset !== "custom"}
                  min={320}
                  max={6000}
                  step={1}
                  onChange={(e) => onCustom("height", e.target.value)}
                />
                <span>px</span>
              </div>
            </label>
          </div>
          {invalid ? (
            <p className="field-error" role="alert">
              {invalid}
            </p>
          ) : (
            <p className="field-hint">
              <Maximize2 size={11} />{" "}
              {preset === "custom" ? "Custom canvas" : selected.detail} ·{" "}
              {dimensions.width}:{dimensions.height}
            </p>
          )}
        </div>
        <div className="export-block">
          <span className="field-label">
            <FileImage size={13} aria-hidden="true" /> File format
          </span>
          <div className="format-options" aria-label="File format">
            {(["png", "jpeg", "webp"] as const).map((f) => (
              <button
                className={format === f ? "active" : ""}
                key={f}
                disabled={busy}
                onClick={() => onFormat(f)}
                aria-pressed={format === f}
              >
                <FileImage size={12} aria-hidden="true" />{" "}
                {f === "jpeg" ? "JPG" : f.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="field-hint">
            {format === "png"
              ? "Lossless quality. Perfect for every detail."
              : format === "jpeg"
                ? "A smaller file, ready to share anywhere."
                : "Great clarity with a lighter file size."}
          </p>
          {format !== "png" && (
            <label className="quality-control">
              Quality <strong>{Math.round(quality * 100)}%</strong>
              <input
                type="range"
                disabled={busy}
                min="60"
                max="100"
                value={Math.round(quality * 100)}
                onChange={(e) => onQuality(Number(e.target.value) / 100)}
                aria-label="Export quality"
              />
            </label>
          )}
        </div>
        <div className="quality-callout">
          <div className="quality-icon">
            <CheckCheck size={20} strokeWidth={1.5} />
          </div>
          <div>
            <strong>Made to look good.</strong>
            <p>
              Full resolution. No watermark.
              <br />
              Just your memories.
            </p>
          </div>
        </div>
      </div>
      <button
        className="button primary download-button"
        onClick={onExport}
        disabled={disabled || busy || !!invalid}
      >
        {busy ? (
          <LoaderCircle size={17} className="spin" />
        ) : downloaded ? (
          <Check size={18} />
        ) : (
          <Download size={17} />
        )}
        {busy
          ? "Creating your collage…"
          : downloaded
            ? "Download again"
            : "Download collage"}
        {!busy && <ArrowDownToLine size={14} className="download-end" />}
      </button>
      <p className="download-meta">
        {format === "jpeg" ? "JPG" : format.toUpperCase()} <span>·</span>{" "}
        {dimensions.width.toLocaleString()} ×{" "}
        {dimensions.height.toLocaleString()} px
      </p>
      <div className="privacy-note">
        <LockKeyhole size={14} />
        <p>
          Download → open your social app → post.
          <br />
          <span>Collage exports are made on your device.</span>
        </p>
      </div>
    </aside>
  );
}
