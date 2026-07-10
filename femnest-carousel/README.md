# FemNEST — "The Why" Instagram Carousel

A 4-slide Instagram carousel for **FemNEST** built around the "connect the dots"
narrative: women collect the fragmented pieces ("dots") of their lives, and
FemNEST connects them.

## Files
- `FemNEST_TheWhy_source.html` — editable source (all 4 slides in one file)
- `FemNEST_TheWhy_1.png` … `FemNEST_TheWhy_4.png` — rendered slides
- `render.js` — Playwright render script (Chromium, element screenshots)

## Slides
1. **Hook** — "Women collect the dots." + italic lime clause, scattered lime dots.
2. **Stat** — big orange `50+` with a cream supporting line, blue-toned dots pooled below.
3. **Until now.** — faint dots behind a lavender line threading through them; "FemNEST maps the whole picture."
4. **CTA** — connector journey: Community → Education → Financial Tools → Advocacy → "Start with FemNEST" (orange CTA).

## Specs
- Size: **1080 × 1350 px**, rendered at **2× (retina)** → 2160 × 2700 output PNGs.
- Fonts (Google Fonts): **Archivo** (eyebrows/labels), **Bitter** (headlines/body).

## Brand kit
- Cobalt blue `#295df6` (primary background)
- Lime / chartreuse `#deea9e` (secondary accent)
- Orange `#ec6a2c` (CTAs / accent numbers only)
- Lavender `#f2cdfc` (wordmark + connector line accents)
- Cream `#eee7ce` (light text on blue)

## Logo
The FemNEST nest mark is a **recreated placeholder** (inline SVG): a dark
figure/head resting in an overlapping bowl of orange/blue/lavender/lime
half-circles, with a "FemNEST" wordmark. Replace it if an official asset is
dropped into the repo.

## Rendering
```
NODE_PATH=/opt/node22/lib/node_modules node render.js
```
Uses the pre-installed Chromium under `/opt/pw-browsers`. Waits for
`document.fonts.ready` before screenshotting each slide element.
