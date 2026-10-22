import { loadConfig } from "./config.js";

function token(cfg) {
  if (!cfg.accessToken) throw new Error("Not logged in. Run `linkedin-official login`.");
  if (cfg.expiresAt && cfg.expiresAt < Date.now()) throw new Error("Access token expired. Run `linkedin-official login`.");
  return cfg.accessToken;
}

async function call(path, { method = "GET", body, rest = true } = {}) {
  const cfg = loadConfig();
  const headers = { Authorization: `Bearer ${token(cfg)}` };
  if (rest) {
    headers["LinkedIn-Version"] = cfg.apiVersion;
    headers["X-Restli-Protocol-Version"] = "2.0.0";
  }
  if (body) headers["content-type"] = "application/json";
  const r = await fetch(`https://api.linkedin.com${path}`, { method, headers, body: body && JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`LinkedIn API ${r.status}: ${text}`);
  return { headers: r.headers, data: text ? JSON.parse(text) : null };
}

export async function whoami() {
  const { data } = await call("/v2/userinfo", { rest: false });
  return data;
}

export async function createPost(text, visibility = "PUBLIC") {
  const me = await whoami();
  const { headers } = await call("/rest/posts", {
    method: "POST",
    body: {
      author: `urn:li:person:${me.sub}`,
      commentary: text,
      visibility,
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    },
  });
  return { id: headers.get("x-restli-id") };
}

export async function deletePost(urn) {
  await call(`/rest/posts/${encodeURIComponent(urn)}`, { method: "DELETE" });
  return { deleted: urn };
}
