---
description: Comment on one of your LinkedIn posts (asks before posting)
argument-hint: <post: last | id | urn> <comment text>
allowed-tools: mcp__quillpost__quillpost_history, mcp__quillpost__quillpost_comment
---

Comment on a LinkedIn post using the `quillpost` skill. Input: $ARGUMENTS

The first word is the post (`last`, a history id or a URN) and the rest is the comment. Show me the exact comment and which post it goes on, then wait for my explicit approval before calling `quillpost_comment` with `approved: true`.
