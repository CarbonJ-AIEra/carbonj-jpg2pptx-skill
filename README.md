# CarbonJ JPG2PPTX Skill

[中文](#中文说明) · [English](#english)

将 JPG、JPEG、PNG、网页截图、海报和信息图重建为可编辑 PowerPoint。文字、色块、线条、卡片和常规 UI 会尽量转换成 PowerPoint 原生对象；照片、纹理和复杂图标则保留为独立、可替换的图片对象。

Rebuild JPG, JPEG, PNG, webpage screenshots, posters, and infographics as editable PowerPoint slides. Text, shapes, lines, cards, and standard UI elements are recreated as native PowerPoint objects whenever practical. Photos, textures, and complex icons remain separate, replaceable image objects.

---

## 中文说明

### 适用场景

- 图片、截图、海报或信息图转可编辑 PPTX。
- 按原图比例复刻文字、颜色、间距、卡片、UI 和图标。
- 不接受把整张原图直接铺成一张不可编辑背景图。
- 需要在 Microsoft PowerPoint 中保持稳定排版的交付场景。

### 核心能力

- 保持原图宽高比，不拉伸、不裁切。
- 将可识别文字重建为可编辑文本框。
- 将矩形、圆、线条、边框和常规 UI 重建为原生形状。
- 将复杂图标、照片和纹理拆分为独立图片对象。
- 使用原图像素坐标统一换算 PowerPoint 坐标。
- 自动检查文本框宽高、字号、行数和安全余量。
- 检测并拒绝 PowerPoint 延迟自动缩放标记。
- 执行内容、结构、可编辑性和视觉渲染检查。

### 为什么排版更稳定

部分 PptxGenJS 项目会使用 `fit: "shrink"` 或 `fit: "resize"`。这些设置只会写入 Office 自动适配标记，PptxGenJS 无法让 Microsoft PowerPoint 在文件生成时立即完成缩放。因此，LibreOffice 中看似正常的页面，在 PowerPoint 首次打开时可能出现数字拆行、标题换行和正文重叠。

本 Skill 采用 PowerPoint-first 文字策略：

- 最终文本统一使用 `fit: "none"`。
- 生成前测量文字尺寸并固化最终字号。
- 单行数字、百分比和短标签默认禁止自动换行。
- 原图中的人为换行通过 `\n` 显式保留。
- 文本框预留约 12%–18% 宽高安全空间。
- 使用 `check_powerpoint_text_safety.py` 检查 PPTX 内部 XML，确保不存在 `normAutofit` 或 `spAutoFit`。

### 安装

将 Skill 文件夹复制到 Codex Skills 目录：

```bash
mkdir -p ~/.codex/skills
cp -R carbonj-jpg2pptx-skill ~/.codex/skills/carbonj-jpg2pptx-skill
```

重新打开 Codex 任务后即可调用。

或者把地址给到codex：https://github.com/CarbonJ-AIEra/carbonj-jpg2pptx-skill.git

主要依赖：

- `pptx` Skill
- Node.js
- PptxGenJS
- `@napi-rs/canvas`
- Python 与 `python-pptx`
- ffmpeg / ffprobe
- Tesseract（需要 OCR 时）
- Microsoft PowerPoint（主要视觉验收）
- LibreOffice（辅助渲染验收）

### 使用方式

在 Codex 中附加原图并输入：

```text
$carbonj-jpg2pptx-skill
把这张图片 1:1 转成可编辑 PPTX，保持文字内容、字号、颜色、UI、图标和版式不变，输出到 Downloads。
```

即使不写 Skill 名称，下列请求也应触发它：

```text
把这张 JPG 转成可编辑 PowerPoint。
把这个网页截图 1:1 复刻成 PPTX，不要整张图片铺底。
保留图片里的文字大小、颜色、卡片和图标，转成可编辑幻灯片。
```

### 使用通用构建器

先根据原图创建场景规范 JSON，再运行：

```bash
NODE_PATH="<node_modules>" node scripts/build_from_spec.cjs scene.json
```

构建器会生成：

- `editable-output.pptx`：可编辑 PowerPoint。
- `editable-output.text-safety.json`：文字安全检查报告。

场景规范字段见 `references/spec-schema.md`，最小示例见 `examples/basic-scene.json`。

### 验收标准

- 幻灯片比例与原图一致。
- 所有可识别文字均可编辑，内容与原图一致。
- 数字和百分比不会被拆成两行。
- 标题和正文换行与原图一致。
- 正文、卡片和页脚之间不存在重叠。
- PPTX 内不存在延迟自动缩放标记。
- 复杂位图素材保持为独立、可替换对象。
- 条件允许时，必须在 Microsoft PowerPoint 中实际打开并截图验收。

### 目录结构

```text
carbonj-jpg2pptx-skill/
├── SKILL.md
├── README.md
├── scripts/
│   ├── build_from_spec.cjs
│   ├── check_editability.py
│   ├── check_powerpoint_text_safety.py
│   ├── compare_render.py
│   └── probe_image.sh
├── references/
│   ├── spec-schema.md
│   └── case-study.md
├── examples/
│   └── basic-scene.json
└── evals/
    └── evals.json
```

### 限制

- “1:1”是视觉复刻目标，不代表所有复杂图像都能自动矢量化。
- 照片、纹理、渐变、反射和复杂图标可能作为独立位图对象保留。
- 原字体无法识别或本机缺少字体时，会使用字宽和字重最接近的字体。
- OCR 只能作为文字定位草稿，最终内容仍需对照原图核验。
- LibreOffice 渲染正常不等于 PowerPoint 一定正常，Microsoft PowerPoint 是主要兼容性目标。

---

## English

### Use cases

- Convert images, screenshots, posters, or infographics into editable PPTX files.
- Reproduce typography, colors, spacing, cards, UI elements, and icons at the source aspect ratio.
- Avoid delivering a single flattened image disguised as an editable slide.
- Produce layouts that remain stable when first opened in Microsoft PowerPoint.

### Key capabilities

- Preserves the original aspect ratio without stretching or cropping.
- Recreates recognizable text as editable text boxes.
- Recreates rectangles, circles, lines, borders, and standard UI as native shapes.
- Keeps complex icons, photos, and textures as independent image objects.
- Uses source-image pixels as the shared design coordinate system.
- Measures text width, height, line count, and safety margin before generation.
- Detects and rejects delayed PowerPoint auto-fit markers.
- Runs content, structure, editability, and visual-rendering checks.

### PowerPoint-safe typography

Some PptxGenJS projects rely on `fit: "shrink"` or `fit: "resize"`. These options write Office auto-fit instructions, but PptxGenJS cannot trigger Microsoft PowerPoint to calculate and persist the fitted text during file generation. A slide may therefore look correct in LibreOffice but reflow when first opened in PowerPoint, splitting percentages, wrapping headings, or pushing body text into the footer.

This Skill uses a PowerPoint-first text strategy:

- Final text uses `fit: "none"`.
- Text is measured before generation and the resulting font size is fixed.
- Single-line numbers, percentages, and short labels disable automatic wrapping by default.
- Intentional source line breaks are encoded explicitly with `\n`.
- Text boxes keep approximately 12%–18% spare width and height.
- `check_powerpoint_text_safety.py` inspects the PPTX XML and rejects `normAutofit` or `spAutoFit` markers.

### Installation

Copy the Skill folder into your Codex Skills directory:

```bash
mkdir -p ~/.codex/skills
cp -R carbonj-jpg2pptx-skill ~/.codex/skills/carbonj-jpg2pptx-skill
```

Start a new Codex task after installation.

Main dependencies:

- `pptx` Skill
- Node.js
- PptxGenJS
- `@napi-rs/canvas`
- Python and `python-pptx`
- ffmpeg / ffprobe
- Tesseract when OCR is useful
- Microsoft PowerPoint for primary visual QA
- LibreOffice for secondary rendering QA

### Usage

Attach a source image in Codex and enter:

```text
$carbonj-jpg2pptx-skill
Rebuild this image as a 1:1 editable PPTX. Preserve the text, font sizes, colors, UI, icons, and layout, then save it to Downloads.
```

The Skill should also trigger for natural-language requests such as:

```text
Convert this JPG into an editable PowerPoint.
Rebuild this webpage screenshot as a PPTX without using the whole screenshot as the background.
Keep the text sizes, colors, cards, and icons editable in PowerPoint.
```

### Generic builder

Create a scene-specification JSON file from the source image, then run:

```bash
NODE_PATH="<node_modules>" node scripts/build_from_spec.cjs scene.json
```

The builder produces:

- `editable-output.pptx`: the editable PowerPoint file.
- `editable-output.text-safety.json`: the text-safety preflight report.

See `references/spec-schema.md` for the scene schema and `examples/basic-scene.json` for a minimal working example.

### Acceptance criteria

- The slide ratio matches the source image.
- All recognizable text remains editable and matches the source content.
- Numbers and percentages remain on one line.
- Heading and paragraph line breaks match the source.
- Body text, cards, and footer elements do not overlap.
- No delayed auto-fit markers remain inside the PPTX.
- Complex raster artwork remains independently selectable and replaceable.
- When available, the final deck is opened and visually inspected in Microsoft PowerPoint.

### Limitations

- “1:1” is a visual reconstruction target; it does not mean every complex image can be automatically vectorized.
- Photos, textures, gradients, reflections, and complex icons may remain separate raster objects.
- If the original font cannot be identified or is not installed, the closest available font is used based on width and weight.
- OCR is only a positioning and transcription aid; all text still needs to be checked against the source image.
- A successful LibreOffice render does not guarantee identical Microsoft PowerPoint behavior. PowerPoint remains the primary compatibility target.

## License

See [LICENSE](LICENSE).
