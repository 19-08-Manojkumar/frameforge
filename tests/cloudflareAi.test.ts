import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AiError,
  AiQuota,
  aiConfig,
  aiInput,
  boundedBytes,
  cloudflareFailure,
  runCloudflare,
  visitorSession,
} from "../lib/ai/cloudflare";
import {
  AI_MODEL,
  AI_REFERENCE_SIDE,
  AI_SIZES,
  aiSize,
  validAiSize,
} from "../lib/ai/shared";
import { imageInfo } from "../lib/ai/imageInfo";
import { GET, POST } from "../app/api/ai/images/route";

const config = {
  accountId: "a".repeat(32),
  token: "test-server-only-token",
  dailyLimit: 60,
  personalLimit: 10,
};
// These are deliberately only raster headers: decoding is covered by browser tests with real PNGs.
function png(width = 1024, height = 1024) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}
function form(mode = "generate") {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    mode,
    prompt: "A cinematic mountain scene",
    width: "1024",
    height: "1024",
    consent: "cloudflare",
  }))
    data.set(key, value);
  if (mode === "edit")
    data.set(
      "image",
      new Blob([png(504, 320)], { type: "image/png" }),
      "private-original-name.png",
    );
  return data;
}
function request(data = form(), extra: Record<string, string> = {}) {
  return new Request("https://studio.example/api/ai/images", {
    method: "POST",
    body: data,
    headers: { "X-Studio-AI": "1", origin: "https://studio.example", ...extra },
  });
}
const problem = (status: number) => (error: unknown) =>
  error instanceof AiError && error.status === status;

test("AI output presets and source sizing stay within the model budget", () => {
  for (const size of Object.values(AI_SIZES))
    assert.ok(validAiSize(size.width, size.height));
  assert.deepEqual(aiSize("source", { width: 3000, height: 4000 }), {
    width: 768,
    height: 1024,
  });
  assert.deepEqual(aiSize("source", { width: 12000, height: 1000 }), {
    width: 1024,
    height: 256,
  });
  assert.equal(AI_REFERENCE_SIDE, 504);
  for (const side of [0, 255, 1000.5, 1025, 1920, NaN])
    assert.equal(validAiSize(side, 1024), false);
});
test("raster headers support PNG, JPEG and the three WEBP encodings", () => {
  assert.deepEqual(imageInfo(png(320, 504)), {
    width: 320,
    height: 504,
    type: "image/png",
    extension: "png",
  });
  const jpeg = Uint8Array.from([
    255, 216, 255, 224, 0, 4, 0, 0, 255, 192, 0, 11, 8, 1, 64, 1, 248, 1, 1, 17,
    0,
  ]);
  assert.equal(imageInfo(jpeg)?.width, 504);
  assert.equal(imageInfo(jpeg)?.height, 320);
  for (const kind of ["VP8X", "VP8 ", "VP8L"]) {
    const webp = new Uint8Array(30);
    webp.set(new TextEncoder().encode("RIFF"));
    webp.set(new TextEncoder().encode("WEBP"), 8);
    webp.set(new TextEncoder().encode(kind), 12);
    if (kind === "VP8X") {
      webp[24] = 247;
      webp[25] = 1;
      webp[27] = 63;
      webp[28] = 1;
    }
    if (kind === "VP8 ") {
      webp.set([157, 1, 42], 23);
      new DataView(webp.buffer).setUint16(26, 504, true);
      new DataView(webp.buffer).setUint16(28, 320, true);
    }
    if (kind === "VP8L") {
      webp[20] = 47;
      const packed = 503 | (319 << 14);
      new DataView(webp.buffer).setUint32(21, packed, true);
    }
    assert.equal(imageInfo(webp)?.width, 504);
    assert.equal(imageInfo(webp)?.height, 320);
  }
  assert.equal(imageInfo(new Uint8Array()), null);
  assert.equal(imageInfo(jpeg.slice(0, 16)), null);
  assert.equal(imageInfo(new TextEncoder().encode("<svg></svg>")), null);
});
test("generation sends only a prompt; editing sends a normalized binary reference", async () => {
  const generated = await aiInput(request());
  assert.deepEqual(
    [...generated.upstream.keys()],
    ["prompt", "width", "height"],
  );
  const edited = await aiInput(request(form("edit")));
  const reference = edited.upstream.get("input_image_0") as File;
  assert.equal(reference.name, "reference.png");
  assert.equal(reference.type, "image/png");
  assert.equal(
    imageInfo(new Uint8Array(await reference.arrayBuffer()))?.width,
    504,
  );
  assert.equal(edited.upstream.has("image"), false);
});
test("AI requests reject absent consent, unsupported sizes, duplicate fields and cross-site calls", async () => {
  for (const [key, value] of [
    ["consent", ""],
    ["width", "1920"],
    ["prompt", "a"],
    ["mode", "unknown"],
    ["prompt", "x".repeat(1501)],
  ]) {
    const data = form();
    data.set(key, value);
    await assert.rejects(aiInput(request(data)), problem(400));
  }
  const duplicate = form();
  duplicate.append("prompt", "other");
  await assert.rejects(aiInput(request(duplicate)), problem(400));
  const unknown = form();
  unknown.set("token", "should-never-be-accepted");
  await assert.rejects(aiInput(request(unknown)), problem(400));
  await assert.rejects(
    aiInput(request(form(), { origin: "https://elsewhere.example" })),
    problem(403),
  );
  await assert.rejects(
    aiInput(request(form(), { "X-Studio-AI": "" })),
    problem(403),
  );
  await assert.rejects(
    aiInput(request(form(), { "sec-fetch-site": "cross-site" })),
    problem(403),
  );
  const accidental = form();
  accidental.set("image", new Blob([png(504, 504)]));
  await assert.rejects(aiInput(request(accidental)), problem(400));
  const oversized = form("edit");
  oversized.set("image", new Blob([png(512, 504)]));
  await assert.rejects(aiInput(request(oversized)), problem(400));
  const fake = form("edit");
  fake.set("image", new Blob(["https://private.example/photo.jpg"]));
  await assert.rejects(aiInput(request(fake)), problem(400));
});
test("stream and declared body size limits are enforced before parsing", async () => {
  await assert.rejects(boundedBytes(new Response("12345"), 4), problem(413));
  await assert.rejects(
    boundedBytes(
      new Response("1", { headers: { "content-length": "200" } }),
      100,
    ),
    problem(413),
  );
  assert.equal((await boundedBytes(new Response("1234"), 4)).length, 4);
});
test("quotas count attempts, cap concurrency, enforce cooldown and reset at UTC midnight", () => {
  const quota = new AiQuota(),
    now = Date.parse("2026-10-30T12:00:00Z");
  const finish = quota.reserve(config, "a", now),
    finishB = quota.reserve(config, "b", now);
  assert.throws(() => quota.reserve(config, "c", now), problem(429));
  finish();
  finish();
  finishB();
  assert.equal(quota.status(config, "a", now).remaining, 58);
  assert.throws(() => quota.reserve(config, "a", now + 1000), problem(429));
  quota.reserve(config, "a", now + 15000)();
  assert.equal(quota.status(config, "a", now + 15000).personalRemaining, 8);
  const capped = { ...config, dailyLimit: 4 };
  quota.reserve(capped, "c", now + 16000)();
  assert.throws(() => quota.reserve(capped, "d", now + 17000), problem(429));
  const tomorrow = now + 86400000;
  assert.equal(quota.status(config, "a", tomorrow).remaining, 60);
  quota.reserve({ ...config, personalLimit: 1 }, "a", tomorrow)();
  assert.throws(
    () => quota.reserve({ ...config, personalLimit: 1 }, "a", tomorrow + 15000),
    problem(429),
  );
  assert.equal(quota.status(null, "a", now).configured, false);
});
test("anonymous session cookies are signed, expiring, httpOnly and contain no credentials", () => {
  const now = Date.parse("2026-10-30T12:00:00Z"),
    session = visitorSession(request(), config, now);
  assert.ok(session.cookie.includes("HttpOnly; SameSite=Strict; Secure"));
  assert.ok(!session.cookie.includes(config.token));
  const withCookie = (cookie: string) =>
    new Request("https://studio.example/api/ai/images", {
      headers: { cookie },
    });
  const cookie = session.cookie.split(";")[0];
  assert.equal(
    visitorSession(withCookie(cookie), config, now + 1000).id,
    session.id,
  );
  assert.notEqual(
    visitorSession(
      withCookie(cookie.replace(session.id, "b".repeat(32))),
      config,
      now + 1000,
    ).id,
    session.id,
  );
  assert.notEqual(
    visitorSession(withCookie(cookie), config, now + 86400001).id,
    session.id,
  );
  assert.ok(
    !JSON.stringify(new AiQuota().status(config, session.id)).includes(
      config.token,
    ),
  );
});
test("Cloudflare adapter uses the fixed authenticated multipart endpoint and validates result dimensions", async () => {
  const input = await aiInput(request());
  const mock: typeof fetch = async (url, options) => {
    assert.equal(
      url,
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${AI_MODEL}`,
    );
    assert.deepEqual(options?.headers, {
      Authorization: `Bearer ${config.token}`,
    });
    assert.equal((options?.body as FormData).get("width"), "1024");
    assert.equal(options?.redirect, "error");
    return Response.json({
      success: true,
      result: { image: Buffer.from(png()).toString("base64") },
    });
  };
  const result = await runCloudflare(
    config,
    input,
    new AbortController().signal,
    mock,
  );
  assert.equal(result.width, 1024);
  assert.equal(result.type, "image/png");
  const raw = await runCloudflare(
    config,
    input,
    new AbortController().signal,
    async () =>
      new Response(png(), { headers: { "content-type": "image/png" } }),
  );
  assert.equal(raw.height, 1024);
  await assert.rejects(
    runCloudflare(config, input, new AbortController().signal, async () =>
      Response.json({ image: Buffer.from(png(504, 504)).toString("base64") }),
    ),
    problem(502),
  );
});
test("provider errors are sanitized, rate limits readable and cancellation is recognized", async () => {
  const input = await aiInput(request()),
    signal = new AbortController().signal;
  for (const [status, expected] of [
    [401, 503],
    [403, 503],
    [429, 429],
  ]) {
    await assert.rejects(
      runCloudflare(
        config,
        input,
        signal,
        async () => new Response(config.token, { status }),
      ),
      (e: unknown) =>
        problem(expected)(e) && !(e as Error).message.includes(config.token),
    );
  }
  await assert.rejects(
    runCloudflare(config, input, signal, async () =>
      Response.json({ success: false, errors: [{ message: "neurons quota" }] }),
    ),
    problem(429),
  );
  await assert.rejects(
    runCloudflare(config, input, signal, async () =>
      Response.json({ success: true, result: { image: "not-an-image" } }),
    ),
    problem(502),
  );
  await assert.rejects(
    runCloudflare(config, input, signal, async () => {
      throw new Error(config.token);
    }),
    problem(504),
  );
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(
    runCloudflare(config, input, abort.signal, async () => {
      throw new Error("aborted");
    }),
    problem(499),
  );
});
test("the real Cloudflare 3030 response explains an output safety block without automatically retrying", async () => {
  const input = await aiInput(request());
  let calls = 0;
  await assert.rejects(
    runCloudflare(config, input, new AbortController().signal, async () => {
      calls++;
      return Response.json(
        {
          success: false,
          errors: [
            {
              code: 3030,
              message:
                "AiError: AiError: Your output has been flagged. Please choose another prompt / input image combination (provider-request-id)",
            },
          ],
        },
        { status: 400 },
      );
    }),
    (error: unknown) => {
      assert.ok(error instanceof AiError);
      assert.equal(error.status, 422);
      assert.equal(error.providerCode, 3030);
      assert.equal(error.retryAfter, undefined);
      assert.match(error.message, /safety filter flagged the generated image/);
      assert.match(error.message, /Cloudflare code 3030/);
      assert.ok(!error.message.includes("provider-request-id"));
      return true;
    },
  );
  assert.equal(calls, 1);
});

test("quota exhaustion, temporary capacity, model terms and account access get distinct remedies", () => {
  const error = (code: number, status: number) =>
    cloudflareFailure(status, {
      errors: [{ code, message: "provider detail" }],
      success: false,
    });
  const quota = error(3036, 429),
    busy = error(3040, 429);
  assert.match(quota.message, /daily AI allowance.*00:00 UTC/);
  assert.ok(quota.retryAfter! >= 1 && quota.retryAfter! <= 86400);
  assert.match(busy.message, /temporarily busy/);
  assert.equal(busy.retryAfter, 30);
  assert.match(error(5035, 403).message, /paid plan/);
  assert.match(error(5016, 403).message, /model agreement/);
  for (const code of [5018, 3041, 3023])
    assert.match(error(code, 403).message, /restricted this account/);
  assert.match(error(10000, 400).message, /could not authorize/);
  assert.match(error(7003, 404).message, /account ID/);
  for (const code of [5007, 3042])
    assert.match(error(code, 400).message, /image model/);
  for (const code of [3007, 3008]) assert.equal(error(code, 408).status, 504);
  for (const code of [3003, 5004]) {
    assert.equal(error(code, 400).status, 502);
    assert.match(error(code, 400).message, /request format/);
  }
  assert.equal(error(3006, 413).status, 413);
});

test("provider diagnostics never echo secrets, prompts, stack traces, or arbitrary raw messages", async () => {
  const secret =
    config.token +
    " " +
    config.accountId +
    " " +
    "private prompt with a personal address";
  for (const payload of [
    null,
    "unreadable response",
    { errors: [null, {}, { code: "5001", message: secret }] },
    { errors: [{ code: "3030", message: secret }] },
  ]) {
    const failure = cloudflareFailure(400, payload);
    assert.ok(!failure.message.includes(config.token));
    assert.ok(!failure.message.includes(config.accountId));
    assert.ok(!failure.message.includes("private prompt"));
  }
  const input = await aiInput(request());
  await assert.rejects(
    runCloudflare(config, input, new AbortController().signal, async () =>
      Response.json(null),
    ),
    problem(502),
  );
  await assert.rejects(
    runCloudflare(
      config,
      input,
      new AbortController().signal,
      async () => new Response(secret, { status: 503 }),
    ),
    (error: unknown) =>
      error instanceof AiError &&
      error.status === 503 &&
      !error.message.includes(config.token),
  );
});

test("an unconfigured route fails clearly without attempting external generation", async () => {
  const previousId = process.env.CLOUDFLARE_ACCOUNT_ID,
    previousToken = process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_API_TOKEN;
  try {
    assert.equal(aiConfig(), null);
    const status = await GET(request());
    assert.equal((await status.json()).configured, false);
    assert.match(status.headers.get("cache-control")!, /no-store/);
    const result = await POST(request());
    assert.equal(result.status, 503);
    assert.match((await result.json()).error, /not connected/);
    process.env.CLOUDFLARE_ACCOUNT_ID = config.accountId;
    process.env.CLOUDFLARE_API_TOKEN = config.token;
    assert.equal(aiConfig()?.dailyLimit, 60);
  } finally {
    if (previousId === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = previousId;
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;
  }
});

test("configured route keeps authentication server-side, returns a raster and enforces the visitor cooldown", async () => {
  const previousId = process.env.CLOUDFLARE_ACCOUNT_ID,
    previousToken = process.env.CLOUDFLARE_API_TOKEN,
    previousFetch = globalThis.fetch;
  process.env.CLOUDFLARE_ACCOUNT_ID = config.accountId;
  process.env.CLOUDFLARE_API_TOKEN = config.token;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.match(String(url), /api\.cloudflare\.com/);
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      `Bearer ${config.token}`,
    );
    return Response.json({
      success: true,
      result: { image: Buffer.from(png()).toString("base64") },
    });
  };
  try {
    const status = await GET(request()),
      payload = await status.json();
    assert.equal(payload.configured, true);
    assert.ok(!JSON.stringify(payload).includes(config.token));
    const cookie = status.headers.get("set-cookie")!.split(";")[0];
    const result = await POST(request(form(), { cookie }));
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("content-type"), "image/png");
    assert.equal(result.headers.get("x-ai-width"), "1024");
    assert.equal(
      imageInfo(new Uint8Array(await result.arrayBuffer()))?.height,
      1024,
    );
    assert.ok(![...result.headers.values()].join(" ").includes(config.token));
    const repeat = await POST(request(form(), { cookie }));
    assert.equal(repeat.status, 429);
    assert.ok(Number(repeat.headers.get("retry-after")) > 0);
    assert.equal(calls, 1);
    globalThis.fetch = async () => {
      calls++;
      return Response.json(
        {
          success: false,
          errors: [
            {
              code: 3030,
              message:
                "AiError: Your output has been flagged. Internal request details.",
            },
          ],
        },
        { status: 400 },
      );
    };
    const nextSession = await GET(request());
    const blocked = await POST(
      request(form(), {
        cookie: nextSession.headers.get("set-cookie")!.split(";")[0],
      }),
    );
    assert.equal(blocked.status, 422);
    const details = await blocked.json();
    assert.equal(details.providerCode, 3030);
    assert.match(details.error, /safety filter/);
    assert.ok(!details.error.includes("Internal request details"));
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousId === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = previousId;
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;
  }
});
