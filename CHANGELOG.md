# Changelog

All notable changes to this project are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/), and versions follow [semantic versioning](https://semver.org/).

## [0.3.0]

Renamed from `linkedin-official` to **Quillpost** and expanded from a three-command wrapper into a full posting toolkit.

### Added
- Seven post styles (`announcement`, `insight`, `news`, `story`, `howto`, `listicle`, `question`) that build LinkedIn-ready plain text from a few fields.
- Post checks: blocking errors, markdown errors (overridable with `--force`), warnings, and a "feed cut" preview of what shows before "see more".
- `preview` command and `--dry-run`; `--plain` markdown conversion; `--links-to-comment`.
- Rich posts: link preview cards, single and multi-image posts with alt text, document carousels, and a first comment.
- Comments, reactions and `posts` history; `last`, history ids and URNs accepted everywhere.
- Drafts (`draft save|list|show|publish|delete`) and a local schedule (`schedule add|list|cancel|run|watch`).
- MCP server: 17 tools, server instructions, one prompt per style, and a `quillpost://styles` resource. Every publishing tool needs `approved: true`; without it, it only previews.
- Claude Code skill and slash commands (`/quillpost-post`, `/quillpost-preview`, `/quillpost-comment`, `/quillpost-delete`).
- Documentation: getting started, post styles, rich posts, CLI reference, MCP guide, scheduling, troubleshooting, FAQ, and a security policy.
- Offline test suite against a fake LinkedIn API, run in CI on Ubuntu and Windows with Node 20, 22 and 24.
- Clearer network errors, including a hint for `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

### Changed
- Package, command and MCP server names are now `quillpost`; tools are `quillpost_*` (previously `linkedin_*`).
- Data folder is `~/.quillpost`. An existing `~/.linkedin-official` login is still found and used.
- Default API version is `202609`.
- `--force` now overrides only markdown errors; hard errors (empty or over-long post, bad attachments, missing style fields) always block.

### Notes
- Text posts and deleting are verified against the live API. Images, documents, link cards, comments and reactions follow LinkedIn's documented request shapes and are covered offline only.

## [0.1.0]

First version as `linkedin-official`: `setup`, `login`, `whoami`, `post`, `delete` and an MCP server with three tools, on LinkedIn's official API.
