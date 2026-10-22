# FAQ

### Is this official?
It uses LinkedIn's **official** API and OAuth, but it is an independent project, not made or endorsed by LinkedIn. LinkedIn does not publish its own CLI or MCP server.

### Does it scrape LinkedIn or automate a browser?
No. Everything goes through `api.linkedin.com` with a token you grant through LinkedIn's own consent screen. That is also why it cannot do things LinkedIn does not allow apps to do.

### Whose account does it post to?
Only the account that signed in. Quillpost cannot post as a company Page or as another person.

### Can it read my feed, search, or show analytics?
No. Those need partner-level API access that LinkedIn grants to approved businesses. The self-serve products cover posting text, images, documents and link cards, and deleting.

### Can it comment or react?
Not on a self-serve app. LinkedIn restricts commenting (and, we expect, reactions) to approved partners through its Community Management API; the request comes back `403 ACCESS_DENIED`. `--comment` therefore still publishes your post, then prints the comment text for you to paste on LinkedIn. If you have been granted that API access, `quillpost comment` and `quillpost react` will work.

### Why do I need to create a LinkedIn app?
LinkedIn requires every app that posts for a member to be registered. Your own app gives you your own client id and secret, so there is no shared key and no hosted service holding your login.

### Is it safe to give an AI agent access?
The agent can only preview unless it sets an explicit approval flag, and it is instructed to do that only after you approve the exact text in chat. That is a guardrail based on the agent following instructions, not a technical sandbox. If you want zero risk of an unwanted post, do not allow the publishing tools in your client. See the [MCP guide](mcp.md).

### Where are my credentials stored?
In `~/.quillpost/` with owner-only permissions, outside any repository. Nothing is sent anywhere except to LinkedIn.

### How long does sign-in last?
About 60 days. There is no refresh token on the self-serve flow, so run `quillpost login` again when it expires.

### Can I schedule posts for when my computer is off?
No. LinkedIn has no scheduling API, so Quillpost keeps a local queue that needs something running at publish time. See [Scheduling](scheduling.md).

### Can a cloud AI routine publish for me?
Not directly: your token lives on your machine. Have the routine draft the post and publish it yourself, or save it as a draft.

### Why plain text only?
LinkedIn does not render markdown or rich formatting from the API. Quillpost builds structure from line breaks and markers, and warns when markdown would show up literally.

### Can I edit a post after publishing?
Not through Quillpost. Delete it and publish again, or edit it in LinkedIn.

### Does it work for LinkedIn Pages or ads?
No. Pages and ads use different products with their own approval.

### What does it cost?
Nothing. It is MIT licensed, and LinkedIn's self-serve API products are free.

### Something is not working
See [Troubleshooting](troubleshooting.md), then [open an issue](https://github.com/ApiCartOps/quillpost/issues).
