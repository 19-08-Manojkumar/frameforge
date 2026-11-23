import {
  AiError,
  AiQuota,
  aiConfig,
  aiInput,
  runCloudflare,
  visitorSession,
} from "@/lib/ai/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const state = globalThis as typeof globalThis & { studioAiQuota?: AiQuota };
const quota = (state.studioAiQuota ??= new AiQuota());
const headers = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(request: Request) {
  const config = aiConfig(),
    session = visitorSession(request, config);
  return Response.json(quota.status(config, session.id), {
    headers: {
      ...headers,
      ...(session.cookie ? { "Set-Cookie": session.cookie } : {}),
    },
  });
}
export async function POST(request: Request) {
  const config = aiConfig(),
    session = visitorSession(request, config);
  let finish: (() => void) | undefined;
  try {
    if (!config)
      throw new AiError(
        503,
        "AI Studio is not connected yet. The studio owner needs to configure Cloudflare. Your collage editor still works normally.",
      );
    const input = await aiInput(request);
    finish = quota.reserve(config, session.id);
    const result = await runCloudflare(config, input, request.signal);
    return new Response(new Uint8Array(result.bytes).buffer, {
      headers: {
        ...headers,
        "Content-Type": result.type,
        "Content-Disposition": `inline; filename="ai-${input.mode === "edit" ? "edited" : "generated"}.${result.extension}"`,
        "X-AI-Width": String(result.width),
        "X-AI-Height": String(result.height),
        "X-AI-Remaining": String(quota.status(config, session.id).remaining),
        ...(session.cookie ? { "Set-Cookie": session.cookie } : {}),
      },
    });
  } catch (error) {
    const problem =
      error instanceof AiError
        ? error
        : new AiError(
            500,
            "This AI request could not be completed. Please try again.",
          );
    return Response.json(
      {
        error: problem.message,
        retryAfter: problem.retryAfter,
        providerCode: problem.providerCode,
      },
      {
        status: problem.status,
        headers: {
          ...headers,
          ...(session.cookie ? { "Set-Cookie": session.cookie } : {}),
          ...(problem.retryAfter
            ? { "Retry-After": String(problem.retryAfter) }
            : {}),
        },
      },
    );
  } finally {
    finish?.();
  }
}
