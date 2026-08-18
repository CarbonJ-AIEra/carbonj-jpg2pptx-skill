# Scene specification

`scripts/build_from_spec.cjs` reads one JSON file. All element coordinates are measured in source-image pixels, which keeps the visual analysis and PowerPoint construction in the same coordinate system.

## Top-level fields

```json
{
  "canvas": {
    "widthPx": 1920,
    "heightPx": 1080,
    "slideWidthIn": 13.333333,
    "slideHeightIn": 7.5
  },
  "background": "FFFFFF",
  "output": "./editable-output.pptx",
  "metadata": {
    "title": "Editable reconstruction",
    "author": "CarbonJ",
    "lang": "zh-CN"
  },
  "theme": {
    "headFontFace": "Arial",
    "bodyFontFace": "Arial"
  },
  "elements": [],
  "notes": "[Sources]\n- User-provided image ...\n[/Sources]"
}
```

`slideWidthIn` and `slideHeightIn` are optional. The builder preserves the source ratio automatically.

## Text element

```json
{
  "type": "text",
  "name": "Main title",
  "x": 100,
  "y": 80,
  "w": 700,
  "h": 100,
  "text": "Editable title",
  "fontFace": "Arial",
  "fontSizePt": 42,
  "color": "222222",
  "bold": true,
  "italic": false,
  "align": "left",
  "valign": "top",
  "margin": 0,
  "charSpacing": 0.4,
  "fit": "shrink"
}
```

For multicolor text, replace `text` with `runs`:

```json
"runs": [
  {"text": "P", "color": "222222"},
  {"text": "O", "color": "FF0000"},
  {"text": "WERPOINT", "color": "222222"}
]
```

Explicit `\n` characters preserve source line breaks.

## Shape element

Use any PptxGenJS shape name supported by the installed version, such as `rect`, `ellipse`, `parallelogram`, `triangle`, `rtTriangle`, `roundRect`, or `chevron`.

```json
{
  "type": "parallelogram",
  "name": "Diagonal step",
  "x": 800,
  "y": 240,
  "w": 420,
  "h": 180,
  "fill": {"color": "F75A43"},
  "line": {"color": "F75A43", "transparency": 100, "width": 0},
  "shadow": {
    "type": "outer",
    "color": "000000",
    "opacity": 0.22,
    "blur": 5,
    "offset": 3,
    "angle": 90,
    "rotateWithShape": true
  }
}
```

`fill` may be a six-digit color string or a fill object. Do not use `#` in authored specs; the builder strips it defensively but generated PptxGenJS code should follow the library rule directly.

## Line element

```json
{
  "type": "line",
  "name": "Divider",
  "x": 100,
  "y": 300,
  "w": 500,
  "h": 0,
  "line": {"color": "555555", "width": 2}
}
```

## Image element

```json
{
  "type": "image",
  "name": "Extracted source icon",
  "path": "./assets/icon-alpha.png",
  "altText": "Source-derived icon",
  "x": 120,
  "y": 420,
  "w": 180,
  "h": 180
}
```

Relative image paths resolve from the JSON file directory. Preserve the asset's aspect ratio unless the source visibly stretches it.

## Z-order

Elements are added in array order. Put background decorations first and foreground objects last. This is especially important for diagonal bands, shadows, text labels and extracted icons.

