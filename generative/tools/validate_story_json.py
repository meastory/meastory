#!/usr/bin/env python3
import sys
import json
import re
from typing import Any, Dict, List, Set, Tuple

RE_TOKEN = re.compile(r"\{\{([a-zA-Z0-9_]+)\}\}")

class ValidationResult:
    def __init__(self) -> None:
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def ok(self) -> bool:
        return len(self.errors) == 0

    def report(self) -> None:
        if self.errors:
            print("Errors:")
            for e in self.errors:
                print(f"  - {e}")
        if self.warnings:
            print("Warnings:")
            for w in self.warnings:
                print(f"  - {w}")
        if not self.errors and not self.warnings:
            print("No issues found.")


def validate_story(data: Dict[str, Any]) -> ValidationResult:
    r = ValidationResult()

    # Top-level required fields
    required_fields = [
        "id", "title", "description", "ageRange", "themes",
        "storyType", "interactive", "access", "media", "scenes"
    ]
    for f in required_fields:
        if f not in data:
            r.error(f"Missing top-level field: {f}")

    # Access
    access = data.get("access", {}) or {}
    if "tier" not in access:
        r.error("Missing access.tier")
    if "releaseStatus" not in access:
        r.error("Missing access.releaseStatus")

    # Story type and personalization
    story_type = data.get("storyType")
    personalization = data.get("personalization") or {}
    if story_type == "personalized":
        tokens = personalization.get("tokens")
        if not isinstance(tokens, list) or not tokens:
            r.error("Personalized story must include personalization.tokens (non-empty list)")
        defaults = personalization.get("defaults")
        if not isinstance(defaults, dict):
            r.error("Personalized story must include personalization.defaults (object)")
    else:
        # Original stories may include personalization but shouldn't use tokens in text
        pass

    # Age range
    age = data.get("ageRange")
    if not (isinstance(age, list) and len(age) == 2 and all(isinstance(n, (int, float)) for n in age)):
        r.error("ageRange must be [min, max] numbers")
    elif age[0] > age[1]:
        r.error("ageRange min must be <= max")
    elif age[1] < 3 or age[0] > 12:
        r.warn("ageRange is outside the typical 3-8 target; confirm intended audience")

    # Media backgrounds
    media = data.get("media") or {}
    bgs = (media.get("backgrounds") or {})
    if not isinstance(bgs, dict) or not bgs:
        r.error("media.backgrounds must be a non-empty object")
    bg_keys: Set[str] = set(bgs.keys())

    # Scenes
    scenes = data.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        r.error("scenes must be a non-empty array")
        return r

    seen_ids: Set[str] = set()
    endings_zero_choice = 0

    # Build set of all scene ids first for reference
    all_ids: Set[str] = set()
    for s in scenes:
        if not isinstance(s, dict):
            r.error("Each scene must be an object")
            continue
        sid = s.get("id")
        if not sid or not isinstance(sid, str):
            r.error("Scene missing valid id (string)")
            continue
        if sid in all_ids:
            r.error(f"Duplicate scene id: {sid}")
        all_ids.add(sid)

    # Scene-by-scene checks
    for idx, s in enumerate(scenes):
        if not isinstance(s, dict):
            continue
        sid = s.get("id")
        if not isinstance(sid, str):
            continue
        seen_ids.add(sid)

        # background present and valid
        bg = s.get("background")
        if bg and bg not in bg_keys:
            r.error(f"Scene '{sid}' uses undefined background key '{bg}'")

        # text present
        if not isinstance(s.get("text"), str) or not s["text"].strip():
            r.error(f"Scene '{sid}' must include non-empty text")

        # choices
        choices = s.get("choices")
        if choices is None:
            r.error(f"Scene '{sid}' missing choices array (use [] for endings)")
            continue
        if not isinstance(choices, list):
            r.error(f"Scene '{sid}' choices must be an array")
            continue
        if len(choices) == 0:
            endings_zero_choice += 1
        else:
            # Each non-empty choice must have label and nextSceneId
            for c in choices:
                if not isinstance(c, dict):
                    r.error(f"Scene '{sid}' has non-object choice entry")
                    continue
                if not isinstance(c.get("label"), str) or not c["label"].strip():
                    r.error(f"Scene '{sid}' has a choice with missing/empty label")
                if not isinstance(c.get("nextSceneId"), str) or not c["nextSceneId"].strip():
                    r.error(f"Scene '{sid}' has a choice missing nextSceneId (string)")
                elif c["nextSceneId"] not in all_ids:
                    r.error(f"Scene '{sid}' choice nextSceneId '{c['nextSceneId']}' does not match any scene id")

        # personalization token usage
        tokens = set((personalization.get("tokens") or [])) if story_type == "personalized" else set()
        text = s.get("text") or ""
        used = set(RE_TOKEN.findall(text))
        for u in used:
            if tokens and u not in tokens:
                r.warn(f"Scene '{sid}' uses token '{{{{{u}}}}}' not listed in personalization.tokens")

    if endings_zero_choice == 0:
        r.error("At least one scene must have zero choices (final ending)")

    # Pathways (optional)
    pathways = data.get("pathways")
    if pathways is not None:
        if not isinstance(pathways, dict):
            r.error("pathways must be an object if present")
        else:
            for key, meta in pathways.items():
                if not isinstance(meta, dict):
                    r.error(f"pathways['{key}'] must be an object")
                    continue
                seq = meta.get("scenes")
                if not isinstance(seq, list) or not seq:
                    r.error(f"pathways['{key}'].scenes must be a non-empty array")
                    continue
                # Validate that sequence refers to scene ids and last scene is an ending (zero choices)
                all_valid = True
                for sid in seq:
                    if sid not in all_ids:
                        r.error(f"pathways['{key}'] references unknown scene id '{sid}'")
                        all_valid = False
                if all_valid:
                    last_id = seq[-1]
                    # find last scene and check choices array is empty
                    last_scene = next((s for s in scenes if s.get("id") == last_id), None)
                    if isinstance(last_scene, dict):
                        if isinstance(last_scene.get("choices"), list) and len(last_scene["choices"]) > 0:
                            r.warn(f"pathways['{key}'] last scene '{last_id}' has choices; consider ending at a zero-choice scene")

    return r


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: validate_story_json.py <path-to-json>")
        sys.exit(2)

    path = sys.argv[1]
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Failed to read JSON: {e}")
        sys.exit(1)

    res = validate_story(data)
    if res.ok():
        print("✅ Validation passed")
    res.report()
    sys.exit(0 if res.ok() else 1)


if __name__ == '__main__':
    main() 