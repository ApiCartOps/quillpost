---
description: Write and publish a LinkedIn post with Quillpost (previews first, asks before publishing)
argument-hint: <topic, notes or exact text>
allowed-tools: mcp__quillpost__quillpost_styles, mcp__quillpost__quillpost_preview, mcp__quillpost__quillpost_post, mcp__quillpost__quillpost_whoami
---

Use the `quillpost` skill to write a LinkedIn post from this input: $ARGUMENTS

Pick the best style (say which), build it with `quillpost_preview`, and show me the exact final text, visibility, attachments and any warnings. Then stop and wait for my explicit approval. Do not call `quillpost_post` with `approved: true` until I say yes.
