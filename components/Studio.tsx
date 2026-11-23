"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Images,
  Layers3,
  LockKeyhole,
  RotateCcw,
  Undo2,
  Redo2,
  Sparkles,
  Upload,
  X,
  LayoutTemplate,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import type {
  CropPosition,
  CanvasTextLayer,
  Dimensions,
  ImageFormat,
  Photo,
  PhotoLayers,
  ImageElement,
  LineLayer,
  StickerLayer,
  ThemeCustomization,
  ThemeId,
} from "@/types/collage";
import { THEMES } from "@/lib/themeLayouts";
import { EMPTY_STICKERS } from "@/lib/stickers";
import { snapshotPhotoLayers } from "@/lib/photoEditing";
import {
  defaultImageFrame,
  EMPTY_IMAGES,
  MAX_EXTRA_IMAGES,
} from "@/lib/extraImages";
import { frontLayerOrder, orderedLayers } from "@/lib/layerOrder";
import {
  dimensionError,
  MAX_IMAGES,
  MAX_TOTAL_PIXELS,
  PRESETS,
} from "@/lib/settings";
import {
  decodePhoto,
  disposePhoto,
  loadPhoto,
  SAMPLES,
} from "@/lib/imageLoader";
import { createExport, downloadImage } from "@/lib/imageExport";
import { ThemeSelector } from "@/components/ThemeSelector";
import { CollagePreview } from "@/components/CollagePreview";
import { ImageUploader } from "@/components/ImageUploader";
import { ImageGallery } from "@/components/ImageGallery";
import { ExportPanel } from "@/components/ExportPanel";
import { SessionExitDialog } from "@/components/SessionExitDialog";
import { useSessionGuard } from "@/components/useSessionGuard";
import { QuickCreatePanel } from "@/components/QuickCreatePanel";
import { useLocalDraft } from "@/components/useLocalDraft";
import { DraftStatus } from "@/components/DraftStatus";
import { DraftRecoveryDialog } from "@/components/DraftRecoveryDialog";
import type { StudioSnapshot } from "@/types/studio";
import type { AiApplyRequest } from "@/types/ai";
import { AiStudio } from "@/components/AiStudio";
import {
  EMPTY_TRAVEL_DETAILS,
  personalizeTravelText,
  recommendedThemes,
  type TravelCollection,
  type TravelDetails,
} from "@/lib/travelTemplates";
import {
  createDefaultTextLayers,
  createDefaultThemeCustomizations,
} from "@/lib/themeCustomization";

const COLOR_DEFAULTS = createDefaultThemeCustomizations();
const WORDING_DEFAULTS = createDefaultTextLayers();
const DEFAULT_COLORS = JSON.stringify(COLOR_DEFAULTS);
const DEFAULT_WORDING = JSON.stringify(WORDING_DEFAULTS);

interface EditHistorySnapshot {
  theme: ThemeId;
  preset: string;
  custom: { width: string; height: string };
  format: ImageFormat;
  quality: number;
  cropPositions: Record<string, CropPosition>;
  themeCustomizations: Record<ThemeId, ThemeCustomization>;
  themeTextLayers: Record<ThemeId, CanvasTextLayer[]>;
  themePhotoLayers: Partial<Record<ThemeId, PhotoLayers>>;
  themeStickers: Partial<Record<ThemeId, StickerLayer[]>>;
  themeLines: Partial<Record<ThemeId, LineLayer[]>>;
}

interface EditHistoryEntry {
  snapshot: EditHistorySnapshot;
  signature: string;
}

export default function Studio({
  initialMode = "quick",
}: {
  initialMode?: "quick" | "editor";
}) {
  const [mode, setMode] = useState<"quick" | "editor">(initialMode);
  const [quickStep, setQuickStep] = useState(1);
  const [travelCollection, setTravelCollection] =
    useState<TravelCollection>("Recommended");
  const [tripDetails, setTripDetails] =
    useState<TravelDetails>(EMPTY_TRAVEL_DETAILS);
  const [photos, setPhotos] = useState<Photo[]>([]),
    photoRef = useRef<Photo[]>([]);
  const [templatePhotos, setTemplatePhotos] = useState<Photo[]>([]);
  const [sidebarPane, setSidebarPane] = useState<"templates" | "photos">(
    "templates",
  );
  const [focusMode, setFocusMode] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [themePhotoLayers, setThemePhotoLayers] = useState<
    Partial<Record<ThemeId, PhotoLayers>>
  >({});
  const [cropPositions, setCropPositions] = useState<
    Record<string, CropPosition>
  >({});
  const [theme, setTheme] = useState<ThemeId>("scenic-fan"),
    [preset, setPreset] = useState("portrait");
  const [themeCustomizations, setThemeCustomizations] = useState<
    Record<ThemeId, ThemeCustomization>
  >(createDefaultThemeCustomizations);
  const [themeTextLayers, setThemeTextLayers] = useState<
    Record<ThemeId, CanvasTextLayer[]>
  >(createDefaultTextLayers);
  const [themeStickers, setThemeStickers] = useState<
    Partial<Record<ThemeId, StickerLayer[]>>
  >({});
  const [themeLines, setThemeLines] = useState<
    Partial<Record<ThemeId, LineLayer[]>>
  >({});
  const [themeImages, setThemeImages] = useState<
    Partial<Record<ThemeId, ImageElement[]>>
  >({});
  const imageRef = useRef<Partial<Record<ThemeId, ImageElement[]>>>({});
  const extraImageInput = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitialSourceId, setAiInitialSourceId] = useState<string>();
  const openAi = (id?: string) => {
    if (loadingRef.current || exportingRef.current) return;
    setAiInitialSourceId(id);
    setAiOpen(true);
  };
  const updateImages = useCallback((target: ThemeId, next: ImageElement[]) => {
    const updated = { ...imageRef.current, [target]: next };
    imageRef.current = updated;
    setThemeImages(updated);
  }, []);
  const [custom, setCustom] = useState({ width: "1080", height: "1080" });
  const [format, setFormat] = useState<ImageFormat>("png"),
    [quality, setQuality] = useState(0.95);
  const [loading, setLoading] = useState(false),
    loadingRef = useRef(false),
    [exporting, setExporting] = useState(false),
    exportingRef = useRef(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [downloaded, setDownloaded] = useState(false),
    [step, setStep] = useState(1),
    [help, setHelp] = useState(false);
  const mounted = useRef(true),
    loadGeneration = useRef(0),
    helpButton = useRef<HTMLButtonElement>(null),
    helpClose = useRef<HTMLButtonElement>(null);
  const selectedTheme = THEMES.find((t) => t.id === theme)!;
  const dimensions = useMemo<Dimensions>(
    () =>
      preset === "custom"
        ? { width: Number(custom.width), height: Number(custom.height) }
        : PRESETS.find((p) => p.id === preset)!,
    [preset, custom],
  );
  const invalid = dimensionError(dimensions);
  // Backfill newly introduced templates without replacing edits in an open editor.
  const colorsByTheme = { ...COLOR_DEFAULTS, ...themeCustomizations };
  const wordingByTheme = { ...WORDING_DEFAULTS, ...themeTextLayers };
  const hasSessionWork = useMemo(
    () =>
      photos.length > 0 ||
      Object.values(themeImages).some((images) => images.length > 0) ||
      Object.keys(cropPositions).length > 0 ||
      Object.values(themeStickers).some((layers) => layers.length > 0) ||
      Object.values(themeLines).some((layers) => layers.length > 0) ||
      Object.values(themePhotoLayers).some(
        (layers) => Object.keys(layers).length > 0,
      ) ||
      JSON.stringify(colorsByTheme) !== DEFAULT_COLORS ||
      JSON.stringify(wordingByTheme) !== DEFAULT_WORDING,
    [
      photos.length,
      cropPositions,
      themePhotoLayers,
      themeCustomizations,
      themeTextLayers,
      themeStickers,
      themeLines,
      themeImages,
    ],
  );
  const lastDimensions = useRef<Dimensions>({ width: 1080, height: 1080 });
  if (!invalid) lastDimensions.current = dimensions;
  const previewDimensions = invalid ? lastDimensions.current : dimensions;
  const replacePhotos = useCallback((next: Photo[]) => {
    photoRef.current = next;
    setPhotos(next);
    const ids = new Set(next.map((photo) => photo.id));
    setSelectedPhotoId((id) => (id && ids.has(id) ? id : null));
    setThemePhotoLayers((current) =>
      Object.fromEntries(
        Object.entries(current).map(([theme, layers]) => [
          theme,
          Object.fromEntries(
            Object.entries(layers).filter(([id]) => ids.has(id)),
          ),
        ]),
      ),
    );
    setCropPositions((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => ids.has(id))),
    );
  }, []);
  const snapshot = useMemo<StudioSnapshot>(
    () => ({
      mode,
      quickStep,
      step,
      sidebarPane,
      photos,
      theme,
      preset,
      custom,
      format,
      quality,
      cropPositions,
      themeCustomizations,
      themeTextLayers,
      themePhotoLayers,
      themeStickers,
      themeLines,
      themeImages,
      travelCollection,
      tripDetails,
    }),
    [
      mode,
      quickStep,
      step,
      sidebarPane,
      photos,
      theme,
      preset,
      custom,
      format,
      quality,
      cropPositions,
      themeCustomizations,
      themeTextLayers,
      themePhotoLayers,
      themeStickers,
      themeLines,
      themeImages,
      travelCollection,
      tripDetails,
    ],
  );
  const editSnapshot = useMemo<EditHistorySnapshot>(
    () => ({
      theme,
      preset,
      custom,
      format,
      quality,
      cropPositions,
      themeCustomizations,
      themeTextLayers,
      themePhotoLayers,
      themeStickers,
      themeLines,
    }),
    [
      theme,
      preset,
      custom,
      format,
      quality,
      cropPositions,
      themeCustomizations,
      themeTextLayers,
      themePhotoLayers,
      themeStickers,
      themeLines,
    ],
  );
  const editSignature = JSON.stringify(editSnapshot);
  const editHistory = useRef<{
    past: EditHistoryEntry[];
    current: EditHistoryEntry;
    future: EditHistoryEntry[];
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const clearHistoryOnNextSnapshot = useRef(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  if (!editHistory.current)
    editHistory.current = {
      past: [],
      current: { snapshot: editSnapshot, signature: editSignature },
      future: [],
      timer: null,
    };
  useEffect(() => {
    const history = editHistory.current!;
    if (clearHistoryOnNextSnapshot.current) {
      clearHistoryOnNextSnapshot.current = false;
      if (history.timer) clearTimeout(history.timer);
      history.timer = null;
      history.past = [];
      history.future = [];
      history.current = { snapshot: editSnapshot, signature: editSignature };
      setHistoryRevision((revision) => revision + 1);
      return;
    }
    if (history.current.signature === editSignature) return;
    if (history.timer) clearTimeout(history.timer);
    history.timer = setTimeout(() => {
      if (history.current.signature !== editSignature) {
        history.past.push(history.current);
        history.past = history.past.slice(-60);
        history.current = { snapshot: editSnapshot, signature: editSignature };
        history.future = [];
        setHistoryRevision((revision) => revision + 1);
      }
      history.timer = null;
    }, 350);
  }, [editSignature, editSnapshot]);
  useEffect(
    () => () => {
      if (editHistory.current?.timer) clearTimeout(editHistory.current.timer);
    },
    [],
  );
  const applyEditHistory = useCallback((entry: EditHistoryEntry) => {
    const history = editHistory.current!;
    if (history.timer) clearTimeout(history.timer);
    history.timer = null;
    history.current = entry;
    const saved = entry.snapshot;
    setTheme(saved.theme);
    setPreset(saved.preset);
    setCustom(saved.custom);
    setFormat(saved.format);
    setQuality(saved.quality);
    setCropPositions(saved.cropPositions);
    setThemeCustomizations(saved.themeCustomizations);
    setThemeTextLayers(saved.themeTextLayers);
    setThemePhotoLayers(saved.themePhotoLayers);
    setThemeStickers(saved.themeStickers);
    setThemeLines(saved.themeLines);
    setDownloaded(false);
    setHistoryRevision((revision) => revision + 1);
  }, []);
  const undoEdit = useCallback(() => {
    const history = editHistory.current!;
    if (history.timer) {
      clearTimeout(history.timer);
      history.timer = null;
    }
    if (history.current.signature !== editSignature) {
      history.past.push(history.current);
      history.current = { snapshot: editSnapshot, signature: editSignature };
      history.future = [];
    }
    const previous = history.past.pop();
    if (!previous) return;
    history.future.push(history.current);
    applyEditHistory(previous);
  }, [applyEditHistory, editSignature, editSnapshot]);
  const redoEdit = useCallback(() => {
    const history = editHistory.current!;
    if (history.timer) {
      clearTimeout(history.timer);
      history.timer = null;
    }
    if (history.current.signature !== editSignature) {
      history.past.push(history.current);
      history.current = { snapshot: editSnapshot, signature: editSignature };
      history.future = [];
    }
    const next = history.future.pop();
    if (!next) return;
    history.past.push(history.current);
    applyEditHistory(next);
  }, [applyEditHistory, editSignature, editSnapshot]);
  const canUndo = !!editHistory.current?.past.length;
  const canRedo = !!editHistory.current?.future.length;
  const restoreSnapshot = useCallback((saved: StudioSnapshot) => {
    photoRef.current.forEach(disposePhoto);
    Object.values(imageRef.current)
      .flat()
      .forEach((image) => disposePhoto(image.photo));
    photoRef.current = saved.photos;
    setPhotos(saved.photos);
    imageRef.current = saved.themeImages;
    setThemeImages(saved.themeImages);
    setTheme(saved.theme);
    setMode(saved.mode === "editor" ? "editor" : "quick");
    setQuickStep(Math.max(1, Math.min(3, saved.quickStep || 2)));
    setStep(Math.max(1, Math.min(3, saved.step || 2)));
    setSidebarPane(saved.sidebarPane === "templates" ? "templates" : "photos");
    setPreset(
      PRESETS.some((preset) => preset.id === saved.preset)
        ? saved.preset
        : "portrait",
    );
    setCustom(saved.custom);
    setFormat(
      ["png", "jpeg", "webp"].includes(saved.format) ? saved.format : "png",
    );
    setQuality(Math.max(0.1, Math.min(1, saved.quality || 0.95)));
    setCropPositions(saved.cropPositions ?? {});
    setThemeCustomizations({ ...COLOR_DEFAULTS, ...saved.themeCustomizations });
    setThemeTextLayers({
      ...createDefaultTextLayers(),
      ...saved.themeTextLayers,
    });
    setThemePhotoLayers(saved.themePhotoLayers ?? {});
    setThemeStickers(saved.themeStickers ?? {});
    setThemeLines(saved.themeLines ?? {});
    setTripDetails({ ...EMPTY_TRAVEL_DETAILS, ...saved.tripDetails });
    setTravelCollection(saved.travelCollection ?? "Recommended");
    setSelectedPhotoId(null);
    setFocusMode(false);
    setDownloaded(false);
    setEditorSession((n) => n + 1);
    setNotice({
      text: "Your draft is ready. All your photos and edits are back.",
      error: false,
    });
  }, []);
  const draft = useLocalDraft(snapshot, hasSessionWork, restoreSnapshot);
  const session = useSessionGuard(
    draft.needsProtection || loading || exporting,
  );
  useEffect(() => {
    if (session.action) setHelp(false);
  }, [session.action]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      loadGeneration.current++;
      photoRef.current.forEach(disposePhoto);
      Object.values(imageRef.current)
        .flat()
        .forEach((image) => disposePhoto(image.photo));
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const decoded: Photo[] = [];
    (async () => {
      try {
        for (const sample of SAMPLES) {
          const photo = await decodePhoto(
            `/samples/${sample.file}.jpg`,
            sample.name,
            true,
          );
          if (cancelled) {
            disposePhoto(photo);
            return;
          }
          decoded.push(photo);
        }
        setTemplatePhotos([...decoded]);
      } catch {
        decoded.forEach(disposePhoto);
      }
    })();
    return () => {
      cancelled = true;
      decoded.forEach(disposePhoto);
    };
  }, []);
  useEffect(() => {
    setDownloaded(false);
  }, [
    photos,
    theme,
    dimensions,
    format,
    quality,
    cropPositions,
    themeCustomizations,
    themeTextLayers,
    themePhotoLayers,
    themeStickers,
    themeLines,
    themeImages,
  ]);
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!help) return;
    helpClose.current?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        helpButton.current?.focus();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        helpClose.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [help]);
  useEffect(() => {
    const handleHistoryShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || loading || exporting) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest("dialog") ||
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redoEdit();
        else undoEdit();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoEdit();
      }
    };
    document.addEventListener("keydown", handleHistoryShortcut);
    return () => document.removeEventListener("keydown", handleHistoryShortcut);
  }, [exporting, loading, redoEdit, undoEdit]);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || loadingRef.current || exportingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setNotice(null);
      const generation = ++loadGeneration.current;
      const current = photoRef.current,
        samples = current.length > 0 && current.every((p) => p.sample),
        base = samples ? [] : current;
      const added: Photo[] = [],
        errors: string[] = [];
      let pixels =
        base.reduce((sum, p) => sum + p.width * p.height, 0) +
        Object.values(imageRef.current)
          .flat()
          .reduce(
            (sum, image) => sum + image.photo.width * image.photo.height,
            0,
          );
      const available = MAX_IMAGES - base.length;
      try {
        for (const file of files) {
          if (added.length >= available) {
            errors.push(
              `A collage holds up to 10 photos. ${files.length - files.indexOf(file)} extra file(s) were skipped.`,
            );
            break;
          }
          try {
            const photo = await loadPhoto(file);
            if (pixels + photo.width * photo.height > MAX_TOTAL_PIXELS) {
              disposePhoto(photo);
              throw new Error(
                `${file.name}: this collection is too large for browser memory. Use smaller photos.`,
              );
            }
            pixels += photo.width * photo.height;
            added.push(photo);
          } catch (e) {
            errors.push(
              e instanceof Error ? e.message : "An image could not be loaded.",
            );
          }
        }
        if (!mounted.current || generation !== loadGeneration.current) {
          added.forEach(disposePhoto);
          return;
        }
        if (added.length) {
          if (samples) current.forEach(disposePhoto);
          replacePhotos([...base, ...added]);
          setSidebarPane("photos");
          setStep(2);
          setQuickStep(2);
          if (mode === "quick" && !base.length)
            setTheme(recommendedThemes(added, "Recommended")[0]);
        }
        if (errors.length) setNotice({ text: errors.join(" "), error: true });
        else
          setNotice({
            text: `${added.length} ${added.length === 1 ? "photo added" : "photos added"}. Make something beautiful.`,
            error: false,
          });
      } finally {
        if (mounted.current) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    },
    [replacePhotos, mode],
  );

  const loadSamples = async () => {
    if (loadingRef.current || exportingRef.current || photoRef.current.length)
      return;
    loadingRef.current = true;
    setLoading(true);
    setNotice(null);
    const generation = ++loadGeneration.current,
      loaded: Photo[] = [];
    try {
      for (const sample of SAMPLES)
        loaded.push(
          await decodePhoto(`/samples/${sample.file}.jpg`, sample.name, true),
        );
      if (!mounted.current || generation !== loadGeneration.current) {
        loaded.forEach(disposePhoto);
        return;
      }
      replacePhotos(loaded);
      setSidebarPane("photos");
      setStep(2);
      setQuickStep(2);
    } catch {
      loaded.forEach(disposePhoto);
      if (mounted.current)
        setNotice({
          text: "Sample photos could not be loaded. You can still upload your own.",
          error: true,
        });
    } finally {
      if (mounted.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  };
  const removePhoto = (id: string) => {
    if (loadingRef.current || exportingRef.current) return;
    setThemePhotoLayers((current) => ({
      ...current,
      [theme]: snapshotPhotoLayers(
        theme,
        photos,
        previewDimensions,
        current[theme] ?? {},
      ),
    }));
    const removed = photos.find((p) => p.id === id);
    if (removed) disposePhoto(removed);
    replacePhotos(photos.filter((p) => p.id !== id));
  };
  const replacePhoto = async (id: string, file: File) => {
    if (loadingRef.current || exportingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setNotice(null);
    try {
      const photo = await loadPhoto(file);
      const current = photoRef.current;
      const previous = current.find((photo) => photo.id === id);
      if (!mounted.current || !previous) {
        disposePhoto(photo);
        return;
      }
      if (
        current
          .filter((photo) => photo.id !== id)
          .reduce((sum, photo) => sum + photo.width * photo.height, 0) +
          photo.width * photo.height >
        MAX_TOTAL_PIXELS -
          Object.values(imageRef.current)
            .flat()
            .reduce(
              (sum, image) => sum + image.photo.width * image.photo.height,
              0,
            )
      ) {
        disposePhoto(photo);
        throw new Error("This collection is too large. Use a smaller photo.");
      }
      replacePhotos(
        current.map((item) => (item.id === id ? { ...photo, id } : item)),
      );
      setCropPositions((current) => ({ ...current, [id]: { x: 0.5, y: 0.5 } }));
      disposePhoto(previous);
    } catch (error) {
      setNotice({
        text:
          error instanceof Error
            ? error.message
            : "The replacement could not be loaded.",
        error: true,
      });
    } finally {
      loadingRef.current = false;
      if (mounted.current) setLoading(false);
    }
  };
  const reorder = (from: number, to: number) => {
    if (
      loadingRef.current ||
      exportingRef.current ||
      from === to ||
      from < 0 ||
      to < 0 ||
      to >= photos.length
    )
      return;
    const next = [...photos],
      [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setThemePhotoLayers((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, layers]) => [
          id,
          Object.fromEntries(
            next
              .map((photo, index) => [photo.id, layers[photos[index].id]])
              .filter(([, layer]) => !!layer),
          ),
        ]),
      ),
    );
    replacePhotos(next);
    setNotice({
      text: `Moved ${moved.name} to position ${to + 1}.`,
      error: false,
    });
  };
  const clear = () => {
    if (!loadingRef.current && !exportingRef.current) {
      photos.forEach(disposePhoto);
      replacePhotos([]);
      setStep(1);
      setNotice(null);
    }
  };
  const startNewCollage = async () => {
    if (loadingRef.current || exportingRef.current) return;
    if (!(await draft.discard())) return;
    clearHistoryOnNextSnapshot.current = true;
    photoRef.current.forEach(disposePhoto);
    replacePhotos([]);
    setTheme("scenic-fan");
    setPreset("portrait");
    setCustom({ width: "1080", height: "1080" });
    setFormat("png");
    setQuality(0.95);
    setThemePhotoLayers({});
    setCropPositions({});
    setThemeCustomizations(createDefaultThemeCustomizations());
    setThemeTextLayers(createDefaultTextLayers());
    setThemeStickers({});
    setThemeLines({});
    Object.values(imageRef.current)
      .flat()
      .forEach((image) => disposePhoto(image.photo));
    imageRef.current = {};
    setThemeImages({});
    setSidebarPane("templates");
    setStep(1);
    setFocusMode(false);
    setHelp(false);
    setDownloaded(false);
    setMode("quick");
    setQuickStep(1);
    setTripDetails(EMPTY_TRAVEL_DETAILS);
    setTravelCollection("Recommended");
    session.cancel();
    setEditorSession((current) => current + 1);
    setNotice({
      text: "A fresh start. Choose a theme and add your favorite photos.",
      error: false,
    });
  };
  const exportCollage = async () => {
    if (
      exportingRef.current ||
      loadingRef.current ||
      invalid ||
      (!photos.length && !themeImages[theme]?.length)
    )
      return;
    exportingRef.current = true;
    setExporting(true);
    setNotice(null);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => setTimeout(resolve, 40)),
      );
      const blob = await createExport(
        {
          ...dimensions,
          photos,
          theme,
          cropPositions,
          customization: colorsByTheme[theme],
          textLayers: wordingByTheme[theme],
          photoLayers: themePhotoLayers[theme],
          stickers: themeStickers[theme] ?? EMPTY_STICKERS,
          lines: themeLines[theme] ?? [],
          images: themeImages[theme] ?? EMPTY_IMAGES,
        },
        format,
        quality,
      );
      downloadImage(
        blob,
        `collage-${theme}-${dimensions.width}x${dimensions.height}.${format === "jpeg" ? "jpg" : format}`,
      );
      setDownloaded(true);
      setStep(3);
      setQuickStep(3);
      setNotice({
        text: "Your collage is ready. Check your browser’s downloads.",
        error: false,
      });
    } catch (e) {
      setNotice({
        text:
          e instanceof Error
            ? e.message
            : "Something went wrong. Try a smaller export size.",
        error: true,
      });
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };
  const goStep = (value: number) => {
    setFocusMode(false);
    if (value === 1) setSidebarPane("templates");
    if (value === 2) setSidebarPane("photos");
    setStep(value);
  };
  const selectTheme = useCallback((id: ThemeId) => {
    if (exportingRef.current) return;
    setTheme(id);
    setSelectedPhotoId(null);
    if (window.matchMedia("(max-width: 900px)").matches)
      setSidebarPane("photos");
    setStep(2);
  }, []);
  const updateThemeCustomization = useCallback(
    (patch: Partial<ThemeCustomization>) => {
      setThemeCustomizations((current) => ({
        ...current,
        [theme]: {
          ...COLOR_DEFAULTS[theme],
          ...current[theme],
          ...patch,
          ...("backgroundColor" in patch && !("backgroundCustomized" in patch)
            ? { backgroundCustomized: true }
            : {}),
        },
      }));
    },
    [theme],
  );
  const updateThemeTextLayers = useCallback(
    (next: CanvasTextLayer[]) => {
      setThemeTextLayers((current) => ({ ...current, [theme]: next }));
    },
    [theme],
  );
  const customize = () => {
    setMode("editor");
    setFocusMode(false);
    setSidebarPane("photos");
    setStep(2);
  };
  const updateTripDetails = (field: keyof TravelDetails, value: string) => {
    const next = { ...tripDetails, [field]: value };
    setTripDetails(next);
    setThemeTextLayers(
      (current) =>
        Object.fromEntries(
          THEMES.map(({ id }) => [
            id,
            personalizeTravelText(
              current[id] ?? WORDING_DEFAULTS[id],
              id,
              next,
              field,
            ),
          ]),
        ) as Record<ThemeId, CanvasTextLayer[]>,
    );
  };

  const addIndependentImages = async (files: File[]) => {
    if (!files.length || loadingRef.current || exportingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setNotice(null);
    const target = theme,
      generation = loadGeneration.current;
    const current = imageRef.current[target] ?? [];
    const added: ImageElement[] = [],
      errors: string[] = [];
    let pixels =
      photoRef.current.reduce(
        (sum, photo) => sum + photo.width * photo.height,
        0,
      ) +
      Object.values(imageRef.current)
        .flat()
        .reduce(
          (sum, image) => sum + image.photo.width * image.photo.height,
          0,
        );
    let order = frontLayerOrder(
      orderedLayers(
        photos,
        themePhotoLayers[target] ?? {},
        wordingByTheme[target],
        themeStickers[target] ?? [],
        current,
      ),
    );
    try {
      for (const file of files) {
        if (current.length + added.length >= MAX_EXTRA_IMAGES) {
          errors.push("You can add up to 10 separate images per theme.");
          break;
        }
        try {
          const photo = await loadPhoto(file);
          if (pixels + photo.width * photo.height > MAX_TOTAL_PIXELS) {
            disposePhoto(photo);
            throw new Error(
              `${file.name}: this collection is too large. Try a smaller image.`,
            );
          }
          pixels += photo.width * photo.height;
          added.push({
            photo,
            frame: defaultImageFrame(photo, previewDimensions, order++),
            crop: { x: 0.5, y: 0.5 },
          });
        } catch (e) {
          errors.push(
            e instanceof Error ? e.message : "An image could not be loaded.",
          );
        }
      }
      if (!mounted.current || generation !== loadGeneration.current) {
        added.forEach((image) => disposePhoto(image.photo));
        return;
      }
      if (added.length) updateImages(target, [...current, ...added]);
      setNotice({
        text: errors.length
          ? errors.join(" ")
          : `${added.length} separate image${added.length === 1 ? "" : "s"} added. Drag to position or use the image controls.`,
        error: !!errors.length,
      });
    } finally {
      loadingRef.current = false;
      if (mounted.current) setLoading(false);
    }
  };
  const removeIndependentImage = (id: string) => {
    if (loadingRef.current || exportingRef.current) return;
    const current = imageRef.current[theme] ?? [];
    const removed = current.find((image) => image.photo.id === id);
    if (removed) disposePhoto(removed.photo);
    updateImages(
      theme,
      current.filter((image) => image.photo.id !== id),
    );
  };
  const replaceIndependentImage = async (id: string, file: File) => {
    if (loadingRef.current || exportingRef.current) return;
    const target = theme;
    loadingRef.current = true;
    setLoading(true);
    setNotice(null);
    try {
      const photo = await loadPhoto(file);
      const current = imageRef.current[target] ?? [],
        previous = current.find((image) => image.photo.id === id);
      if (!mounted.current || !previous) {
        disposePhoto(photo);
        return;
      }
      const pixels =
        photoRef.current.reduce(
          (sum, item) => sum + item.width * item.height,
          0,
        ) +
        Object.values(imageRef.current)
          .flat()
          .filter((image) => image.photo.id !== id)
          .reduce(
            (sum, image) => sum + image.photo.width * image.photo.height,
            0,
          );
      if (pixels + photo.width * photo.height > MAX_TOTAL_PIXELS) {
        disposePhoto(photo);
        throw new Error("This collection is too large. Try a smaller image.");
      }
      updateImages(
        target,
        current.map((image) =>
          image.photo.id === id
            ? { ...image, photo: { ...photo, id }, crop: { x: 0.5, y: 0.5 } }
            : image,
        ),
      );
      disposePhoto(previous.photo);
    } catch (e) {
      setNotice({
        text:
          e instanceof Error ? e.message : "The image could not be replaced.",
        error: true,
      });
    } finally {
      loadingRef.current = false;
      if (mounted.current) setLoading(false);
    }
  };
  const applyAiImage = async ({
    file,
    destination,
    sourceId,
  }: AiApplyRequest) => {
    if (loadingRef.current || exportingRef.current)
      throw new Error("Please wait for the current operation to finish.");
    loadingRef.current = true;
    setLoading(true);
    let added: Photo | undefined;
    let committed = false;
    try {
      added = await loadPhoto(file);
      if (!mounted.current)
        throw new Error("The editor was closed. Please try again.");
      const current = photoRef.current,
        extras = imageRef.current[theme] ?? [];
      const previous =
        destination === "replace"
          ? current.find((photo) => photo.id === sourceId)
          : undefined;
      const previousExtra =
        destination === "replace"
          ? extras.find((image) => image.photo.id === sourceId)
          : undefined;
      if (destination === "replace" && !previous && !previousExtra)
        throw new Error(
          "This photo is no longer in the collage. Add the result as a new photo instead.",
        );
      const replaced = previous ?? previousExtra?.photo;
      const pixels =
        current.reduce((sum, photo) => sum + photo.width * photo.height, 0) +
        Object.values(imageRef.current)
          .flat()
          .reduce(
            (sum, image) => sum + image.photo.width * image.photo.height,
            0,
          ) -
        (replaced ? replaced.width * replaced.height : 0);
      if (pixels + added.width * added.height > MAX_TOTAL_PIXELS)
        throw new Error(
          "This collection is too large. Remove a photo before adding this result.",
        );
      if (destination === "template") {
        if (current.length >= MAX_IMAGES)
          throw new Error(
            "Your template already has 10 photos. Add this result as a layer instead.",
          );
        replacePhotos([...current, added]);
        setSelectedPhotoId(added.id);
        setSidebarPane("photos");
        setStep(2);
        setQuickStep(2);
      } else if (destination === "image") {
        if (extras.length >= MAX_EXTRA_IMAGES)
          throw new Error("This theme already has 10 separate images.");
        const order = frontLayerOrder(
          orderedLayers(
            current,
            themePhotoLayers[theme] ?? {},
            wordingByTheme[theme],
            themeStickers[theme] ?? [],
            extras,
          ),
        );
        updateImages(theme, [
          ...extras,
          {
            photo: added,
            frame: defaultImageFrame(added, previewDimensions, order),
            crop: { x: 0.5, y: 0.5 },
          },
        ]);
        setMode("editor");
        setSidebarPane("photos");
        setStep(2);
      } else if (previous) {
        const replacement = { ...added, id: previous.id };
        replacePhotos(
          current.map((photo) =>
            photo.id === previous.id ? replacement : photo,
          ),
        );
        setCropPositions((value) => ({
          ...value,
          [previous.id]: { x: 0.5, y: 0.5 },
        }));
      } else if (previousExtra) {
        const replacement = { ...added, id: previousExtra.photo.id };
        updateImages(
          theme,
          extras.map((image) =>
            image.photo.id === previousExtra.photo.id
              ? { ...image, photo: replacement, crop: { x: 0.5, y: 0.5 } }
              : image,
          ),
        );
      }
      committed = true;
      if (replaced) disposePhoto(replaced);
      setNotice({
        text:
          destination === "replace"
            ? "AI edit applied. Your photo frame and layout are preserved."
            : "Your AI image is ready in the collage.",
        error: false,
      });
    } finally {
      if (added && !committed) disposePhoto(added);
      loadingRef.current = false;
      if (mounted.current) setLoading(false);
    }
  };
  const currentImages = themeImages[theme] ?? EMPTY_IMAGES;
  const hasCurrentImages = !!(photos.length || currentImages.length);
  const previewPhotos = photos.length
    ? photos
    : currentImages.length
      ? []
      : templatePhotos;

  return (
    <div
      className="studio-shell"
      data-step={step}
      data-pane={sidebarPane}
      data-focus={focusMode}
      data-mode={mode}
    >
      {aiOpen && (
        <AiStudio
          sources={[
            ...photos.map((photo, index) => ({
              id: photo.id,
              label: `Photo ${index + 1} · ${photo.name}`,
              photo,
              kind: "template" as const,
            })),
            ...currentImages.map((image, index) => ({
              id: image.photo.id,
              label: `Added image ${index + 1} · ${image.photo.name}`,
              photo: image.photo,
              kind: "image" as const,
            })),
          ]}
          initialSourceId={aiInitialSourceId}
          photoCount={photos.length}
          imageCount={currentImages.length}
          onApply={applyAiImage}
          onClose={() => setAiOpen(false)}
        />
      )}
      <a href="#studio" className="skip-link">
        Skip to collage workspace
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="/"
          aria-label="FrameForge home"
          onClick={(event) => {
            if (hasSessionWork || loading || exporting) {
              event.preventDefault();
              session.request("restart");
            }
          }}
        >
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          <span>FrameForge</span>
          <span className="version-tag">V1</span>
        </a>
        <div
          className="studio-mode-switch"
          role="group"
          aria-label="Studio mode"
        >
          <button
            aria-pressed={mode === "quick"}
            onClick={() => {
              setMode("quick");
              setFocusMode(false);
            }}
          >
            <Zap size={13} aria-hidden="true" /> Quick Create
          </button>
          <button aria-pressed={mode === "editor"} onClick={customize}>
            <SlidersHorizontal size={13} aria-hidden="true" /> Full editor
          </button>
        </div>
        <nav className="step-nav" aria-label="Collage steps">
          {(mode === "quick"
            ? [
                { label: "Photos", icon: Upload },
                { label: "Design", icon: Layers3 },
                { label: "Download", icon: Images },
              ]
            : [
                { label: "Templates", icon: Layers3 },
                { label: "Photos", icon: Upload },
                { label: "Export", icon: Images },
              ]
          ).map((item, i) => (
            <div className="step-wrap" key={item.label}>
              <button
                onClick={() =>
                  mode === "quick" ? setQuickStep(i + 1) : goStep(i + 1)
                }
                className={
                  (mode === "quick" ? quickStep : step) === i + 1
                    ? "active"
                    : i === 0 && photos.length
                      ? "complete"
                      : ""
                }
                aria-current={
                  (mode === "quick" ? quickStep : step) === i + 1
                    ? "step"
                    : undefined
                }
              >
                <span className="step-number">
                  {i === 0 && photos.length ? <Check size={12} /> : `0${i + 1}`}
                </span>
                {item.label}
              </button>
              {i < 2 && <ChevronRight size={12} />}
            </div>
          ))}
        </nav>
        <div className="header-right">
          <DraftStatus
            status={draft.status}
            hasWork={hasSessionWork}
            error={draft.error}
            updatedAt={draft.updatedAt}
            onRetry={() => {
              void draft.retry();
            }}
            onSave={() => {
              void draft.saveNow();
            }}
          />
          <div
            className="history-buttons"
            role="group"
            aria-label="Edit history"
            data-history-revision={historyRevision}
          >
            <button
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
              disabled={!canUndo || loading || exporting}
              onClick={undoEdit}
            >
              <Undo2 size={15} />
            </button>
            <button
              aria-label="Redo"
              title="Redo (Ctrl+Y)"
              disabled={!canRedo || loading || exporting}
              onClick={redoEdit}
            >
              <Redo2 size={15} />
            </button>
          </div>
          <span
            className="local-badge"
            title="Collage editing and drafts stay on this device. Optional AI sends your chosen reference to Cloudflare."
          >
            <span />
            Local collage editing
          </span>
          <span className="header-rule" />
          <button
            className="session-restart"
            aria-label="Start over"
            title="Start a new collage"
            disabled={loading || exporting}
            onClick={() =>
              hasSessionWork ? session.request("restart") : startNewCollage()
            }
          >
            <RotateCcw size={15} />
            <span>Start over</span>
          </button>
          <button
            className="help-button"
            ref={helpButton}
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={16} /> <span>Quick guide</span>
          </button>
        </div>
      </header>
      <div className="draft-mobile-status">
        <DraftStatus
          status={draft.status}
          hasWork={hasSessionWork}
          error={draft.error}
          updatedAt={draft.updatedAt}
          onRetry={() => {
            void draft.retry();
          }}
          onSave={() => {
            void draft.saveNow();
          }}
        />
      </div>
      <main
        className={mode === "quick" ? "quick-layout" : "editor-layout"}
        id="studio"
      >
        {mode === "quick" && (
          <QuickCreatePanel
            step={quickStep}
            onStep={setQuickStep}
            photos={photos}
            samplePhotos={templatePhotos}
            busy={loading || exporting}
            exporting={exporting}
            onFiles={addFiles}
            onSamples={loadSamples}
            onRemove={removePhoto}
            onReorder={reorder}
            onClear={clear}
            selected={theme}
            onTheme={selectTheme}
            dimensions={previewDimensions}
            preset={preset}
            onPreset={setPreset}
            format={format}
            onFormat={setFormat}
            onExport={exportCollage}
            downloaded={downloaded}
            collection={travelCollection}
            onCollection={setTravelCollection}
            trip={tripDetails}
            onTrip={updateTripDetails}
            customizations={colorsByTheme}
            textLayers={wordingByTheme}
            photoLayers={themePhotoLayers}
            stickers={themeStickers}
            images={themeImages}
            cropPositions={cropPositions}
            onCustomize={customize}
          />
        )}
        {mode === "editor" && (
          <aside className="theme-panel">
            <div className="sidebar-tabs" aria-label="Studio tools">
              <button
                aria-label="Show templates"
                aria-pressed={sidebarPane === "templates"}
                onClick={() => goStep(1)}
              >
                <LayoutTemplate size={14} aria-hidden="true" /> Templates
              </button>
              <button
                aria-label="Show photos"
                aria-pressed={sidebarPane === "photos"}
                onClick={() => goStep(2)}
              >
                <Images size={14} aria-hidden="true" /> Photos{" "}
                <span>{photos.length}/10</span>
              </button>
            </div>
            <div className="sidebar-themes">
              {" "}
              <ThemeSelector
                photos={photos.length ? photos : templatePhotos}
                templateOnly={!photos.length}
                imagesByTheme={themeImages}
                dimensions={previewDimensions}
                cropPositions={cropPositions}
                customizations={colorsByTheme}
                textLayersByTheme={wordingByTheme}
                photoLayersByTheme={themePhotoLayers}
                stickersByTheme={themeStickers}
                linesByTheme={themeLines}
                selected={theme}
                onSelect={selectTheme}
              />
            </div>
            <div className="sidebar-photos">
              <div className="photos-panel-heading">
                <span className="eyebrow">02 / YOUR PHOTOS</span>
                <h2>Add your memories</h2>
              </div>{" "}
              {photos.length > 0 && photos.every((p) => p.sample) && (
                <div className="sample-banner">
                  <Sparkles size={14} />
                  <span>You’re exploring with sample photos.</span>
                  <button
                    onClick={() =>
                      document
                        .querySelector<HTMLInputElement>(
                          '[data-testid="photo-input"]',
                        )
                        ?.click()
                    }
                    disabled={loading || exporting}
                  >
                    Use your own <ArrowRight size={12} />
                  </button>
                </div>
              )}
              {photos.length ? (
                <ImageGallery
                  photos={photos}
                  busy={loading || exporting}
                  onRemove={removePhoto}
                  onReorder={reorder}
                  onFiles={addFiles}
                  onClear={clear}
                  selectedId={selectedPhotoId}
                  onSelect={setSelectedPhotoId}
                />
              ) : (
                <section className="upload-section" id="photos">
                  <ImageUploader onFiles={addFiles} busy={loading} count={0} />
                  <button
                    className="sample-button"
                    onClick={loadSamples}
                    disabled={loading}
                  >
                    <Sparkles size={14} /> Just looking around?{" "}
                    <strong>Try sample photos</strong>
                    <ArrowRight size={14} />
                  </button>
                </section>
              )}
            </div>
          </aside>
        )}
        <div className="center-panel">
          <CollagePreview
            onOpenAI={openAi}
            quick={mode === "quick"}
            onCustomize={customize}
            key={editorSession}
            photos={previewPhotos}
            focusMode={focusMode}
            onFocusMode={() => setFocusMode((v) => !v)}
            templateOnly={!hasCurrentImages}
            images={currentImages}
            onImages={(next) => updateImages(theme, next)}
            onAddImage={() => extraImageInput.current?.click()}
            onRemoveImage={removeIndependentImage}
            onReplaceImage={replaceIndependentImage}
            dimensions={previewDimensions}
            theme={selectedTheme}
            busy={loading || exporting}
            cropPositions={cropPositions}
            onCropPositions={setCropPositions}
            customization={colorsByTheme[theme]}
            textLayers={wordingByTheme[theme]}
            onTextLayers={updateThemeTextLayers}
            stickers={themeStickers[theme] ?? EMPTY_STICKERS}
            onStickers={(next) =>
              setThemeStickers((current) => ({ ...current, [theme]: next }))
            }
            lines={themeLines[theme] ?? []}
            onLines={(next) =>
              setThemeLines((current) => ({ ...current, [theme]: next }))
            }
            onCustomizationChange={updateThemeCustomization}
            photoLayers={themePhotoLayers[theme] ?? {}}
            onPhotoLayers={(next) =>
              setThemePhotoLayers((current) => ({ ...current, [theme]: next }))
            }
            selectedPhotoId={selectedPhotoId}
            onSelectPhoto={setSelectedPhotoId}
            onRemovePhoto={removePhoto}
            onReplacePhoto={replacePhoto}
            onAddPhotos={() => {
              setFocusMode(false);
              goStep(2);
              document
                .querySelector<HTMLInputElement>('[data-testid="photo-input"]')
                ?.click();
            }}
          />
        </div>
        {mode === "editor" && (
          <ExportPanel
            theme={theme}
            customization={colorsByTheme[theme]}
            onCustomizationChange={updateThemeCustomization}
            preset={preset}
            onPreset={setPreset}
            custom={custom}
            onCustom={(key, value) =>
              setCustom((c) => ({ ...c, [key]: value }))
            }
            dimensions={previewDimensions}
            invalid={invalid}
            format={format}
            onFormat={setFormat}
            quality={quality}
            onQuality={setQuality}
            busy={exporting}
            disabled={!hasCurrentImages || loading}
            downloaded={downloaded}
            onExport={exportCollage}
            textLayers={wordingByTheme[theme]}
            onTextLayers={updateThemeTextLayers}
          />
        )}
      </main>
      {draft.phase === "checking" && (
        <div className="draft-checking" role="status">
          Checking for your saved collage…
        </div>
      )}
      {draft.record &&
        (draft.phase === "prompt" ||
          draft.phase === "restoring" ||
          draft.phase === "clearing") && (
          <DraftRecoveryDialog
            record={draft.record}
            busy={draft.phase !== "prompt"}
            error={draft.error}
            progress={draft.progress}
            onRestore={() => {
              void draft.restore();
            }}
            onDiscard={() => {
              void draft.discard();
            }}
          />
        )}
      <input
        ref={extraImageInput}
        data-testid="extra-image-input"
        className="visually-hidden"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        aria-label="Add independent image files"
        disabled={loading || exporting}
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = "";
          void addIndependentImages(files);
        }}
      />
      <footer className="app-footer">
        <span>Made for the moments that matter.</span>
        <span>
          FRAMEFORGE <span className="footer-dot">•</span> NO
          WATERMARKS, EVER.
        </span>
      </footer>
      {session.action && (
        <SessionExitDialog
          action={session.action}
          busy={loading || exporting}
          canDownload={hasCurrentImages && !invalid}
          downloaded={downloaded}
          error={notice?.error ? notice.text : null}
          onCancel={session.cancel}
          onConfirm={
            session.action === "refresh" ? session.refresh : startNewCollage
          }
          onDownload={() => {
            void exportCollage();
          }}
        />
      )}
      {notice && (
        <div
          className={`toast ${notice.error ? "error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {help && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setHelp(false);
              helpButton.current?.focus();
            }
          }}
        >
          <section
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            <button
              className="icon-button modal-close"
              ref={helpClose}
              aria-label="Close guide"
              onClick={() => {
                setHelp(false);
                helpButton.current?.focus();
              }}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">YOUR THREE-STEP STUDIO</span>
            <h2 id="help-title">Make a little magic.</h2>
            <ol>
              <li>
                <strong>Add your photos.</strong>
                <p>
                  Choose or drop 1–10 JPG, PNG, or WEBP images, up to 30 MB
                  each. Try samples first if you like.
                </p>
              </li>
              <li>
                <strong>Find your favorite theme.</strong>
                <p>
                  Explore {THEMES.length} compositions. Drag photos or use their
                  arrows to change the order. Select a photo on the preview to
                  move, resize, rotate, reshape, replace, or remove it. Crop
                  mode moves the image inside its frame. Add text to tell your
                  story.
                </p>
              </li>
              <li>
                <strong>Make it yours to keep.</strong>
                <p>
                  Pick a platform or custom size, choose PNG, JPG, or WEBP, and
                  download your finished collage.
                </p>
              </li>
            </ol>
            <div className="help-privacy">
              <LockKeyhole size={16} />
              <p>
                Collage editing and saved drafts stay in this browser. AI Studio
                sends only the description and resized photo you confirm to
                Cloudflare. After refreshing, choose Continue editing. Clearing
                browser data removes saved drafts.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
