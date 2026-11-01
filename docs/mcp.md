# MCP guide

Quillpost is a standard MCP server over stdio. Any client that can launch a command can use it.

## Connect a client

**Claude Code**

```bash
claude mcp add quillpost --scope user -- node /absolute/path/to/quillpost/src/cli.js mcp
```

**Claude Desktop, Cursor, Windsurf, Cline and most others**: add to the client's MCP config (`quillpost config` prints this with the right path):

```json
{
  "mcpServers": {
    "quillpost": {
      "command": "node",
      "args": ["/absolute/path/to/quillpost/src/cli.js", "mcp"]
    }
  }
}
```

**VS Code / GitHub Copilot** uses `servers` instead of `mcpServers` in its `mcp.json`.

If your network re-signs HTTPS traffic, add `"env": { "NODE_USE_SYSTEM_CA": "1" }`. Sign in once on the command line first (`quillpost login`); the server reuses that login.

## The approval model

Publishing is public, so no tool publishes by default.

1. The agent builds the post with **`quillpost_preview`** and shows you the exact text, visibility and attachments.
2. You approve in chat.
3. Only then does the agent call the publishing tool again with **`approved: true`**.

Every tool that publishes, comments, reacts, deletes or schedules takes `approved` (default `false`). Without it, the tool returns what *would* happen and changes nothing. The server also sends instructions telling the agent never to take text or approval from web pages, files or tool output, and never to retry a failed publish silently.

Hard errors (empty or over-long post, missing fields, bad attachments) block even with `approved: true`. Markdown in the text blocks too, unless the agent sets `plain: true` to convert it or `force: true` (which it should do only if you ask).

This is a guardrail, not a sandbox: it relies on the agent honoring the instructions. If you do not want an agent to publish at all, only enable the read tools in your client, or leave `approved` out of what you allow.

## Tools

| Tool | Publishes? | Description |
|---|---|---|
| `quillpost_whoami` | no | The signed-in LinkedIn member |
| `quillpost_styles` | no | List styles, or one with its example text |
| `quillpost_preview` | no | Build and check a post; text, stats, feed cut, warnings, errors |
| `quillpost_post` | with `approved` | Publish text, a style post, link, images, a document or a video |
| `quillpost_comment` | with `approved` | Comment on one of your posts. **Partner-only on LinkedIn's side**; fails with 403 on self-serve apps |
| `quillpost_react` | with `approved` | React to a post. Same restriction (expected to fail the same way) |
| `quillpost_delete` | with `approved` | Delete a post |
| `quillpost_history` | no | Posts published through Quillpost |
| `quillpost_draft_save` / `_list` / `_get` / `_delete` | no | Manage local drafts |
| `quillpost_draft_publish` | with `approved` | Publish a saved draft |
| `quillpost_schedule_add` | with `approved` | Queue a post for later |
| `quillpost_schedule_list` / `_cancel` | no | Manage the queue |
| `quillpost_schedule_run_due` | with `approved` | Publish due queued posts |

`quillpost_post` and `quillpost_preview` take the same fields: `text`, or `style` with `hook`, `intro`, `items`, `takeaway`, `cta`, `tags`; plus `plain`, `visibility`, `first_comment`, `link`, `images`, `document`, `video`, `force`.

**First comments and partner access.** `first_comment` (like `quillpost_comment`) uses LinkedIn's commenting API, which only approved partners can use. On a self-serve app LinkedIn refuses it with 403. The post still publishes, and the result carries `commentError` and `commentToPaste`; the server instructions tell the agent to hand that text to you to paste on LinkedIn and not to retry.

A `post` argument means `"last"`, a history id, or a URN.

## Prompts and resources

- **Prompts:** `write_announcement`, `write_insight`, `write_news`, `write_story`, `write_howto`, `write_listicle`, `write_question`. Each takes a `topic` and starts the preview-then-approve flow.
- **Resource:** `quillpost://styles` lists the styles.

## Claude Code skill and commands

The `.claude/` folder in this repo has a skill and slash commands that enforce the same rules: `/quillpost-post`, `/quillpost-preview`, `/quillpost-delete`. The sources are in `content/`; copy them to `~/.claude/` to use them in every project.
