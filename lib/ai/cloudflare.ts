import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  AI_BODY_BYTES,
  AI_IMAGE_BYTES,
  AI_MODEL,
  AI_MODEL_LABEL,
  AI_PROMPT_MAX,
  AI_REFERENCE_SIDE,
  validAiSize,
} from "@/lib/ai/shared";
import { imageInfo } from "@/lib/ai/imageInfo";

export class AiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
    public providerCode?: number,
  ) {
    super(message);
  }
}

/** Map provider failures to fixed messages. Never echo raw provider text or request data. */
export function cloudflareFailure(
  httpStatus: number,
  payload?: unknown,
): AiError {
  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const errors = Array.isArray(data.errors) ? data.errors.slice(0, 5) : [];
  const codes = errors.flatMap((error) => {
    const code = error && typeof error === "object" ? Number(error.code) : NaN;
    return Number.isInteger(code) && code > 0 && code < 1_000_000 ? [code] : [];
  });
  const description = errors
    .map((error) =>
      typeof error?.message === "string"
        ? error.message.slice(0, 700)
        : typeof error === "string"
          ? error.slice(0, 700)
          : "",
    )
    .join(" ")
    .toLowerCase();
  const has = (...values: number[]) =>
    values.some((value) => codes.includes(value));
  const failure = (
    status: number,
    message: string,
    retryAfter?: number,
    code = codes[0],
  ) =>
    new AiError(
      status,
      message + (code ? ` (Cloudflare code ${code})` : ""),
      retryAfter,
      code,
    );

  if (
    has(3030) ||
    /output.*flagged|safety filter|content moderation|nsfw/.test(description)
  )
    return failure(
      422,
      "Cloudflare's safety filter flagged the generated image, so it did not return a result. Your collage is unchanged. Try a different description or reference photo.",
      undefined,
      codes.find((code) => code === 3030) ?? codes[0],
    );
  if (has(3036) || /daily free allocation|neurons|quota/.test(description))
    return failure(
      429,
      "Your Cloudflare account's daily AI allowance is used up. Try again after 00:00 UTC; changing the description will not restore the allowance.",
      Math.ceil((nextReset(Date.now()) - Date.now()) / 1000),
      codes.find((code) => code === 3036) ?? codes[0],
    );
  if (has(3040))
    return failure(
      429,
      "Cloudflare's image model is temporarily busy. Wait a little before trying again; you can keep the same description.",
      30,
      3040,
    );
  if (has(5035))
    return failure(
      503,
      "Cloudflare requires a paid plan for this model on your account. The studio owner should check model availability before continuing.",
      undefined,
      5035,
    );
  if (has(5016))
    return failure(
      503,
      "Cloudflare requires a model agreement for this account. Review the model's terms in the Cloudflare dashboard before using it.",
      undefined,
      5016,
    );
  if (has(5018, 3041, 3023))
    return failure(
      503,
      "Cloudflare has restricted this account's access to the image model. Check account access and model availability in the Cloudflare dashboard.",
    );
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    has(10000) ||
    /authentication error|invalid api token|invalid token/.test(description)
  )
    return failure(
      503,
      "Cloudflare could not authorize this request. Check that the token has Workers AI Read and Edit permissions and belongs to the configured account.",
    );
  if (has(7000, 7003))
    return failure(
      503,
      "Cloudflare could not find the configured account endpoint. Check the account ID and that the token belongs to that account.",
    );
  if (has(5007, 3042) || httpStatus === 404)
    return failure(
      503,
      "Cloudflare could not find the configured image model. The studio owner should check the model identifier and its availability.",
    );
  if (has(3007, 3008) || httpStatus === 408 || httpStatus === 504)
    return failure(
      504,
      "Cloudflare did not finish creating this image in time. Wait a moment before trying again.",
      15,
    );
  if (has(3006) || httpStatus === 413)
    return failure(
      413,
      "Cloudflare rejected the image request because it is too large. Use a smaller reference photo or output size.",
    );
  if (httpStatus === 429)
    return failure(
      429,
      "Cloudflare is limiting AI requests right now. Check the account's AI usage or wait before trying again.",
      60,
    );
  if (has(3003, 5004))
    return failure(
      502,
      "Cloudflare rejected the image request format. Share this error code with the studio owner so the integration can be checked.",
    );
  if (httpStatus >= 500)
    return failure(
      503,
      "Cloudflare's image service could not complete this request. Please try again later.",
      30,
    );
  return failure(
    502,
    "Cloudflare rejected the image request. Share this error code with the studio owner to investigate the provider response.",
  );
}
export interface AiConfig {
  accountId: string;
  token: string;
  dailyLimit: number;
  personalLimit: number;
}
export function aiConfig(): AiConfig | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? "";
  const limit = (value: string | undefined, fallback: number, max: number) => {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? Math.min(max, n) : fallback;
  };
  return /^[a-f0-9]{32}$/i.test(accountId) && token.length >= 10
    ? {
        accountId,
        token,
        dailyLimit: limit(process.env.AI_DAILY_REQUEST_LIMIT, 60, 60),
        personalLimit: limit(process.env.AI_VISITOR_DAILY_LIMIT, 10, 60),
      }
    : null;
}
const nextReset = (now: number) =>
  Date.parse(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z") +
  86400000;

/** Anonymous/session and global safeguards for one Node process. No photos/prompts are retained. */
export class AiQuota {
  private day = "";
  private used = 0;
  private active = 0;
  private visitors = new Map<string, { used: number; last: number }>();
  private roll(now: number) {
    const day = new Date(now).toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.used = 0;
      this.visitors.clear();
    }
  }
  status(config: AiConfig | null, visitor: string, now = Date.now()) {
    this.roll(now);
    return {
      configured: !!config,
      model: AI_MODEL_LABEL,
      dailyLimit: config?.dailyLimit ?? 60,
      remaining: config ? Math.max(0, config.dailyLimit - this.used) : 0,
      personalRemaining: config
        ? Math.max(
            0,
            config.personalLimit - (this.visitors.get(visitor)?.used ?? 0),
          )
        : 0,
      resetAt: new Date(nextReset(now)).toISOString(),
    };
  }
  reserve(config: AiConfig, visitor: string, now = Date.now()) {
    this.roll(now);
    const entry = this.visitors.get(visitor) ?? { used: 0, last: 0 };
    if (this.used >= config.dailyLimit || entry.used >= config.personalLimit)
      throw new AiError(
        429,
        "Today's AI allowance is used up. Your collage is safe; try again after the daily reset.",
        Math.ceil((nextReset(now) - now) / 1000),
      );
    if (entry.last && now - entry.last < 15000)
      throw new AiError(
        429,
        "Please wait a few seconds before creating another image.",
        Math.ceil((15000 - (now - entry.last)) / 1000),
      );
    if (this.active >= 2)
      throw new AiError(
        429,
        "AI is working on other images. Please try again shortly.",
        10,
      );
    entry.used++;
    entry.last = now;
    this.visitors.set(visitor, entry);
    this.used++;
    this.active++;
    let finished = false;
    // Attempted calls remain counted, including cancellation/timeouts: provider compute may already have run.
    return () => {
      if (!finished) {
        this.active--;
        finished = true;
      }
    };
  }
}

const COOKIE = "studio_ai_session";
export function visitorSession(
  request: Request,
  config: AiConfig | null,
  now = Date.now(),
) {
  const secret = process.env.AI_SESSION_SECRET?.trim() || config?.token;
  if (!secret) return { id: "unconfigured", cookie: "" };
  const sign = (value: string) =>
    createHmac("sha256", secret).update(value).digest("hex");
  const existing =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(COOKIE + "="))
      ?.slice(COOKIE.length + 1) ?? "";
  const [id, timestamp, signature] = existing.split(".");
  if (
    /^[a-f0-9]{32}$/.test(id ?? "") &&
    /^\d{13}$/.test(timestamp ?? "") &&
    /^[a-f0-9]{64}$/.test(signature ?? "") &&
    now - Number(timestamp) <= 86400000 &&
    Number(timestamp) <= now + 60000
  ) {
    if (
      timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(sign(`${id}.${timestamp}`)),
      )
    )
      return { id, cookie: "" };
  }
  const nextId = randomBytes(16).toString("hex"),
    value = `${nextId}.${now}`;
  return {
    id: nextId,
    cookie: `${COOKIE}=${value}.${sign(value)}; Path=/api/ai; Max-Age=86400; HttpOnly; SameSite=Strict${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
export async function boundedBytes(message: Request | Response, max: number) {
  if (Number(message.headers.get("content-length")) > max)
    throw new AiError(
      413,
      "This image request is too large. Choose a smaller image.",
    );
  const reader = message.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new AiError(
          413,
          "This image request is too large. Choose a smaller image.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function aiInput(request: Request) {
  const origin = request.headers.get("origin");
  if (
    request.headers.get("x-studio-ai") !== "1" ||
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AiError(
      403,
      "Open AI Studio from this website to make a request.",
    );
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data;"))
    throw new AiError(
      400,
      "Choose an image task and describe what you want to create.",
    );
  const bytes = await boundedBytes(request, AI_BODY_BYTES);
  let form: FormData;
  try {
    form = await new Response(bytes, {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    throw new AiError(
      400,
      "This image request could not be read. Please try again.",
    );
  }
  for (const key of new Set(form.keys()))
    if (
      !["mode", "prompt", "width", "height", "consent", "image"].includes(
        key,
      ) ||
      form.getAll(key).length !== 1
    )
      throw new AiError(400, "This image request has unsupported fields.");
  const mode = form.get("mode"),
    prompt =
      typeof form.get("prompt") === "string"
        ? (form.get("prompt") as string).trim()
        : "";
  const width = Number(form.get("width")),
    height = Number(form.get("height"));
  if (mode !== "generate" && mode !== "edit")
    throw new AiError(400, "Choose Generate or Edit photo.");
  if (
    prompt.length < 3 ||
    prompt.length > AI_PROMPT_MAX ||
    prompt.includes("\0")
  )
    throw new AiError(
      400,
      `Describe your image in 3–${AI_PROMPT_MAX} characters.`,
    );
  if (!validAiSize(width, height))
    throw new AiError(
      400,
      "Choose a supported AI image size up to 1024 pixels per side.",
    );
  if (form.get("consent") !== "cloudflare")
    throw new AiError(
      400,
      "Please confirm that this request can be sent to Cloudflare.",
    );
  const image = form.get("image");
  const upstream = new FormData();
  upstream.set("prompt", prompt);
  upstream.set("width", String(width));
  upstream.set("height", String(height));
  if (mode === "edit") {
    if (!(image instanceof Blob) || !image.size || image.size > AI_IMAGE_BYTES)
      throw new AiError(
        400,
        "Choose a photo to edit. The reference copy must be under 1.2 MB.",
      );
    const data = new Uint8Array(await image.arrayBuffer()),
      info = imageInfo(data);
    if (
      !info ||
      !info.width ||
      !info.height ||
      info.width > AI_REFERENCE_SIDE ||
      info.height > AI_REFERENCE_SIDE
    )
      throw new AiError(
        400,
        "The reference photo must be a JPG, PNG or WEBP resized below 512 pixels per side.",
      );
    upstream.set(
      "input_image_0",
      new Blob([data], { type: info.type }),
      `reference.${info.extension}`,
    );
  } else if (image)
    throw new AiError(
      400,
      "Generate sends only your description. Use Edit photo to send a reference image.",
    );
  return { upstream, mode, width, height };
}

export async function runCloudflare(
  config: AiConfig,
  input: Awaited<ReturnType<typeof aiInput>>,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${AI_MODEL}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}` },
        body: input.upstream,
        signal: AbortSignal.any([signal, AbortSignal.timeout(90_000)]),
        cache: "no-store",
        redirect: "error",
      },
    );
  } catch {
    if (signal.aborted)
      throw new AiError(
        499,
        "Image creation was cancelled. Your original photo is unchanged.",
      );
    throw new AiError(
      504,
      "Cloudflare took too long to respond. Please try again in a moment.",
    );
  }
  let bytes: Uint8Array;
  try {
    bytes = await boundedBytes(response, 12_000_000);
  } catch (error) {
    if (signal.aborted)
      throw new AiError(
        499,
        "Image creation was cancelled. Your original photo is unchanged.",
      );
    if (error instanceof AiError)
      throw new AiError(
        502,
        "Cloudflare returned an image that is too large. Please try again.",
      );
    throw new AiError(
      504,
      "The image download was interrupted. Please try again in a moment.",
    );
  }
  let imageBytes: Uint8Array = bytes;
  if (!(response.headers.get("content-type") ?? "").startsWith("image/")) {
    let data;
    try {
      data = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      if (!response.ok) throw cloudflareFailure(response.status);
      throw new AiError(
        502,
        "Cloudflare returned an unreadable result. Please try again.",
      );
    }
    if (
      !response.ok ||
      data?.success === false ||
      (Array.isArray(data?.errors) && data.errors.length)
    )
      throw cloudflareFailure(response.status, data);
    if (!data || typeof data !== "object")
      throw new AiError(
        502,
        "Cloudflare returned an unreadable image result. Please try again.",
      );
    const encoded = data.result?.image ?? data.image;
    if (
      typeof encoded !== "string" ||
      encoded.length > 11_000_000 ||
      !/^(?:data:image\/(?:png|jpeg|webp);base64,)?[A-Za-z0-9+/\r\n]+={0,2}$/.test(
        encoded,
      )
    )
      throw new AiError(
        502,
        "Cloudflare did not return an image. Please try again.",
      );
    imageBytes = Uint8Array.from(
      Buffer.from(encoded.replace(/^data:image\/[^;]+;base64,/, ""), "base64"),
    );
  } else if (!response.ok) throw cloudflareFailure(response.status);
  const info = imageInfo(imageBytes);
  if (!info || info.width !== input.width || info.height !== input.height)
    throw new AiError(
      502,
      "Cloudflare returned an unexpected image size. Please try again.",
    );
  return { bytes: imageBytes, ...info };
}
