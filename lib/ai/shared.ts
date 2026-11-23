import type { AiAspect } from "@/types/ai";

export const AI_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
export const AI_MODEL_LABEL = "FLUX.2 klein 4B";
export const AI_PROMPT_MAX = 1500;
export const AI_REFERENCE_SIDE = 504;
export const AI_IMAGE_BYTES = 1_200_000;
export const AI_BODY_BYTES = 1_500_000;
export const AI_SIZES = {
  square: { width: 1024, height: 1024 },
  portrait: { width: 832, height: 1024 },
  story: { width: 576, height: 1024 },
  landscape: { width: 1024, height: 576 },
};
export function aiSize(
  aspect: AiAspect,
  source?: { width: number; height: number },
) {
  if (aspect !== "source" || !source)
    return AI_SIZES[aspect === "source" ? "square" : aspect];
  const scale = 1024 / Math.max(source.width, source.height);
  return {
    width: Math.max(256, Math.round((source.width * scale) / 16) * 16),
    height: Math.max(256, Math.round((source.height * scale) / 16) * 16),
  };
}
export function validAiSize(width: number, height: number) {
  return [width, height].every(
    (side) =>
      Number.isInteger(side) && side >= 256 && side <= 1024 && side % 16 === 0,
  );
}
