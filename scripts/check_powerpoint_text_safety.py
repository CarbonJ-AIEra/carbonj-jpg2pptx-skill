#!/usr/bin/env python3
"""Fail when a deck relies on delayed Office text auto-fit behavior."""

import sys
import zipfile


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: check_powerpoint_text_safety.py <deck.pptx>", file=sys.stderr)
        return 2
    deck = sys.argv[1]
    forbidden = (b"<a:normAutofit", b"<a:spAutoFit")
    hits = []
    with zipfile.ZipFile(deck) as archive:
        for name in archive.namelist():
            if not name.startswith("ppt/slides/slide") or not name.endswith(".xml"):
                continue
            data = archive.read(name)
            for marker in forbidden:
                count = data.count(marker)
                if count:
                    hits.append((name, marker.decode(), count))
    if hits:
        print("FAIL: delayed PowerPoint text auto-fit markers found:")
        for name, marker, count in hits:
            print(f"- {name}: {marker} x {count}")
        return 1
    print("PASS: no delayed text auto-fit markers found")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
