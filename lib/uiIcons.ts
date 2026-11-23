import {
  Compass,
  Grid2X2,
  Landmark,
  LayoutTemplate,
  MapPinned,
  Mountain,
  Palette,
  Route,
  Sparkles,
  Square,
  RectangleVertical,
  Monitor,
  TreePalm,
  type LucideIcon,
} from "lucide-react";

const collectionIcons: Record<string, LucideIcon> = {
  Tour: Compass,
  Trip: MapPinned,
  Grid: Grid2X2,
  Editorial: LayoutTemplate,
  Creative: Palette,
  "All themes": Grid2X2,
  Recommended: Sparkles,
  Beach: TreePalm,
  Mountains: Mountain,
  "Road trips": Route,
  "City & heritage": Landmark,
  "All designs": Grid2X2,
};
export function collectionIcon(name: string) {
  return collectionIcons[name] ?? LayoutTemplate;
}
export function outputIcon(preset: string): LucideIcon {
  return preset === "square"
    ? Square
    : preset === "landscape"
      ? Monitor
      : RectangleVertical;
}
