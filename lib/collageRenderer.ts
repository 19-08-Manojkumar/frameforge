import type {
  CanvasTextLayer,
  CropPosition,
  Dimensions,
  Photo,
  PhotoLayers,
  PhotoSlot,
  StickerLayer,
  ThemeCustomization,
  ThemeId,
  ImageElement,
  LineLayer,
} from "@/types/collage";
import { createLayout } from "@/lib/themeLayouts";
import { resolvePhotoSlots } from "@/lib/photoEditing";
import { drawTripBackdrop, drawTripOverlay } from "@/lib/tripDecorations";
import { TRIP_THEME_IDS } from "@/lib/tripLayouts";
import { isBlendedTour } from "@/lib/blendedTourLayouts";
import {
  drawBlendedTourBackdrop,
  drawBlendedTourOverlay,
} from "@/lib/blendedTourDecorations";
import { applyPhotoBlendMask } from "@/lib/photoBlending";
import { textBoxLayout } from "@/lib/textLayout";
import { drawStickers } from "@/lib/stickerRenderer";
import { drawLines } from "@/lib/lineRenderer";
import { orderedLayers } from "@/lib/layerOrder";
import {
  createDefaultThemeCustomizations,
  createDefaultTextLayers,
  THEME_SECTIONS,
} from "@/lib/themeCustomization";

const DEFAULT_CUSTOMIZATIONS = createDefaultThemeCustomizations();
const DEFAULT_TEXT_LAYERS = createDefaultTextLayers();

export interface RenderOptions extends Dimensions {
  theme: ThemeId;
  photos: Photo[];
  preview?: boolean;
  cropPositions?: Record<string, CropPosition>;
  customization?: ThemeCustomization;
  textLayers?: CanvasTextLayer[];
  photoLayers?: PhotoLayers;
  stickers?: StickerLayer[];
  lines?: LineLayer[];
  /** Hide the active text editor while retaining its stable position in the stack. */
  hiddenTextId?: string | null;
  images?: ImageElement[];
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  shape?: "circle" | "arch",
) {
  ctx.beginPath();
  if (shape === "circle")
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === "arch") {
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h / 2);
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  } else ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}
/** Center crop with a single uniform scale: images never stretch. */
export function coverCrop(
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  position: CropPosition = { x: 0.5, y: 0.5 },
) {
  const scale =
    Math.max(dw / sw, dh / sh) * Math.max(1, Math.min(3, position.zoom ?? 1));
  const cropWidth = dw / scale;
  const cropHeight = dh / scale;
  return {
    sx: (sw - cropWidth) * Math.max(0, Math.min(1, position.x)),
    sy: (sh - cropHeight) * Math.max(0, Math.min(1, position.y)),
    sw: cropWidth,
    sh: cropHeight,
  };
}
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  photo: Photo,
  s: PhotoSlot,
  u: number,
  preview: boolean,
  vintage: boolean,
  stacked: boolean,
  cropPosition: CropPosition | undefined,
  smoothEffect: ThemeCustomization["smoothEffect"],
  gapColor: string | null,
  scratch?: HTMLCanvasElement,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, s.opacity ?? 1));
  ctx.globalCompositeOperation = s.blendMode ?? "source-over";
  ctx.save();
  ctx.translate(s.x + s.width / 2, s.y + s.height / 2);
  if (stacked) {
    // A second paper frame peeks out behind the photo, without covering photo content.
    ctx.save();
    ctx.rotate(-(s.rotation || 0));
    ctx.fillStyle = gapColor ?? "#f5f3ec";
    ctx.fillRect(
      -s.width * 0.49,
      -s.height * 0.49,
      s.width * 0.98,
      s.height * 0.98,
    );
    ctx.restore();
  }
  ctx.rotate(s.rotation || 0);
  const x = -s.width / 2,
    y = -s.height / 2;
  const mat = (s.mat || 0) * Math.min(s.width, s.height),
    bottom = (s.bottomMat || s.mat || 0) * Math.min(s.width, s.height);
  if (s.shadow) {
    const transform = ctx.getTransform();
    const backingScale = Math.hypot(transform.a, transform.b);
    ctx.shadowColor = "#18231e25";
    ctx.shadowBlur = u * 0.016 * backingScale;
    ctx.shadowOffsetY = u * 0.006 * backingScale;
  }
  const frame = (fx: number, fy: number, fw: number, fh: number) => {
    if (!s.polygon) {
      rounded(ctx, fx, fy, fw, fh, (s.radius || 0) * u, s.shape);
      return;
    }
    ctx.beginPath();
    s.polygon.forEach(([a, b], i) =>
      i
        ? ctx.lineTo(fx + a * fw, fy + b * fh)
        : ctx.moveTo(fx + a * fw, fy + b * fh),
    );
    ctx.closePath();
  };
  frame(x, y, s.width, s.height);
  ctx.fillStyle = gapColor ?? (vintage ? "#f3e7cb" : "#fffefa");
  if (!((s.feather || s.fadeEdges || s.blendMask) && !mat && !bottom))
    ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const px = x + mat,
    py = y + mat,
    pw = s.width - 2 * mat,
    ph = s.height - mat - bottom;
  frame(px, py, pw, ph);
  ctx.clip();
  const source = preview ? photo.preview : photo.source;
  const crop = coverCrop(source.width, source.height, pw, ph, cropPosition);
  const fadeAmount = Math.max(
    s.feather ?? 0,
    smoothEffect.enabled ? (0.1 * smoothEffect.size) / 100 : 0,
  );
  if ((!fadeAmount && !s.fadeEdges && !s.blendMask) || !scratch) {
    ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, px, py, pw, ph);
  } else {
    const transform = ctx.getTransform();
    const scale = Math.max(0.1, Math.hypot(transform.a, transform.b));
    scratch.width = Math.max(1, Math.ceil(pw * scale));
    scratch.height = Math.max(1, Math.ceil(ph * scale));
    const blend = scratch.getContext("2d");
    if (blend) {
      blend.setTransform(scale, 0, 0, scale, 0, 0);
      blend.imageSmoothingEnabled = true;
      blend.imageSmoothingQuality = "high";
      blend.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph);
      if (vintage) {
        blend.fillStyle = "#c59b5420";
        blend.fillRect(0, 0, pw, ph);
      }
      // Fade photo edges into the soft image mosaic underneath for a seamless finish.
      const fade = Math.min(pw, ph) * Math.min(0.5, fadeAmount);
      const edges = s.fadeEdges;
      const left = Math.max(fade, pw * (edges?.left ?? 0));
      const right = Math.max(fade, pw * (edges?.right ?? 0));
      const top = Math.max(fade, ph * (edges?.top ?? 0));
      const bottomEdge = Math.max(fade, ph * (edges?.bottom ?? 0));
      blend.globalCompositeOperation = "destination-in";
      const masks = [
        [blend.createLinearGradient(0, 0, Math.max(0.01, left), 0), left],
        [
          blend.createLinearGradient(pw - Math.max(0.01, right), 0, pw, 0),
          right,
        ],
        [blend.createLinearGradient(0, 0, 0, Math.max(0.01, top)), top],
        [
          blend.createLinearGradient(0, ph - Math.max(0.01, bottomEdge), 0, ph),
          bottomEdge,
        ],
      ] as const;
      masks[0][0].addColorStop(0, "transparent");
      masks[0][0].addColorStop(1, "white");
      masks[1][0].addColorStop(0, "white");
      masks[1][0].addColorStop(1, "transparent");
      masks[2][0].addColorStop(0, "transparent");
      masks[2][0].addColorStop(1, "white");
      masks[3][0].addColorStop(0, "white");
      masks[3][0].addColorStop(1, "transparent");
      for (const [gradient, extent] of masks) {
        if (!extent) continue;
        blend.fillStyle = gradient;
        blend.fillRect(0, 0, pw, ph);
      }
      blend.globalCompositeOperation = "source-over";
      if (s.blendMask) applyPhotoBlendMask(blend, s.blendMask, pw, ph);
      ctx.drawImage(scratch, px, py, pw, ph);
    }
  }
  ctx.restore();
  if (s.polygon) {
    ctx.save();
    ctx.translate(s.x + s.width / 2, s.y + s.height / 2);
    ctx.rotate(s.rotation ?? 0);
    ctx.beginPath();
    s.polygon.forEach(([a, b], i) =>
      i
        ? ctx.lineTo((a - 0.5) * s.width, (b - 0.5) * s.height)
        : ctx.moveTo((a - 0.5) * s.width, (b - 0.5) * s.height),
    );
    ctx.closePath();
    ctx.strokeStyle = gapColor ?? "#fffef5";
    ctx.lineWidth = u * 0.006;
    ctx.stroke();
    ctx.restore();
  }
  if (s.paperclip) {
    ctx.save();
    ctx.translate(s.x + s.width * 0.12, s.y + s.height * 0.015);
    ctx.rotate(0.24);
    ctx.strokeStyle = "#4e5049";
    ctx.lineWidth = u * 0.0016;
    rounded(ctx, -u * 0.009, -u * 0.023, u * 0.021, u * 0.086, u * 0.009);
    ctx.stroke();
    rounded(ctx, -u * 0.004, -u * 0.018, u * 0.011, u * 0.066, u * 0.005);
    ctx.stroke();
    ctx.restore();
  }
  if (s.tape) {
    ctx.save();
    ctx.translate(s.x + s.width * 0.5, s.y + u * 0.002);
    ctx.rotate((s.rotation || 0) - 0.06);
    ctx.fillStyle = "#d4bb8cbb";
    ctx.fillRect(-s.width * 0.15, -u * 0.012, s.width * 0.3, u * 0.027);
    ctx.restore();
  }
  ctx.restore();
}
/** Optional soft, color-washed image blend behind the selected theme. */
function drawPhotoAtmosphere(
  ctx: CanvasRenderingContext2D,
  photos: Photo[],
  width: number,
  height: number,
  preview: boolean,
  u: number,
  effect: ThemeCustomization["smoothEffect"],
) {
  if (!photos.length || !effect.enabled || effect.size <= 0) return;
  const amount = effect.size / 100;
  const cols = Math.max(
    1,
    Math.ceil(Math.sqrt(photos.length * (width / height))),
  );
  const rows = Math.ceil(photos.length / cols);
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  ctx.save();
  ctx.globalAlpha = 0.48 * amount;
  ctx.filter = `blur(${u * 0.08 * amount}px) saturate(1.12)`;
  photos.forEach((photo, index) => {
    const source = preview ? photo.preview : photo.source;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * cellWidth - cellWidth * 0.045;
    const y = row * cellHeight - cellHeight * 0.045;
    const drawWidth = cellWidth * 1.09;
    const drawHeight = cellHeight * 1.09;
    const crop = coverCrop(source.width, source.height, drawWidth, drawHeight);
    ctx.drawImage(
      source,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      x,
      y,
      drawWidth,
      drawHeight,
    );
  });
  ctx.filter = "none";
  ctx.globalAlpha = 0.4 * amount;
  ctx.fillStyle = effect.color;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
function drawThemeBackdrop(
  ctx: CanvasRenderingContext2D,
  theme: ThemeId,
  width: number,
  height: number,
  u: number,
  customization: ThemeCustomization,
) {
  if (theme !== "wander-cutout") return;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = customization.accentColor;
  ctx.font = `900 ${u * 0.86}px Impact, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("#", width * 0.95, height * 0.94);
  ctx.restore();
}
function drawThemeDecorations(
  ctx: CanvasRenderingContext2D,
  theme: ThemeId,
  width: number,
  height: number,
  u: number,
  customization: ThemeCustomization,
) {
  ctx.save();
  if (theme === "tour-poster") {
    const shade = ctx.createLinearGradient(0, 0, width * 0.68, 0);
    shade.addColorStop(0, "#102d2de0");
    shade.addColorStop(0.72, "#102d2d80");
    shade.addColorStop(1, "#102d2d00");
    if (!customization.sectionColor) {
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, width, height * 0.68);
    }
    ctx.strokeStyle = customization.accentColor;
    ctx.lineWidth = Math.max(1, u * 0.002);
    ctx.beginPath();
    ctx.moveTo(width * 0.078, height * 0.63);
    ctx.lineTo(width * 0.39, height * 0.63);
    ctx.stroke();
  } else if (theme === "sea-breeze") {
    const swatches = [
      customization.accentColor,
      "#355a72",
      "#607a79",
      "#b3a6a0",
      "#d0d0c9",
    ];
    const swatchX = width * 0.805;
    const swatchWidth = width * 0.135;
    const swatchHeight = Math.min(height * 0.09, u * 0.085);
    const gap = height * 0.018;
    const startY = (height - (swatchHeight * swatches.length + gap * 4)) / 2;
    swatches.forEach((color, index) => {
      rounded(
        ctx,
        swatchX,
        startY + index * (swatchHeight + gap),
        swatchWidth,
        swatchHeight,
        swatchHeight * 0.2,
      );
      ctx.fillStyle = color;
      ctx.fill();
    });
  } else if (theme === "hike-poster") {
    rounded(ctx, width * 0.44, height * 0.775, width * 0.12, u * 0.003, 0);
    ctx.fillStyle = customization.accentColor;
    ctx.fill();
  } else if (theme === "wander-cutout") {
    ctx.strokeStyle = customization.accentColor;
    ctx.lineWidth = Math.max(2, u * 0.004);
    ctx.setLineDash([u * 0.012, u * 0.009]);
    ctx.strokeRect(u * 0.045, u * 0.045, width - u * 0.09, height - u * 0.09);
  } else if (theme === "postcard-stack") {
    ctx.strokeStyle = customization.accentColor;
    ctx.lineWidth = Math.max(1, u * 0.002);
    ctx.setLineDash([u * 0.009, u * 0.008]);
    ctx.strokeRect(u * 0.035, u * 0.035, width - u * 0.07, height - u * 0.07);
    ctx.setLineDash([]);
    ctx.strokeRect(width - u * 0.16, u * 0.045, u * 0.09, u * 0.1);
  } else if (theme === "scenic-fan") {
    const road = ctx.createLinearGradient(0, height * 0.77, 0, height);
    road.addColorStop(0, "#929487");
    road.addColorStop(1, "#303a39");
    const inset = u * 0.018;
    ctx.beginPath();
    ctx.rect(inset, height * 0.77, width - 2 * inset, height * 0.23 - inset);
    ctx.clip();
    ctx.fillStyle = customization.sectionColor ?? road;
    ctx.fillRect(
      inset,
      height * 0.77,
      width - 2 * inset,
      height * 0.23 - inset,
    );
    ctx.strokeStyle = "#e6e6cf99";
    ctx.lineWidth = u * 0.003;
    for (const x of [width * 0.025, width * 0.975]) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.77);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    ctx.setLineDash([u * 0.018, u * 0.016]);
    ctx.beginPath();
    ctx.moveTo(width * 0.5, height * 0.78);
    ctx.lineTo(width * 0.5, height);
    ctx.stroke();
  } else if (theme === "torn-travel") {
    ctx.strokeStyle = customization.gapColor ?? "#fffdf4";
    ctx.lineWidth = u * 0.01;
    ctx.shadowColor = "#18332c55";
    ctx.shadowBlur = u * 0.007;
    ctx.beginPath();
    for (let i = 0; i <= 70; i++) {
      const x = width * 0.746 + Math.sin(i * 2.7) * u * 0.003;
      i ? ctx.lineTo(x, (height * i) / 70) : ctx.moveTo(x, 0);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function drawTextLayers(
  ctx: CanvasRenderingContext2D,
  layers: CanvasTextLayer[],
  width: number,
  height: number,
  u: number,
) {
  for (const layer of layers) {
    if (!layer.text.trim()) continue;
    const box = textBoxLayout(layer, { width, height }, ctx);
    const size = box.fontSize;
    const x = layer.x * width;
    const y = layer.y * height;
    const lines = box.lines;
    const lineHeight = box.lineHeight;
    ctx.save();
    ctx.font = `${layer.italic ? "italic " : ""}${layer.bold ? "700" : "400"} ${size}px ${layer.fontFamily}`;
    ctx.textAlign = layer.align;
    ctx.textBaseline = "middle";
    if (layer.background) {
      const paddingX = size * 0.38;
      const paddingY = size * 0.2;
      rounded(
        ctx,
        box.left - paddingX,
        box.top - paddingY,
        box.width + paddingX * 2,
        box.height + paddingY * 2,
        size * 0.25,
      );
      ctx.fillStyle = layer.backgroundColor;
      ctx.globalAlpha = 0.86;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = layer.color;
    lines.forEach((line, index) => {
      const baseline = y + (index - (lines.length - 1) / 2) * lineHeight;
      ctx.fillText(line, x, baseline);
    });
    ctx.restore();
  }
} /** Render at requested logical dimensions onto any backing resolution. Same function for all outputs. */
export function renderCollage(
  canvas: HTMLCanvasElement,
  options: RenderOptions,
  pixelWidth = options.width,
) {
  const {
    width,
    height,
    photos,
    theme,
    preview = false,
    cropPositions = {},
    customization = DEFAULT_CUSTOMIZATIONS[theme],
    textLayers = DEFAULT_TEXT_LAYERS[theme],
    photoLayers = {},
  } = options;
  canvas.width = Math.max(1, Math.round(pixelWidth));
  canvas.height = Math.max(1, Math.round((pixelWidth * height) / width));
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx)
    throw new Error(
      "Your browser could not create a canvas. Please try a current browser.",
    );
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const layout = createLayout(theme, photos.length, width, height),
    u = Math.min(width, height),
    scratch =
      (customization.smoothEffect.enabled &&
        customization.smoothEffect.size > 0) ||
      TRIP_THEME_IDS.includes(theme) ||
      isBlendedTour(theme) ||
      Object.values(photoLayers).some(
        (layer) =>
          (layer.feather ?? 0) > 0 || layer.fadeEdges || layer.blendMask,
      ) ||
      options.images?.some(
        (image) =>
          (image.frame.feather ?? 0) > 0 ||
          image.frame.fadeEdges ||
          image.frame.blendMask,
      )
        ? document.createElement("canvas")
        : undefined;
  if (layout.background === "gradient" && !customization.backgroundCustomized) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#c5c4f3");
    gradient.addColorStop(0.5, "#f1c6d4");
    gradient.addColorStop(1, "#f5d7a6");
    ctx.fillStyle = gradient;
  } else ctx.fillStyle = customization.backgroundColor;
  ctx.fillRect(0, 0, width, height);
  if (
    theme === "torn-travel" &&
    photos.length &&
    !customization.backgroundCustomized
  ) {
    ctx.save();
    const image = preview ? photos[0].preview : photos[0].source;
    const crop = coverCrop(image.width, image.height, width, height);
    ctx.filter = `blur(${u * 0.018 * Math.hypot(ctx.getTransform().a, ctx.getTransform().b)}px)`;
    ctx.globalAlpha = 0.6;
    ctx.drawImage(
      image,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      -u * 0.025,
      -u * 0.025,
      width + u * 0.05,
      height + u * 0.05,
    );
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    const mist = ctx.createLinearGradient(0, 0, 0, height);
    mist.addColorStop(0, "#d4e8eddd");
    mist.addColorStop(0.45, "#d4e8ed22");
    mist.addColorStop(1, "#193b2dcc");
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  drawPhotoAtmosphere(
    ctx,
    photos,
    width,
    height,
    preview,
    u,
    customization.smoothEffect,
  );
  drawThemeBackdrop(ctx, theme, width, height, u, customization);
  drawTripBackdrop(ctx, theme, width, height, customization, photos.length);
  if (isBlendedTour(theme))
    drawBlendedTourBackdrop(ctx, theme, width, height, customization);
  if (
    theme === "scrapbook" ||
    theme === "travel-journal" ||
    theme === "retro-vintage"
  ) {
    ctx.strokeStyle = theme === "travel-journal" ? "#b2a58c25" : "#7768470c";
    ctx.lineWidth = u * 0.0007;
    for (let y = u * 0.02; y < height; y += u * 0.025) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  if (theme === "travel-journal") {
    ctx.save();
    ctx.strokeStyle = "#ab9b7a60";
    ctx.lineWidth = u * 0.001;
    ctx.setLineDash([u * 0.006, u * 0.006]);
    ctx.strokeRect(u * 0.027, u * 0.027, width - u * 0.054, height - u * 0.054);
    ctx.restore();
  }
  if (theme === "film-strip") {
    ctx.fillStyle = "#dbd8ca";
    for (let y = u * 0.016; y < height - u * 0.012; y += u * 0.04) {
      rounded(ctx, u * 0.015, y, u * 0.018, u * 0.022, u * 0.004);
      ctx.fill();
      rounded(ctx, width - u * 0.033, y, u * 0.018, u * 0.022, u * 0.004);
      ctx.fill();
    }
  }
  if (customization.gapColor && layout.slots.length) {
    const x = Math.min(...layout.slots.map((s) => s.x)),
      y = Math.min(...layout.slots.map((s) => s.y));
    const right = Math.max(...layout.slots.map((s) => s.x + s.width)),
      bottom = Math.max(...layout.slots.map((s) => s.y + s.height));
    ctx.fillStyle = customization.gapColor;
    const regions = layout.gapRegions ?? [
      { x, y, width: right - x, height: bottom - y },
    ];
    for (const region of regions)
      ctx.fillRect(region.x, region.y, region.width, region.height);
  }
  const slots = resolvePhotoSlots(
    theme,
    photos,
    { width, height },
    photoLayers,
  );
  const stack = orderedLayers(
    photos,
    photoLayers,
    textLayers,
    options.stickers ?? [],
    options.images ?? [],
  );
  const freeform = photos.some((photo) => photoLayers[photo.id]);
  // Decorative panels keep their template position; editable elements share one stack.
  const decorationsOrder = freeform ? -500 : 500;
  const draws = stack.map((layer) => ({
    order: layer.order,
    draw: () => {
      if (layer.kind === "photo") {
        const slot = slots.find((s) => s.index === layer.index)!;
        drawPhoto(
          ctx,
          photos[slot.index],
          slot,
          u,
          preview,
          theme === "retro-vintage",
          theme === "polaroid",
          cropPositions[photos[slot.index].id],
          customization.smoothEffect,
          customization.gapColor,
          scratch,
        );
      } else if (layer.kind === "image") {
        const image = options.images![layer.index];
        const slot = resolvePhotoSlots(
          "clean-grid",
          [image.photo],
          { width, height },
          { [image.photo.id]: image.frame },
        )[0];
        drawPhoto(
          ctx,
          image.photo,
          slot,
          u,
          preview,
          false,
          false,
          image.crop,
          { ...customization.smoothEffect, enabled: false },
          null,
          scratch,
        );
      } else if (layer.kind === "text") {
        if (layer.id !== options.hiddenTextId)
          drawTextLayers(ctx, [textLayers[layer.index]], width, height, u);
      } else
        drawStickers(ctx, [options.stickers![layer.index]], { width, height });
    },
  }));
  draws.push({
    order: decorationsOrder,
    draw: () => {
      if (
        theme !== "scenic-fan" &&
        !isBlendedTour(theme) &&
        !TRIP_THEME_IDS.includes(theme) &&
        customization.sectionColor &&
        THEME_SECTIONS[theme]
      ) {
        const [x, y, w, h] = THEME_SECTIONS[theme]!.rect;
        ctx.fillStyle = customization.sectionColor;
        ctx.fillRect(width * x, height * y, width * w, height * h);
      }
      if (theme !== "torn-travel" || photos.length > 1)
        drawThemeDecorations(ctx, theme, width, height, u, customization);
    },
  });
  draws.push({
    order: 750,
    draw: () => drawTripOverlay(ctx, theme, width, height, customization),
  });
  if (isBlendedTour(theme))
    draws.push({
      order: 750,
      draw: () =>
        drawBlendedTourOverlay(ctx, theme, width, height, customization),
    });
  draws.sort((a, b) => a.order - b.order).forEach(({ draw }) => draw());
  drawLines(ctx, options.lines ?? [], { width, height });
  if (scratch) {
    scratch.width = 1;
    scratch.height = 1;
  }
  return canvas;
}
