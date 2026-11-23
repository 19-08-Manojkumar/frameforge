import type { Photo } from "@/types/collage";

export type AiMode = "generate" | "edit";
export type AiAspect = "square" | "portrait" | "story" | "landscape" | "source";
export interface AiSource {
  id: string;
  label: string;
  photo: Photo;
  kind: "template" | "image";
}
export interface AiStatus {
  configured: boolean;
  remaining: number;
  dailyLimit: number;
  resetAt: string;
  personalRemaining: number;
  model: string;
}
export interface AiApplyRequest {
  file: File;
  destination: "template" | "image" | "replace";
  sourceId?: string;
}
