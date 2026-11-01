---
description: Write and publish a LinkedIn post with an MP4 video (previews first, asks before publishing)
argument-hint: <video.mp4> <topic, notes or exact text>
allowed-tools: Bash, Read, mcp__quillpost__quillpost_styles, mcp__quillpost__quillpost_preview, mcp__quillpost__quillpost_post, mcp__quillpost__quillpost_whoami
---

Use the `quillpost-video` skill to write a LinkedIn post with a video from this input: $ARGUMENTS

Pick the best style (say which). Build it with `quillpost_preview` including `video: { path, title }`, and show me the exact final text, the video file and its size, the title, visibility and any warnings. Then stop and wait for my explicit approval of text and video together. Do not call `quillpost_post` with `approved: true` until I say yes.
