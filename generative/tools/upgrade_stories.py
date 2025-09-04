#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path
from typing import Dict, Any

UNIFIED_DEFAULTS = {
  "personalization": {
    "tokens": ["childName"],
    "defaults": {"childName": "Alex"}
  }
}

RE_TOKEN = re.compile(r"\{\{([a-zA-Z0-9_]+)\}\}")

TIER_MAP = {
  # filename (lower) -> tier
  "three-little-pigs.json": "guest",
  "the-three-bears.json": "guest",
  "little-red-riding-hood.json": "free",
  "bramble-storm.json": "free",
  "bramble-lost-little-one.json": "free",
  "bramble-friendship-muddle.json": "paid",
}


def detect_story_type(data: Dict[str, Any]) -> str:
  scenes = data.get("scenes") or []
  uses_child = any(isinstance(s, dict) and isinstance(s.get("text"), str) and "{{childName}}" in s["text"] for s in scenes)
  return "personalized" if uses_child else "original"


def ensure_description(data: Dict[str, Any]) -> None:
  if data.get("description"):
    return
  # Build from first scene text snippet
  scenes = data.get("scenes") or []
  snippet = ""
  if scenes and isinstance(scenes[0], dict) and isinstance(scenes[0].get("text"), str):
    snippet = scenes[0]["text"].strip().replace("\n", " ")
  title = data.get("title") or data.get("id") or "Story"
  desc = f"An interactive story: {title}."
  if snippet:
    desc = snippet[:180] + ("…" if len(snippet) > 180 else "")
  data["description"] = desc


def move_media_blocks(data: Dict[str, Any]) -> None:
  backgrounds = data.get("backgrounds")
  characters = data.get("characters")
  media = data.get("media") or {}
  changed = False
  if isinstance(backgrounds, dict):
    media.setdefault("backgrounds", backgrounds)
    changed = True
  if isinstance(characters, dict):
    media.setdefault("characters", characters)
    changed = True
  if changed:
    data["media"] = media
    # Remove old top-level to avoid duplication
    if "backgrounds" in data: del data["backgrounds"]
    if "characters" in data: del data["characters"]


def move_pedagogy(data: Dict[str, Any]) -> None:
  est = data.pop("estimatedReadTime", None)
  lo = data.pop("learningObjectives", None)
  dp = data.pop("discussionPrompts", None)
  if est or lo or dp:
    pedagogy = data.get("pedagogy") or {}
    if est: pedagogy["estimatedReadTime"] = est
    if lo: pedagogy["learningObjectives"] = lo
    if dp: pedagogy["discussionPrompts"] = dp
    data["pedagogy"] = pedagogy


def ensure_access(data: Dict[str, Any], filename: str) -> None:
  tier = TIER_MAP.get(Path(filename).name.lower())
  if not tier:
    return
  access = data.get("access") or {}
  access.setdefault("tier", tier)
  access.setdefault("releaseStatus", "published")
  data["access"] = access


def ensure_personalization(data: Dict[str, Any]) -> None:
  if data.get("storyType") == "personalized":
    pers = data.get("personalization") or {}
    tokens = pers.get("tokens") or []
    defaults = pers.get("defaults") or {}
    # Add childName if text uses it
    scenes = data.get("scenes") or []
    uses_child = any(isinstance(s, dict) and isinstance(s.get("text"), str) and "{{childName}}" in s["text"] for s in scenes)
    if uses_child and "childName" not in tokens:
      tokens.append("childName")
    if uses_child and "childName" not in defaults:
      defaults["childName"] = "Alex"
    pers["tokens"] = tokens
    pers["defaults"] = defaults
    data["personalization"] = pers
  else:
    # Remove personalization or leave empty; keep structure consistent
    if "personalization" in data and not data["personalization"]:
      del data["personalization"]


def process_file(path: Path) -> bool:
  with path.open('r', encoding='utf-8') as f:
    data = json.load(f)

  # Required top-level
  data.setdefault("themes", data.get("themes") or [])
  data.setdefault("interactive", True)

  # storyType
  stype = detect_story_type(data)
  data["storyType"] = stype

  # personalization
  if stype == "personalized" and not data.get("personalization"):
    data["personalization"] = json.loads(json.dumps(UNIFIED_DEFAULTS["personalization"]))

  # access tier
  ensure_access(data, path.name)

  # description
  ensure_description(data)

  # media
  move_media_blocks(data)

  # pedagogy
  move_pedagogy(data)

  # finalize personalization
  ensure_personalization(data)

  with path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
  return True


def main() -> None:
  if len(sys.argv) < 2:
    print("Usage: upgrade_stories.py <stories_dir>")
    sys.exit(2)
  folder = Path(sys.argv[1])
  if not folder.is_dir():
    print(f"Not a directory: {folder}")
    sys.exit(2)

  # Process all JSON files except jack-and-the-beanstalk.json
  for p in sorted(folder.glob('*.json')):
    if p.name.lower() == 'jack-and-the-beanstalk.json':
      continue
    if p.name.lower() not in TIER_MAP:
      # Skip files not in tier map
      continue
    print(f"Upgrading {p.name} …")
    process_file(p)
  print("Done.")


if __name__ == '__main__':
  main() 