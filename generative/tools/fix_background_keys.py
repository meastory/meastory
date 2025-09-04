#!/usr/bin/env python3
import json
import sys
import re
from pathlib import Path
from typing import Dict, Any

SLUG_RE = re.compile(r"[^a-z0-9]+")

def slugify(text: str) -> str:
    text = text.strip().lower()
    text = SLUG_RE.sub('-', text).strip('-')
    if not text:
        text = 'background'
    return text[:80]

def fix_file(path: Path) -> bool:
    with path.open('r', encoding='utf-8') as f:
        data: Dict[str, Any] = json.load(f)

    media = data.get('media') or {}
    bgs: Dict[str, Any] = media.get('backgrounds') or {}

    scenes = data.get('scenes') or []
    changed = False

    # ensure backgrounds dict exists
    if 'media' not in data:
        data['media'] = {}
    if 'backgrounds' not in data['media']:
        data['media']['backgrounds'] = {}
        bgs = data['media']['backgrounds']

    for s in scenes:
        if not isinstance(s, dict):
            continue
        bg = s.get('background')
        if not isinstance(bg, str) or not bg.strip():
            continue
        # if already a key in backgrounds dict, keep
        if bg in bgs:
            continue
        # otherwise, create a slug key
        key = slugify(bg)
        # avoid collisions by appending incremental suffix
        base = key
        i = 2
        while key in bgs:
            key = f"{base}-{i}"
            i += 1
        # add to backgrounds
        bgs[key] = {
            "description": bg,
            "illustration_prompt": ""
        }
        # update scene to reference the new key
        s['background'] = key
        changed = True

    if changed:
        data['media']['backgrounds'] = bgs
        with path.open('w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    return changed


def main() -> None:
    if len(sys.argv) < 2:
        print('Usage: fix_background_keys.py <json-file> [<json-file> ...]')
        sys.exit(2)
    for p in sys.argv[1:]:
        path = Path(p)
        if not path.is_file():
            print(f"Skip (not file): {path}")
            continue
        changed = fix_file(path)
        print(f"Fixed {path.name}: {'changed' if changed else 'ok'}")

if __name__ == '__main__':
    main() 