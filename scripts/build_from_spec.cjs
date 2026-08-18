#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');
let createCanvas;
try {
  ({ createCanvas } = require('@napi-rs/canvas'));
} catch (_) {
  // Text measurement remains optional so the builder can still run in a minimal Node environment.
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function cleanHex(value, label = 'color') {
  if (value == null) return undefined;
  const v = String(value).replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(v)) fail(`${label} must be a 6-digit hex color: ${value}`);
  return v;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeFill(fill) {
  if (!fill) return undefined;
  if (typeof fill === 'string') return { color: cleanHex(fill, 'fill') };
  const out = clone(fill);
  if (out.color) out.color = cleanHex(out.color, 'fill.color');
  return out;
}

function normalizeLine(line) {
  if (!line) return { color: 'FFFFFF', transparency: 100, width: 0 };
  const out = clone(line);
  if (out.color) out.color = cleanHex(out.color, 'line.color');
  return out;
}

function normalizeShadow(shadow) {
  if (!shadow) return undefined;
  const out = clone(shadow);
  out.type = out.type || 'outer';
  if (out.color) out.color = cleanHex(out.color, 'shadow.color');
  if (Number(out.offset || 0) < 0) fail('shadow.offset must be >= 0');
  return out;
}

function resolvePath(baseDir, value) {
  if (!value) return value;
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

const specPath = process.argv[2];
if (!specPath) fail('Usage: build_from_spec.cjs <scene.json>');
const absoluteSpec = path.resolve(specPath);
const baseDir = path.dirname(absoluteSpec);
const spec = JSON.parse(fs.readFileSync(absoluteSpec, 'utf8'));

if (!spec.canvas || !spec.canvas.widthPx || !spec.canvas.heightPx) {
  fail('canvas.widthPx and canvas.heightPx are required');
}

const sourceW = Number(spec.canvas.widthPx);
const sourceH = Number(spec.canvas.heightPx);
const landscape = sourceW >= sourceH;
const slideW = Number(spec.canvas.slideWidthIn || (landscape ? 13.333333 : 7.5 * sourceW / sourceH));
const slideH = Number(spec.canvas.slideHeightIn || (landscape ? slideW * sourceH / sourceW : 7.5));
const sx = (n) => Number(n || 0) / sourceW * slideW;
const sy = (n) => Number(n || 0) / sourceH * slideH;
const sourcePxPerPt = sourceW / slideW / 72;
const textSafetyReport = [];

function textLines(element) {
  if (Array.isArray(element.runs)) {
    let combined = '';
    for (const run of element.runs) {
      combined += String(run.text || '');
      if (run.breakLine || run.options?.breakLine) combined += '\n';
    }
    return combined.replace(/\n$/, '').split('\n');
  }
  return String(element.text || '').split('\n');
}

function safeFontSize(element, name, requestedPt, fontFace) {
  const lines = textLines(element);
  const safetyFactor = Number(element.safetyFactor || spec.textSafety?.safetyFactor || 0.88);
  const minPt = Number(element.minFontSizePt || spec.textSafety?.minFontSizePt || 6);
  const allowAutoDownsize = element.allowAutoDownsize !== false;
  const lineHeight = Number(element.lineHeight || spec.textSafety?.lineHeight || 1.18);
  let widthRatio = 0;

  if (createCanvas) {
    const ctx = createCanvas(16, 16).getContext('2d');
    const weight = element.bold ? '700' : '400';
    const style = element.italic ? 'italic' : 'normal';
    ctx.font = `${style} ${weight} ${requestedPt * sourcePxPerPt}px "${fontFace}"`;
    for (const line of lines) {
      widthRatio = Math.max(widthRatio, ctx.measureText(line).width / Math.max(1, Number(element.w)));
    }
  }

  const heightRatio = lines.length * requestedPt * sourcePxPerPt * lineHeight / Math.max(1, Number(element.h));
  const limitingRatio = Math.max(widthRatio, heightRatio);
  let chosenPt = requestedPt;
  if (limitingRatio > safetyFactor) {
    chosenPt = Math.max(minPt, requestedPt * safetyFactor / limitingRatio);
    if (!allowAutoDownsize) {
      fail(`${name} exceeds its text box (ratio ${limitingRatio.toFixed(2)} > ${safetyFactor}); enlarge the box or lower fontSizePt`);
    }
  }
  textSafetyReport.push({
    name, requestedPt, chosenPt: Number(chosenPt.toFixed(2)), lines: lines.length,
    widthRatio: Number(widthRatio.toFixed(3)), heightRatio: Number(heightRatio.toFixed(3)),
    safetyFactor, autoDownsized: chosenPt < requestedPt - 0.01,
  });
  return chosenPt;
}

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'SOURCE_RATIO', width: slideW, height: slideH });
pptx.layout = 'SOURCE_RATIO';
pptx.author = spec.metadata?.author || 'CarbonJ JPG2PPTX Skill';
pptx.company = spec.metadata?.company || 'CarbonJ';
pptx.subject = spec.metadata?.subject || 'Editable reconstruction from an image';
pptx.title = spec.metadata?.title || 'Editable image reconstruction';
pptx.lang = spec.metadata?.lang || 'zh-CN';
pptx.theme = {
  headFontFace: spec.theme?.headFontFace || 'Arial',
  bodyFontFace: spec.theme?.bodyFontFace || 'Arial',
  lang: spec.metadata?.lang || 'zh-CN',
};

const slide = pptx.addSlide();
slide.background = { color: cleanHex(spec.background || 'FFFFFF', 'background') };

for (const [index, element] of (spec.elements || []).entries()) {
  const name = element.name || `${element.type}-${index + 1}`;
  const common = {
    x: sx(element.x), y: sy(element.y), w: sx(element.w), h: sy(element.h),
    rotate: Number(element.rotate || 0), name,
  };

  if (element.type === 'text') {
    const fontFace = element.fontFace || spec.theme?.bodyFontFace || 'Arial';
    const requestedPt = Number(element.fontSizePt || 18);
    const chosenPt = safeFontSize(element, name, requestedPt, fontFace);
    const runScale = chosenPt / requestedPt;
    const options = {
      ...common,
      fontFace,
      fontSize: chosenPt,
      color: cleanHex(element.color || '000000', `${name}.color`),
      bold: Boolean(element.bold), italic: Boolean(element.italic),
      align: element.align || 'left', valign: element.valign || 'top',
      margin: element.margin == null ? 0 : clone(element.margin),
      breakLine: false,
      fit: 'none',
      wrap: element.wrap == null ? false : Boolean(element.wrap),
      isTextBox: true,
      lineSpacing: element.lineSpacingPt == null ? undefined : Number(element.lineSpacingPt),
      charSpacing: element.charSpacing == null ? undefined : Number(element.charSpacing),
      shadow: normalizeShadow(element.shadow),
    };
    if (Array.isArray(element.runs)) {
      const runs = element.runs.map((run) => ({
        text: String(run.text || ''),
        options: {
          ...(run.color ? { color: cleanHex(run.color, `${name}.run.color`) } : {}),
          ...(run.bold != null ? { bold: Boolean(run.bold) } : {}),
          ...(run.italic != null ? { italic: Boolean(run.italic) } : {}),
          ...(run.fontFace ? { fontFace: run.fontFace } : {}),
          ...(run.fontSizePt ? { fontSize: Number(run.fontSizePt) * runScale } : {}),
          ...((run.breakLine || run.options?.breakLine) ? { breakLine: true } : {}),
        },
      }));
      slide.addText(runs, options);
    } else {
      slide.addText(String(element.text || ''), options);
    }
    continue;
  }

  if (element.type === 'image') {
    const imagePath = resolvePath(baseDir, element.path);
    if (!imagePath || !fs.existsSync(imagePath)) fail(`image not found for ${name}: ${imagePath}`);
    slide.addImage({
      path: imagePath, ...common,
      transparency: Number(element.transparency || 0),
      altText: element.altText || name,
    });
    continue;
  }

  if (element.type === 'line') {
    slide.addShape(pptx.ShapeType.line, {
      x: sx(element.x), y: sy(element.y), w: sx(element.w), h: sy(element.h),
      line: normalizeLine(element.line || { color: element.color || '000000', width: element.widthPt || 1 }),
      name,
    });
    continue;
  }

  const shapeName = element.shape || element.type || 'rect';
  const shapeType = pptx.ShapeType[shapeName] || shapeName;
  slide.addShape(shapeType, {
    ...common,
    fill: normalizeFill(element.fill || element.color || 'FFFFFF'),
    line: normalizeLine(element.line),
    shadow: normalizeShadow(element.shadow),
    ...(element.flipH != null ? { flipH: Boolean(element.flipH) } : {}),
    ...(element.flipV != null ? { flipV: Boolean(element.flipV) } : {}),
  });
}

if (spec.notes) slide.addNotes(String(spec.notes));

const output = process.argv[3]
  ? path.resolve(process.argv[3])
  : resolvePath(baseDir, spec.output || 'editable-output.pptx');
fs.mkdirSync(path.dirname(output), { recursive: true });

(async () => {
  await pptx.writeFile({ fileName: output, compression: true });
  const reportPath = output.replace(/\.pptx$/i, '.text-safety.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(textSafetyReport, null, 2)}\n`);
  console.log(output);
  console.log(reportPath);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
