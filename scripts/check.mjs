// Offline test suite: no network, no LinkedIn account. Runs the CLI and MCP server against a fake LinkedIn API
// with a throwaway QUILLPOST_HOME, so nothing real is read or written.
import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src", "cli.js");
const step = (s) => console.log(`ok  ${s}`);

// ---------- 1. syntax ----------
const files = fs.readdirSync(path.join(root, "src")).filter((f) => f.endsWith(".js"));
for (const f of files) {
  const r = await new Promise((res) => { const c = spawn(process.execPath, ["--check", path.join(root, "src", f)]); let e = ""; c.stderr.on("data", (d) => (e += d)); c.on("close", (code) => res({ code, e })); });
  assert.equal(r.code, 0, `syntax error in src/${f}\n${r.e}`);
}
step(`syntax (${files.length} files)`);

// ---------- 2. styles: pure functions ----------
const S = await import(pathToFileURL(path.join(root, "src", "styles.js")).href);
for (const [id, st] of Object.entries(S.STYLES)) {
  assert.deepEqual(S.validateFields(id, st.example), [], `${id} example must validate`);
  const text = S.compose(id, st.example);
  const l = S.lint(text);
  assert.deepEqual(l.errors, [], `${id} example must lint clean: ${l.errors}`);
  assert.ok(l.stats.chars < 3000);
}
step(`all ${Object.keys(S.STYLES).length} style examples validate and lint clean`);

assert.match(S.validateFields("howto", { hook: "x", items: ["one"] })[0], /at least 2/);
assert.match(S.validateFields("news", { items: ["a"] })[0], /hook is required/);
assert.match(S.validateFields("nope", {})[0], /Unknown style/);
assert.equal(S.compose("howto", { hook: "H", items: ["a", "b"], tags: ["#AI", "dev ops"] }), "H\n\n1. a\n\n2. b\n\n#AI #devops");
assert.equal(S.normalizeTag("#Hello World!"), "#HelloWorld");
const n = S.normalize("## Title\n\n**bold** and `code` and [site](https://a.example/x)\n\n- one\n- two");
assert.equal(n.text, "Title\n\nbold and code and site\n\n→ one\n→ two");
assert.deepEqual(n.links, ["https://a.example/x"]);
assert.ok(S.lint("**x**").soft.some((e) => /bold/.test(e)));
assert.equal(S.lint("**x**").errors.length, 0, "markdown is a soft error that --force may override");
assert.ok(S.lint("x".repeat(3001)).errors.some((e) => /3000/.test(e)));
assert.ok(S.lint("a ".repeat(200) + "\n\n#a #b #c").seeMore);
assert.ok(S.lint("see https://x.example\n\n#a").warnings.some((w) => /link/.test(w)));
step("compose, validate, normalize, lint");

// ---------- 3. fake LinkedIn API ----------
const calls = [];
let seq = 100;
let denyPartner = false; // when true, comments and reactions are refused like LinkedIn does for self-serve apps
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks);
    const url = new URL(req.url, "http://x");
    let body = null;
    if ((req.headers["content-type"] ?? "").includes("json") && raw.length) body = JSON.parse(raw.toString());
    calls.push({ method: req.method, path: url.pathname, search: url.search, body, auth: req.headers.authorization, version: req.headers["linkedin-version"], bytes: raw.length });
    const json = (code, o, h = {}) => { res.writeHead(code, { "content-type": "application/json", ...h }); res.end(o ? JSON.stringify(o) : ""); };
    const port = server.address().port;
    if (req.headers.authorization !== "Bearer tok") return json(401, { message: "bad token" });
    if (denyPartner && (url.pathname.includes("/comments") || url.pathname === "/rest/reactions")) {
      return json(403, { status: 403, serviceErrorCode: 100, code: "ACCESS_DENIED", message: "Not enough permissions to access: partnerApiSocialActions.CREATE.20260901" });
    }
    if (url.pathname === "/v2/userinfo") return json(200, { sub: "abc", name: "Test User" });
    if (url.pathname === "/rest/posts" && req.method === "POST") return json(201, null, { "x-restli-id": `urn:li:share:${++seq}` });
    if (url.pathname.startsWith("/rest/posts/") && req.method === "DELETE") return json(204);
    if (url.pathname === "/rest/images") return json(200, { value: { uploadUrl: `http://127.0.0.1:${port}/upload/i${++seq}`, image: `urn:li:image:I${seq}` } });
    if (url.pathname === "/rest/documents") return json(200, { value: { uploadUrl: `http://127.0.0.1:${port}/upload/d${++seq}`, document: `urn:li:document:D${seq}` } });
    if (url.pathname.startsWith("/upload/")) return json(201);
    if (url.pathname.includes("/comments")) return json(201, null, { "x-restli-id": `urn:li:comment:C${++seq}` });
    if (url.pathname === "/rest/reactions") return json(201);
    json(404, { message: "no route " + url.pathname });
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const home = fs.mkdtempSync(path.join(os.tmpdir(), "quillpost-test-"));
const env = {
  ...process.env, QUILLPOST_HOME: home, QUILLPOST_API_URL: `http://127.0.0.1:${server.address().port}`,
  QUILLPOST_ACCESS_TOKEN: "tok", HOME: home, USERPROFILE: home,
};
// Async spawn on purpose: the fake API lives in this process, so a blocking spawn would deadlock.
const run = (args, { stdin, e = {} } = {}) => new Promise((resolve) => {
  const c = spawn(process.execPath, [cli, ...args], { env: { ...env, ...e } });
  let out = "", err = "";
  c.stdout.on("data", (d) => (out += d)); c.stderr.on("data", (d) => (err += d));
  c.on("close", (code) => resolve({ code, out, err }));
  if (stdin) c.stdin.end(stdin); else c.stdin.end();
});
const posts = () => calls.filter((c) => c.method === "POST" && c.path === "/rest/posts");
const last = () => posts().at(-1).body;

try {
  // ---------- 4. CLI ----------
  let r = await run(["whoami"]);
  assert.equal(JSON.parse(r.out).sub, "abc");
  assert.equal(calls.at(-1).auth, "Bearer tok");

  r = await run(["preview", "Hello world #a #b #c", "--visibility=CONNECTIONS"]);
  assert.equal(r.code, 0); assert.match(r.out, /CONNECTIONS/); assert.equal(posts().length, 0, "preview must not post");
  r = await run(["post", "dry", "--dry-run"]);
  assert.equal(posts().length, 0, "--dry-run must not post");
  step("whoami, preview and --dry-run publish nothing");

  r = await run(["post", "Plain post that is long enough to avoid the short warning. ".repeat(3) + "\n\n#a #b #c"]);
  assert.equal(r.code, 0, r.err); assert.equal(JSON.parse(r.out).published, true);
  assert.equal(last().author, "urn:li:person:abc"); assert.equal(last().visibility, "PUBLIC");
  assert.ok(calls.find((c) => c.path === "/rest/posts").version, "LinkedIn-Version header sent");
  step("text post");

  r = await run(["post", "**bold** text"]);
  assert.equal(r.code, 1); assert.match(r.err, /bold/); assert.equal(posts().length, 1, "lint error must block");
  r = await run(["post", "**bold** text with [a link](https://s.example/a)", "--plain", "--links-to-comment"]);
  assert.equal(r.code, 0, r.err);
  assert.ok(!last().commentary.includes("**")); assert.equal(calls.at(-1).body.message.text, "https://s.example/a");
  step("markdown is blocked, --plain converts it, --links-to-comment posts links as first comment");

  r = await run(["post", "--style=howto", "--hook=How to ship in 3 steps", "--item=Write it", "--item=Test it", "--item=Ship it",
    "--cta=What would you add?", "--tag=Dev", "--tag=#Shipping", "--comment=Sources: none"]);
  assert.equal(r.code, 0, r.err);
  assert.equal(last().commentary, "How to ship in 3 steps\n\n1. Write it\n\n2. Test it\n\n3. Ship it\n\nWhat would you add?\n\n#Dev #Shipping");
  assert.equal(calls.at(-1).body.message.text, "Sources: none");
  r = await run(["post", "--style=howto", "--hook=Too few", "--item=one"]);
  assert.equal(r.code, 1); assert.match(r.err, /at least 2/);
  step("style post with first comment; style validation blocks");

  r = await run(["post", "Link post", "--link=https://example.com/a", "--link-title=Example", "--force"]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(last().content, { article: { source: "https://example.com/a", title: "Example" } });
  step("link post");

  const png = path.join(home, "a.png"); fs.writeFileSync(png, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0]));
  const png2 = path.join(home, "b.png"); fs.writeFileSync(png2, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 1]));
  r = await run(["post", "One image", `--image=${png}`, "--alt=A test image", "--force"]);
  assert.equal(r.code, 0, r.err);
  assert.match(last().content.media.id, /^urn:li:image:/); assert.equal(last().content.media.altText, "A test image");
  assert.ok(calls.some((c) => c.method === "PUT" && c.path.startsWith("/upload/") && c.bytes === 10 && c.auth === "Bearer tok"), "image bytes uploaded");
  r = await run(["post", "Two images", `--image=${png}`, `--image=${png2}`, "--alt=first", "--alt=second", "--force"]);
  assert.equal(last().content.multiImage.images.length, 2); assert.equal(last().content.multiImage.images[1].altText, "second");
  step("single and multi image posts upload the files");

  const pdf = path.join(home, "deck.pdf"); fs.writeFileSync(pdf, "%PDF-1.4\n");
  r = await run(["post", "Deck", `--document=${pdf}`, "--doc-title=My deck", "--force"]);
  assert.equal(r.code, 0, r.err);
  assert.match(last().content.media.id, /^urn:li:document:/); assert.equal(last().content.media.title, "My deck");
  r = await run(["post", "Mixed", "--link=https://x.example", `--image=${png}`, "--force"]);
  assert.equal(r.code, 1); assert.match(r.err, /only one of/);
  r = await run(["post", "Bad ext", `--image=${pdf}`, "--force"]);
  assert.equal(r.code, 1); assert.match(r.err, /png, jpg or gif/);
  step("document post; mixed and invalid attachments are rejected");

  const hist = (await run(["posts"])).out;
  assert.match(hist, /urn|linkedin\.com\/feed\/update\/urn:li:share:/);
  r = await run(["comment", "last", "Nice", "one"]);
  assert.equal(r.code, 0, r.err);
  const cc = calls.at(-1); assert.match(decodeURIComponent(cc.path), /urn:li:share:\d+\/comments/); assert.equal(cc.body.message.text, "Nice one");
  r = await run(["react", "last", "--type=PRAISE"]);
  assert.equal(calls.at(-1).body.reactionType, "PRAISE"); assert.match(decodeURIComponent(calls.at(-1).search), /actor=urn:li:person:abc/);
  r = await run(["react", "last", "--type=NOPE"]); assert.equal(r.code, 1);
  r = await run(["delete", "last"]); assert.equal(r.code, 0, r.err);
  assert.equal(calls.at(-1).method, "DELETE");
  r = await run(["comment", "nonexistent", "x"]); assert.equal(r.code, 1);
  step("posts, comment, react, delete resolve 'last' and ids");

  // comments and reactions are partner-only on self-serve apps: degrade gracefully
  denyPartner = true;
  const pBefore = posts().length;
  r = await run(["post", "Post whose comment is refused. ".repeat(6) + "\n\n#a #b #c", "--comment=Sources: https://s.example/1"]);
  assert.equal(r.code, 0, "a refused comment must not fail the publish");
  const pj = JSON.parse(r.out);
  assert.equal(pj.published, true); assert.equal(posts().length, pBefore + 1, "the post is still published");
  assert.match(pj.commentError, /Community Management API/); assert.equal(pj.commentToPaste, "Sources: https://s.example/1");
  assert.match(r.err, /Paste this as the first comment/); assert.match(r.err, /Sources: https:\/\/s\.example\/1/);
  r = await run(["preview", "Preview with comment. ".repeat(8) + "\n\n#a #b #c", "--comment=x"]);
  assert.match(r.out, /partner-only/, "preview warns up front that the first comment may fail");
  r = await run(["comment", "last", "hello"]);
  assert.equal(r.code, 1); assert.match(r.err, /Community Management API/); assert.match(r.err, /on LinkedIn instead/);
  r = await run(["react", "last"]);
  assert.equal(r.code, 1); assert.match(r.err, /Community Management API/);
  denyPartner = false;
  step("refused comment/reaction (403 ACCESS_DENIED): post still publishes, comment text is handed back, clear errors");

  // drafts
  const before = posts().length;
  r = await run(["draft", "save", "--style=question", "--hook=Agents or humans?", "--cta=Tell me", "--tag=AI"]);
  const id = /draft (\w+)/.exec(r.out)[1];
  assert.match((await run(["draft", "list"])).out, new RegExp(id));
  assert.match((await run(["draft", "show", id])).out, /Agents or humans\?/);
  assert.equal(posts().length, before, "draft save/show must not post");
  r = await run(["draft", "publish", id]); assert.equal(r.code, 0, r.err);
  assert.equal(posts().length, before + 1);
  assert.doesNotMatch((await run(["draft", "list"])).out, new RegExp(id), "published draft is removed");
  step("drafts: save, list, show, publish");

  // schedule
  const b2 = posts().length;
  r = await run(["schedule", "add", "--at=+1d", "Scheduled later post #a #b #c"]);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(JSON.parse((await run(["schedule", "run"])).out), [], "future item is not published");
  assert.equal(posts().length, b2);
  const q = JSON.parse(fs.readFileSync(path.join(home, "queue.json"), "utf8"));
  q[0].at = new Date(Date.now() - 1000).toISOString(); fs.writeFileSync(path.join(home, "queue.json"), JSON.stringify(q));
  const ran = JSON.parse((await run(["schedule", "run"])).out);
  assert.equal(ran[0].status, "published"); assert.equal(posts().length, b2 + 1);
  assert.deepEqual(JSON.parse((await run(["schedule", "run"])).out), [], "published items are not run twice");
  r = await run(["schedule", "add", "--at=not a time", "x"]); assert.equal(r.code, 1);
  step("schedule: future items wait, due items publish once");

  // not logged in
  r = await run(["whoami"], { e: { QUILLPOST_ACCESS_TOKEN: "", LINKEDIN_ACCESS_TOKEN: "" } });
  assert.equal(r.code, 1); assert.match(r.err, /Not logged in/);

  // ---------- 5. MCP ----------
  const p = spawn(process.execPath, [cli, "mcp"], { env });
  let buf = ""; const pending = new Map();
  p.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (l.trim()) { const m = JSON.parse(l); pending.get(m.id)?.(m); } } });
  const rpc = (id, method, params) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error(`timeout: ${method}`)), 15000); pending.set(id, (m) => { clearTimeout(t); res(m); }); p.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
  try {
    const init = await rpc(1, "initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ci", version: "1" } });
    assert.match(init.result.instructions, /approved: true/);
    p.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    const tools = (await rpc(2, "tools/list", {})).result.tools.map((t) => t.name);
    for (const t of ["quillpost_whoami", "quillpost_styles", "quillpost_preview", "quillpost_post", "quillpost_comment", "quillpost_react", "quillpost_delete", "quillpost_history", "quillpost_draft_save", "quillpost_draft_publish", "quillpost_schedule_add", "quillpost_schedule_run_due"]) assert.ok(tools.includes(t), `missing tool ${t}`);
    const call = async (id, name, args) => { const m = await rpc(id, "tools/call", { name, arguments: args }); return { isError: m.result.isError, data: m.result.content[0].text.startsWith("{") || m.result.content[0].text.startsWith("[") ? JSON.parse(m.result.content[0].text) : m.result.content[0].text }; };

    const base = posts().length;
    let m = await call(3, "quillpost_post", { style: "news", hook: "Hook line", items: ["One thing happened. It matters."], tags: ["AI"] });
    assert.equal(m.data.published, false); assert.equal(posts().length, base, "post without approved must only preview");
    m = await call(4, "quillpost_post", { style: "news", hook: "Hook line", items: ["One thing happened. It matters."], tags: ["AI"], approved: true, first_comment: "src" });
    assert.equal(m.data.published, true); assert.equal(posts().length, base + 1);
    m = await call(5, "quillpost_post", { text: "**bold**", approved: true });
    assert.equal(m.isError, true); assert.equal(posts().length, base + 1, "lint errors block approved posts too");
    m = await call(6, "quillpost_delete", { post: "last" });
    assert.equal(m.data.deleted, false); assert.equal(calls.filter((c) => c.method === "DELETE").length, 1, "delete without approved must not delete");
    m = await call(7, "quillpost_comment", { post: "last", text: "x" });
    assert.equal(m.data.published, false);
    m = await call(8, "quillpost_styles", {}); assert.equal(m.data.length, 7);
    m = await call(9, "quillpost_styles", { id: "story" }); assert.match(m.data.exampleText, /#/);
    m = await call(10, "quillpost_schedule_add", { text: "later #a #b #c", at: "+1d" });
    assert.equal(m.data.queued, false);
    const prompts = (await rpc(11, "prompts/list", {})).result.prompts.map((x) => x.name);
    assert.ok(prompts.includes("write_news"));
    step(`mcp: ${tools.length} tools; nothing publishes without approved: true; lint still blocks`);
  } finally { p.kill(); }
} finally {
  server.close();
  fs.rmSync(home, { recursive: true, force: true });
}
console.log("ALL OK");
