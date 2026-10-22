# Troubleshooting

Find your error text below. `quillpost status` shows login state, token expiry and the API version in use.

## Sign-in

### "The redirect_uri does not match the registered value"
The redirect URL on your LinkedIn app is not exactly what Quillpost sends. In your app's **Auth** tab, add `http://localhost:8765/callback` and click **Update**. Check for a trailing slash, `127.0.0.1` instead of `localhost`, `https`, a different port, or editing a different app than the one whose Client ID you used. To use another URL, pass `--redirect-uri=URL` to `setup`.

### "The requested permission scope is not valid"
Your app is missing a product. On the **Products** tab, both must be added (not just requested): **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**. The **Auth** tab then lists `openid`, `profile`, `email` and `w_member_social`.

### "Port 8765 is busy"
An earlier `login` is still waiting. Close it (Ctrl+C) or end the stray `node` process, then retry.

### "Not logged in" or "Access token expired"
Run `quillpost login`. Tokens last about 60 days and cannot be refreshed.

## Network

### `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
Something on your network (antivirus HTTPS scanning, a VPN, a corporate proxy) re-signs HTTPS traffic with a certificate Windows trusts but Node does not. Tell Node to use the system certificate store:

```powershell
$env:NODE_USE_SYSTEM_CA = "1"        # this terminal only
setx NODE_USE_SYSTEM_CA 1            # permanent; open a new terminal
```

Do **not** set `NODE_TLS_REJECT_UNAUTHORIZED=0`; that disables certificate checking, and Quillpost sends your access token. For an MCP client, add `NODE_USE_SYSTEM_CA=1` to the server's `env`.

### `ETIMEDOUT`, `ECONNREFUSED`, `ENOTFOUND`
A firewall, VPN, proxy or DNS problem. Node's `fetch` does not use your system proxy settings by default. On Node 24 you can set `NODE_USE_ENV_PROXY=1` together with `HTTPS_PROXY=http://host:port`; otherwise try a direct connection.

## Publishing

### `426 NONEXISTENT_VERSION`
LinkedIn retires old API versions. Pass a current one (format `YYYYMM`): `quillpost setup --client-id=... --client-secret=... --api-version=202609`. The default is `202609`; if that has been retired by the time you read this, use a newer month.

### `401`
The token is invalid or expired. Run `quillpost login`.

### `403 ... partnerApiSocialActions` when commenting or reacting (or with `--comment`)
Expected on a self-serve app. LinkedIn only allows commenting and reactions through the Community Management API, which it grants to approved partners; **Share on LinkedIn** does not include it. A post published with `--comment` still goes live, and the comment text is printed (`commentToPaste`) so you can paste it on LinkedIn.

### `403` when posting or uploading
The app lacks permission. Confirm **Share on LinkedIn** is on your app and that you signed in after adding it (run `login` again). Some image or document features can depend on the account; open an issue with the exact message.

### `422`
LinkedIn rejected the content. The message names the field. Common causes: duplicate content posted twice in a row, text too long, or an invalid link.

### "Not published: ..." (before any request is sent)
Quillpost's own checks. Read the listed reasons; see [Post styles: Checks](post-styles.md#checks). Markdown problems can be fixed with `--plain`.

### Post published but the first comment failed
The post is live; the response includes `commentError` and `commentToPaste`. On a self-serve app this is expected (see above): paste the text as the first comment on LinkedIn.

## Scheduling

### A scheduled post did not go out
The queue only publishes when `schedule run` or `schedule watch` runs. Check `quillpost schedule list`: `pending` means nothing ran after its time, `failed` shows the error. See [Scheduling](scheduling.md).

## Agents

### The agent shows a preview but never publishes
That is the approval model working: it publishes only after you approve in chat. Reply with your approval and it will call the tool with `approved: true`.

### The tools do not appear
Restart the client after adding the server. Check the path is absolute and `node src/cli.js mcp` starts without errors. In Claude Code, `claude mcp list` shows connection status.

## Still stuck

Open an issue at <https://github.com/ApiCartOps/quillpost/issues> with the error text. Remove any tokens or secrets first.
