/** Reserve a tool dock only when it fits in the canvas's unused side gutter. */
export function previewDock(
  width: number,
  height: number,
  ratio: number,
  desktop: boolean,
) {
  if (!desktop || ratio >= 1) return 0;
  const fittedWidth = Math.min(width, Math.max(0, height - 54) * ratio);
  const gutter = width - fittedWidth;
  return gutter >= 196 ? Math.min(232, gutter - 12) : 0;
}
export function previewFit(
  width: number,
  height: number,
  ratio: number,
  zoom = 1,
) {
  return (
    Math.max(1, Math.min(Math.max(1, width), Math.max(1, height) * ratio)) *
    zoom
  );
}
