# CLI reference

Run `quillpost` with no arguments for the built-in help. Without `npm link`, use `node src/cli.js` in its place.

## Account

| Command | Description |
|---|---|
| `setup --client-id=ID --client-secret=SECRET [--redirect-uri=URL] [--api-version=YYYYMM]` | Save your LinkedIn app credentials |
| `login` | OAuth sign-in in your browser. Scopes: `openid profile email w_member_social` |
| `logout` | Forget the stored token |
| `whoami` | Show the signed-in member |
| `status` | Config path, login state, token expiry, API version, draft/queue/post counts |

## Writing

| Command | Description |
|---|---|
| `styles [id]` | List the styles, or show one with an example |
| `preview [text] [post options]` | Build and check a post. Publishes nothing |
| `post [text] [post options]` | Publish. Add `--dry-run` to check only |

### Post options

| Option | Description |
|---|---|
| `[text]` | Free text after the command (or use `--text-file`) |
| `--text-file=PATH` | Read text from a file; `-` reads stdin |
| `--style=ID` | Build the post from fields; see [Post styles](post-styles.md) |
| `--hook=` `--intro=` `--takeaway=` `--cta=` | Style fields |
| `--item=` | Repeat for each bullet, step or paragraph |
| `--tag=` | Repeat for each hashtag; or `--tags=a,b,c` |
| `--plain` | Convert markdown to LinkedIn plain text |
| `--visibility=` | `PUBLIC` (default), `CONNECTIONS`, `LOGGED_IN` |
| `--comment=TEXT` | First comment. **Partner-only on LinkedIn's side**: on a self-serve app it is refused, the post still publishes, and the text is printed for you to paste |
| `--links-to-comment` | With `--plain`, use the removed markdown links as the first comment text (same caveat) |
| `--link=URL` `--link-title=` `--link-desc=` | Link with a preview card |
| `--image=PATH` `--alt=` | Repeat both for each image, same order |
| `--document=PATH` `--doc-title=` | PDF, PowerPoint or Word as a carousel |
| `--video=PATH` `--video-title=` | One MP4, 75 KB to 500 MB |
| `--force` | Publish despite markdown errors (hard errors still block) |
| `--json` | Machine-readable output |
| `--dry-run` | With `post`: check without publishing |

Use only one of `--link`, `--image`, `--document` or `--video` per post.

Output of `preview` and `--dry-run`: the final text between rules, a stats line (visibility, characters, hook length, hashtags, links), the feed cut, attachments, the first comment, then `✗` errors and `!` warnings.

## Drafts

| Command | Description |
|---|---|
| `draft save [post options]` | Save a post spec. Prints its id |
| `draft list` | List drafts |
| `draft show <id>` | Build and check a draft |
| `draft publish <id>` | Publish a draft, then remove it |
| `draft delete <id>` | Delete a draft |

## Schedule

| Command | Description |
|---|---|
| `schedule add --at=WHEN [post options]` | Queue a post. `WHEN`: `"2026-10-23 09:00"` (local), ISO time, or `+30m` / `+2h` / `+1d` |
| `schedule list` | Queued posts with status |
| `schedule cancel <id>` | Remove one |
| `schedule run` | Publish everything due, once |
| `schedule watch [--every=60]` | Keep running; check every N seconds |

See [Scheduling](scheduling.md).

## After publishing

| Command | Description |
|---|---|
| `posts` | Posts published through Quillpost, with ids and URLs |
| `comment <post> <text>` | Comment on your post. **Needs Community Management API access**; fails with a clear message on self-serve apps |
| `react <post> [--type=LIKE]` | `LIKE`, `PRAISE`, `APPRECIATION`, `EMPATHY`, `INTEREST`, `ENTERTAINMENT`. Same restriction as comments (untested, expected to fail the same way) |
| `delete <post>` | Delete a post. Irreversible |

`<post>` is `last`, a history id from `posts`, or a full URN such as `urn:li:share:123`.

## Other

| Command | Description |
|---|---|
| `mcp` | Run as an MCP server over stdio. See the [MCP guide](mcp.md) |
| `config` | Print an MCP client config snippet pointing at this checkout |

## Files and environment

Everything is stored in `~/.quillpost/` (or the older `~/.linkedin-official/` if that is where your login already is), file mode 600:

| File | Contents |
|---|---|
| `config.json` | Client id and secret, access token, expiry, API version |
| `drafts.json` | Saved drafts |
| `queue.json` | Scheduled posts and their status |
| `history.json` | Posts published through Quillpost |

| Variable | Purpose |
|---|---|
| `QUILLPOST_HOME` | Use a different data folder |
| `QUILLPOST_CLIENT_ID`, `QUILLPOST_CLIENT_SECRET`, `QUILLPOST_ACCESS_TOKEN` | Override stored values (`LINKEDIN_*` names also work) |
| `QUILLPOST_API_VERSION` | LinkedIn API version header, default `202609` |
| `NODE_USE_SYSTEM_CA=1` | Trust the system certificate store (needed behind HTTPS-inspecting networks) |

Exit code is 0 on success and 1 on any error; errors go to stderr.
