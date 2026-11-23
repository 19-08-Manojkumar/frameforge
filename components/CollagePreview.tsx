"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { previewDock, previewFit } from "@/lib/previewLayout";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Expand,
  Shrink,
  Italic,
  ArrowDown,
  ArrowUp,
  Layers,
  Image,
  LoaderCircle,
  Minus,
  Plus,
  RotateCcw,
  Scan,
  Trash2,
  Type,
  Sticker as StickerSymbol,
  Waves,
  Images,
  ImagePlus,
  SlidersHorizontal,
  Sparkles,
  Spline,
  WandSparkles,
} from "lucide-react";
import { ToolbarSelect } from "@/components/ToolbarSelect";
import type {
  CanvasTextLayer,
  CropPosition,
  Dimensions,
  Photo,
  PhotoLayers,
  ImageElement,
  StickerLayer,
  StickerStyle,
  LineLayer,
  Theme,
  ThemeCustomization,
} from "@/types/collage";
import { renderCollage } from "@/lib/collageRenderer";
import { normalizeSlot } from "@/lib/photoEditing";
import { usePhotoEditing } from "@/components/usePhotoEditing";
import { PhotoControls } from "@/components/PhotoControls";
import { InlineTextEditor } from "@/components/InlineTextEditor";
import { CUSTOMIZABLE_THEMES } from "@/lib/themeCustomization";
import { textBoxLayout } from "@/lib/textLayout";
import { useTextBoxEditing } from "@/components/useTextBoxEditing";
import { TextBoxControls } from "@/components/TextBoxControls";
import { FONT_OPTIONS, ensureTextFonts } from "@/lib/fonts";
import { STICKERS, constrainSticker, stickerName } from "@/lib/stickers";
import { StickerLibrary } from "@/components/StickerLibrary";
import { StickerControls } from "@/components/StickerControls";
import { StickerOverlays } from "@/components/StickerOverlays";
import { LineControls, LineOverlay } from "@/components/LineOverlay";
import { LINE_EFFECTS } from "@/lib/lineCatalog";
import { noteTextPlacement } from "@/lib/noteText";
import { ensureStickerAssets } from "@/lib/flagEmoji";
import { LayerCycleButton } from "@/components/LayerCycleButton";
import { defaultImageFrame } from "@/lib/extraImages";
import {
  frontLayerOrder,
  nextLayerOrder,
  orderedLayers,
  layerPosition,
  type LayerMove,
} from "@/lib/layerOrder";

export function CollagePreview({
  photos,
  dimensions,
  theme,
  busy,
  cropPositions,
  onCropPositions,
  customization,
  onCustomizationChange,
  textLayers,
  onTextLayers,
  templateOnly = false,
  focusMode,
  onFocusMode,
  photoLayers,
  onPhotoLayers,
  selectedPhotoId,
  onSelectPhoto,
  onRemovePhoto,
  onReplacePhoto,
  onAddPhotos,
  stickers,
  onStickers,
  lines,
  onLines,
  images,
  onImages,
  onAddImage,
  onRemoveImage,
  onReplaceImage,
  quick = false,
  onCustomize,
  onOpenAI,
}: {
  photos: Photo[];
  dimensions: Dimensions;
  theme: Theme;
  busy: boolean;
  cropPositions: Record<string, CropPosition>;
  onCropPositions: (next: Record<string, CropPosition>) => void;
  customization: ThemeCustomization;
  onCustomizationChange: (patch: Partial<ThemeCustomization>) => void;
  textLayers: CanvasTextLayer[];
  onTextLayers: (next: CanvasTextLayer[]) => void;
  templateOnly?: boolean;
  focusMode: boolean;
  onFocusMode: () => void;
  photoLayers: PhotoLayers;
  onPhotoLayers: (layers: PhotoLayers) => void;
  selectedPhotoId: string | null;
  onSelectPhoto: (id: string | null) => void;
  onRemovePhoto: (id: string) => void;
  onReplacePhoto: (id: string, file: File) => Promise<void>;
  onAddPhotos: () => void;
  stickers: StickerLayer[];
  onStickers: (layers: StickerLayer[]) => void;
  lines: LineLayer[];
  onLines: (layers: LineLayer[]) => void;
  images: ImageElement[];
  onImages: (images: ImageElement[]) => void;
  onAddImage: () => void;
  onRemoveImage: (id: string) => void;
  onReplaceImage: (id: string, file: File) => Promise<void>;
  quick?: boolean;
  onCustomize?: () => void;
  onOpenAI?: (photoId?: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    workspace = useRef<HTMLDivElement>(null),
    stage = useRef<HTMLDivElement>(null),
    panel = useRef<HTMLElement>(null),
    expandButton = useRef<HTMLButtonElement>(null),
    replaceInput = useRef<HTMLInputElement>(null),
    replacingId = useRef<string | null>(null);
  const initializeCanvas = useCallback((element: HTMLCanvasElement | null) => {
    canvas.current = element;
    // Text measurements can run before the first paint. Always create the
    // same opaque context used by export to keep font rasterization stable.
    element?.getContext("2d", { alpha: false });
  }, []);
  const replacingExtra = useRef(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const previousImages = useRef({
    theme: theme.id,
    ids: images.map((image) => image.photo.id),
  });
  useEffect(() => {
    const previous = previousImages.current;
    const added = images
      .filter((image) => !previous.ids.includes(image.photo.id))
      .at(-1);
    previousImages.current = {
      theme: theme.id,
      ids: images.map((image) => image.photo.id),
    };
    if (added && previous.theme === theme.id) {
      setSelectedImageId(added.photo.id);
      onSelectPhoto(null);
      setSelectedTextId(null);
      setEditingTextId(null);
      setSelectedStickerId(null);
      setSelectedLineId(null);
    }
  }, [images, theme.id]);
  const hasCanvas = !!(photos.length || images.length);
  const [error, setError] = useState(""),
    [zoom, setZoom] = useState(1),
    [expanded, setExpanded] = useState(false),
    [selectedTextId, setSelectedTextId] = useState<string | null>(null),
    [editingTextId, setEditingTextId] = useState<string | null>(null),
    [stagePixelWidth, setStagePixelWidth] = useState(450);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryStyle, setLibraryStyle] = useState<StickerStyle>("classic");
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(
    null,
  );
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [, setFontRevision] = useState(0);
  const closeLibrary = useCallback(() => {
    setLibraryOpen(false);
  }, []);
  const [available, setAvailable] = useState({ width: 450, height: 450 });
  const [panelSize, setPanelSize] = useState({
    width: 0,
    height: 0,
    desktop: false,
  });
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const measure = () =>
      setPanelSize({
        width: el.clientWidth,
        height: el.clientHeight,
        desktop: window.innerWidth > 900,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const dockWidth = previewDock(
    panelSize.width,
    panelSize.height,
    dimensions.width / dimensions.height,
    panelSize.desktop,
  );
  const fitWidth = previewFit(
    available.width,
    available.height,
    dimensions.width / dimensions.height,
    zoom,
  );
  useEffect(() => {
    if (quick) {
      setZoom(1);
      setExpanded(false);
      setEditingTextId(null);
    }
  }, [quick]);
  useEffect(() => {
    if (!editingTextId) return;
    const finishOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.closest(
          "[data-inline-text-editor], [data-text-control], .text-style-toolbar",
        )
      ) {
        setEditingTextId(null);
      }
    };
    document.addEventListener("pointerdown", finishOutside, true);
    return () =>
      document.removeEventListener("pointerdown", finishOutside, true);
  }, [editingTextId]);
  const layerStack = orderedLayers(
    photos,
    photoLayers,
    textLayers,
    stickers,
    images,
  );
  const overlayOrder = new Map(
    layerStack.map((l, i) => [`${l.kind}:${l.id}`, i + 1]),
  );
  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(async () => {
      try {
        const fontsChanged = await ensureTextFonts(textLayers);
        await ensureStickerAssets(stickers);
        if (cancelled) return;
        if (fontsChanged) setFontRevision((n) => n + 1);
        if (canvas.current && hasCanvas)
          renderCollage(
            canvas.current,
            {
              ...dimensions,
              photos,
              theme: theme.id,
              preview: true,
              cropPositions,
              photoLayers,
              stickers,
              lines,
              images,
              customization,
              textLayers,
              hiddenTextId: editingTextId,
            },
            Math.min(1600, (1600 * dimensions.width) / dimensions.height),
          );
        setError("");
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "The preview could not be drawn.",
        );
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
    toolsOpen,
    editingTextId,
    photoLayers,
    stickers,
    lines,
    images,
  ]);
  useEffect(() => {
    setSelectedTextId(null);
    setEditingTextId(null);
    setToolsOpen(false);
    setSelectedStickerId(null);
    setSelectedLineId(null);
    setLibraryOpen(false);
    setSelectedImageId(null);
  }, [theme.id]);
  useEffect(() => {
    if (selectedPhotoId) {
      setSelectedImageId(null);
      setSelectedStickerId(null);
      setSelectedLineId(null);
      setSelectedTextId(null);
      setEditingTextId(null);
    }
  }, [selectedPhotoId, photos]);
  useEffect(() => {
    const el = workspace.current;
    if (!el) return;
    const resize = () => {
      const style = getComputedStyle(el);
      setAvailable({
        width:
          el.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight),
        height:
          el.clientHeight -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom),
      });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);
  const themeEditor = usePhotoEditing({
    photos,
    dimensions,
    theme: theme.id,
    layers: photoLayers,
    onLayers: onPhotoLayers,
    selectedId: selectedPhotoId,
    onSelect: (id) => {
      onSelectPhoto(id);
      setSelectedImageId(null);
      setSelectedStickerId(null);
      setSelectedLineId(null);
      setSelectedTextId(null);
      setEditingTextId(null);
    },
    cropPositions,
    onCropPositions,
    stage,
    disabled: busy || templateOnly || quick,
  });
  const imagePhotos = images.map((image) => image.photo);
  const imageFrames = Object.fromEntries(
    images.map((image) => [image.photo.id, image.frame]),
  );
  const imageEditor = usePhotoEditing({
    photos: imagePhotos,
    dimensions,
    theme: "clean-grid",
    layers: imageFrames,
    onLayers: (frames) =>
      onImages(
        images.map((image) => ({
          ...image,
          frame: frames[image.photo.id] ?? image.frame,
        })),
      ),
    selectedId: selectedImageId,
    onSelect: (id) => {
      setSelectedImageId(id);
      onSelectPhoto(null);
      setSelectedStickerId(null);
      setSelectedLineId(null);
      setSelectedTextId(null);
      setEditingTextId(null);
    },
    cropPositions: Object.fromEntries(
      images.map((image) => [image.photo.id, image.crop]),
    ),
    onCropPositions: (positions) =>
      onImages(
        images.map((image) => ({
          ...image,
          crop: positions[image.photo.id] ?? image.crop,
        })),
      ),
    stage,
    disabled: busy || quick,
    resetLayer: (photo) =>
      defaultImageFrame(
        photo,
        dimensions,
        imageFrames[photo.id]?.zIndex ?? 2000,
      ),
  });
  const editor = selectedImageId ? imageEditor : themeEditor;
  const selectedKind = selectedImageId ? "image" : "photo";
  const removeActiveImage = () => {
    if (selectedImageId) {
      onRemoveImage(selectedImageId);
      setSelectedImageId(null);
    } else if (selectedPhotoId) onRemovePhoto(selectedPhotoId);
  };
  const updateTextLayer = (id: string, patch: Partial<CanvasTextLayer>) => {
    onTextLayers(
      textLayers.map((layer) =>
        layer.id === id ? { ...layer, ...patch } : layer,
      ),
    );
  };
  const textBoxEditor = useTextBoxEditing({
    stage,
    canvas,
    dimensions,
    disabled: busy,
    onChange: updateTextLayer,
    onSelect: (id, keepEditing) => {
      setSelectedImageId(null);
      onSelectPhoto(null);
      setSelectedStickerId(null);
      setSelectedLineId(null);
      setSelectedTextId(id);
      setEditingTextId(keepEditing ? id : null);
    },
  });
  const suppressTextClick = textBoxEditor.suppressClick;
  const addText = () => {
    setSelectedImageId(null);
    setSelectedStickerId(null);
    setSelectedLineId(null);
    onSelectPhoto(null);
    setToolsOpen(true);
    const id = `text-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
    const nextLayer: CanvasTextLayer = {
      id,
      zIndex: frontLayerOrder(layerStack),
      text: "Your text",
      width: 0.55,
      x: 0.5,
      y: 0.5,
      size: 0.055,
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
      bold: true,
      italic: false,
      align: "center",
      background: false,
      backgroundColor: "#233a32",
      ...(selectedSticker
        ? noteTextPlacement(selectedSticker, dimensions)
        : null),
    };
    onTextLayers([...textLayers, nextLayer]);
    setSelectedTextId(id);
    setEditingTextId(id);
  };
  const beginTextDrag = (
    event: React.PointerEvent<HTMLElement>,
    layer: CanvasTextLayer,
  ) => {
    if (editingTextId !== layer.id)
      textBoxEditor.begin(event, layer, false, false);
  };
  const removeSelectedText = () => {
    if (!selectedTextId) return;
    const currentIndex = textLayers.findIndex(
      (layer) => layer.id === selectedTextId,
    );
    const next = textLayers.filter((layer) => layer.id !== selectedTextId);
    onTextLayers(next);
    setSelectedTextId(
      next[Math.min(currentIndex, next.length - 1)]?.id ?? null,
    );
    setEditingTextId(null);
  };
  const selectedText = textLayers.find((layer) => layer.id === selectedTextId);
  const selectedTextBox = selectedText
    ? textBoxLayout(
        selectedText,
        dimensions,
        canvas.current?.getContext("2d", { alpha: false }),
      )
    : null;
  const textLayerIndex = layerStack.findIndex(
    (l) => l.kind === "text" && l.id === selectedTextId,
  );
  const moveTextLayer = (move: LayerMove) => {
    if (!selectedText || busy) return;
    setEditingTextId(null);
    updateTextLayer(selectedText.id, {
      zIndex: nextLayerOrder(layerStack, "text", selectedText.id, move),
    });
  };
  const selectedSticker = stickers.find(
    (layer) => layer.id === selectedStickerId,
  );
  const selectedLine = lines.find((line) => line.id === selectedLineId);
  const selectSticker = (id: string | null) => {
    setSelectedImageId(null);
    setSelectedStickerId(id);
    setSelectedLineId(null);
    onSelectPhoto(null);
    setSelectedTextId(null);
    setEditingTextId(null);
  };
  const updateSticker = (patch: Partial<StickerLayer>) => {
    if (!selectedSticker || busy) return;
    onStickers(
      stickers.map((s) =>
        s.id === selectedSticker.id
          ? constrainSticker({ ...s, ...patch }, dimensions)
          : s,
      ),
    );
  };
  const addSticker = (kind: StickerLayer["kind"], emoji?: string) => {
    if (busy || stickers.length >= 50) return;
    const definition = STICKERS.find((s) => s.id === kind);
    const layer: StickerLayer = {
      id: `sticker-${crypto.randomUUID()}`,
      zIndex: frontLayerOrder(layerStack),
      kind,
      style: kind === "emoji" ? undefined : libraryStyle,
      emoji,
      x: 0.5,
      y: 0.5,
      size: definition?.defaultSize ?? 0.18,
      rotation: 0,
      color: definition?.color ?? "#e46c76",
      secondaryColor: definition?.secondary ?? "#fff1b5",
      opacity: 1,
      flipped: false,
      outline: definition?.defaultOutline ?? true,
    };
    onStickers([...stickers, layer]);
    selectSticker(layer.id);
    setLibraryOpen(false);
  };
  const addLine = (preset: Omit<LineLayer, "id">) => {
    if (busy || lines.length >= 30) return;
    const line: LineLayer = { ...preset, id: `line-${crypto.randomUUID()}` };
    onLines([...lines, line]);
    setSelectedLineId(line.id);
    setSelectedStickerId(null);
    setSelectedTextId(null);
    setSelectedImageId(null);
    onSelectPhoto(null);
    setLibraryOpen(false);
  };
  const updateLine = (patch: Partial<LineLayer>) => {
    if (!selectedLine || busy) return;
    onLines(
      lines.map((line) =>
        line.id === selectedLine.id ? { ...line, ...patch } : line,
      ),
    );
  };
  const textScale =
    (stagePixelWidth / dimensions.width) *
    Math.min(dimensions.width, dimensions.height);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const updateWidth = () => setStagePixelWidth(element.clientWidth || 450);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [photos.length, expanded]);
  useEffect(() => {
    if (!expanded) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    expandButton.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        (event.target as HTMLElement)?.closest("dialog")
      )
        return;
      if (event.key === "Escape") setExpanded(false);
      if (event.key === "Tab") {
        const buttons = Array.from(
          panel.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) || [],
        );
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
      previousFocus?.focus();
    };
  }, [expanded]);
  const toolDock = (
    <div className="preview-tool-dock" data-customizing={toolsOpen}>
      <div className="preview-tools">
        <div className="toolbar-heading">
          <span>
            <Sparkles size={15} aria-hidden="true" />
          </span>
          Creative tools
        </div>
        {quick && (
          <button
            className="preview-tool-button quick-customize"
            disabled={busy}
            onClick={onCustomize}
          >
            <SlidersHorizontal size={14} aria-hidden="true" /> Customize
          </button>
        )}
        <button
          className="preview-tool-button focus-toggle"
          aria-pressed={focusMode}
          title={
            focusMode
              ? "Restore templates and export panels"
              : "Hide templates and export panels"
          }
          onClick={onFocusMode}
        >
          <Scan size={14} />
          {focusMode ? "Show panels" : "Focus preview"}
        </button>
        <button
          className="preview-tool-button customize-toggle"
          aria-pressed={toolsOpen}
          onClick={() => setToolsOpen(!toolsOpen)}
        >
          <SlidersHorizontal size={14} aria-hidden="true" /> Customize
        </button>
        <button
          className="preview-tool-button add-text-tool"
          disabled={!hasCanvas || busy}
          onClick={addText}
        >
          <Type size={14} /> Add text
        </button>
        <button
          className="preview-tool-button add-image-tool"
          disabled={busy || images.length >= 10}
          onClick={onAddImage}
          title="Add a separate image without changing the template photos"
        >
          <ImagePlus size={14} aria-hidden="true" /> Add image
        </button>
        {onOpenAI && (
          <button
            className="preview-tool-button ai-images-tool"
            disabled={busy}
            onClick={() => onOpenAI()}
          >
            <WandSparkles size={14} aria-hidden="true" /> AI Studio
          </button>
        )}
        {!!images.length && (
          <ToolbarSelect icon={Images}>
            <select
              className="text-layer-menu"
              aria-label="Select added image"
              title="Select an independent image"
              value={selectedImageId ?? ""}
              disabled={busy}
              onChange={(e) => {
                setSelectedImageId(e.target.value || null);
                onSelectPhoto(null);
                setSelectedTextId(null);
                setEditingTextId(null);
                setSelectedStickerId(null);
              }}
            >
              <option value="">Added images ({images.length})</option>
              {images.map((image, i) => (
                <option key={image.photo.id} value={image.photo.id}>
                  Added {i + 1}. {image.photo.name}
                </option>
              ))}
            </select>
          </ToolbarSelect>
        )}
        <button
          className="preview-tool-button add-photos-tool"
          aria-label="Add photos to collage"
          disabled={busy || (!templateOnly && photos.length >= 10)}
          onClick={onAddPhotos}
        >
          <Images size={14} aria-hidden="true" /> Photos
        </button>
        {!!textLayers.length && (
          <ToolbarSelect icon={Type}>
            <select
              className="text-layer-menu"
              aria-label="Select text layer"
              value={selectedTextId ?? ""}
              disabled={busy}
              onChange={(event) => {
                setSelectedImageId(null);
                onSelectPhoto(null);
                setSelectedStickerId(null);
                setSelectedLineId(null);
                setEditingTextId(null);
                setSelectedTextId(event.currentTarget.value || null);
              }}
            >
              <option value="">Text layers ({textLayers.length})</option>
              {textLayers.map((layer, i) => (
                <option key={layer.id} value={layer.id}>
                  {i + 1}.{" "}
                  {layer.text.replace(/\s+/g, " ").slice(0, 40) || "Empty text"}
                </option>
              ))}
            </select>
          </ToolbarSelect>
        )}
        <div className="decoration-tools">
          <button
            className="preview-tool-button decoration-toggle"
            disabled={!hasCanvas || busy}
            aria-expanded={libraryOpen}
            onClick={() => setLibraryOpen((v) => !v)}
          >
            <StickerSymbol size={14} /> Stickers & emoji
          </button>
          {!!lines.length && (
            <ToolbarSelect icon={Spline}>
              <select
                className="sticker-layer-menu"
                aria-label="Select a line"
                value={selectedLineId ?? ""}
                disabled={busy}
                onChange={(event) => {
                  setSelectedStickerId(null);
                  setSelectedTextId(null);
                  setSelectedImageId(null);
                  setEditingTextId(null);
                  onSelectPhoto(null);
                  setSelectedLineId(event.target.value || null);
                }}
              >
                <option value="">Lines ({lines.length})</option>
                {lines.map((line, index) => (
                  <option key={line.id} value={line.id}>
                    {index + 1} ·{" "}
                    {LINE_EFFECTS.find(([id]) => id === line.effect)?.[1] ??
                      line.style}
                  </option>
                ))}
              </select>
            </ToolbarSelect>
          )}
          {!!stickers.length && (
            <ToolbarSelect icon={Layers}>
              <select
                aria-label="Edit a sticker"
                className="sticker-layer-menu"
                value=""
                disabled={busy}
                onChange={(e) => selectSticker(e.target.value)}
              >
                <option value="">Layers ({stickers.length})</option>
                {stickers.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i + 1}. {stickerName(s)}
                  </option>
                ))}
              </select>
            </ToolbarSelect>
          )}
          {libraryOpen && (
            <StickerLibrary
              style={libraryStyle}
              onStyleChange={setLibraryStyle}
              onClose={closeLibrary}
              disabled={busy}
              canAddSticker={stickers.length < 50}
              canAddLine={lines.length < 30}
              onSticker={(definition) => addSticker(definition.id)}
              onEmoji={(emoji) => addSticker("emoji", emoji)}
              onLine={addLine}
            />
          )}
        </div>
        {!!Object.keys(photoLayers).length && (
          <button
            className="preview-tool-button layout-reset-tool"
            disabled={busy}
            onClick={() => {
              onPhotoLayers({});
              onSelectPhoto(null);
            }}
          >
            <RotateCcw size={13} aria-hidden="true" /> Reset layout
          </button>
        )}
        {CUSTOMIZABLE_THEMES.includes(theme.id) && (
          <>
            <label
              className="background-color-tool"
              title="Change background color"
            >
              <span>BG</span>
              <input
                type="color"
                aria-label="Theme background color"
                disabled={busy}
                value={customization.backgroundColor}
                onChange={(event) =>
                  onCustomizationChange({
                    backgroundColor: event.currentTarget.value,
                  })
                }
              />
            </label>
            <label
              className="background-color-tool"
              title="Change theme accent color"
            >
              <span>Accent</span>
              <input
                type="color"
                aria-label="Theme accent color"
                disabled={busy}
                value={customization.accentColor}
                onChange={(event) =>
                  onCustomizationChange({
                    accentColor: event.currentTarget.value,
                  })
                }
              />
            </label>
          </>
        )}
        <button
          className={`preview-tool-button ${customization.smoothEffect.enabled ? "active" : ""}`}
          aria-pressed={customization.smoothEffect.enabled}
          onClick={() =>
            onCustomizationChange({
              smoothEffect: {
                ...customization.smoothEffect,
                enabled: !customization.smoothEffect.enabled,
              },
            })
          }
        >
          <Waves size={14} /> Blend
        </button>
        <button
          ref={expandButton}
          className="preview-tool-button expand-preview-tool"
          aria-label={expanded ? "Exit full screen" : "Full screen"}
          title={
            expanded
              ? "Return to the normal workspace"
              : "Open the preview in a full-screen workspace"
          }
          aria-pressed={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <Shrink size={14} aria-hidden="true" />
          ) : (
            <Expand size={14} aria-hidden="true" />
          )}
          {expanded ? "Exit full screen" : "Full screen"}
        </button>
      </div>

      <div className="preview-editing-tools">
        <input
          ref={replaceInput}
          type="file"
          className="visually-hidden"
          aria-label="Replace selected photo file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0],
              id = replacingId.current;
            if (file && id)
              void (replacingExtra.current
                ? onReplaceImage(id, file)
                : onReplacePhoto(id, file));
            event.target.value = "";
          }}
        />
        {editor.selectedPhoto && editor.selectedSlot && (
          <PhotoControls
            onAIEdit={
              onOpenAI ? () => onOpenAI(editor.selectedPhoto!.id) : undefined
            }
            photo={editor.selectedPhoto}
            photos={selectedImageId ? imagePhotos : photos}
            layer={{
              ...normalizeSlot(editor.selectedSlot, dimensions),
              customShape: (selectedImageId ? imageFrames : photoLayers)[
                editor.selectedPhoto.id
              ]?.customShape,
            }}
            mode={editor.mode}
            disabled={busy}
            onMode={editor.setMode}
            crop={editor.crop}
            onCrop={editor.updateCrop}
            onUpdate={editor.update}
            onShape={editor.changeShape}
            onReset={editor.resetPhoto}
            layerControl={
              <LayerCycleButton
                label={selectedKind}
                count={layerStack.length}
                position={layerPosition(
                  layerStack,
                  selectedKind,
                  editor.selectedPhoto.id,
                )}
                disabled={busy || layerStack.length < 2}
                onMove={(move) =>
                  editor.update({
                    zIndex: nextLayerOrder(
                      layerStack,
                      selectedKind,
                      editor.selectedPhoto!.id,
                      move,
                    ),
                  })
                }
              />
            }
            onSelect={
              selectedImageId ? (id) => setSelectedImageId(id) : onSelectPhoto
            }
            onRemove={removeActiveImage}
            onReplace={() => {
              replacingId.current = editor.selectedPhoto!.id;
              replacingExtra.current = !!selectedImageId;
              replaceInput.current?.click();
            }}
          />
        )}
        {selectedSticker && (
          <StickerControls
            layer={constrainSticker(selectedSticker, dimensions)}
            layers={stickers}
            disabled={busy}
            onSelect={selectSticker}
            onUpdate={updateSticker}
            onDelete={() => {
              onStickers(stickers.filter((s) => s.id !== selectedSticker.id));
              selectSticker(null);
            }}
            onDuplicate={() => {
              if (busy || stickers.length >= 50) return;
              const copy = constrainSticker(
                {
                  ...selectedSticker,
                  id: `sticker-${crypto.randomUUID()}`,
                  zIndex: frontLayerOrder(layerStack),
                  x: selectedSticker.x + 0.04,
                  y: selectedSticker.y + 0.04,
                },
                dimensions,
              );
              onStickers([...stickers, copy]);
              selectSticker(copy.id);
            }}
            layerControl={
              <LayerCycleButton
                label={selectedSticker.kind === "emoji" ? "emoji" : "sticker"}
                count={layerStack.length}
                position={layerPosition(
                  layerStack,
                  "sticker",
                  selectedSticker.id,
                )}
                disabled={busy || layerStack.length < 2}
                onMove={(move) =>
                  updateSticker({
                    zIndex: nextLayerOrder(
                      layerStack,
                      "sticker",
                      selectedSticker.id,
                      move,
                    ),
                  })
                }
              />
            }
          />
        )}
        {selectedLine && (
          <LineControls
            line={selectedLine}
            dimensions={dimensions}
            disabled={busy || quick}
            onUpdate={updateLine}
            onDelete={() => {
              onLines(lines.filter((line) => line.id !== selectedLine.id));
              setSelectedLineId(null);
            }}
          />
        )}
        {hasCanvas && selectedText && selectedTextBox && (
          <div
            className="text-style-toolbar"
            role="toolbar"
            aria-label="Selected text style"
            onPointerDown={(event) => {
              // Formatting buttons should leave the insertion point ready to type.
              if ((event.target as HTMLElement).closest("button"))
                event.preventDefault();
            }}
          >
            <span className="text-edit-hint" id="inline-text-help">
              {editingTextId
                ? "Type to wrap. Drag Move to reposition. Drag a corner to resize."
                : "Click to edit. Drag Move or a corner to adjust the box."}
            </span>
            <div
              className="text-layer-controls"
              role="group"
              aria-label="Text layer order"
            >
              <span title="Layer position, back to front">
                <Layers size={13} /> {textLayerIndex + 1}/{layerStack.length}
              </span>
              <LayerCycleButton
                label="text"
                count={layerStack.length}
                position={layerPosition(layerStack, "text", selectedText.id)}
                disabled={busy || layerStack.length < 2}
                onMove={moveTextLayer}
              />
              <button
                title="Move backward one layer"
                aria-label="Move text backward one layer"
                disabled={busy || textLayerIndex <= 0}
                onClick={() => moveTextLayer("backward")}
              >
                <ArrowDown size={13} />
              </button>
              <button
                title="Move forward one layer"
                aria-label="Move text forward one layer"
                disabled={busy || textLayerIndex === layerStack.length - 1}
                onClick={() => moveTextLayer("forward")}
              >
                <ArrowUp size={13} />
              </button>
              <button
                aria-label={
                  editingTextId ? "Finish editing text" : "Edit selected text"
                }
                disabled={busy}
                onClick={() =>
                  setEditingTextId(editingTextId ? null : selectedText.id)
                }
              >
                <Type size={13} /> {editingTextId ? "Done" : "Edit"}
              </button>
            </div>
            <label className="text-style-select" title="Font">
              <span className="visually-hidden">Font</span>
              <select
                value={selectedText.fontFamily}
                aria-label="Text font"
                onChange={(event) =>
                  updateTextLayer(selectedText.id, {
                    fontFamily: event.currentTarget.value,
                  })
                }
              >
                {FONT_OPTIONS.map((font) => (
                  <option
                    key={font.name}
                    value={font.family}
                    style={{ fontFamily: font.family }}
                  >
                    {font.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-color-tool" title="Text color">
              <span className="visually-hidden">Text color</span>
              <input
                type="color"
                aria-label="Text color"
                value={selectedText.color}
                onChange={(event) =>
                  updateTextLayer(selectedText.id, {
                    color: event.currentTarget.value,
                  })
                }
              />
            </label>
            <label className="text-size-tool">
              <span>
                Box width{" "}
                <strong>
                  {Math.round((selectedTextBox.width / dimensions.width) * 100)}
                  %
                </strong>
              </span>
              <input
                type="range"
                aria-label="Text box width"
                min="2"
                max="95"
                step="1"
                value={(selectedTextBox.width / dimensions.width) * 100}
                onChange={(event) =>
                  textBoxEditor.setWidth(
                    selectedText,
                    Number(event.currentTarget.value) / 100,
                  )
                }
              />
            </label>
            <label className="text-size-tool">
              <span>
                Size <strong>{Math.round(selectedText.size * 100)}%</strong>
              </span>
              <input
                type="range"
                aria-label="Text size"
                min="1"
                max="20"
                step="0.5"
                value={selectedText.size * 100}
                onChange={(event) =>
                  updateTextLayer(selectedText.id, {
                    size: Number(event.currentTarget.value) / 100,
                  })
                }
              />
            </label>
            <button
              className={`text-style-button ${selectedText.bold ? "active" : ""}`}
              aria-label="Bold text"
              aria-pressed={selectedText.bold}
              onClick={() =>
                updateTextLayer(selectedText.id, { bold: !selectedText.bold })
              }
            >
              <Bold size={14} />
            </button>
            <button
              className={`text-style-button ${selectedText.italic ? "active" : ""}`}
              aria-label="Italic text"
              aria-pressed={selectedText.italic}
              onClick={() =>
                updateTextLayer(selectedText.id, {
                  italic: !selectedText.italic,
                })
              }
            >
              <Italic size={14} />
            </button>
            <div
              className="text-align-tools"
              role="group"
              aria-label="Text alignment"
            >
              {(["left", "center", "right"] as const).map((align) => {
                const Icon =
                  align === "left"
                    ? AlignLeft
                    : align === "center"
                      ? AlignCenter
                      : AlignRight;
                return (
                  <button
                    key={align}
                    className={`text-style-button ${selectedText.align === align ? "active" : ""}`}
                    aria-label={`Align ${align}`}
                    aria-pressed={selectedText.align === align}
                    onClick={() =>
                      updateTextLayer(selectedText.id, {
                        align,
                        width: selectedTextBox.width / dimensions.width,
                        x:
                          (selectedTextBox.left +
                            selectedTextBox.width *
                              (align === "left"
                                ? 0
                                : align === "right"
                                  ? 1
                                  : 0.5)) /
                          dimensions.width,
                      })
                    }
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
            <label className="text-background-toggle">
              <input
                type="checkbox"
                checked={selectedText.background}
                onChange={(event) =>
                  updateTextLayer(selectedText.id, {
                    background: event.currentTarget.checked,
                  })
                }
              />
              Backing
            </label>
            {selectedText.background && (
              <label className="text-color-tool" title="Text backing color">
                <span className="visually-hidden">Text backing color</span>
                <input
                  type="color"
                  aria-label="Text backing color"
                  value={selectedText.backgroundColor}
                  onChange={(event) =>
                    updateTextLayer(selectedText.id, {
                      backgroundColor: event.currentTarget.value,
                    })
                  }
                />
              </label>
            )}
            <button
              className="text-style-button delete-text-button"
              aria-label="Delete selected text"
              onClick={removeSelectedText}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
        {customization.smoothEffect.enabled && (
          <div
            className="blend-inline-controls"
            aria-label="Blend effect settings"
          >
            <span className="blend-title">
              <Waves size={14} /> Smooth blend
            </span>
            <label>
              <span>
                Soft edge <strong>{customization.smoothEffect.size}%</strong>
              </span>
              <input
                type="range"
                aria-label="Blend effect size"
                min="0"
                max="100"
                value={customization.smoothEffect.size}
                onChange={(event) =>
                  onCustomizationChange({
                    smoothEffect: {
                      ...customization.smoothEffect,
                      size: Number(event.currentTarget.value),
                    },
                  })
                }
              />
            </label>
            <label className="blend-color-tool" title="Blend color">
              <span>Blend color</span>
              <input
                type="color"
                aria-label="Blend effect color"
                value={customization.smoothEffect.color}
                onChange={(event) =>
                  onCustomizationChange({
                    smoothEffect: {
                      ...customization.smoothEffect,
                      color: event.currentTarget.value,
                    },
                  })
                }
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
  return (
    <section
      ref={panel}
      data-tool-dock={dockWidth ? "side" : "top"}
      style={{ "--tool-dock-width": `${dockWidth}px` } as React.CSSProperties}
      className={`preview-section ${editingTextId ? "text-editing-active" : ""} ${expanded ? "expanded-preview" : ""} ${toolsOpen && !quick ? "tools-open" : ""} ${quick ? "quick-preview" : ""}`}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
      aria-label="Collage preview"
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (
          editingTextId &&
          next instanceof HTMLElement &&
          !next.closest(
            "[data-inline-text-editor], [data-text-control], .text-style-toolbar",
          )
        ) {
          setEditingTextId(null);
        }
      }}
    >
      <div className="preview-heading">
        <div className="preview-label">
          <span className="live-dot" />
          {templateOnly ? "Template preview" : "Live preview"}{" "}
          <span className="preview-divider">/</span>
          <strong>{theme.name}</strong>
        </div>
      </div>
      {toolDock}
      <div
        className={`canvas-workspace ${!hasCanvas ? "empty-workspace" : ""}`}
        ref={workspace}
      >
        {hasCanvas ? (
          <div
            className="canvas-stage"
            ref={stage}
            style={
              {
                "--fit-width": `${fitWidth}px`,
                "--canvas-ratio": `${dimensions.width}/${dimensions.height}`,
                width: `${fitWidth}px`,
                aspectRatio: `${dimensions.width}/${dimensions.height}`,
                transform: "none",
              } as React.CSSProperties
            }
          >
            <canvas
              ref={initializeCanvas}
              data-testid="collage-preview"
              aria-label={`${theme.name} collage with ${photos.length} photos, ${dimensions.width} by ${dimensions.height} pixels`}
              tabIndex={0}
              aria-describedby={
                editor.selectedPhoto ? "photo-drag-help" : undefined
              }
              onDoubleClick={() => {
                if (!busy && !templateOnly && !quick) editor.setMode("crop");
              }}
              style={{ cursor: editor.mode === "crop" ? "grab" : "move" }}
              onPointerDown={(event) => {
                if (quick) return;
                setSelectedStickerId(null);
                editor.onPointerDown(event);
              }}
              onPointerMove={editor.onPointerMove}
              onPointerUp={editor.endGesture}
              onPointerCancel={editor.endGesture}
              onKeyDown={(event) => {
                if (busy || quick || templateOnly || !editor.selectedPhoto)
                  return;
                if (event.key === "Escape") {
                  onSelectPhoto(null);
                  setSelectedImageId(null);
                  return;
                }
                if (event.key === "Delete" || event.key === "Backspace") {
                  event.preventDefault();
                  removeActiveImage();
                  return;
                }
                if (editor.mode === "move" && event.key.startsWith("Arrow")) {
                  event.preventDefault();
                  const layer = normalizeSlot(editor.selectedSlot!, dimensions),
                    amount = event.shiftKey ? 20 : 5;
                  editor.update({
                    x:
                      layer.x +
                      (event.key === "ArrowLeft"
                        ? -amount
                        : event.key === "ArrowRight"
                          ? amount
                          : 0) /
                        dimensions.width,
                    y:
                      layer.y +
                      (event.key === "ArrowUp"
                        ? -amount
                        : event.key === "ArrowDown"
                          ? amount
                          : 0) /
                        dimensions.height,
                  });
                  return;
                }
                const step = event.shiftKey ? 0.1 : 0.025;
                if (event.key === "ArrowLeft")
                  editor.updateCrop({ x: editor.crop.x + step });
                else if (event.key === "ArrowRight")
                  editor.updateCrop({ x: editor.crop.x - step });
                else if (event.key === "ArrowUp")
                  editor.updateCrop({ y: editor.crop.y + step });
                else if (event.key === "ArrowDown")
                  editor.updateCrop({ y: editor.crop.y - step });
                else return;
                event.preventDefault();
              }}
            />
            {[
              { hitEditor: themeEditor, items: photos, kind: "photo" },
              { hitEditor: imageEditor, items: imagePhotos, kind: "image" },
            ].flatMap(({ hitEditor, items, kind }) =>
              hitEditor.slots.map((slot) => {
                const photo = items[slot.index];
                return (
                  <div
                    key={photo.id}
                    className="photo-hit-target"
                    data-layer-kind={kind}
                    data-layer-id={photo.id}
                    aria-hidden="true"
                    style={{
                      left: `${(slot.x / dimensions.width) * 100}%`,
                      top: `${(slot.y / dimensions.height) * 100}%`,
                      width: `${(slot.width / dimensions.width) * 100}%`,
                      height: `${(slot.height / dimensions.height) * 100}%`,
                      transform: `rotate(${slot.rotation ?? 0}rad)`,
                      clipPath: slot.polygon
                        ? `polygon(${slot.polygon.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(",")})`
                        : slot.shape === "circle"
                          ? "ellipse(50% 50% at 50% 50%)"
                          : undefined,
                      borderRadius:
                        slot.shape === "arch"
                          ? "50% 50% 0 0"
                          : slot.radius
                            ? `${(slot.radius * Math.min(dimensions.width, dimensions.height) * stagePixelWidth) / dimensions.width}px`
                            : undefined,
                      zIndex: overlayOrder.get(`${kind}:${photo.id}`),
                      pointerEvents:
                        quick ||
                        (templateOnly && kind === "photo") ||
                        busy ||
                        slot.opacity === 0 ||
                        !!editingTextId
                          ? "none"
                          : "auto",
                    }}
                    onPointerDown={(event) => {
                      hitEditor.onPointerDown(event);
                      canvas.current?.focus({ preventScroll: true });
                    }}
                    onPointerMove={hitEditor.onPointerMove}
                    onPointerUp={hitEditor.endGesture}
                    onPointerCancel={hitEditor.endGesture}
                    onDoubleClick={() => hitEditor.setMode("crop")}
                  />
                );
              }),
            )}
            {editor.selectedSlot && !templateOnly && !quick && (
              <div
                className="photo-selection"
                data-testid="photo-selection"
                style={{
                  left: `${(editor.selectedSlot.x / dimensions.width) * 100}%`,
                  top: `${(editor.selectedSlot.y / dimensions.height) * 100}%`,
                  width: `${(editor.selectedSlot.width / dimensions.width) * 100}%`,
                  height: `${(editor.selectedSlot.height / dimensions.height) * 100}%`,
                  transform: `rotate(${editor.selectedSlot.rotation ?? 0}rad)`,
                }}
              >
                {editor.mode === "move" &&
                  (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map(
                    (handle) => (
                      <button
                        key={handle}
                        className={`photo-resize-handle handle-${handle}`}
                        aria-label={`Resize photo ${handle}`}
                        disabled={busy}
                        onPointerDown={(event) =>
                          editor.startResize(event, handle)
                        }
                        onPointerMove={editor.onPointerMove}
                        onPointerUp={editor.endGesture}
                        onPointerCancel={editor.endGesture}
                        onKeyDown={(event) => {
                          if (event.key.startsWith("Arrow")) {
                            event.preventDefault();
                            const layer =
                              (selectedImageId
                                ? imageFrames[selectedImageId]
                                : photoLayers[selectedPhotoId!]) ??
                              normalizeSlot(editor.selectedSlot!, dimensions);
                            const amount = event.shiftKey ? 0.03 : 0.01;
                            editor.update({
                              width:
                                layer.width +
                                (event.key === "ArrowRight"
                                  ? amount
                                  : event.key === "ArrowLeft"
                                    ? -amount
                                    : 0),
                              height:
                                layer.height +
                                (event.key === "ArrowDown"
                                  ? amount
                                  : event.key === "ArrowUp"
                                    ? -amount
                                    : 0),
                            });
                          }
                        }}
                      />
                    ),
                  )}
              </div>
            )}
            <div
              className="text-overlay-layer"
              aria-label="Editable theme text"
            >
              {textLayers.map((layer) => {
                const isEditing = editingTextId === layer.id;
                const box = textBoxLayout(
                  layer,
                  dimensions,
                  canvas.current?.getContext("2d", { alpha: false }),
                );
                const scale = stagePixelWidth / dimensions.width;
                const alignOffset =
                  layer.align === "left"
                    ? "0%"
                    : layer.align === "right"
                      ? "-100%"
                      : "-50%";
                const textStyle: React.CSSProperties = {
                  zIndex: isEditing
                    ? 10000
                    : overlayOrder.get(`text:${layer.id}`),
                  left: `${layer.x * 100}%`,
                  top: `${layer.y * 100}%`,
                  transform: `translate(${alignOffset}, -50%)`,
                  color: layer.color,
                  caretColor: layer.color,
                  fontFamily: layer.fontFamily,
                  fontSize: `${box.fontSize * scale}px`,
                  width: box.width * scale,
                  height: box.height * scale,
                  lineHeight: 1.12,
                  fontWeight: layer.bold ? 700 : 400,
                  fontStyle: layer.italic ? "italic" : "normal",
                  textAlign: layer.align,
                  backgroundColor: layer.background
                    ? layer.backgroundColor
                    : "transparent",
                };
                return (
                  <div
                    key={layer.id}
                    className={`text-overlay-item ${isEditing ? "editing" : ""} ${selectedTextId === layer.id ? "selected" : ""} ${layer.background ? "backed" : ""}`}
                    title={
                      isEditing ? undefined : "Click to edit. Drag to move."
                    }
                    style={textStyle}
                    onPointerDown={(event) => beginTextDrag(event, layer)}
                    onPointerMove={textBoxEditor.onPointerMove}
                    onPointerUp={textBoxEditor.end}
                    onPointerCancel={textBoxEditor.end}
                  >
                    {isEditing ? (
                      <InlineTextEditor
                        text={layer.text}
                        disabled={busy}
                        contentOffset={Math.max(
                          0,
                          ((box.height - box.contentHeight) * scale) / 2,
                        )}
                        resizeKey={[
                          box.fontSize,
                          box.width,
                          box.height,
                          layer.fontFamily,
                          layer.bold,
                          layer.italic,
                        ].join(":")}
                        onChange={(text) => updateTextLayer(layer.id, { text })}
                        onFinish={() => {
                          setEditingTextId(null);
                          canvas.current?.focus({ preventScroll: true });
                        }}
                      />
                    ) : (
                      <button
                        className="text-layer-content"
                        style={{
                          left:
                            layer.align === "left"
                              ? 0
                              : layer.align === "right"
                                ? "100%"
                                : "50%",
                          transform: `translate(${alignOffset}, -50%)`,
                        }}
                        disabled={busy}
                        aria-label={`Edit text: ${layer.text.replace(/\s+/g, " ")}`}
                        onClick={() => {
                          if (suppressTextClick.current) {
                            suppressTextClick.current = false;
                            return;
                          }
                          onSelectPhoto(null);
                          setSelectedImageId(null);
                          setSelectedStickerId(null);
                          setSelectedTextId(layer.id);
                          setEditingTextId(layer.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "F2") {
                            event.preventDefault();
                            onSelectPhoto(null);
                            setSelectedImageId(null);
                            setSelectedStickerId(null);
                            setSelectedTextId(layer.id);
                            setEditingTextId(layer.id);
                          }
                        }}
                      >
                        {box.lines.join("\n") || "Type here"}
                      </button>
                    )}
                    {(selectedTextId === layer.id || isEditing) && (
                      <TextBoxControls
                        inside={box.top * scale < 30}
                        disabled={busy}
                        onMove={(event) =>
                          textBoxEditor.begin(event, layer, true, isEditing)
                        }
                        onResize={(event, edge) =>
                          textBoxEditor.begin(
                            event,
                            layer,
                            true,
                            isEditing,
                            edge,
                          )
                        }
                        onKeyMove={(event, edge) =>
                          textBoxEditor.keyMove(event, layer, edge)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <StickerOverlays
              layers={stickers}
              dimensions={dimensions}
              selectedId={selectedStickerId}
              onSelect={selectSticker}
              onLayers={onStickers}
              stage={stage}
              disabled={busy || quick}
              textEditing={!!editingTextId}
              layerOrder={overlayOrder}
            />
            <LineOverlay
              lines={lines}
              dimensions={dimensions}
              selectedId={selectedLineId}
              onSelect={(id) => {
                setSelectedLineId(id);
                if (id) {
                  setSelectedStickerId(null);
                  setSelectedTextId(null);
                  setSelectedImageId(null);
                  onSelectPhoto(null);
                }
              }}
              onLayers={onLines}
              stage={stage}
              disabled={busy || quick}
            />
          </div>
        ) : (
          <div className="empty-canvas">
            <div className="empty-frame">
              <Image size={34} strokeWidth={1} />
            </div>
            <h3>A little space for your big moments.</h3>
            <p>Add your photos to see your collage come to life.</p>
          </div>
        )}
        {busy && (
          <div className="preview-loading" role="status">
            <LoaderCircle className="spin" size={18} /> Preparing photos…
          </div>
        )}
        {error && (
          <div className="preview-error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="preview-footer">
        <span>
          {dimensions.width.toLocaleString()} ×{" "}
          {dimensions.height.toLocaleString()} px{" "}
          <span className="footer-separator">•</span> {photos.length}{" "}
          {photos.length === 1 ? "photo" : "photos"}
          {!!images.length &&
            ` + ${images.length} added image${images.length === 1 ? "" : "s"}`}
        </span>
        <div className="zoom-controls">
          <button
            aria-label="Zoom out"
            disabled={zoom <= 0.5}
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          >
            <Minus size={13} />
          </button>
          <button
            className="zoom-value"
            onClick={() => setZoom(1)}
            aria-label="Fit preview"
          >
            {zoom === 1 ? "Fit" : `${Math.round(zoom * 100)}%`}
          </button>
          <button
            aria-label="Zoom in"
            disabled={zoom >= 2}
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </section>
  );
}
