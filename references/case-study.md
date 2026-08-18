# Case study: TinyPPT infographic

This reference captures lessons from reconstructing a 5120×2880 JPG into one editable 16:9 PPTX.

## What worked

- Build at the source aspect ratio and keep coordinates in a 2048×1152 analytical canvas, then apply one consistent scale factor to PowerPoint inches.
- Reconstruct long horizontal panels with a native parallelogram for the slanted left edge and a rectangle for the remaining width.
- Reconstruct a full-height diagonal paper ribbon with a rotated rectangle, plus a slightly larger translucent rotated rectangle behind it for edge depth.
- Use native parallelograms for repeated numbered segments. Their default slant closely matches many infographic templates.
- Use rich-text runs for `POWERPOINT` so the two O letters remain separately colored and the whole word remains editable.
- Extract detailed sailboat, motorcycle, target, bulb and pencil illustrations from the source as separate PNGs. Applying `colorkey` removed the off-white background while preserving most reflections.
- Set `margin: 0` on every precisely aligned text box.

## Problems found during QA

### Text was clipped by the diagonal edge

The first draft centered step labels using the top edge of each parallelogram. Because the shape shifts left toward its bottom, the label center also had to shift left according to its vertical position.

General lesson: position text against the local centerline at the text's actual Y coordinate, not against the bounding box center.

### Image crops showed rectangular backgrounds

The first icon crops kept the source off-white background. When placed above the diagonal ribbon, the crop rectangles visibly covered shapes.

General lesson: either remove the background to alpha or place the crop below the foreground structure. Inspect transparent edges at full-slide resolution.

### Validation failed because of the Python runtime, not the deck

The bundled validation script used Python 3.10 syntax while the system Python was 3.9. A later Python lacked `defusedxml` and `lxml`.

General lesson: distinguish tool-environment failures from PPTX failures. Use a compatible Python and required dependencies, then rerun validation. The final deck passed all structural checks.

### Rendering exposed issues that code inspection missed

The initial builder executed successfully, but the first render showed clipped labels, strong shadows and visible crop backgrounds.

General lesson: successful script execution and valid XML are necessary but not sufficient. Always render and inspect the actual slide.

### LibreOffice looked correct but PowerPoint reflowed the text

A stablecoin infographic passed LibreOffice rendering, yet Microsoft PowerPoint split `28%`, `23%`, `16%`, `42%` and `28%` across lines, wrapped the main title word by word, and pushed body text into the footer. The deck relied on PptxGenJS `fit: "shrink"`. PptxGenJS can write that setting but cannot trigger PowerPoint's delayed auto-fit calculation, so the first real PowerPoint render used the authored font size and reflowed the slide.

General lesson: never use Office auto-fit as final layout logic. Measure text before generation, use `fit: "none"`, disable wrapping for single-line metrics, encode every intended line break, keep 12%–18% spare width, and reject PPTX files containing `normAutofit` or `spAutoFit`. LibreOffice is secondary QA; actual PowerPoint is the compatibility target.

## Final object model

The validated slide contained 47 selectable objects, including 22 text objects and multiple independently replaceable source-derived images. This is a useful sanity range for a moderately complex single-page infographic; a one-object slide would have been a flattened image, not an editable reconstruction.
