import type { AiMode, AiStatus } from "@/types/ai";
import type { Photo } from "@/types/collage";
import { AI_IMAGE_BYTES, AI_REFERENCE_SIDE } from "./shared";

export async function aiStatus(signal?: AbortSignal): Promise<AiStatus> {
  const response = await fetch("/api/ai/images", { cache: "no-store", signal });
  if (!response.ok)
    throw new Error(
      "AI Studio could not check the connection. Please try again.",
    );
  return response.json();
}

/** Only this resized copy is sent to the provider; the original stays in the editor. */
export async function referenceCopy(photo: Photo): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scale = Math.min(
    1,
    AI_REFERENCE_SIDE / Math.max(photo.width, photo.height),
  );
  canvas.width = Math.max(1, Math.round(photo.width * scale));
  canvas.height = Math.max(1, Math.round(photo.height * scale));
  try {
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("There is not enough memory to prepare this photo.");
    context.imageSmoothingQuality = "high";
    context.drawImage(photo.source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob || blob.size > AI_IMAGE_BYTES)
      throw new Error(
        "This reference could not be prepared. Try another photo.",
      );
    return blob;
  } finally {
    canvas.width = canvas.height = 1;
  }
}

export async function createAiImage(
  input: {
    mode: AiMode;
    prompt: string;
    width: number;
    height: number;
    source?: Photo;
  },
  signal: AbortSignal,
) {
  const form = new FormData();
  form.set("mode", input.mode);
  form.set("prompt", input.prompt.trim());
  form.set("width", String(input.width));
  form.set("height", String(input.height));
  form.set("consent", "cloudflare");
  if (input.mode === "edit") {
    if (!input.source) throw new Error("Choose a photo to edit first.");
    form.set("image", await referenceCopy(input.source), "reference.png");
  }
  signal.throwIfAborted();
  let response: Response;
  try {
    response = await fetch("/api/ai/images", {
      method: "POST",
      headers: { "X-Studio-AI": "1" },
      body: form,
      signal: AbortSignal.any([signal, AbortSignal.timeout(110_000)]),
    });
  } catch {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    throw new Error(
      "AI Studio could not connect in time. Check your connection and try again.",
    );
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(
      problem?.error || "The image could not be created. Please try again.",
    );
  }
  const blob = await response.blob();
  const extension = (
    { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as Record<
      string,
      string
    >
  )[blob.type];
  if (!extension || !blob.size)
    throw new Error(
      "AI Studio received an unreadable image. Please try again.",
    );
  return new File(
    [blob],
    `ai-${input.mode === "edit" ? "edited" : "generated"}-${Date.now()}.${extension}`,
    { type: blob.type },
  );
}
