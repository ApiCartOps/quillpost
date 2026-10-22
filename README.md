# linkedin-official

A small CLI and MCP server built on LinkedIn's **official** REST API (OAuth 2.0). No scraping, no browser automation, no third-party service.

Not affiliated with or endorsed by LinkedIn.

## What it does

| Command | Description |
|---|---|
| `setup --client-id --client-secret` | Save your LinkedIn app credentials |
| `login` | OAuth sign-in through your browser |
| `whoami` | Show the authenticated member |
| `post <text> [--visibility=PUBLIC\|CONNECTIONS] [--dry-run]` | Publish a text post |
| `delete <urn>` | Delete a post |
| `mcp` | Run as an MCP server over stdio |
| `status`, `logout` | Show config state, forget the token |

MCP tools: `linkedin_whoami`, `linkedin_create_post`, `linkedin_delete_post`.

## Scope and limits

Only the self-serve LinkedIn products are used, so this covers your own profile and posting. Reading feeds, search, connections and messaging need partner approval from LinkedIn and are not supported.

## Setup

1. Create an app at <https://www.linkedin.com/developers/apps>.
2. On the **Products** tab add **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**.
3. On the **Auth** tab add the redirect URL `http://localhost:8765/callback` (exact match) and copy the Client ID and Client Secret.
4. Install and sign in:

```bash
git clone https://github.com/ApiCartOps/linkedin-official.git
cd linkedin-official
npm install
node src/cli.js setup --client-id=YOUR_ID --client-secret=YOUR_SECRET
node src/cli.js login
node src/cli.js whoami
```

Credentials and the access token are stored in `~/.linkedin-official/config.json` (outside the repo, file mode 600). Access tokens last about 60 days; run `login` again when one expires.

Environment overrides: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_API_VERSION`.

## Use as an MCP server

Claude Code:

```bash
claude mcp add linkedin-official --scope user -- node /absolute/path/to/linkedin-official/src/cli.js mcp
```

Generic MCP client config:

```json
{
  "mcpServers": {
    "linkedin-official": {
      "command": "node",
      "args": ["/absolute/path/to/linkedin-official/src/cli.js", "mcp"]
    }
  }
}
```

`linkedin_create_post` publishes publicly. Clients should show the exact text and get explicit approval before calling it. The `.claude/` folder contains a skill and slash commands (`/linkedin-post`, `/linkedin-whoami`, `/linkedin-delete`) that enforce this for Claude Code.

## API version

Requests send a `LinkedIn-Version` header (default `202609`). LinkedIn retires old versions; if you see a `426 NONEXISTENT_VERSION` error, pass a current one:

```bash
node src/cli.js setup --client-id=... --client-secret=... --api-version=YYYYMM
```

## License

MIT
