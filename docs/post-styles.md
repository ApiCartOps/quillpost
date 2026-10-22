# Post styles

A style turns a few fields into a LinkedIn-ready post. LinkedIn shows plain text only, so structure comes from blank lines and a marker in front of each item (an arrow, a number, a dash, or nothing).

```bash
quillpost styles            # list
quillpost styles story      # one style, with a full example
```

## Fields

| Field | Flag | Notes |
|---|---|---|
| `hook` | `--hook` | **Required.** The first line people see. Keep it under about 200 characters; the feed cuts the post near 210 characters and shows "see more". |
| `intro` | `--intro` | A short setup paragraph. Used by styles that have one. |
| `items` | `--item` (repeat) | Bullets, steps or paragraphs, depending on the style. Each has a minimum and maximum. |
| `takeaway` | `--takeaway` | One sentence in your own voice. |
| `cta` | `--cta` | A closing question or call to action. Questions get replies. |
| `tags` | `--tag` (repeat) or `--tags=a,b` | Hashtags, with or without `#`. Cleaned automatically. Three is a good default. |

Fields a style does not use are ignored. Blocks are always separated by a blank line.

## The seven styles

| Style | Items | Marker | Blocks, in order |
|---|---|---|---|
| `announcement` | 0 to 6 | → | hook, intro, items, takeaway, cta, tags |
| `insight` | 2 to 5 | 1. 2. 3. | hook, intro, items, takeaway, cta, tags |
| `news` | 1 to 5 | → | hook, items, takeaway, cta, tags |
| `story` | 2 to 8 | none | hook, items, takeaway, cta, tags |
| `howto` | 2 to 8 | 1. 2. 3. | hook, intro, items, takeaway, cta, tags |
| `listicle` | 3 to 9 | 1. 2. 3. | hook, items, takeaway, cta, tags |
| `question` | 0 to 5 | - | hook, intro, items, cta, tags |

### announcement
Launches, releases, new roles, milestones. Say what it is, what is included, and ask one question.

### insight
A point of view with two to five supporting points. Lead with the claim; use the takeaway for the "so what".

### news
Recent developments, one item each: what happened, then why it matters. Name the company and the thing. Keep source links out of the body; put them in a first comment (on a self-serve app you paste that comment yourself, see [Rich posts](rich-posts.md#first-comment-needs-partner-access)).

### story
Short paragraphs, one or two sentences each, ending in a lesson. No bullets.

### howto
Numbered steps that reach a result. Put the outcome in the hook ("How to X in 4 steps").

### listicle
Three to nine numbered items. Put the number in the hook ("5 mistakes ...").

### question
A discussion starter. The hook is the question; optional items are answer options readers can pick in the comments.

## Checks

Every post, styled or not, is checked before it is published. `preview` and `post --dry-run` show the results.

**Blocking errors** stop the post, even with `--force`:

- the post is empty or over 3000 characters (LinkedIn's limit)
- a style is missing its hook, or has too few or too many items
- an attachment is missing, the wrong type, too large, or you combined a link, images and a document

**Markdown errors** stop the post unless you pass `--force`. LinkedIn would show these literally. `--plain` converts them instead:

- `**bold**`, `# headings`, `` `backticks` ``, `[text](url)`

**Warnings** are advice and never block:

- the first paragraph is over 210 characters
- no hashtags, more than five, or hashtags not on the last line
- links in the body (they can reduce reach; use `--comment`)
- a paragraph over 600 characters, more than three emoji, or a very short post

The preview also shows the **feed cut**: the text people see before "see more".

## Converting existing text: `--plain`

```bash
quillpost post --text-file=draft.md --plain --links-to-comment
```

`--plain` rewrites markdown into LinkedIn plain text: headings lose their `#`, `**bold**` loses its asterisks, `- bullets` become `→`, and `[label](url)` becomes `label`. With `--links-to-comment`, the removed URLs become the first-comment text. LinkedIn only allows API comments for partner apps, so on a self-serve app that comment is refused; the post still publishes and the text is printed for you to paste (see [Rich posts](rich-posts.md#first-comment-needs-partner-access)). You can combine `--plain` with a style.

Unicode "bold" lookalike text is intentionally not offered: it reads badly with screen readers and breaks search.

## Writing tips

- Lead with the point. People decide in the first two lines.
- One idea per post. Cut the second idea into its own post.
- 700 to 1,600 characters reads well; short posts are fine if they land.
- End with a question you actually want answered.
- Three hashtags, last line.
