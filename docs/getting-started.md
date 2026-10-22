# Getting started

About five minutes. You need Node 20 or newer and a LinkedIn account.

## 1. Create a LinkedIn app

LinkedIn only lets apps post on a member's behalf, so you create a small app of your own. It is free and approval is instant for the two products below.

1. Go to <https://www.linkedin.com/developers/apps> and click **Create app**.
2. Give it a name, link a LinkedIn Page (create a placeholder Page if you do not have one), upload a logo (`assets/logo.png` works), and accept the terms.
3. Open the **Products** tab and request both:
   - **Sign In with LinkedIn using OpenID Connect**
   - **Share on LinkedIn**
4. Open the **Auth** tab. Under **Authorized redirect URLs for your app**, add exactly:

   ```text
   http://localhost:8765/callback
   ```

   Click **Update**. The match is character for character: no trailing slash, `localhost` not `127.0.0.1`, `http` not `https`.
5. On the same tab, copy the **Client ID** and **Primary Client Secret**.

## 2. Install Quillpost

```bash
git clone https://github.com/ApiCartOps/quillpost.git
cd quillpost
npm install
npm link        # optional: puts `quillpost` on your PATH. Otherwise use `node src/cli.js`
```

## 3. Connect your account

```bash
quillpost setup --client-id=YOUR_ID --client-secret=YOUR_SECRET
quillpost login
```

`login` opens LinkedIn in your browser. Click **Allow**; the page then says "Authorized". Check it worked:

```bash
quillpost whoami
```

Your credentials and token are stored in `~/.quillpost/config.json` with owner-only permissions. The token lasts about 60 days. When it expires, run `quillpost login` again.

If your network inspects HTTPS (some antivirus tools, VPNs and corporate proxies do), Node may fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Set `NODE_USE_SYSTEM_CA=1` so Node trusts your system certificate store. See [Troubleshooting](troubleshooting.md).

## 4. Write a post

```bash
quillpost styles                     # the seven styles
quillpost styles howto               # one style, with an example
quillpost preview --style=howto --hook="How to ..." --item="Step one" --item="Step two" --tag=HowTo
```

`preview` never publishes. When you like it, run the same command with `post`:

```bash
quillpost post --style=howto --hook="How to ..." --item="Step one" --item="Step two" --tag=HowTo
```

Your post is live on your profile. The command prints its URL and an id; `quillpost posts` lists what you published and `quillpost delete last` removes the most recent one.

## 5. Optional: connect an AI agent

```bash
claude mcp add quillpost --scope user -- node /absolute/path/to/quillpost/src/cli.js mcp
```

Restart the agent, then ask it to write a post. It will show you a preview and wait for your approval before publishing. See the [MCP guide](mcp.md).

## Next

- [Post styles](post-styles.md)
- [Rich posts](rich-posts.md): images, documents, link cards, and how first comments work
- [Scheduling](scheduling.md)
