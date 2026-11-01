import fs from "node:fs";
import { loadConfig } from "./config.js";

function token(cfg) {
  if (!cfg.accessToken) throw new Error("Not logged in. Run `quillpost login`.");
  if (cfg.expiresAt && cfg.expiresAt < Date.now()) throw new Error("Access token expired. Run `quillpost login`.");
  return cfg.accessToken;
}

function netError(e) {
  const why = e.cause?.code ?? e.cause?.message ?? e.name;
  const hint = why === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
    ? " Your network re-signs HTTPS traffic; set NODE_USE_SYSTEM_CA=1 so Node trusts the system certificate store."
    : " Check your network, VPN or proxy.";
  return new Error(`Could not reach LinkedIn (${why}).${hint}`);
}

export async function call(path, { method = "GET", body, rest = true } = {}) {
  const cfg = loadConfig();
  const headers = { Authorization: `Bearer ${token(cfg)}` };
  if (rest) {
    headers["LinkedIn-Version"] = cfg.apiVersion;
    headers["X-Restli-Protocol-Version"] = "2.0.0";
  }
  if (body) headers["content-type"] = "application/json";
  const r = await fetch(`${cfg.apiBase}${path}`, {
    method, headers, body: body && JSON.stringify(body), signal: AbortSignal.timeout(30000),
  }).catch((e) => { throw netError(e); });
  const text = await r.text();
  if (!r.ok) throw new Error(`LinkedIn API ${r.status}: ${text}`);
  return { headers: r.headers, data: text ? JSON.parse(text) : null };
}

let me;
export async function whoami() {
  if (!me) me = (await call("/v2/userinfo", { rest: false })).data;
  return me;
}
export const personUrn = async () => `urn:li:person:${(await whoami()).sub}`;

export const postUrl = (urn) => `https://www.linkedin.com/feed/update/${urn}/`;

async function upload(kind, filePath) {
  const owner = await personUrn();
  const { data } = await call(`/rest/${kind}s?action=initializeUpload`, {
    method: "POST", body: { initializeUploadRequest: { owner } },
  });
  const { uploadUrl, [kind]: urn } = data.value;
  const cfg = loadConfig();
  const r = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token(cfg)}` },
    body: fs.readFileSync(filePath),
    signal: AbortSignal.timeout(120000),
  }).catch((e) => { throw netError(e); });
  if (!r.ok) throw new Error(`Upload of ${filePath} failed: ${r.status} ${await r.text()}`);
  return urn;
}
export const uploadImage = (p) => upload("image", p);
export const uploadDocument = (p) => upload("document", p);

/**
 * Upload an MP4 with LinkedIn's Videos API: initializeUpload, PUT each byte range LinkedIn asks for
 * (4 MiB parts) and keep every ETag, then finalizeUpload. Resolves with the video urn and its status;
 * the status is PROCESSING when LinkedIn had not finished by the time we stopped waiting.
 */
export async function uploadVideo(filePath) {
  const owner = await personUrn();
  const size = fs.statSync(filePath).size;
  const { data } = await call("/rest/videos?action=initializeUpload", {
    method: "POST", body: { initializeUploadRequest: { owner, fileSizeBytes: size, uploadCaptions: false, uploadThumbnail: false } },
  });
  const { video, uploadToken, uploadInstructions } = data.value;
  const cfg = loadConfig();
  const fd = fs.openSync(filePath, "r");
  const partIds = [];
  try {
    for (const part of uploadInstructions) {
      const last = Math.min(part.lastByte, size - 1);
      const buf = Buffer.alloc(last - part.firstByte + 1);
      fs.readSync(fd, buf, 0, buf.length, part.firstByte);
      const r = await fetch(part.uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token(cfg)}`, "content-type": "application/octet-stream" },
        body: buf,
        signal: AbortSignal.timeout(300000),
      }).catch((e) => { throw netError(e); });
      if (!r.ok) throw new Error(`Upload of ${filePath} failed at byte ${part.firstByte}: ${r.status} ${await r.text()}`);
      const etag = r.headers.get("etag");
      if (!etag) throw new Error(`LinkedIn did not return an ETag for the part starting at byte ${part.firstByte}`);
      partIds.push(etag.replace(/^"|"$/g, ""));
    }
  } finally {
    fs.closeSync(fd);
  }
  await call("/rest/videos?action=finalizeUpload", {
    method: "POST", body: { finalizeUploadRequest: { video, uploadToken: uploadToken ?? "", uploadedPartIds: partIds } },
  });
  return { urn: video, status: await waitForVideo(video) };
}

/** Poll until LinkedIn has processed the video. Returns the last status seen (AVAILABLE, or PROCESSING if we ran out of time). */
export async function waitForVideo(urn) {
  const every = Number(process.env.QUILLPOST_VIDEO_POLL_MS) || 3000;
  const until = Date.now() + (Number(process.env.QUILLPOST_VIDEO_WAIT_MS) || 180000);
  for (;;) {
    const { data } = await call(`/rest/videos/${encodeURIComponent(urn)}`);
    if (data?.status === "AVAILABLE") return "AVAILABLE";
    if (data?.status === "PROCESSING_FAILED") {
      throw new Error(`LinkedIn could not process the video: ${data.processingFailureReason ?? "no reason given"}`);
    }
    if (Date.now() >= until) return data?.status ?? "PROCESSING";
    await new Promise((r) => setTimeout(r, every));
  }
}

export async function createPost({ text, visibility = "PUBLIC", content }) {
  const { headers } = await call("/rest/posts", {
    method: "POST",
    body: {
      author: await personUrn(),
      commentary: text,
      visibility,
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      ...(content && { content }),
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    },
  });
  return { urn: headers.get("x-restli-id") };
}

export async function deletePost(urn) {
  await call(`/rest/posts/${encodeURIComponent(urn)}`, { method: "DELETE" });
  return { deleted: urn };
}

/**
 * LinkedIn gates commenting and reactions behind its Community Management API (partner approval).
 * The self-serve "Share on LinkedIn" product returns 403 ACCESS_DENIED for them. Turn that into a clear message.
 */
export const PARTNER_ONLY = "PARTNER_ONLY";
function partnerOnly(e, what) {
  if (!/\b403\b/.test(e.message) || !/ACCESS_DENIED|partnerApi/i.test(e.message)) return e;
  const err = new Error(
    `LinkedIn refused ${what}: it needs the Community Management API, which LinkedIn grants to approved partners, ` +
    `not the self-serve "Share on LinkedIn" product. Do this one on LinkedIn instead.`);
  err.code = PARTNER_ONLY;
  return err;
}

export async function comment(urn, text) {
  try {
    const { headers, data } = await call(`/rest/socialActions/${encodeURIComponent(urn)}/comments`, {
      method: "POST",
      body: { actor: await personUrn(), object: urn, message: { text } },
    });
    return { commentUrn: headers.get("x-restli-id") ?? data?.commentUrn ?? data?.id ?? null };
  } catch (e) { throw partnerOnly(e, "the comment"); }
}

export const REACTIONS = ["LIKE", "PRAISE", "APPRECIATION", "EMPATHY", "INTEREST", "ENTERTAINMENT"];

export async function react(urn, type = "LIKE") {
  if (!REACTIONS.includes(type)) throw new Error(`Unknown reaction "${type}". Use one of: ${REACTIONS.join(", ")}`);
  const actor = await personUrn();
  try {
    await call(`/rest/reactions?actor=${encodeURIComponent(actor)}`, {
      method: "POST", body: { root: urn, reactionType: type },
    });
  } catch (e) { throw partnerOnly(e, "the reaction"); }
  return { reacted: type, post: urn };
}
