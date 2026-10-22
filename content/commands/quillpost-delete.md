---
description: Delete one of your LinkedIn posts (asks for confirmation first)
argument-hint: <post: last | id | urn>
allowed-tools: mcp__quillpost__quillpost_history, mcp__quillpost__quillpost_delete
---

Delete this LinkedIn post using the `quillpost` skill: $ARGUMENTS

Deleting is irreversible. Look the post up with `quillpost_history`, show me its text and URL, and wait for my explicit yes before calling `quillpost_delete` with `approved: true`.
