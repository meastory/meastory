#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
  from dotenv import load_dotenv
except ImportError:
  load_dotenv = None

import requests

REQUIRED_TOP_LEVEL = [
  'id', 'title', 'ageRange', 'themes', 'storyType', 'interactive', 'access', 'media', 'scenes'
]

class ValidationError(Exception):
  pass


def fail(msg: str) -> None:
  print(f"ERROR: {msg}")
  sys.exit(1)


def warn(msg: str) -> None:
  print(f"Warning: {msg}")


def validate_story(data: Dict[str, Any]) -> List[str]:
  errors: List[str] = []

  # Required fields
  for k in REQUIRED_TOP_LEVEL:
    if k not in data:
      errors.append(f"Missing top-level field: {k}")

  # ageRange
  ar = data.get('ageRange')
  if not (isinstance(ar, list) and len(ar) == 2 and all(isinstance(x, int) for x in ar)):
    errors.append("ageRange must be [min:int, max:int]")

  # themes
  if not (isinstance(data.get('themes'), list) and all(isinstance(x, str) for x in data['themes'])):
    errors.append("themes must be string[]")

  # storyType
  if data.get('storyType') not in ('personalized', 'original'):
    errors.append("storyType must be 'personalized' or 'original'")

  # personalization coherence
  if data.get('storyType') == 'personalized':
    pers = data.get('personalization')
    if not (isinstance(pers, dict) and isinstance(pers.get('tokens'), list)):
      errors.append("personalized stories must include personalization.tokens[]")

  # access
  acc = data.get('access')
  if not (isinstance(acc, dict) and isinstance(acc.get('tier'), str) and isinstance(acc.get('releaseStatus'), str)):
    errors.append("access must include 'tier' and 'releaseStatus'")

  # scenes
  scenes = data.get('scenes')
  if not isinstance(scenes, list) or len(scenes) == 0:
    errors.append("scenes[] required")
  else:
    ids = set()
    for idx, s in enumerate(scenes):
      if not isinstance(s, dict):
        errors.append(f"scene[{idx}] must be object")
        continue
      sid = s.get('id')
      if not isinstance(sid, str) or not sid:
        errors.append(f"scene[{idx}] missing string id")
      elif sid in ids:
        errors.append(f"duplicate scene id: {sid}")
      else:
        ids.add(sid)
      if not isinstance(s.get('text'), str) or not s['text']:
        errors.append(f"scene[{idx}] missing text")
      choices = s.get('choices')
      if choices is not None:
        if not isinstance(choices, list):
          errors.append(f"scene[{idx}].choices must be array if present")
        else:
          for c_idx, c in enumerate(choices):
            if not (isinstance(c, dict) and isinstance(c.get('label'), str) and isinstance(c.get('nextSceneId'), str)):
              errors.append(f"scene[{idx}].choices[{c_idx}] requires label and nextSceneId")

  # media
  media = data.get('media', {})
  bgs = media.get('backgrounds', {}) if isinstance(media, dict) else {}
  if not isinstance(bgs, dict):
    errors.append("media.backgrounds must be object with keys")
  else:
    used_bgs = set(s.get('background') for s in scenes if isinstance(s, dict) and s.get('background'))
    for bg in used_bgs:
      if bg not in bgs:
        warn(f"background '{bg}' referenced in scenes but missing from media.backgrounds")

  return errors


def upsert_story(supabase_url: str, service_key: str, json_path: Path, slug: Optional[str]) -> None:
  with json_path.open('r', encoding='utf-8') as f:
    payload = json.load(f)

  # Determine slug: prefer existing slug field; else use title
  derived_slug = slug or payload.get('slug')
  if not derived_slug:
    title = payload.get('title') or ''
    derived_slug = ''.join(c.lower() if c.isalnum() else '-' for c in title).strip('-')[:120]
  if not derived_slug:
    fail("Cannot derive slug; provide --slug")

  # Build top-level columns
  story_type = payload.get('storyType')
  tier = (payload.get('access') or {}).get('tier')
  ar = payload.get('ageRange') or [None, None]
  themes = payload.get('themes') or []
  pers_tokens = ((payload.get('personalization') or {}).get('tokens')) or []

  headers = {
    'apikey': service_key,
    'Authorization': f'Bearer {service_key}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
  }

  # Upsert into stories by slug
  url = f"{supabase_url}/rest/v1/stories?on_conflict=slug"
  row = {
    'slug': derived_slug,
    'title': payload.get('title'),
    'description': payload.get('description') or '',
    'status': 'published',
    'access_tier': tier,
    'story_type': story_type,
    'age_min': ar[0],
    'age_max': ar[1],
    'themes': themes,
    'personalization_tokens': pers_tokens,
    'content': payload,
  }
  resp = requests.post(url, json=[row], headers=headers)
  if resp.status_code not in (200, 201, 204):
    fail(f"Upsert failed ({resp.status_code}): {resp.text}")

  print(f"✅ Upserted story with slug '{derived_slug}'")


def main() -> None:
  parser = argparse.ArgumentParser(description='Validate and publish a story JSON to Supabase')
  parser.add_argument('file', help='Path to story JSON file')
  parser.add_argument('--slug', help='Override slug for stories.slug')
  args = parser.parse_args()

  # Load .env if present
  if load_dotenv:
    env_path = Path.cwd() / '.env'
    if env_path.exists():
      load_dotenv(env_path)
  supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
  service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

  # Validate JSON
  path = Path(args.file)
  if not path.exists():
    fail(f"File not found: {path}")
  try:
    data = json.loads(path.read_text(encoding='utf-8'))
  except Exception as e:
    fail(f"Invalid JSON: {e}")

  errors = validate_story(data)
  if errors:
    print("Validation failed:")
    for e in errors:
      print(f" - {e}")
    sys.exit(2)
  print("✅ Validation passed")

  # Confirm publish
  if not supabase_url or not service_key:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.")
    print("Create a .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (will be gitignored)")
    sys.exit(3)

  ans = input("Publish to Supabase now? [y/N]: ").strip().lower()
  if ans != 'y':
    print("Skipped publish.")
    return

  try:
    upsert_story(supabase_url, service_key, path, args.slug)
    print("🎉 Publish complete")
  except Exception as e:
    fail(str(e))


if __name__ == '__main__':
  main() 