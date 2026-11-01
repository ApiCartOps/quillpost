#!/usr/bin/env python
"""Render a clean 1200x627 LinkedIn image card (PNG, or animated GIF) with Pillow.

Text only, no logos or third-party branding. Fails loudly if any text
would overflow, so nothing gets cut off silently.

Usage:
  python make_card.py --out card.png --title "Headline" \
      --subtitle "One supporting line" \
      --point "First point" --point "Second point" --point "Third point" \
      --footer "Source: project README" [--theme dark|light|violet|emerald|sunset] \
      [--kicker "NEWS"] [--watermark "example.com"] [--gif]

With --gif the output is an animated GIF (use a .gif path): the title shows
first, then each point appears in turn, and the full card holds at the end.

Prints JSON with the output path, size and suggested alt text.
"""
import argparse
import colorsys
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont, ImageOps

W, H = 1200, 627
PAD = 72

THEMES = {
    "dark": dict(bg=(15, 23, 42), bg2=(30, 41, 59), fg=(241, 245, 249), muted=(148, 163, 184), accent=(56, 189, 248)),
    "light": dict(bg=(248, 250, 252), bg2=(226, 232, 240), fg=(15, 23, 42), muted=(71, 85, 105), accent=(2, 132, 199)),
    "violet": dict(bg=(36, 18, 66), bg2=(58, 30, 100), fg=(250, 245, 255), muted=(196, 181, 224), accent=(251, 191, 36)),
    "emerald": dict(bg=(6, 36, 33), bg2=(10, 61, 54), fg=(240, 253, 250), muted=(153, 205, 195), accent=(52, 211, 153)),
    "sunset": dict(bg=(52, 20, 28), bg2=(94, 34, 40), fg=(255, 247, 237), muted=(223, 185, 170), accent=(251, 146, 60)),
}

FONT_DIRS = [r"C:\Windows\Fonts", "/usr/share/fonts/truetype/dejavu", "/System/Library/Fonts/Supplemental", "/Library/Fonts"]
REGULAR = ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf", "Arial.ttf"]
BOLD = ["segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf"]


def find_font(names, size):
    for d in FONT_DIRS:
        for n in names:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def wrap(draw, text, font, max_w):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def fit(draw, text, names, max_w, max_h, start, minimum, line_gap=1.25):
    """Largest font size where the wrapped text fits in max_w x max_h."""
    for size in range(start, minimum - 1, -2):
        font = find_font(names, size)
        lines = wrap(draw, text, font, max_w)
        if len(lines) * size * line_gap <= max_h and all(draw.textlength(l, font=font) <= max_w for l in lines):
            return font, lines, size
    raise SystemExit(f"ERROR: text does not fit even at {minimum}px, shorten it: {text[:60]!r}")


def hsv(h, s, v):
    r, g, b = colorsys.hsv_to_rgb((h % 360) / 360.0, s, v)
    return (int(r * 255), int(g * 255), int(b * 255))


def flashy_theme(hue):
    """Dark, saturated, hue-shifting theme: text stays high contrast on a deep gradient."""
    return dict(
        bg=hsv(hue, 0.9, 0.22), bg2=hsv(hue + 70, 0.9, 0.46), fg=(255, 255, 255),
        muted=hsv(hue + 40, 0.25, 0.95), accent=hsv(hue + 180, 0.75, 1.0),
    )


def render(a, visible, t=None, hue=None):
    """Draw one frame with the first `visible` points shown. Layout never depends on `visible`."""
    t = t or THEMES[a.theme]
    if hue is None:
        img = Image.new("RGB", (W, H), t["bg"])
    else:
        grad = Image.linear_gradient("L").rotate(90).resize((W, H)).point(lambda v: v // 16 * 16)
        img = ImageOps.colorize(grad, black=t["bg"], white=t["bg2"], mid=hsv(hue + 35, 0.9, 0.34))
    d = ImageDraw.Draw(img)
    if hue is None:
        # soft diagonal band for depth
        d.polygon([(W * 0.62, 0), (W, 0), (W, H), (W * 0.38, H)], fill=t["bg2"])
        d.rectangle([0, 0, 12, H], fill=t["accent"])
    else:
        # rainbow edge bar and a glowing stripe that move with the hue
        for k in range(6):
            d.rectangle([0, k * H / 6, 12, (k + 1) * H / 6], fill=hsv(hue + k * 60, 0.85, 1.0))
        d.polygon([(W * 0.88, 0), (W * 0.94, 0), (W * 0.70, H), (W * 0.64, H)], fill=hsv(hue + 120, 0.85, 0.75))

    inner_w = W - PAD * 2 - 12
    y = PAD
    if a.kicker:
        kf = find_font(BOLD, 24)
        d.text((PAD + 12, y), a.kicker.upper(), font=kf, fill=t["accent"])
        y += 24 * 1.6

    body_budget = H - PAD - y - (40 if a.footer else 0)
    title_h = body_budget * (0.42 if a.point or a.subtitle else 0.8)
    tf, tl, ts = fit(d, a.title, BOLD, inner_w, title_h, 64, 36, 1.18)
    for line in tl:
        d.text((PAD + 12, y), line, font=tf, fill=t["fg"])
        y += ts * 1.18
    y += 14

    if a.subtitle:
        sf, sl, ss = fit(d, a.subtitle, REGULAR, inner_w, 90, 30, 20)
        for line in sl:
            d.text((PAD + 12, y), line, font=sf, fill=t["muted"])
            y += ss * 1.25
        y += 14

    if a.point:
        remaining = H - PAD - (40 if a.footer else 0) - y
        per = remaining / len(a.point)
        for i, p in enumerate(a.point):
            pf, pl, ps = fit(d, p, REGULAR, inner_w - 40, per - 8, 28, 18)
            if i < visible:
                dot = t["accent"] if hue is None else hsv(hue + i * 90, 0.8, 1.0)
                d.ellipse([PAD + 12, y + ps * 0.35, PAD + 26, y + ps * 0.35 + 14], fill=dot)
                yy = y
                for line in pl:
                    d.text((PAD + 40, yy), line, font=pf, fill=t["fg"])
                    yy += ps * 1.25
            y += per

    wm_w = 0
    if a.watermark:
        wf = find_font(BOLD, 22)
        wm_w = d.textlength(a.watermark, font=wf)
        d.text((W - PAD - wm_w, H - PAD + 6), a.watermark, font=wf, fill=t["accent"])

    if a.footer:
        ff = find_font(REGULAR, 20)
        if d.textlength(a.footer, font=ff) > inner_w - (wm_w + 40 if wm_w else 0):
            raise SystemExit("ERROR: footer too long")
        d.text((PAD + 12, H - PAD + 8), a.footer, font=ff, fill=t["muted"])
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--point", action="append", default=[])
    ap.add_argument("--footer", default="")
    ap.add_argument("--kicker", default="")
    ap.add_argument("--theme", choices=THEMES, default="dark")
    ap.add_argument("--watermark", default="", help="small text at the bottom right, e.g. a site name")
    ap.add_argument("--gif", action="store_true", help="write an animated GIF that reveals the points one by one")
    ap.add_argument("--flashy", action="store_true", help="animated multicolor GIF: shifting rainbow gradient, coloured bullets (use a .gif path)")
    a = ap.parse_args()
    if len(a.point) > 4:
        raise SystemExit("ERROR: use at most 4 points")

    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    if a.flashy:
        n_frames, step = 24, 6
        frames = []
        for i in range(n_frames):
            hue = i * 360.0 / n_frames
            frames.append(render(a, min(len(a.point), i // step), flashy_theme(hue), hue))
        pal = [f.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
        pal[0].save(a.out, "GIF", save_all=True, append_images=pal[1:], duration=150, loop=0, optimize=True, disposal=1)
    elif a.gif:
        frames = [render(a, n) for n in range(len(a.point) + 1)]
        durations = [1300] + [1000] * (len(a.point) - 1) + [3500] if a.point else [3000]
        if a.point:
            durations = [1300] + [1000] * len(a.point)
            durations[-1] = 3500
        pal = [f.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
        pal[0].save(a.out, "GIF", save_all=True, append_images=pal[1:], duration=durations, loop=0, optimize=True, disposal=1)
    else:
        render(a, len(a.point)).save(a.out, "PNG", optimize=True)

    alt = a.title + (". " + a.subtitle if a.subtitle else "") + (". " + "; ".join(a.point) if a.point else "")
    print(json.dumps({"path": os.path.abspath(a.out), "width": W, "height": H, "bytes": os.path.getsize(a.out), "suggestedAlt": alt[:300]}, indent=2))


if __name__ == "__main__":
    sys.exit(main())
