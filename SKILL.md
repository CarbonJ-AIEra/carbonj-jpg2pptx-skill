---
name: carbonj-jpg2pptx-skill
description: 将 JPG、JPEG、PNG、网页截图、海报或信息图 1:1 重建为可编辑 PPTX。用户只要提到“图片转 PPT/PPTX”“jpg2pptx”“截图变成可编辑幻灯片”“1:1 复刻图片到 PowerPoint”“保留文字大小、颜色、UI、图标和版式”，就应使用本 Skill，即使用户没有明确说出 Skill 名称。以 PptxGenJS 为核心，把文字、色块、线条、编号和简单图标重建为 PowerPoint 原生对象；复杂图标、照片与纹理拆成独立可替换图片对象；完成内容、结构、溢出和渲染对照检查后，把最终 PPTX 放到用户指定目录或 Downloads。
compatibility: Requires the pptx skill, PptxGenJS, ffmpeg/ffprobe, Tesseract when OCR is useful, LibreOffice or a PowerPoint renderer for QA, and Python with python-pptx for editability checks.
---

# CarbonJ JPG to Editable PPTX

把单张或多张参考图片重建成真正可编辑的 PowerPoint。目标不是把整张图片直接铺成背景，而是尽量恢复它的图层结构，同时保持肉眼可见的尺寸、内容、颜色、间距、图标和 UI 关系。

## 成功标准

交付前同时满足以下条件：

- 幻灯片宽高比与原图一致，没有拉伸或裁切。
- 所有可识别文字均为可编辑文本框，文字内容经过人工核对。
- 色块、线条、编号、边框、简单几何和可原生实现的 UI 为独立 PowerPoint 对象。
- 复杂图标、照片、反射、纹理可保留为独立、可移动、可缩放、可替换的图片对象。
- 不用一张铺满全页的参考图伪装“可编辑”。如需临时对照，可在构建阶段使用参考图，但最终版本必须移除。
- 最终文件能正常打开，通过结构验证，无文字越界，并经过逐页渲染检查。
- 最终文件保存到用户指定目录；用户只说 Download/下载目录时，默认使用 `~/Downloads`。

## 开始前

1. 完整阅读已安装的 `pptx` Skill，遵循其中 PptxGenJS、验证和渲染规则。
2. 先解析当前对话，不重复询问已经明确的信息。通常用户已经给出参考图片、保真要求和输出位置。
3. 若用户提供的路径不存在，在允许的工作区中用文件名搜索；路径仅有轻微目录名偏差时使用找到的唯一文件，并在交付时简短说明。
4. 创建独立临时工作目录，保存分析、图标裁切、构建脚本、渲染图和 QA 记录；最终目录只放交付文件。

## 工作流

### 1. 检查原图

- 用图像查看工具以原始分辨率查看，不只依赖聊天中的缩略图。
- 运行 `scripts/probe_image.sh <image>` 获取尺寸、格式和 OCR 草稿。
- OCR 只作为定位线索。逐字对照原图，特别检查大小写、标点、百分号、网址、数字和换行。
- 记录画布尺寸、背景色、主色、字体风格、阴影方向、主要水平/垂直基线和重复模块。

### 2. 建立图层清单

按从后到前的顺序拆分：

1. 背景。
2. 大面积色块、面板和阴影。
3. 斜切结构、线条、边框、装饰。
4. 标题、正文、编号和标签。
5. 照片、复杂图标、反射和纹理。
6. 前景装饰与水印。

给每个对象一个稳定、可读的名称，便于后续检查。先判断对象是否真的需要位图：

- 文本：使用 `addText()`。
- 矩形、圆、线、平行四边形、箭头：使用 `addShape()`。
- 多色字：使用富文本 runs，不要把整行做成图片。
- 照片或细节非常复杂的图标：从原图无损裁切，去除背景后用 `addImage()`，保持为独立对象。
- 渐变：PptxGenJS 不支持原生渐变填充。优先用可编辑纯色底形状加半透明渐变覆盖图；若渐变很弱，可用最接近的纯色并通过渲染对照调整。

### 3. 坐标与尺寸

以原图像素作为唯一设计坐标系，最后统一换算为英寸：

```text
slideX = sourceX / sourceWidth * slideWidthInches
slideY = sourceY / sourceHeight * slideHeightInches
```

推荐画布：

- 横图：`slideWidth = 13.333333`，`slideHeight = slideWidth × sourceHeight / sourceWidth`。
- 竖图：`slideHeight = 7.5`，`slideWidth = slideHeight × sourceWidth / sourceHeight`。

在 PptxGenJS 中必须先 `defineLayout` 和设置 `pptx.layout`，再添加幻灯片。使用 `scripts/build_from_spec.cjs` 时，构建器会自动完成比例换算。

### 4. 图标与复杂素材

使用 ffmpeg 从原图裁切，不要重新画一个“差不多”的图标冒充原图：

```bash
ffmpeg -y -i source.jpg -vf 'crop=W:H:X:Y' -frames:v 1 icon.png
```

背景接近纯色时，可生成透明版本：

```bash
ffmpeg -y -i icon.png -vf 'colorkey=0xRRGGBB:0.12:0.04,format=rgba' icon-alpha.png
```

透明度参数从小到大逐步调整，并查看边缘、白色高光和反射是否被误删。素材进入 PPTX 后应是单独可选对象。

### 5. 使用通用构建器

优先创建一个场景规范 JSON，再调用通用构建器：

```bash
NODE_PATH="<node_modules>" node scripts/build_from_spec.cjs scene.json
```

规范格式见 `references/spec-schema.md`。可复制 `examples/basic-scene.json` 起步。

若画面包含构建器尚未覆盖的形状或复杂富文本，复制构建器生成的结构到任务目录，写一个专用 `.cjs` 构建脚本。仍然遵守以下 PptxGenJS 规则：

- 颜色值使用六位十六进制且不带 `#`。
- 透明度使用 `fill.transparency`；阴影透明度使用 `shadow.opacity`。
- 每个对象创建新的 options 和 shadow 对象，避免 PptxGenJS 原地修改后污染其他对象。
- 文本紧贴坐标时设置 `margin: 0`。
- 字符间距使用 `charSpacing`，不是 `letterSpacing`。
- 阴影 `offset` 不得为负数。
- 先设置版式，再 `addSlide()`。
- 每个输出文件使用新的 `pptxgen()` 实例。

### 6. 字体策略

- 优先识别并使用原图字体；本机没有时选择字宽和字重最接近的字体。
- 需要稳定渲染时优先 Arial、Calibri、Cambria、Times New Roman 等 Office 安全字体。
- 文字框预留约 5%–10% 宽度，避免 PowerPoint 与 LibreOffice 字体度量差异造成换行。
- 原图中人为控制的换行应显式写入文本，而不是依赖自动换行碰运气。
- 多行正文逐行核对，不因 OCR 识别错误擅自改写内容。

### 7. QA：结构、内容、视觉

按顺序执行：

1. 用 `markitdown` 提取文本；不可用时用 `python-pptx` 逐个文本框提取。核对遗漏、拼写和顺序。
2. 运行 `pptx` Skill 的 `scripts/office/validate.py`。若系统 Python 太旧，切换到 Python 3.10+；不要把运行环境错误误报成 PPTX 损坏。
3. 运行 `scripts/check_editability.py <deck.pptx>`，确认幻灯片、对象、文本和图片数量合理。
4. 用 `pptx` Skill 的 `scripts/office/soffice.py` 转 PDF，再用 `pdftoppm` 生成逐页 PNG。
5. 逐页以完整尺寸查看渲染图，对照原图检查：
   - 字体大小、字重、行距和换行；
   - 斜切边、色块边界、图标中心点；
   - 遮挡顺序、阴影方向和裁切；
   - 透明图片周围是否出现矩形底色或白边；
   - 标题、网址和底部元素是否越界。
6. 修正后重新生成、重新验证、重新渲染。不要只检查脚本语法就宣称完成。

视觉相似度可用 `scripts/compare_render.py <source> <render>` 计算辅助指标，但数字不能替代肉眼检查；字体抗锯齿和渲染器差异会影响像素分数。

## 交付方式

最终只向用户交付：

- 一个可编辑 `.pptx`；
- 一句简短说明保存位置、哪些对象为原生可编辑、哪些复杂对象为独立图片；
- 验证结果。

不要把中间脚本、裁切素材、PDF、预览图或临时目录一并放进 Downloads，除非用户明确要求。

## 真实性边界

“1:1”是视觉目标，不应虚假承诺每个复杂位图都已矢量化。交付时如实说明：

- 所有文字和常规 UI/几何对象已重建为可编辑对象；
- 照片、纹理、反射和复杂图标可能作为独立图片对象保留；
- 若原字体无法确认或本机缺失，使用了最接近的可用字体。

## 参考资料

- `references/spec-schema.md`：场景规范字段和示例。
- `references/case-study.md`：TinyPPT 信息图复刻中验证有效的拆解方法与问题修正。
- `examples/basic-scene.json`：可运行的最小示例。

