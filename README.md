<p align="center"><img src="https://raw.githubusercontent.com/ApiCartOps/quillpost/main/assets/logo.svg" width="96" alt="Quillpost logo"></p>

<h1 align="center">Quillpost</h1>

<p align="center"><b>Write, check and publish LinkedIn posts from your terminal or AI agent.</b><br>Seven post styles, built-in checks, images, documents, video, drafts and a schedule, on LinkedIn's official API.</p>

<p align="center"><img alt="license" src="https://img.shields.io/badge/license-MIT-2dd4bf"> <img alt="node" src="https://img.shields.io/badge/node-%3E%3D20-2dd4bf"> <img alt="MCP" src="https://img.shields.io/badge/MCP-stdio-2dd4bf"> <img alt="API" src="https://img.shields.io/badge/LinkedIn-official%20API-2dd4bf"></p>

Quillpost is a CLI and an MCP server that publishes to **your own** LinkedIn profile using LinkedIn's official REST API and OAuth 2.0. No scraping, no browser automation, no third-party service in the middle. It speaks plain MCP over stdio, so it works with any MCP-capable agent (Claude Code and Desktop, Cursor, VS Code / Copilot, Windsurf, Cline, Gemini CLI, Codex CLI and others).

Not affiliated with or endorsed by LinkedIn.

## Why

LinkedIn renders **plain text only**. Markdown from an AI draft shows up as literal `**asterisks**` and `#` signs, the feed cuts your post after about 210 characters, and links in the body hurt reach. Quillpost fixes the structure for you:

- **Styles** build a well-formed post from a few fields (hook, items, takeaway, question, hashtags).
- **Checks** catch markdown, over-long hooks, link-in-body and hashtag problems before anything is published.
- **Safe for agents.** An agent can only preview. Publishing needs an explicit approval flag that the agent is told to set only after you say yes in chat.

## Quick start

```bash
git clone https://github.com/ApiCartOps/quillpost.git
cd quillpost
npm install
npm link                       # puts `quillpost` on your PATH (or run: node src/cli.js)

quillpost setup --client-id=YOUR_ID --client-secret=YOUR_SECRET
quillpost login
quillpost whoami
```

You need a free LinkedIn developer app with two products enabled. [Getting started](docs/getting-started.md) walks through it in five minutes.

Write your first post:

```bash
quillpost preview --style=news \
  --hook="Three agent releases this week that change how teams ship." \
  --item="Walmart launched an MCP server so approved agents can shop. Retail is writing agent access rules." \
  --item="OpenAI published two agent incidents. Oversight has to be hard to switch off." \
  --takeaway="Agents are getting real access, and controls are becoming the product." \
  --cta="Which of these affects your team first?" \
  --tag=AIAgents --tag=AgenticAI --tag=TechNews
```

```text
────────────────────────────────────────────
Three agent releases this week that change how teams ship.

→ Walmart launched an MCP server so approved agents can shop. Retail is writing agent access rules.

→ OpenAI published two agent incidents. Oversight has to be hard to switch off.

Agents are getting real access, and controls are becoming the product.

Which of these affects your team first?

#AIAgents #AgenticAI #TechNews
────────────────────────────────────────────
PUBLIC · 385 chars · hook 58 · 3 hashtags · 0 links
feed cut ("see more"): Three agent releases this week that change how teams ship. ↵ → Walmart launched an MCP server so approved agents can shop. Retail is writing agent access rules. ↵ → OpenAI published two agent incidents.…
```

Change `preview` to `post` to publish. Add `--dry-run` to any `post` to check it without publishing.

## Post styles

| Style | For | Layout |
|---|---|---|
| `announcement` | Launches, releases, milestones | hook, intro, → items, question |
| `insight` | Opinions with reasons | hook, intro, numbered points, takeaway, question |
| `news` | Roundups and commentary | hook, → items, takeaway, question |
| `story` | Personal stories | hook, paragraphs, lesson, question |
| `howto` | Tutorials and checklists | hook, numbered steps, question |
| `listicle` | Tips, tools, mistakes | hook, numbered items, takeaway |
| `question` | Discussion starters | hook, context, options, prompt |

`quillpost styles news` shows one with a full example. See [Post styles](docs/post-styles.md) for every field and check.

Already have text from somewhere else? Skip styles: `quillpost post --text-file=draft.md --plain` converts markdown to LinkedIn plain text and can pull the links out for a first comment.

## More than text

```bash
quillpost post "New release is out" --link=https://example.com/release --link-title="Release notes"
quillpost post --text-file=post.txt --image=chart.png --alt="Chart of weekly signups"
quillpost post --text-file=post.txt --document=deck.pdf --doc-title="Q3 review"
quillpost post --text-file=post.txt --video=demo.mp4 --video-title="Demo of the new export"
quillpost post --text-file=post.txt --comment="Sources: https://example.com/a"
```

Images (1 to 20), a PDF or Office document as a swipeable carousel, one MP4 video, and link preview cards are covered in [Rich posts](docs/rich-posts.md).

> **The first comment needs partner access.** LinkedIn restricts commenting through its API to approved partners, so on a self-serve app `--comment` is refused with a 403. The post still publishes, and Quillpost prints the comment text so you can paste it yourself.

## Drafts, schedule and follow-up

```bash
quillpost draft save --style=story --hook="..." --item="..." --item="..."
quillpost draft publish a1b2c3

quillpost schedule add --at="2026-10-23 09:00" --text-file=post.txt
quillpost schedule watch                 # publishes due posts while it runs

quillpost posts                          # what you published through Quillpost
quillpost delete last
```

`quillpost comment` and `quillpost react` exist too, but LinkedIn only allows them for partner apps (see below), so on a self-serve app they fail with a clear message.

LinkedIn's API has no native scheduling, so the schedule is a local queue. See [Scheduling](docs/scheduling.md) for how to run it from Task Scheduler, cron or launchd.

## Use it from an AI agent

```bash
claude mcp add quillpost --scope user -- node /absolute/path/to/quillpost/src/cli.js mcp
```

Other clients: `quillpost config` prints the standard `mcpServers` snippet. [MCP guide](docs/mcp.md) covers every tool, the approval model and client configs.

| Tool | What it does |
|---|---|
| `quillpost_styles`, `quillpost_preview` | Browse styles; build and check a post without publishing |
| `quillpost_post` | Publish. Only previews unless `approved: true` |
| `quillpost_delete` | Delete a post. Needs `approved: true` |
| `quillpost_comment`, `quillpost_react` | Partner-only on LinkedIn's side; fail with 403 on self-serve apps |
| `quillpost_draft_*` | Save, list, show, delete and publish drafts |
| `quillpost_schedule_*` | Queue, list, cancel and run scheduled posts |
| `quillpost_history`, `quillpost_whoami` | Your Quillpost posts; the signed-in account |

Server instructions, one prompt per style (`write_news`, `write_howto`, ...) and a `quillpost://styles` resource are included. The `.claude/` folder has a Claude Code skill and slash commands (`/quillpost-post`, `/quillpost-preview`, `/quillpost-delete`).

## What it can and cannot do

Quillpost uses only LinkedIn's **self-serve** products, so it covers your own profile: posting text, images, documents and link cards, and deleting. Reading your feed, searching, analytics, connections, messaging and **commenting and reactions** need partner approval (the Community Management API) and are not available on a self-serve app. Posts are always published as you.

> **Status (verified against the live LinkedIn API):** text posts, document carousels and deleting work. **Commenting is refused with `403 ACCESS_DENIED`** on a self-serve app, and reactions very likely are too; Quillpost reports this clearly and still publishes the post. Images and link cards follow LinkedIn's documented request shapes and are covered by an offline test suite with a fake API, but have not been confirmed live. If one behaves differently on your account, please [open an issue](https://github.com/ApiCartOps/quillpost/issues) with the error text.

## Security

- Credentials and the access token live in `~/.quillpost/` (file mode 600), never in the repo.
- Nothing publishes from an agent without an explicit approval flag; previews are always free.
- Access tokens last about 60 days; run `quillpost login` again when one expires.

See [SECURITY.md](SECURITY.md).

## Docs

[Getting started](docs/getting-started.md) · [Post styles](docs/post-styles.md) · [Rich posts](docs/rich-posts.md) · [CLI reference](docs/cli-reference.md) · [MCP guide](docs/mcp.md) · [Scheduling](docs/scheduling.md) · [Troubleshooting](docs/troubleshooting.md) · [FAQ](docs/faq.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

## License

MIT
