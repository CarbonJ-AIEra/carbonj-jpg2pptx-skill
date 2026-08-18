#!/bin/zsh
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: probe_image.sh <image>" >&2
  exit 2
fi

IMAGE_PATH="$1"
if [[ ! -f "$IMAGE_PATH" ]]; then
  echo "Image not found: $IMAGE_PATH" >&2
  exit 2
fi

file "$IMAGE_PATH"
ffprobe -v error -show_entries stream=width,height,pix_fmt -of default=nw=1 "$IMAGE_PATH"

if command -v tesseract >/dev/null 2>&1; then
  echo "OCR_DRAFT_BEGIN"
  tesseract "$IMAGE_PATH" stdout --psm 11 2>/dev/null || true
  echo "OCR_DRAFT_END"
fi

