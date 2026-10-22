// CI checks that need no network or LinkedIn credentials:
//   1. every file in src/ passes `node --check`
//   2. `post --dry-run` prints the text without publishing
//   3. the MCP server starts and lists its three tools
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src", "cli.js");
// Isolated home so nothing real is read or written.
const home = fs.mkdtempSync(path.join(os.tmpdir(), "li-check-"));
const env = { ...process.env, HOME: home, USERPROFILE: home };

// 1. syntax
const files = fs.readdirSync(path.join(root, "src")).filter((f) => f.endsWith(".js"));
for (const f of files) {
  const r = spawnSync(process.execPath, ["--check", path.join(root, "src", f)], { encoding: "utf8" });
  assert.equal(r.status, 0, `syntax error in src/${f}:\n${r.stderr}`);
}
console.log(`syntax ok (${files.length} files)`);

// 2. dry run
const dry = spawnSync(process.execPath, [cli, "post", "ci check", "--dry-run"], { env, encoding: "utf8" });
assert.equal(dry.status, 0, dry.stderr);
assert.equal(JSON.parse(dry.stdout).wouldPost, "ci check");
console.log("dry-run post ok");

// 3. MCP tools
const p = spawn(process.execPath, [cli, "mcp"], { env });
let buf = "";
const pending = new Map();
p.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    if (line.trim()) { const m = JSON.parse(line); pending.get(m.id)?.(m); }
  }
});
const rpc = (id, method, params) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 15000);
  pending.set(id, (m) => { clearTimeout(t); resolve(m); });
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});
try {
  await rpc(1, "initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ci", version: "1" } });
  p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  const names = (await rpc(2, "tools/list", {})).result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["linkedin_create_post", "linkedin_delete_post", "linkedin_whoami"]);
  console.log("mcp tools ok:", names.join(", "));
  // Without a token the tools must fail cleanly, not crash or call the network.
  const who = (await rpc(3, "tools/call", { name: "linkedin_whoami", arguments: {} })).result;
  assert.equal(who.isError, true);
  assert.match(who.content[0].text, /Not logged in/);
  console.log("unauthenticated call fails cleanly");
} finally {
  p.kill();
  fs.rmSync(home, { recursive: true, force: true });
}
console.log("ALL OK");
