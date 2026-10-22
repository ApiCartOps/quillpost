// Post styles: turn a few fields into a LinkedIn-ready plain-text post, and lint any text.
// LinkedIn renders plain text only: no markdown, so structure comes from line breaks and markers.

const MARKERS = {
  arrow: () => "→ ",
  numbered: (i) => `${i + 1}. `,
  dash: () => "- ",
  none: () => "",
};

export const STYLES = {
  announcement: {
    label: "Announcement",
    description: "Launch or news about your own work: hook, what it is, what is included, call to action.",
    use: "Product or feature launches, releases, new roles, milestones.",
    blocks: ["hook", "intro", "items", "takeaway", "cta", "tags"],
    marker: "arrow",
    items: { min: 0, max: 6, label: "what is included" },
    example: {
      hook: "Quillpost 0.3 is out: write LinkedIn posts from your terminal.",
      intro: "It formats posts for LinkedIn, checks them before you publish, and works as an MCP server for AI agents.",
      items: ["Seven post styles with built-in checks", "Images, documents and link previews", "Drafts and a local schedule"],
      cta: "Which style would you use first?",
      tags: ["OpenSource", "DevTools", "LinkedIn"],
    },
  },
  insight: {
    label: "Insight",
    description: "A point of view backed by two to five short supporting points.",
    use: "Thought leadership, lessons learned, opinions with reasons.",
    blocks: ["hook", "intro", "items", "takeaway", "cta", "tags"],
    marker: "numbered",
    items: { min: 2, max: 5, label: "supporting points" },
    example: {
      hook: "Most agent failures are permission problems, not model problems.",
      intro: "After a year of shipping agents, the same three gaps keep showing up.",
      items: ["Agents get broad access by default", "Nobody reviews what an agent is allowed to do", "Spend limits are added after the first surprise bill"],
      takeaway: "Design permissions first, capabilities second.",
      cta: "What is the first control you add?",
      tags: ["AIAgents", "Engineering", "Security"],
    },
  },
  news: {
    label: "News roundup",
    description: "One to five recent developments, each with what happened and why it matters.",
    use: "Daily or weekly industry updates and commentary on recent events.",
    blocks: ["hook", "items", "takeaway", "cta", "tags"],
    marker: "arrow",
    items: { min: 1, max: 5, label: "news items (what happened, why it matters)" },
    example: {
      hook: "Three agent releases this week that change how teams ship.",
      items: ["Walmart launched an MCP server so approved agents can shop. Retail is writing agent access rules.", "OpenAI published two agent incidents. Oversight has to be hard to switch off."],
      takeaway: "The pattern: agents are getting real access, and controls are becoming the product.",
      cta: "Which of these affects your team first?",
      tags: ["AIAgents", "AgenticAI", "TechNews"],
    },
  },
  story: {
    label: "Story",
    description: "A short personal story told in paragraphs, ending in a lesson.",
    use: "Career moments, mistakes, behind-the-scenes, customer stories.",
    blocks: ["hook", "items", "takeaway", "cta", "tags"],
    marker: "none",
    items: { min: 2, max: 8, label: "story paragraphs (one to two sentences each)" },
    example: {
      hook: "I deleted production on a Friday. Here is what I changed.",
      items: ["It was a one-line cleanup script and I skipped the dry run.", "We were back in 40 minutes, but only because a teammate had a backup.", "The next Monday I wrote the rule we still use."],
      takeaway: "The lesson: every destructive command gets a dry run, no exceptions.",
      cta: "What is your rule?",
      tags: ["Engineering", "Lessons"],
    },
  },
  howto: {
    label: "How-to",
    description: "Numbered steps that get the reader to a result.",
    use: "Tutorials, checklists, workflows, setup guides.",
    blocks: ["hook", "intro", "items", "takeaway", "cta", "tags"],
    marker: "numbered",
    items: { min: 2, max: 8, label: "steps" },
    example: {
      hook: "How to give an AI agent safe access to your GitHub in 4 steps.",
      items: ["Create one token per account, with the smallest scope that works.", "Store tokens outside your repos.", "Require approval before any write.", "Review the activity log weekly."],
      cta: "What would you add?",
      tags: ["HowTo", "GitHub", "AIAgents"],
    },
  },
  listicle: {
    label: "Listicle",
    description: "A numbered list of three to nine items with a one-line takeaway.",
    use: "Tools, books, mistakes, tips, predictions.",
    blocks: ["hook", "items", "takeaway", "cta", "tags"],
    marker: "numbered",
    items: { min: 3, max: 9, label: "list items" },
    example: {
      hook: "5 mistakes I see in every first MCP server.",
      items: ["Returning tokens in tool output", "No approval step on writes", "Tools with vague descriptions", "No error handling", "No tests"],
      takeaway: "Fix the first two and you are ahead of most.",
      cta: "Which did I miss?",
      tags: ["MCP", "DevTools"],
    },
  },
  question: {
    label: "Question",
    description: "A discussion starter: a sharp question, brief context, optional options to vote on in comments.",
    use: "Engagement, polling opinions, asking for recommendations.",
    blocks: ["hook", "intro", "items", "cta", "tags"],
    marker: "dash",
    items: { min: 0, max: 5, label: "answer options" },
    example: {
      hook: "Should AI agents ever be allowed to publish on your behalf?",
      intro: "I am building a tool that drafts posts and waits for approval. Some people want it fully automatic.",
      items: ["Never, always review", "Only for low-stakes channels", "Yes, with limits"],
      cta: "Where do you land? Tell me in the comments.",
      tags: ["AIAgents", "Automation"],
    },
  },
};

export const FIELDS = ["hook", "intro", "items", "takeaway", "cta", "tags"];

export function normalizeTag(t) {
  const clean = String(t).replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
  return clean ? `#${clean}` : "";
}

/** Required-field and count checks for a style. Returns a list of error strings. */
export function validateFields(styleId, f) {
  const st = STYLES[styleId];
  if (!st) return [`Unknown style "${styleId}". Styles: ${Object.keys(STYLES).join(", ")}`];
  const errors = [];
  if (!f.hook?.trim()) errors.push("hook is required (the first line people see)");
  const n = (f.items ?? []).filter((s) => s?.trim()).length;
  if (n < st.items.min) errors.push(`${st.label} needs at least ${st.items.min} item(s) for ${st.items.label} (got ${n})`);
  if (n > st.items.max) errors.push(`${st.label} allows at most ${st.items.max} items (got ${n})`);
  return errors;
}

export function compose(styleId, f) {
  const st = STYLES[styleId];
  const mark = MARKERS[st.marker];
  const out = [];
  for (const b of st.blocks) {
    if (b === "items") {
      const items = (f.items ?? []).map((s) => s.trim()).filter(Boolean);
      if (items.length) out.push(items.map((s, i) => `${mark(i)}${s}`).join("\n\n"));
    } else if (b === "tags") {
      const tags = (f.tags ?? []).map(normalizeTag).filter(Boolean);
      if (tags.length) out.push(tags.join(" "));
    } else if (f[b]?.trim()) {
      out.push(f[b].trim());
    }
  }
  return out.join("\n\n");
}

/** Convert markdown-ish text to LinkedIn plain text. Returns { text, links } (links go in the first comment). */
export function normalize(input) {
  const links = [];
  let t = String(input).replace(/\r\n/g, "\n");
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => { links.push(url); return label; });
  t = t.replace(/^#{1,6}[ \t]+(.+)$/gm, "$1");
  t = t.replace(/(\*\*|__)(.+?)\1/g, "$2");
  t = t.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?!\w)/g, "$1$2");
  t = t.replace(/`([^`\n]+)`/g, "$1");
  t = t.replace(/^[ \t]*[-*+][ \t]+/gm, "→ ");
  t = t.replace(/^>[ \t]?/gm, "");
  t = t.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  return { text: t, links };
}

const urlRe = /https?:\/\/\S+/g;

/** Check final text. errors always block; soft (markdown) errors block unless forced; warnings are advice. */
export function lint(text) {
  const errors = [];
  const soft = [];
  const warnings = [];
  const chars = [...text].length;
  const firstBlock = text.split(/\n\s*\n/)[0] ?? "";
  const hookChars = [...firstBlock].length;
  const hashtags = text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? [];
  const urls = text.match(urlRe) ?? [];
  const lines = text.split("\n");
  const lastLine = lines.filter((l) => l.trim()).at(-1) ?? "";

  if (!text.trim()) errors.push("post is empty");
  if (chars > 3000) errors.push(`post is ${chars} characters; LinkedIn allows 3000`);
  if (/\*\*.+?\*\*|__.+?__/.test(text)) soft.push("contains **bold** markdown, which LinkedIn shows literally (use --plain to convert)");
  if (/^#{1,6}[ \t]+\S/m.test(text)) soft.push("contains a markdown # heading (use --plain to convert)");
  if (/\[[^\]]+\]\([^)]+\)/.test(text)) soft.push("contains a markdown [link](url) (use --plain to convert)");
  if (/`[^`\n]+`/.test(text)) soft.push("contains `backticks`, which LinkedIn shows literally (use --plain to convert)");

  if (hookChars > 210) warnings.push(`first paragraph is ${hookChars} characters; the feed cuts around 210 before "see more", so keep the hook short`);
  if (!hashtags.length) warnings.push("no hashtags; 3 relevant ones at the end is a good default");
  if (hashtags.length > 5) warnings.push(`${hashtags.length} hashtags; more than 5 looks spammy`);
  if (hashtags.length && !/^(\s*#[\p{L}\p{N}_]+)+\s*$/u.test(lastLine)) warnings.push("hashtags are easier to scan when they are the last line");
  if (urls.length) warnings.push(`${urls.length} link(s) in the body can reduce reach; put them in the first comment (--comment)`);
  if (text.split(/\n\s*\n/).some((p) => [...p].length > 600)) warnings.push("a paragraph is over 600 characters; break it up");
  if ((text.match(/\p{Extended_Pictographic}/gu) ?? []).length > 3) warnings.push("more than 3 emoji");
  if (chars > 0 && chars < 150) warnings.push("very short post; posts of 700 to 1,600 characters tend to read well");

  const cut = [...text].slice(0, 210).join("");
  const seeMore = chars > 210 ? cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)) + "…" : null;
  return { errors, soft, warnings, stats: { chars, hookChars, hashtags: hashtags.length, links: urls.length }, seeMore };
}
