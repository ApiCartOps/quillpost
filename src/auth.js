import http from "node:http";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { loadConfig, saveConfig } from "./config.js";

const SCOPES = "openid profile email w_member_social";

export async function login() {
  const cfg = loadConfig();
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error("Run `linkedin-official setup --client-id=... --client-secret=...` first (from your app at linkedin.com/developers).");
  }
  const state = crypto.randomBytes(16).toString("hex");
  const redirect = new URL(cfg.redirectUri);
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.search = new URLSearchParams({
    response_type: "code", client_id: cfg.clientId, redirect_uri: cfg.redirectUri, state, scope: SCOPES,
  }).toString();

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, redirect.origin);
      if (u.pathname !== redirect.pathname) { res.writeHead(404).end(); return; }
      const ok = u.searchParams.get("state") === state && u.searchParams.get("code");
      res.writeHead(ok ? 200 : 400, { "content-type": "text/plain" })
        .end(ok ? "Authorized. You can close this tab." : "Authorization failed.");
      server.close();
      ok ? resolve(u.searchParams.get("code")) : reject(new Error(u.searchParams.get("error_description") ?? "OAuth state mismatch or denied"));
    });
    server.on("error", reject);
    server.listen(Number(redirect.port), redirect.hostname);
    console.error(`Open this URL to authorize:\n${url}\n`);
    const open = process.platform === "win32" ? `start "" "${url}"` : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
    exec(open, () => {});
  });

  const r = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri,
      client_id: cfg.clientId, client_secret: cfg.clientSecret,
    }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`Token exchange failed: ${JSON.stringify(body)}`);
  saveConfig({ accessToken: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 });
  return { loggedIn: true, expiresInDays: Math.round(body.expires_in / 86400) };
}
