import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** ~/.quillpost, or the pre-rename ~/.linkedin-official if that is where the login already lives. */
function homeDir() {
  if (process.env.QUILLPOST_HOME) return process.env.QUILLPOST_HOME;
  const next = path.join(os.homedir(), ".quillpost");
  const legacy = path.join(os.homedir(), ".linkedin-official");
  return !fs.existsSync(next) && fs.existsSync(legacy) ? legacy : next;
}

export const dir = homeDir();

export function readJson(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")); } catch { return fallback; }
}

export function writeJson(name, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2), { mode: 0o600 });
}

export const configPath = path.join(dir, "config.json");

const env = (k) => process.env[`QUILLPOST_${k}`] ?? process.env[`LINKEDIN_${k}`];

export function loadConfig() {
  const c = readJson("config.json", {});
  return {
    clientId: env("CLIENT_ID") ?? c.clientId,
    clientSecret: env("CLIENT_SECRET") ?? c.clientSecret,
    accessToken: env("ACCESS_TOKEN") ?? c.accessToken,
    expiresAt: c.expiresAt,
    apiVersion: env("API_VERSION") ?? c.apiVersion ?? "202609",
    redirectUri: c.redirectUri ?? "http://localhost:8765/callback",
    apiBase: process.env.QUILLPOST_API_URL ?? "https://api.linkedin.com",
    oauthBase: process.env.QUILLPOST_OAUTH_URL ?? "https://www.linkedin.com",
  };
}

export function saveConfig(patch) {
  writeJson("config.json", { ...readJson("config.json", {}), ...patch });
}

export function clearToken() {
  saveConfig({ accessToken: undefined, expiresAt: undefined });
}
