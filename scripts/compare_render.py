#!/usr/bin/env python3
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: compare_render.py <source-image> <rendered-slide>", file=sys.stderr)
        return 2
    source_path = Path(sys.argv[1]).expanduser().resolve()
    render_path = Path(sys.argv[2]).expanduser().resolve()
    source = Image.open(source_path).convert("RGB")
    render = Image.open(render_path).convert("RGB").resize(source.size, Image.Resampling.LANCZOS)
    diff = ImageChops.difference(source, render)
    stat = ImageStat.Stat(diff)
    mse = sum(v * v for v in stat.rms) / 3
    rmse = math.sqrt(mse)
    similarity = max(0.0, 1.0 - rmse / 255.0)
    print(json.dumps({
        "source": str(source_path),
        "render": str(render_path),
        "source_size": list(source.size),
        "rmse_0_to_255": round(rmse, 4),
        "similarity_0_to_1": round(similarity, 6),
        "note": "Advisory only; font rasterization and renderer differences affect this score.",
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

