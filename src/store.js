// Local drafts, schedule queue and post history, stored next to the login in ~/.quillpost.
import crypto from "node:crypto";
import { readJson, writeJson } from "./config.js";

const newId = () => crypto.randomBytes(3).toString("hex");
const now = () => new Date().toISOString();

function collection(file) {
  const read = () => readJson(file, []);
  return {
    list: read,
    get(id) {
      const hit = read().find((x) => x.id === id);
      if (!hit) throw new Error(`No item "${id}" in ${file.replace(".json", "")}.`);
      return hit;
    },
    add(item) { const all = read(); const row = { id: newId(), createdAt: now(), ...item }; all.push(row); writeJson(file, all); return row; },
    update(id, patch) {
      const all = read(); const i = all.findIndex((x) => x.id === id);
      if (i < 0) throw new Error(`No item "${id}" in ${file.replace(".json", "")}.`);
      all[i] = { ...all[i], ...patch, updatedAt: now() }; writeJson(file, all); return all[i];
    },
    remove(id) {
      const all = read(); const i = all.findIndex((x) => x.id === id);
      if (i < 0) throw new Error(`No item "${id}" in ${file.replace(".json", "")}.`);
      const [gone] = all.splice(i, 1); writeJson(file, all); return gone;
    },
  };
}

export const drafts = collection("drafts.json");
export const queue = collection("queue.json");
export const history = collection("history.json");

/** Resolve "last", a short history id, or a full urn to a post urn. */
export function resolvePost(ref) {
  if (!ref) throw new Error('Give a post: "last", a history id (see `quillpost posts`), or a urn like urn:li:share:123.');
  if (ref.startsWith("urn:li:")) return ref;
  const all = history.list();
  if (ref === "last") {
    const last = all.at(-1);
    if (!last) throw new Error("No posts in history yet.");
    return last.urn;
  }
  const hit = all.find((x) => x.id === ref);
  if (!hit) throw new Error(`Unknown post "${ref}". Run \`quillpost posts\` or pass a full urn.`);
  return hit.urn;
}

/** "2026-10-23 09:00" (local), any ISO string, or relative "+30m" / "+2h" / "+1d". */
export function parseWhen(s, base = Date.now()) {
  const rel = /^\+(\d+)\s*([mhd])$/i.exec(s.trim());
  if (rel) return new Date(base + Number(rel[1]) * { m: 60e3, h: 3600e3, d: 86400e3 }[rel[2].toLowerCase()]);
  const d = new Date(s.trim());
  if (Number.isNaN(d.getTime())) throw new Error(`Cannot read time "${s}". Use "2026-10-23 09:00" (local), an ISO time, or "+2h".`);
  return d;
}
