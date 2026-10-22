#!/usr/bin/env node
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadConfig, saveConfig, clearToken, configPath } from "./config.js";
import { login } from "./auth.js";
import * as api from "./api.js";
import { STYLES, compose } from "./styles.js";
import { publish, runDue } from "./publish.js";
import { drafts, queue, history, resolvePost, parseWhen } from "./store.js";

const HELP = `quillpost: write, check and publish LinkedIn posts from your terminal (official API)

Account
  setup --client-id=ID --client-secret=SECRET [--redirect-uri=URL] [--api-version=YYYYMM]
  login | logout | whoami | status

Write
  styles [id]                       List post styles, or show one with an example
  preview [text] [post options]     Build and check a post. Publishes nothing.
  post [text] [post options]        Publish (add --dry-run to preview only)

Post options
  --style=ID --hook= --intro= --item= (repeat) --takeaway= --cta= --tag= (repeat)
  --text-file=PATH|-                Read the post text from a file or stdin
  --plain                           Convert markdown to LinkedIn plain text
  --visibility=PUBLIC|CONNECTIONS|LOGGED_IN
  --comment=TEXT                    First comment. Needs partner API access; if LinkedIn refuses,
                                    the post still publishes and the text is printed for you to paste
  --links-to-comment                With --plain, move markdown links into the first comment (same caveat)
  --link=URL [--link-title= --link-desc=]
  --image=PATH (repeat) [--alt= (repeat, same order)]
  --document=PATH [--doc-title=]
  --force                           Publish despite lint errors
  --json                            Machine-readable output

Drafts and schedule
  draft save [post options] | list | show <id> | publish <id> | delete <id>
  schedule add --at="2026-10-23 09:00" [post options] | list | cancel <id> | run | watch [--every=60]

After publishing
  posts                             Posts published through Quillpost
  comment <post> <text>             <post> = last, a history id, or a urn
  react <post> [--type=LIKE|PRAISE|APPRECIATION|EMPATHY|INTEREST|ENTERTAINMENT]
  delete <post>
  Note: comments and reactions need LinkedIn's partner-only Community Management API.
  On a self-serve app they fail with 403; post the comment on LinkedIn instead.

  mcp                               Run as an MCP server over stdio
  config                            Print an MCP client config snippet`;

const { values: v, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "client-id": { type: "string" }, "client-secret": { type: "string" }, "redirect-uri": { type: "string" }, "api-version": { type: "string" },
    style: { type: "string" }, hook: { type: "string" }, intro: { type: "string" }, item: { type: "string", multiple: true },
    takeaway: { type: "string" }, cta: { type: "string" }, tag: { type: "string", multiple: true }, tags: { type: "string" },
    "text-file": { type: "string" }, plain: { type: "boolean" }, visibility: { type: "string" },
    comment: { type: "string" }, "links-to-comment": { type: "boolean" },
    link: { type: "string" }, "link-title": { type: "string" }, "link-desc": { type: "string" },
    image: { type: "string", multiple: true }, alt: { type: "string", multiple: true },
    document: { type: "string" }, "doc-title": { type: "string" },
    force: { type: "boolean" }, json: { type: "boolean" }, "dry-run": { type: "boolean" },
    at: { type: "string" }, every: { type: "string" }, type: { type: "string" },
  },
});
const [cmd, sub, ...rest] = positionals;
const out = (o) => console.log(JSON.stringify(o, null, 2));

function readText(textFile, inline) {
  if (textFile) return fs.readFileSync(textFile === "-" ? 0 : textFile, "utf8").trim();
  return inline?.length ? inline.join(" ") : undefined;
}

/** Build a post spec from flags. `words` is any free text after the command. */
function specFromArgs(words) {
  const tags = [...(v.tag ?? []), ...(v.tags ? v.tags.split(",") : [])].map((t) => t.trim()).filter(Boolean);
  return {
    text: readText(v["text-file"], words),
    style: v.style, hook: v.hook, intro: v.intro, items: v.item, takeaway: v.takeaway, cta: v.cta, tags: tags.length ? tags : undefined,
    plain: v.plain, visibility: v.visibility, firstComment: v.comment, linksToComment: v["links-to-comment"], force: v.force,
    link: v.link && { url: v.link, title: v["link-title"], description: v["link-desc"] },
    images: v.image?.map((p, i) => ({ path: p, alt: v.alt?.[i] })),
    document: v.document && { path: v.document, title: v["doc-title"] },
  };
}

function printPreview(p) {
  const bar = "─".repeat(44);
  console.log(`${bar}\n${p.text}\n${bar}`);
  console.log(`${p.visibility} · ${p.stats.chars} chars · hook ${p.stats.hookChars} · ${p.stats.hashtags} hashtags · ${p.stats.links} links`);
  if (p.seeMore) console.log(`feed cut ("see more"): ${p.seeMore.replace(/\n+/g, " ↵ ")}`);
  const a = p.attachments ?? {};
  if (a.link) console.log(`link card: ${a.link.url}`);
  if (a.images) console.log(`images: ${a.images.map((i) => i.path).join(", ")}`);
  if (a.document) console.log(`document: ${a.document.path}`);
  if (p.firstComment) console.log(`first comment: ${p.firstComment.replace(/\n/g, " | ")}`);
  for (const e of p.errors ?? []) console.log(`✗ ${e}`);
  for (const w of p.warnings ?? []) console.log(`! ${w}`);
}

const show = (r) => {
  if (v.json) return out(r);
  if (r.published === false || r.text) return printPreview(r);
  out(r);
  if (r.commentToPaste) {
    console.error(`\nThe post is live, but the first comment was NOT posted:\n${r.commentError}\n\nPaste this as the first comment yourself:\n${"─".repeat(44)}\n${r.commentToPaste}\n${"─".repeat(44)}`);
  }
};

try {
  switch (cmd) {
    case "setup":
      if (!v["client-id"] || !v["client-secret"]) throw new Error("setup needs --client-id and --client-secret");
      saveConfig({ clientId: v["client-id"], clientSecret: v["client-secret"],
        ...(v["redirect-uri"] && { redirectUri: v["redirect-uri"] }), ...(v["api-version"] && { apiVersion: v["api-version"] }) });
      console.log(`Saved to ${configPath}. Now run: quillpost login`);
      break;
    case "login": out(await login()); break;
    case "logout": clearToken(); console.log("Logged out."); break;
    case "whoami": out(await api.whoami()); break;
    case "status": {
      const c = loadConfig();
      out({ configPath, clientId: c.clientId ?? null, hasSecret: !!c.clientSecret, loggedIn: !!c.accessToken,
        expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null, apiVersion: c.apiVersion,
        drafts: drafts.list().length, queued: queue.list().filter((q) => q.status === "pending").length, posts: history.list().length });
      break;
    }

    case "styles":
      if (sub) {
        const s = STYLES[sub]; if (!s) throw new Error(`Unknown style "${sub}". Styles: ${Object.keys(STYLES).join(", ")}`);
        console.log(`${sub}: ${s.label}\n${s.description}\nGood for: ${s.use}\nItems: ${s.items.min}-${s.items.max} (${s.items.label})\n\nExample:\n${"─".repeat(44)}\n${compose(sub, s.example)}\n${"─".repeat(44)}`);
      } else {
        for (const [id, s] of Object.entries(STYLES)) console.log(`${id.padEnd(13)} ${s.description}`);
        console.log("\nTry: quillpost styles news");
      }
      break;

    case "preview": show(await publish(specFromArgs([sub, ...rest].filter(Boolean)), { dryRun: true })); break;
    case "post": show(await publish(specFromArgs([sub, ...rest].filter(Boolean)), { dryRun: v["dry-run"] })); break;

    case "draft":
      if (sub === "save") { const d = drafts.add({ spec: specFromArgs(rest) }); console.log(`Saved draft ${d.id}`); }
      else if (sub === "list") for (const d of drafts.list()) console.log(`${d.id}  ${d.createdAt.slice(0, 16)}  ${d.spec.style ?? "text"}  ${(d.spec.text ?? d.spec.hook ?? "").slice(0, 60)}`);
      else if (sub === "show") show(await publish(drafts.get(rest[0]).spec, { dryRun: true }));
      else if (sub === "publish") { const r = await publish(drafts.get(rest[0]).spec, { dryRun: v["dry-run"] }); if (r.published) drafts.remove(rest[0]); show(r); }
      else if (sub === "delete") console.log(`Deleted ${drafts.remove(rest[0]).id}`);
      else throw new Error("Usage: draft save|list|show|publish|delete");
      break;

    case "schedule":
      if (sub === "add") {
        if (!v.at) throw new Error('schedule add needs --at="2026-10-23 09:00" (local time) or --at=+2h');
        const when = parseWhen(v.at);
        const spec = specFromArgs(rest);
        const p = await publish(spec, { dryRun: true });
        const item = queue.add({ at: when.toISOString(), status: "pending", spec });
        console.log(`Queued ${item.id} for ${when.toString()}. It is published when \`quillpost schedule run\` or \`watch\` runs on this machine.`);
        if (p.warnings.length) for (const w of p.warnings) console.log(`! ${w}`);
      } else if (sub === "list") for (const q of queue.list()) console.log(`${q.id}  ${new Date(q.at).toLocaleString()}  ${q.status}${q.error ? ` (${q.error.split("\n")[0]})` : ""}  ${(q.spec.text ?? q.spec.hook ?? "").slice(0, 50)}`);
      else if (sub === "cancel") console.log(`Cancelled ${queue.remove(rest[0]).id}`);
      else if (sub === "run") out(await runDue());
      else if (sub === "watch") {
        const every = Number(v.every ?? 60) * 1000;
        console.log(`Watching the queue every ${every / 1000}s. Ctrl+C to stop.`);
        const tick = async () => { for (const r of await runDue()) console.log(new Date().toISOString(), JSON.stringify(r)); };
        await tick();
        setInterval(() => tick().catch((e) => console.error(e.message)), every);
      } else throw new Error("Usage: schedule add|list|cancel|run|watch");
      break;

    case "posts": for (const h of history.list()) console.log(`${h.id}  ${h.createdAt.slice(0, 16)}  ${h.visibility}  ${h.preview}\n        ${h.url}`); break;
    case "comment": {
      if (!rest.length) throw new Error("Usage: comment <post> <text>");
      out(await api.comment(resolvePost(sub), rest.join(" ")));
      break;
    }
    case "react": out(await api.react(resolvePost(sub), v.type ?? "LIKE")); break;
    case "delete": out(await api.deletePost(resolvePost(sub))); break;

    case "mcp": await (await import("./mcp.js")).serve(); break;
    case "config":
      out({ mcpServers: { quillpost: { command: "node", args: [new URL("./cli.js", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"), "mcp"] } } });
      break;
    default: console.log(HELP);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
