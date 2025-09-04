#!/usr/bin/env python3
import json
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS_DIR = ROOT / 'supabase' / 'migrations'

FILES = {
    'three-little-pigs': ROOT / 'apps' / 'read' / 'src' / 'stories' / 'three-little-pigs.json',
    'the-three-bears': ROOT / 'apps' / 'read' / 'src' / 'stories' / 'the-three-bears.json',
    'little-red-riding-hood': ROOT / 'apps' / 'read' / 'src' / 'stories' / 'little-red-riding-hood.json',
    'bramble-storm': ROOT / 'apps' / 'read' / 'src' / 'stories' / 'bramble-storm.json',
    'bramble-lost-little-one': ROOT / 'apps' / 'read' / 'src' / 'stories' / 'bramble-lost-little-one.json',
    'bramble-friendship-muddle': ROOT / 'apps' / 'read' / 'src' / 'stories' / 'bramble-friendship-muddle.json',
}


def load_json(path: Path) -> dict:
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


def sql_quote_json(obj: dict) -> str:
    # Minify JSON to reduce SQL size and wrap with dollar-quoting
    s = json.dumps(obj, separators=(',', ':'), ensure_ascii=False)
    return f"$json${s}$json$::jsonb"


def build_update(slug: str, content: dict) -> str:
    # Extract helpful columns if present
    story_type = content.get('storyType')
    age_range = content.get('ageRange') if isinstance(content.get('ageRange'), list) else None
    age_min = age_range[0] if age_range and len(age_range) >= 1 else None
    age_max = age_range[1] if age_range and len(age_range) >= 2 else None
    themes = content.get('themes') if isinstance(content.get('themes'), list) else None
    personalization_tokens = None
    if isinstance(content.get('personalization'), dict):
        tokens = content['personalization'].get('tokens')
        if isinstance(tokens, list):
            personalization_tokens = tokens

    sets = [f"content = {sql_quote_json(content)}"]
    if story_type in ('personalized', 'original'):
        sets.append(f"story_type = '{story_type}'")
    if age_min is not None:
        sets.append(f"age_min = {int(age_min)}")
    if age_max is not None:
        sets.append(f"age_max = {int(age_max)}")
    if themes is not None:
        # Array literal with proper quoting
        themes_items = ','.join([f"'{t.replace("'", "''")}'" for t in themes])
        sets.append(f"themes = ARRAY[{themes_items}]::text[]")
    if personalization_tokens is not None:
        toks_items = ','.join([f"'{t.replace("'", "''")}'" for t in personalization_tokens])
        sets.append(f"personalization_tokens = ARRAY[{toks_items}]::text[]")

    set_clause = ',\n    '.join(sets)
    return f"UPDATE stories SET\n    {set_clause}\nWHERE slug = '{slug}';\n"


def main() -> None:
    if not MIGRATIONS_DIR.exists():
        print(f"Migrations directory not found: {MIGRATIONS_DIR}", file=sys.stderr)
        sys.exit(1)

    ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    filename = f"{ts}_fill_stories_content.sql"
    target = MIGRATIONS_DIR / filename

    statements = []
    for slug, path in FILES.items():
        if not path.exists():
            print(f"Missing story file: {path}", file=sys.stderr)
            sys.exit(1)
        content = load_json(path)
        statements.append(build_update(slug, content))

    sql = ["-- Fill stories.content with full JSON payloads and populate derived columns", "BEGIN;"]
    sql.extend(statements)
    sql.append("COMMIT;")

    with target.open('w', encoding='utf-8') as f:
        f.write('\n\n'.join(sql) + '\n')

    print(str(target))


if __name__ == '__main__':
    main() 