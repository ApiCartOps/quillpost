#!/usr/bin/env python
"""Animated GIF: a simple explainer of how AI video is generated, then the post's card.

Part 1 (explainer): a prompt is typed, four frames start as noise and are cleaned up
step by step, then the frames play back as a video. This is a simplified picture of
how diffusion style video models work, not of any one model.
Part 2 (card): the make_card.py flashy card with the points popping in.

Usage:
  python make_explainer.py --out out.gif --title "Headline" --subtitle "Line" \
      --point "One" --point "Two" --point "Three" --footer "Source: ..." \
      [--kicker "Label"] [--watermark "example.com"] [--prompt "a red kite flying over green hills"]

Prints JSON with the path, size in bytes and suggested alt text.
"""
import argparse
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_card as mc  # noqa: E402
from PIL import Image, ImageDraw, ImageOps  # noqa: E402

FW, FH = 240, 135          # one video frame in the strip
GAP = 28
X0 = 84
STRIP_Y = 322
N_FRAMES = 4
TYPE_N, DENOISE_N, PLAY_N = 8, 12, 8


def background(hue):
    t = mc.flashy_theme(hue)
    grad = Image.linear_gradient("L").rotate(90).resize((mc.W, mc.H)).point(lambda v: v // 16 * 16)
    img = ImageOps.colorize(grad, black=t["bg"], white=t["bg2"], mid=mc.hsv(hue + 35, 0.9, 0.34))
    d = ImageDraw.Draw(img)
    for k in range(6):
        d.rectangle([0, k * mc.H / 6, 12, (k + 1) * mc.H / 6], fill=mc.hsv(hue + k * 60, 0.85, 1.0))
    return img, d, t


def scene(k):
    """A tiny clean scene; the kite sits further along in each frame so playback looks like motion."""
    im = Image.new("RGB", (FW, FH), (96, 165, 250))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, FW, FH * 0.45], fill=(125, 190, 255))
    d.ellipse([FW - 58, 12, FW - 22, 48], fill=(253, 224, 71))
    d.ellipse([-40, FH * 0.62, FW * 0.7, FH + 60], fill=(34, 160, 80))
    d.ellipse([FW * 0.35, FH * 0.72, FW + 60, FH + 50], fill=(22, 128, 62))
    kx, ky = 30 + k * 52, 34 + (k % 2) * 14
    d.line([kx, ky + 14, kx - 14, ky + 52], fill=(255, 255, 255), width=2)
    d.polygon([(kx, ky - 16), (kx + 14, ky), (kx, ky + 16), (kx - 14, ky)], fill=(239, 68, 68))
    return im


def noise(k, step):
    rng = random.Random(k * 977 + step * 13)
    small = Image.new("RGB", (FW // 6, FH // 6))
    small.putdata([(rng.randrange(256), rng.randrange(256), rng.randrange(256)) for _ in range(small.width * small.height)])
    return small.resize((FW, FH), Image.NEAREST)


def explainer_frame(j, total, prompt):
    hue = j * 360.0 / total
    img, d, t = background(hue)
    if j < TYPE_N:
        phase, caption = 0, "1. You write a prompt"
        shown = prompt[: max(1, int(len(prompt) * (j + 1) / TYPE_N))]
        alpha, bar = 1.0, 0.0
    elif j < TYPE_N + DENOISE_N:
        phase, caption = 1, "2. The model removes noise, step by step"
        shown, p = prompt, (j - TYPE_N + 1) / DENOISE_N
        alpha, bar = (1 - p) ** 1.2, p
    else:
        phase, caption = 2, "3. The frames play back as a video"
        shown, alpha, bar = prompt, 0.0, 1.0
    playing = (j - TYPE_N - DENOISE_N) // 2 if phase == 2 else -1

    d.text((X0, 40), "SIMPLIFIED", font=mc.find_font(mc.BOLD, 22), fill=t["accent"])
    d.text((X0, 70), "How AI video is made", font=mc.find_font(mc.BOLD, 52), fill=t["fg"])

    box = [X0, 152, mc.W - 84, 226]
    d.rounded_rectangle(box, radius=14, fill=mc.hsv(hue, 0.85, 0.12), outline=t["accent"], width=3)
    d.text((X0 + 22, 176), "PROMPT", font=mc.find_font(mc.BOLD, 20), fill=t["accent"])
    caret = "|" if phase == 0 else ""
    d.text((X0 + 128, 168), shown + caret, font=mc.find_font(mc.REGULAR, 32), fill=t["fg"])

    d.text((X0, 242), caption, font=mc.find_font(mc.BOLD, 28), fill=mc.hsv(hue + 60, 0.5, 1.0))
    bw = mc.W - 84 - X0
    d.rounded_rectangle([X0, 288, X0 + bw, 298], radius=5, fill=mc.hsv(hue, 0.6, 0.3))
    if bar > 0:
        d.rounded_rectangle([X0, 288, X0 + max(10, bw * bar), 298], radius=5, fill=t["accent"])

    for k in range(N_FRAMES):
        x = X0 + k * (FW + GAP)
        clean = scene(k)
        if alpha >= 1.0:
            tile = noise(k, 0)
        elif alpha <= 0.0:
            tile = clean
        else:
            tile = Image.blend(clean, noise(k, j), alpha)
        img.paste(tile, (x, STRIP_Y))
        edge = t["accent"] if k == playing else mc.hsv(hue, 0.3, 0.8)
        d.rectangle([x - 3, STRIP_Y - 3, x + FW + 2, STRIP_Y + FH + 2], outline=edge, width=6 if k == playing else 2)
        d.text((x, STRIP_Y + FH + 12), f"Frame {k + 1}", font=mc.find_font(mc.REGULAR, 20), fill=t["muted"])
    return img, d, t


def footer(img, d, t, text, watermark):
    ff = mc.find_font(mc.REGULAR, 20)
    d.text((X0, mc.H - mc.PAD + 8), text, font=ff, fill=t["muted"])
    if watermark:
        wf = mc.find_font(mc.BOLD, 22)
        d.text((mc.W - mc.PAD - d.textlength(watermark, font=wf), mc.H - mc.PAD + 6), watermark, font=wf, fill=t["accent"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--point", action="append", default=[])
    ap.add_argument("--footer", default="")
    ap.add_argument("--kicker", default="")
    ap.add_argument("--watermark", default="")
    ap.add_argument("--prompt", default="a red kite flying over green hills")
    a = ap.parse_args()
    if len(a.point) > 4:
        raise SystemExit("ERROR: use at most 4 points")
    a.theme = "dark"

    n_explainer = TYPE_N + DENOISE_N + PLAY_N
    n_card, step = 24, 6
    total = n_explainer + n_card
    frames, durations = [], []

    for j in range(n_explainer):
        img, d, t = explainer_frame(j, total, a.prompt)
        footer(img, d, t, "Simplified illustration, not any one model", a.watermark)
        frames.append(img)
        durations.append(110 if j < TYPE_N else 170 if j < TYPE_N + DENOISE_N else 330)

    for i in range(n_card):
        hue = (n_explainer + i) * 360.0 / total
        frames.append(mc.render(a, min(len(a.point), i // step), mc.flashy_theme(hue), hue))
        durations.append(150)
    durations[-1] = 3000

    pal = [f.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    pal[0].save(a.out, "GIF", save_all=True, append_images=pal[1:], duration=durations, loop=0, optimize=True, disposal=1)

    alt = ("Animated explainer. A text prompt is typed, noise is removed step by step from four frames, and the frames play as a video. "
           + a.title + (". " + a.subtitle if a.subtitle else "") + (". " + "; ".join(a.point) if a.point else ""))
    print(json.dumps({"path": os.path.abspath(a.out), "width": mc.W, "height": mc.H, "frames": len(frames),
                      "bytes": os.path.getsize(a.out), "suggestedAlt": alt[:400]}, indent=2))


if __name__ == "__main__":
    sys.exit(main())
