"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  ImagePlus,
  Layers,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import type {
  AiApplyRequest,
  AiAspect,
  AiMode,
  AiSource,
  AiStatus,
} from "@/types/ai";
import type { Photo } from "@/types/collage";
import { aiStatus, createAiImage } from "@/lib/ai/client";
import { AI_MODEL_LABEL, AI_PROMPT_MAX, aiSize } from "@/lib/ai/shared";
import { disposePhoto, loadPhoto } from "@/lib/imageLoader";

const IDEAS = {
  generate: [
    "A misty mountain lake at sunrise, cinematic travel photography, no text",
    "A peaceful tropical coast at golden hour, warm film colors, no text",
    "An airy watercolor landscape with soft blue mountains and space for a caption",
  ],
  edit: [
    "Change the lighting to a warm golden sunset. Keep the person's appearance and pose.",
    "Give the scenery a dreamy mountain mist. Keep the main subject recognizable.",
    "Turn this photo into a soft watercolor travel illustration, without lettering.",
  ],
};
interface Result {
  file: File;
  url: string;
  mode: AiMode;
  sourceId?: string;
  width: number;
  height: number;
}

export function AiStudio({
  sources,
  initialSourceId,
  photoCount,
  imageCount,
  onApply,
  onClose,
}: {
  sources: AiSource[];
  initialSourceId?: string;
  photoCount: number;
  imageCount: number;
  onApply: (request: AiApplyRequest) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    upload = useRef<HTMLInputElement>(null),
    resultSection = useRef<HTMLElement>(null);
  const active = useRef(true),
    request = useRef<AbortController | null>(null);
  const localRef = useRef<Photo | null>(null),
    resultRef = useRef<Result | null>(null);
  const [mode, setMode] = useState<AiMode>(
    initialSourceId ? "edit" : "generate",
  );
  const [sourceId, setSourceId] = useState(
    initialSourceId ?? sources[0]?.id ?? "",
  );
  const [localPhoto, setLocalPhoto] = useState<Photo | null>(null);
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<AiAspect>(
    initialSourceId ? "source" : "square",
  );
  const [consent, setConsent] = useState(false),
    [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState(""),
    [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false),
    [applying, setApplying] = useState(false),
    [loadingPhoto, setLoadingPhoto] = useState(false);
  const [result, setResult] = useState<Result | null>(null),
    [before, setBefore] = useState(false);
  useEffect(() => {
    if (result && window.matchMedia("(max-width: 700px)").matches)
      resultSection.current?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
  }, [result]);
  const source =
    localPhoto ?? sources.find((item) => item.id === sourceId)?.photo;
  const size = aiSize(aspect, source);
  const remaining = status
    ? Math.min(status.remaining, status.personalRemaining)
    : 0;
  const clearResult = () => {
    if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
    resultRef.current = null;
    setResult(null);
    setBefore(false);
  };
  const refresh = async (signal?: AbortSignal) => {
    setChecking(true);
    try {
      const next = await aiStatus(signal);
      if (active.current) {
        setStatus(next);
        setError("");
      }
    } catch {
      if (active.current && !signal?.aborted)
        setError("The connection check failed. Please try again.");
    } finally {
      if (active.current && !signal?.aborted) setChecking(false);
    }
  };
  useEffect(() => {
    active.current = true;
    const controller = new AbortController(),
      previous = document.activeElement as HTMLElement | null,
      element = dialog.current;
    element?.showModal();
    void refresh(controller.signal);
    return () => {
      active.current = false;
      controller.abort();
      request.current?.abort();
      if (localRef.current) disposePhoto(localRef.current);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.url);
      element?.close();
      previous?.focus();
    };
  }, []);
  const changeSource = (id: string) => {
    clearResult();
    setConsent(false);
    setSourceId(id);
    if (localRef.current) disposePhoto(localRef.current);
    localRef.current = null;
    setLocalPhoto(null);
    setError("");
  };
  const chooseFile = async (file?: File) => {
    if (!file) return;
    setLoadingPhoto(true);
    setError("");
    try {
      const photo = await loadPhoto(file);
      if (!active.current) {
        disposePhoto(photo);
        return;
      }
      clearResult();
      setConsent(false);
      if (localRef.current) disposePhoto(localRef.current);
      localRef.current = photo;
      setLocalPhoto(photo);
    } catch (e) {
      if (active.current)
        setError(
          e instanceof Error ? e.message : "This photo could not be read.",
        );
    } finally {
      if (active.current) setLoadingPhoto(false);
    }
  };
  const generate = async () => {
    if (
      busy ||
      applying ||
      checking ||
      !status?.configured ||
      !remaining ||
      !consent ||
      prompt.trim().length < 3 ||
      (mode === "edit" && !source)
    )
      return;
    clearResult();
    setError("");
    setBusy(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      const file = await createAiImage(
        { mode, prompt, ...size, source },
        controller.signal,
      );
      const probe = await loadPhoto(file);
      const actualSize = { width: probe.width, height: probe.height };
      disposePhoto(probe);
      if (!active.current || controller.signal.aborted) return;
      const next = {
        file,
        url: URL.createObjectURL(file),
        mode,
        sourceId: mode === "edit" && !localPhoto ? sourceId : undefined,
        ...actualSize,
      };
      resultRef.current = next;
      setResult(next);
    } catch (e) {
      if (active.current && !controller.signal.aborted)
        setError(
          e instanceof Error ? e.message : "This image could not be created.",
        );
    } finally {
      if (active.current) {
        setBusy(false);
        request.current = null;
        // Refresh remaining attempts without clearing a generation error.
        void aiStatus()
          .then((value) => {
            if (active.current) setStatus(value);
          })
          .catch(() => {});
      }
    }
  };
  const apply = async (destination: AiApplyRequest["destination"]) => {
    if (!result || applying) return;
    setApplying(true);
    setError("");
    try {
      await onApply({
        file: result.file,
        destination,
        sourceId: result.sourceId,
      });
      onClose();
    } catch (e) {
      if (active.current) {
        setError(
          e instanceof Error ? e.message : "This image could not be added.",
        );
        setApplying(false);
      }
    }
  };
  const locked = busy || applying || loadingPhoto;
  return (
    <dialog
      className="ai-dialog"
      ref={dialog}
      aria-labelledby="ai-title"
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault();
        if (!applying) onClose();
      }}
    >
      <header className="ai-header">
        <span className="ai-mark">
          <WandSparkles size={23} />
        </span>
        <div>
          <p className="ai-eyebrow">A little imagination. A new possibility.</p>
          <h2 id="ai-title">
            AI Studio <span>by Cloudflare</span>
          </h2>
        </div>
        <button
          className="ai-close"
          aria-label="Close AI Studio"
          disabled={applying}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="ai-body">
        <section className="ai-form" aria-label="AI image settings">
          <div className="ai-tabs" role="group" aria-label="AI task">
            <button
              aria-pressed={mode === "generate"}
              disabled={locked}
              onClick={() => {
                setMode("generate");
                setAspect("square");
                setConsent(false);
                setPrompt("");
                clearResult();
                setError("");
              }}
            >
              <Sparkles size={16} /> Generate
            </button>
            <button
              aria-pressed={mode === "edit"}
              disabled={locked}
              onClick={() => {
                setMode("edit");
                setAspect("source");
                setConsent(false);
                setPrompt("");
                clearResult();
                setError("");
              }}
            >
              <WandSparkles size={16} /> Edit photo
            </button>
          </div>
          <h3>
            {mode === "generate"
              ? "Describe your next image"
              : "Give a photo a new direction"}
          </h3>
          <p className="ai-muted">
            {mode === "generate"
              ? "Create a backdrop, a travel scene, or something entirely your own."
              : "Preview the changes first. Your original stays untouched until you apply them."}
          </p>
          {mode === "edit" && (
            <div className="ai-source">
              <label htmlFor="ai-source">Photo to edit</label>
              <select
                id="ai-source"
                disabled={locked || !sources.length}
                value={localPhoto ? "local" : sourceId}
                onChange={(e) => changeSource(e.target.value)}
              >
                {!sources.length && !localPhoto && (
                  <option value="">Choose a photo below</option>
                )}
                {localPhoto && <option value="local">{localPhoto.name}</option>}
                {sources.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                className="ai-secondary"
                disabled={locked}
                onClick={() => upload.current?.click()}
              >
                <Upload size={15} />{" "}
                {loadingPhoto ? "Preparing photo…" : "Choose another photo"}
              </button>
              <input
                ref={upload}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="AI reference photo"
                onChange={(e) => {
                  void chooseFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <p className="ai-fine">
                Only a copy under 512 px per side is sent. The full photo and
                its current crop stay in your collage.
              </p>
            </div>
          )}
          <label className="ai-label" htmlFor="ai-prompt">
            {mode === "generate"
              ? "Your description"
              : "What would you like to change?"}
          </label>
          <textarea
            id="ai-prompt"
            value={prompt}
            disabled={locked}
            maxLength={AI_PROMPT_MAX}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === "generate"
                ? "A quiet coastline at sunrise, pastel skies, cinematic travel photography…"
                : "Describe the lighting, background, or artistic style you want…"
            }
            rows={4}
          />
          <div className="ai-prompt-meta">
            <span>Be specific about the look you want.</span>
            <span>
              {prompt.length}/{AI_PROMPT_MAX}
            </span>
          </div>
          <div className="ai-ideas" aria-label="Prompt ideas">
            {IDEAS[mode].map((idea, index) => (
              <button
                key={idea}
                disabled={locked}
                onClick={() => setPrompt(idea)}
              >
                <Sparkles size={12} />
                {
                  (mode === "generate"
                    ? [
                        "Mountain sunrise",
                        "Coastal light",
                        "Watercolor backdrop",
                      ]
                    : ["Golden hour", "Dreamy scenery", "Watercolor look"])[
                    index
                  ]
                }
              </button>
            ))}
          </div>
          <label className="ai-label" htmlFor="ai-size">
            Image proportions
          </label>
          <select
            id="ai-size"
            value={aspect}
            disabled={locked}
            onChange={(e) => {
              setAspect(e.target.value as AiAspect);
              clearResult();
            }}
          >
            {mode === "edit" && <option value="source">Match photo</option>}
            <option value="square">Square · 1:1</option>
            <option value="portrait">Portrait · 4:5 approx.</option>
            <option value="story">Story · 9:16 approx.</option>
            <option value="landscape">Wide · 16:9 approx.</option>
          </select>
          <p className="ai-fine">
            {size.width} × {size.height} px · Set your collage download size
            separately.
          </p>
          <div className="ai-connection" aria-live="polite">
            {checking ? (
              <p>
                <LoaderCircle size={15} className="ai-spin" /> Checking
                connection…
              </p>
            ) : status?.configured ? (
              <>
                <p>
                  <Check size={15} /> {remaining} studio attempts left today
                </p>
                <span className="ai-fine">
                  App safeguard · Cloudflare also applies its account allowance.
                  Resets at{" "}
                  {new Date(status.resetAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                  .
                </span>
              </>
            ) : (
              <>
                <strong>Connect Cloudflare to start creating</strong>
                <p className="ai-fine">
                  Your collage editor is ready to use. AI becomes available
                  after the server is configured.
                </p>
                <details>
                  <summary>Setup instructions</summary>
                  <p className="ai-fine">
                    Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to
                    .env.local, then restart the app. Create a Workers AI token
                    scoped to your account with Read and Edit permissions. Keep
                    credentials on the server.
                  </p>
                </details>
                <button
                  className="ai-text-button"
                  onClick={() => void refresh()}
                >
                  <RefreshCw size={13} /> Check connection
                </button>
              </>
            )}
          </div>
          <label className="ai-consent">
            <input
              type="checkbox"
              checked={consent}
              disabled={locked}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Send{" "}
              {mode === "edit"
                ? "this photo’s resized copy and my description"
                : "my description"}{" "}
              to Cloudflare to create this image.
            </span>
          </label>
          {error && (
            <p className="ai-error" role="alert">
              {error}
            </p>
          )}
          <div className="ai-generate-row">
            <button
              className="ai-primary"
              disabled={
                locked ||
                checking ||
                !status?.configured ||
                !remaining ||
                !consent ||
                prompt.trim().length < 3 ||
                (mode === "edit" && !source)
              }
              onClick={() => void generate()}
            >
              {busy ? (
                <LoaderCircle size={17} className="ai-spin" />
              ) : (
                <WandSparkles size={17} />
              )}
              {busy
                ? "Creating your image…"
                : mode === "edit"
                  ? "Create edited version"
                  : "Generate image"}
            </button>
            {busy && (
              <button
                className="ai-secondary"
                onClick={() => request.current?.abort()}
              >
                Cancel
              </button>
            )}
          </div>
          <p className="ai-fine">
            <ShieldCheck size={12} /> {AI_MODEL_LABEL} · AI may change details.
            Review your result before using it. Cloudflare may withhold results
            flagged by its safety filter. Failed or cancelled calls may still
            use an attempt.
          </p>
        </section>
        <section
          className="ai-result"
          aria-label="AI image preview"
          ref={resultSection}
        >
          <div className="ai-result-heading">
            <span>
              {result
                ? "Your new image"
                : mode === "edit" && source
                  ? "Your original photo"
                  : "Room for your imagination"}
            </span>
            {result && (
              <span>
                {result.width} × {result.height}
              </span>
            )}
          </div>
          {result?.mode === "edit" && source && (
            <div
              className="ai-compare"
              role="group"
              aria-label="Compare AI edit"
            >
              <button aria-pressed={before} onClick={() => setBefore(true)}>
                Before
              </button>
              <button aria-pressed={!before} onClick={() => setBefore(false)}>
                After
              </button>
            </div>
          )}
          <div className="ai-image-stage" aria-busy={busy}>
            {result && !before ? (
              <img src={result.url} alt="AI generated result" />
            ) : mode === "edit" && source ? (
              <img src={source.url} alt="Original reference photo" />
            ) : (
              <div className="ai-placeholder">
                <span>
                  <Sparkles size={36} />
                </span>
                <h3>Make something you imagined.</h3>
                <p>
                  Your image will appear here.
                  <br />
                  Add it to your story when it feels right.
                </p>
              </div>
            )}
            {busy && (
              <div className="ai-working" role="status">
                <LoaderCircle size={30} className="ai-spin" />
                <strong>Bringing your idea to life</strong>
                <span>This can take a moment.</span>
              </div>
            )}
          </div>
          {result ? (
            <div className="ai-result-actions">
              <button
                className="ai-primary"
                disabled={applying || (!result.sourceId && photoCount >= 10)}
                onClick={() =>
                  void apply(result.sourceId ? "replace" : "template")
                }
              >
                {applying ? (
                  <LoaderCircle size={16} className="ai-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                {result.sourceId ? "Apply to photo" : "Add to photos"}
              </button>
              {result.sourceId && (
                <button
                  className="ai-secondary"
                  disabled={applying || photoCount >= 10}
                  onClick={() => void apply("template")}
                >
                  <ImagePlus size={15} /> Add as new photo
                </button>
              )}
              <button
                className="ai-secondary"
                disabled={applying || imageCount >= 10}
                onClick={() => void apply("image")}
              >
                <Layers size={15} /> Add as a layer
              </button>
              <a
                className="ai-secondary"
                href={result.url}
                download={result.file.name}
              >
                <Download size={15} /> Download image
              </a>
              <p className="ai-fine">
                {result.sourceId
                  ? "Apply replaces this photo. Add as new keeps both versions."
                  : "Add to photos uses your template layout. Add as a layer lets you position it freely."}
                {photoCount >= 10 && " Your template already has 10 photos."}
                {imageCount >= 10 &&
                  " This theme already has 10 separate images."}
              </p>
            </div>
          ) : (
            <p className="ai-result-note">
              <ShieldCheck size={15} /> Nothing is added to your collage until
              you choose it.
            </p>
          )}
        </section>
      </div>
    </dialog>
  );
}
