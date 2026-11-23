export type ThemeId =
  | "clean-grid"
  | "magazine"
  | "polaroid"
  | "film-strip"
  | "scrapbook"
  | "minimal-white"
  | "dark-editorial"
  | "travel-journal"
  | "retro-vintage"
  | "modern-gradient"
  | "tour-poster"
  | "sea-breeze"
  | "hike-poster"
  | "wander-cutout"
  | "postcard-stack"
  | "sunset-drift"
  | "cloudline-escape"
  | "prism-voyage"
  | "midnight-mirage"
  | "tidal-reverie"
  | "scenic-fan"
  | "torn-travel"
  | "route-diary"
  | "coastal-exposure"
  | "golden-roadtrip"
  | "departure-club"
  | "alpine-atlas"
  | "off-grid-zine"
  | "horizon-cinema"
  | "browser-getaway"
  | "heritage-reverie";
export type ImageFormat = "png" | "jpeg" | "webp";
export interface Photo {
  id: string;
  name: string;
  url: string;
  source: HTMLImageElement;
  preview: HTMLCanvasElement;
  width: number;
  height: number;
  sample?: boolean;
  /** Original local bytes, retained for lossless draft recovery. */
  originalBlob?: Blob;
}
export interface CropPosition {
  x: number;
  y: number;
  /** Uniform zoom inside the frame. One fills the frame without empty edges. */
  zoom?: number;
}
export interface ThemeCustomization {
  backgroundColor: string;
  backgroundCustomized: boolean;
  gapColor: string | null;
  sectionColor: string | null;
  accentColor: string;
  smoothEffect: {
    enabled: boolean;
    size: number;
    color: string;
  };
}
export interface CanvasTextLayer {
  id: string;
  /** Shared canvas stacking order. Omitted values retain the template order. */
  zIndex?: number;
  text: string;
  x: number;
  y: number;
  /** Fractional box width; wording wraps within it at the chosen font size. */
  width?: number;
  /** Minimum fractional height; the box grows when its content needs room. */
  height?: number;
  size: number;
  color: string;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  background: boolean;
  backgroundColor: string;
}
export type StickerKind =
  | "heart"
  | "star"
  | "sparkles"
  | "pin"
  | "palm"
  | "sun"
  | "cloud"
  | "rainbow"
  | "flower"
  | "plane"
  | "camera"
  | "mountains"
  | "compass"
  | "arrow"
  | "ticket"
  | "suitcase"
  | "backpack"
  | "tent"
  | "campfire"
  | "sailboat"
  | "lighthouse"
  | "hot-air-balloon"
  | "bicycle"
  | "camper-van"
  | "passport"
  | "map"
  | "globe"
  | "binoculars"
  | "coffee"
  | "ice-cream"
  | "cocktail"
  | "coconut"
  | "flip-flops"
  | "seashell"
  | "wave"
  | "fish"
  | "turtle"
  | "butterfly"
  | "leaf"
  | "daisy"
  | "moon"
  | "shooting-star"
  | "snowflake"
  | "music-note"
  | "headphones"
  | "gift"
  | "party-hat"
  | "balloon"
  | "smiley"
  | "speech-bubble"
  | "dotted-route"
  | "winding-route"
  | "switchback-trail"
  | "mountain-trail"
  | "ridge-route"
  | "summit-route"
  | "lake-route"
  | "island-route"
  | "coastal-route"
  | "road-trip-route"
  | "air-route"
  | "loop-trail"
  | "waypoint-pair"
  | "waypoint-trio"
  | "destination-pin"
  | "start-flag"
  | "finish-flag"
  | "summit-flag"
  | "trail-signpost"
  | "compass-route"
  | "map-fold-route"
  | "distance-markers"
  | "boot-trail"
  | "campsite-route"
  | "ticket-route"
  | "polaroid-frame"
  | "postage-stamp"
  | "tape-strip"
  | "torn-note"
  | "photo-corners"
  | "journal-label"
  | "round-badge"
  | "checkered-heart"
  | "checkered-flag"
  | "sunburst"
  | "retro-flower"
  | "retro-smile"
  | "lightning-bolt"
  | "ribbon-banner"
  | "film-reel"
  | "film-frame"
  | "clapperboard"
  | "instant-camera"
  | "cassette"
  | "vinyl-record"
  | "disco-ball"
  | "cherries"
  | "strawberry"
  | "boba"
  | "peace-hand"
  | "paper-note"
  | "paper-sticky"
  | "paper-notebook"
  | "paper-postcard"
  | "paper-envelope"
  | "paper-ticket"
  | "paper-tag"
  | "paper-bookmark"
  | "paper-checklist"
  | "paper-grid"
  | "paper-lines"
  | "paper-torn"
  | "paper-folded"
  | "paper-memo"
  | "paper-label"
  | "paper-stamp"
  | "paper-washi"
  | "paper-index"
  | "paper-polaroid"
  | "paper-calendar"
  | "paper-letter"
  | "paper-journal"
  | "paper-ribbon"
  | "paper-cloud"
  | "paper-speech"
  | "paper-flower"
  | "paper-star"
  | "paper-heart"
  | "paper-circle"
  | "paper-scallop"
  | `charm-${string}`;
export type StickerStyle =
  "classic" | "anime-pop" | "trend-studio" | "vintage-paper";
export interface StickerLayer {
  id: string;
  zIndex?: number;
  kind: StickerKind | "emoji";
  /** Missing styles in older drafts retain the original Classic artwork. */
  style?: StickerStyle;
  emoji?: string;
  /** Center in canvas fractions; square size as a fraction of its shorter side. */
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  secondaryColor: string;
  opacity: number;
  flipped: boolean;
  outline: boolean;
}
export type LineStyle =
  | "solid"
  | "dashed"
  | "dotted"
  | "double"
  | "wavy"
  | "zigzag"
  | "arrow"
  | "dash-dot";
export interface LineLayer {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
  style: LineStyle;
  curve: number;
  opacity: number;
  effect?: string;
  secondaryColor?: string;
  palette?: string[];
}
export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  category: "Tour" | "Trip" | "Grid" | "Editorial" | "Creative";
}
export interface Dimensions {
  width: number;
  height: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface PhotoSlot extends Rect {
  index: number;
  shape?: "circle" | "arch";
  polygon?: [number, number][];
  paperclip?: boolean;
  rotation?: number;
  mat?: number;
  bottomMat?: number;
  radius?: number;
  shadow?: boolean;
  tape?: boolean;
  opacity?: number;
  /** Fraction of the smaller photo dimension faded into surrounding layers. */
  feather?: number;
  /** Per-edge crossfades, as fractions of photo width/height. */
  fadeEdges?: { top?: number; right?: number; bottom?: number; left?: number };
  blendMode?: "source-over" | "multiply" | "screen" | "soft-light";
  /** Smooth alpha artwork, separate from photo cropping and frame shape. */
  blendMask?: PhotoBlendMask;
}
export interface PhotoBlendMask {
  kind: "oval" | "diagonal" | "wave" | "bloom";
  softness: number;
  phase?: number;
}
export type PhotoShape =
  "template" | "rectangle" | "rounded" | "circle" | "diamond" | "arch";
/** Positions and sizes are fractions of the output canvas, so edits scale with exports. */
export interface PhotoLayer extends Omit<PhotoSlot, "index"> {
  customShape?: PhotoShape;
  zIndex: number;
}
export type PhotoLayers = Record<string, PhotoLayer>;
/** An independently placed image that never participates in template photo counts. */
export interface ImageElement {
  photo: Photo;
  frame: PhotoLayer;
  crop: CropPosition;
}
export interface CollageLayout {
  slots: PhotoSlot[];
  /** Photo groups whose inner gutters can be colored independently of the canvas. */
  gapRegions?: Rect[];
  background: string;
  kind: ThemeId;
  /** Soft-exposure designs intentionally layer photos while preserving each editable frame. */
  layered?: boolean;
}
