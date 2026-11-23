import type {
  CanvasTextLayer,
  CropPosition,
  ImageElement,
  LineLayer,
  ImageFormat,
  Photo,
  PhotoLayers,
  StickerLayer,
  ThemeCustomization,
  ThemeId,
} from "@/types/collage";
import type { TravelCollection, TravelDetails } from "@/lib/travelTemplates";

export interface StudioSnapshot {
  mode: "quick" | "editor";
  quickStep: number;
  step: number;
  sidebarPane: "templates" | "photos";
  photos: Photo[];
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
  themeImages: Partial<Record<ThemeId, ImageElement[]>>;
  travelCollection: TravelCollection;
  tripDetails: TravelDetails;
}
