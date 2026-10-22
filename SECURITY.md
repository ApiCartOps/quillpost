# Security

## What Quillpost handles

- Your LinkedIn app **client secret** and a member **access token** (about 60 days).
- Post text, media files you choose to attach, and a local history of what you published.

## Where it lives

Everything is stored in `~/.quillpost/` (or the older `~/.linkedin-official/`) with owner-only file permissions. Nothing is stored in the repository, and nothing is sent anywhere except `api.linkedin.com` and `www.linkedin.com`. There is no telemetry.

Tokens are never written to command lines, logs or MCP tool output. Do not paste them into chat, issues or screenshots.

## Agents and publishing

The MCP server's publishing tools do nothing without `approved: true` and the server tells agents to set it only after you approve the exact text in chat. This is a guardrail that depends on the agent following instructions; it is not a sandbox. If you do not want an agent to be able to publish, do not enable the publishing tools in your client.

## Good practice

- Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`. If your network re-signs HTTPS, use `NODE_USE_SYSTEM_CA=1`.
- If a token or secret leaks, regenerate the client secret on your app's **Auth** tab at <https://www.linkedin.com/developers/apps>, then run `quillpost setup` and `quillpost login` again.
- Review `quillpost posts` and your LinkedIn activity if something looks wrong.

## Reporting a vulnerability

Please report privately through GitHub's **Report a vulnerability** option on the repository's Security tab, not in a public issue. Include steps to reproduce and the version. You will get a response as soon as practical.
