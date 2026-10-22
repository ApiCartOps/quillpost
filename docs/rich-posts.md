# Rich posts

A post can carry one kind of attachment: a link card, images, or a document. They cannot be combined; Quillpost rejects a mix before anything is published.

> **Status:** document carousels are verified on a live account. Link cards and images follow LinkedIn's documented request shapes and are covered by an offline test suite, but have not been confirmed live. If one fails for you, [open an issue](https://github.com/ApiCartOps/quillpost/issues) with the error text.

## Link with a preview card

```bash
quillpost post "Release notes are up" --link=https://example.com/release --link-title="v2.0 release notes" --link-desc="What changed and how to upgrade"
```

LinkedIn builds the card from the link. Title and description are optional but give a better card. A link in the post **body** can reduce reach; if you only want a link, using `--link` shows it as a card instead.

## Images

```bash
quillpost post --text-file=post.txt --image=chart.png --alt="Weekly signups doubled in October"
```

- 1 to 20 images, PNG, JPG or GIF, up to 8 MB each.
- One image shows as a single picture; two or more become a multi-image post.
- Repeat `--alt` once per image, in the same order. Alt text helps readers who use screen readers; Quillpost warns when it is missing.

## Documents (carousels)

```bash
quillpost post --text-file=post.txt --document=deck.pdf --doc-title="Q3 review"
```

PDF, PowerPoint or Word, up to 100 MB. LinkedIn shows it as a swipeable carousel. PDFs with one idea per page work best. The title is shown above the carousel.

## First comment (needs partner access)

```bash
quillpost post --text-file=post.txt --comment="Sources: https://example.com/a https://example.com/b"
```

A first comment is the best place for source links, because links in the post body can reduce reach. But **LinkedIn only allows commenting through its API for approved partners** (the Community Management API). On a self-serve app the request is refused with `403 ACCESS_DENIED`.

Quillpost handles that gracefully:

- `preview` warns you up front that the comment may fail.
- The **post still publishes**; a failed comment never fails the publish.
- The result includes `commentError` and **`commentToPaste`**, and the CLI prints the text so you can paste it as the first comment on LinkedIn yourself.

With `--plain --links-to-comment`, links found in markdown are moved into that comment text for you, with the same caveat.

## Visibility

`--visibility=PUBLIC` (default), `CONNECTIONS` or `LOGGED_IN` (any signed-in LinkedIn member). LinkedIn's API has no truly private option for member posts; `CONNECTIONS` is the narrowest.

## Follow-up

```bash
quillpost posts          # posts published through Quillpost, with ids
quillpost delete last    # irreversible
```

`last`, a history id, or a full URN such as `urn:li:share:123` all work. LinkedIn's self-serve API does not let apps read your feed, so `posts` lists only what Quillpost published.

`quillpost comment <post> <text>` and `quillpost react <post> --type=PRAISE` exist for accounts that have Community Management API access. On a self-serve app they fail with a message explaining that, and you do those two things on LinkedIn.
