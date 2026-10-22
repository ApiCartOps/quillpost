# Contributing

Thanks for helping. Quillpost is small on purpose: zero runtime dependencies beyond the MCP SDK and `zod`.

## Setup

```bash
git clone https://github.com/ApiCartOps/quillpost.git
cd quillpost
npm install
npm test
```

`npm test` runs `scripts/check.mjs`: a syntax check, unit tests for styles and checks, and end-to-end tests of the CLI and MCP server against a **fake LinkedIn API** with a temporary data folder. It needs no network and no LinkedIn account, and it never touches your real `~/.quillpost`.

## Layout

| Path | What |
|---|---|
| `src/cli.js` | Command-line interface |
| `src/mcp.js` | MCP server (tools, prompts, resource) |
| `src/publish.js` | Build, check and publish a post; the schedule runner |
| `src/styles.js` | Post styles, compose, lint, markdown conversion |
| `src/api.js` | LinkedIn API calls (posts, uploads, comments, reactions) |
| `src/auth.js`, `src/config.js`, `src/store.js` | OAuth login, config, drafts/queue/history |
| `content/` | Skill and slash command sources for agents |
| `docs/` | User documentation |

## Guidelines

- **New LinkedIn endpoints** need a branch in the fake API in `scripts/check.mjs` and a test that checks the request body. Cite LinkedIn's documentation for the request shape in the pull request.
- **Anything that publishes** from the MCP server must take `approved` and do nothing without it. Add a test that proves it.
- Keep errors actionable: say what to do, not just what failed.
- Update `docs/` and `CHANGELOG.md` with the change.
- Do not commit tokens, client secrets, or real post content.

## Reporting bugs

Open an issue with the command you ran and the error text (remove secrets first). For anything involving a LinkedIn error, include the status code and message.

Security issues: see [SECURITY.md](SECURITY.md).
