import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = path.join(os.homedir(), ".linkedin-official");
const file = path.join(dir, "config.json");

function read() {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; }
}

export function loadConfig() {
  const c = read();
  return {
    clientId: process.env.LINKEDIN_CLIENT_ID ?? c.clientId,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? c.clientSecret,
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN ?? c.accessToken,
    expiresAt: c.expiresAt,
    apiVersion: process.env.LINKEDIN_API_VERSION ?? c.apiVersion ?? "202609",
    redirectUri: c.redirectUri ?? "http://localhost:8765/callback",
  };
}

export function saveConfig(patch) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ ...read(), ...patch }, null, 2), { mode: 0o600 });
}

export function clearToken() {
  saveConfig({ accessToken: undefined, expiresAt: undefined });
}

export const configPath = file;
