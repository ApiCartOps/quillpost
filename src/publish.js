// Build, check and publish a post from a "spec" (shared by the CLI and the MCP server).
//
// spec = {
//   text | (style + hook, intro, items[], takeaway, cta, tags[]),
//   plain, visibility, firstComment, linksToComment, force,
//   link: { url, title, description } | images: [{ path, alt }] | document: { path, title }
// }
import fs from "node:fs";
import path from "node:path";
import { STYLES, compose, validateFields, normalize, lint } from "./styles.js";
import * as api from "./api.js";
import { history, queue } from "./store.js";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif"]);
const DOC_EXT = new Set([".pdf", ".ppt", ".pptx", ".doc", ".docx"]);
const VISIBILITY = ["PUBLIC", "CONNECTIONS", "LOGGED_IN"];
const MB = 1024 * 1024;

export function build(spec) {
  const errors = [];
  const warnings = [];
  let text;
  if (spec.style) {
    errors.push(...validateFields(spec.style, spec));
    text = STYLES[spec.style] ? compose(spec.style, spec) : "";
  } else {
    text = spec.text ?? "";
  }
  let links = [];
  if (spec.plain) ({ text, links } = normalize(text));

  const l = lint(text);
  errors.push(...l.errors);
  const soft = l.soft;
  warnings.push(...l.warnings);

  const visibility = spec.visibility ?? "PUBLIC";
  if (!VISIBILITY.includes(visibility)) errors.push(`visibility must be one of ${VISIBILITY.join(", ")}`);

  const kinds = [spec.link && "link", spec.images?.length && "images", spec.document && "document"].filter(Boolean);
  if (kinds.length > 1) errors.push(`use only one of link, images or document per post (got ${kinds.join(", ")})`);

  const attachments = {};
  if (spec.link) {
    try { if (!/^https?:$/.test(new URL(spec.link.url).protocol)) throw new Error(); } catch { errors.push(`link url is not a valid http(s) URL: ${spec.link.url}`); }
    if (!spec.link.title) warnings.push("link has no title; the preview card looks better with one");
    attachments.link = spec.link;
  }
  if (spec.images?.length) {
    if (spec.images.length > 20) errors.push("at most 20 images per post");
    for (const img of spec.images) {
      if (!IMAGE_EXT.has(path.extname(img.path).toLowerCase())) errors.push(`image must be png, jpg or gif: ${img.path}`);
      else if (!fs.existsSync(img.path)) errors.push(`image not found: ${img.path}`);
      else if (fs.statSync(img.path).size > 8 * MB) errors.push(`image is over 8 MB: ${img.path}`);
      if (!img.alt) warnings.push(`no alt text for ${path.basename(img.path)}; alt text helps accessibility`);
    }
    attachments.images = spec.images;
  }
  if (spec.document) {
    const p = spec.document.path;
    if (!DOC_EXT.has(path.extname(p).toLowerCase())) errors.push(`document must be pdf, ppt(x) or doc(x): ${p}`);
    else if (!fs.existsSync(p)) errors.push(`document not found: ${p}`);
    else if (fs.statSync(p).size > 100 * MB) errors.push(`document is over 100 MB: ${p}`);
    if (!spec.document.title) warnings.push("document has no title; it is shown above the carousel");
    attachments.document = spec.document;
  }

  const firstComment = spec.firstComment ?? (spec.linksToComment && links.length ? links.join("\n") : undefined);
  if (firstComment) {
    warnings.push("the first comment uses LinkedIn's commenting API, which is partner-only; on a self-serve app it usually fails with 403, " +
      "in which case the post still publishes and you paste the comment yourself (it is returned as commentToPaste)");
  }
  return { text, errors, soft, warnings, stats: l.stats, seeMore: l.seeMore, links, visibility, attachments, firstComment };
}

async function buildContent(a) {
  if (a.link) return { article: { source: a.link.url, ...(a.link.title && { title: a.link.title }), ...(a.link.description && { description: a.link.description }) } };
  if (a.images?.length) {
    const ids = [];
    for (const img of a.images) ids.push({ id: await api.uploadImage(img.path), altText: img.alt ?? "" });
    return ids.length === 1 ? { media: ids[0] } : { multiImage: { images: ids } };
  }
  if (a.document) return { media: { title: a.document.title ?? path.basename(a.document.path), id: await api.uploadDocument(a.document.path) } };
  return undefined;
}

export async function publish(spec, { dryRun = false } = {}) {
  const b = build(spec);
  const preview = {
    text: b.text, visibility: b.visibility, stats: b.stats, seeMore: b.seeMore,
    warnings: b.warnings, errors: [...b.errors, ...b.soft], attachments: b.attachments, firstComment: b.firstComment,
  };
  // Hard errors always block. Soft (markdown) errors block unless the caller forces.
  const blocking = [...b.errors, ...(spec.force ? [] : b.soft)];
  if (blocking.length) throw new Error(`Not published:\n- ${blocking.join("\n- ")}`);
  if (dryRun) return { published: false, ...preview };

  const content = await buildContent(b.attachments);
  const { urn } = await api.createPost({ text: b.text, visibility: b.visibility, content });
  const row = history.add({ urn, url: api.postUrl(urn), visibility: b.visibility, preview: b.text.replace(/\s+/g, " ").slice(0, 100) });
  const result = { published: true, id: row.id, urn, url: row.url, warnings: b.warnings };
  if (b.firstComment) {
    try { result.comment = await api.comment(urn, b.firstComment); }
    catch (e) {
      // The post is live; never fail the publish over its comment. Hand the text back so nothing is lost.
      result.commentError = e.message;
      result.commentToPaste = b.firstComment;
    }
  }
  return result;
}

/** Publish every queued post whose time has come. Failed items stay in the queue marked "failed". */
export async function runDue(now = Date.now()) {
  const done = [];
  for (const item of queue.list()) {
    if (item.status !== "pending" || new Date(item.at).getTime() > now) continue;
    try {
      const r = await publish(item.spec);
      queue.update(item.id, { status: "published", result: { urn: r.urn, url: r.url, commentToPaste: r.commentToPaste } });
      done.push({ id: item.id, status: "published", url: r.url, ...(r.commentToPaste && { commentToPaste: r.commentToPaste }) });
    } catch (e) {
      queue.update(item.id, { status: "failed", error: e.message });
      done.push({ id: item.id, status: "failed", error: e.message });
    }
  }
  return done;
}
