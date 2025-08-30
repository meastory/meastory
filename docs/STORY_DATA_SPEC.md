# Story Data Specification

### Overview
Stories are defined as JSON files that the client loads at runtime. Phase 1 uses static assets and minimal branching logic.

### JSON Shape (v1)
```json
{
  "id": "dragon-adventure",
  "title": "The Friendly Dragon",
  "ageRange": [3, 8],
  "themes": ["kindness", "courage", "friendship"],
  "scenes": [
    {
      "id": "scene-1",
      "background": "castle.jpg",
      "text": "Once upon a time, in a castle far away...",
      "choices": [
        { "label": "Enter the castle", "nextSceneId": "scene-2" },
        { "label": "Walk around the moat", "nextSceneId": "scene-3" }
      ]
    }
  ]
}
```

Notes
- `background` points to a static asset in `apps/tell/public/backgrounds`
- `choices` are optional for linear scenes; omit or use empty array
- Personalization (Phase 2): the client substitutes tokens like `{{childName}}`

### JSON Schema (draft)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Story",
  "type": "object",
  "required": ["id", "title", "scenes"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "title": { "type": "string", "minLength": 1 },
    "ageRange": {
      "type": "array",
      "items": { "type": "integer", "minimum": 0 },
      "minItems": 2,
      "maxItems": 2
    },
    "themes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "scenes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "text"],
        "properties": {
          "id": { "type": "string" },
          "background": { "type": ["string", "null"] },
          "text": { "type": "string" },
          "choices": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["label"],
              "properties": {
                "label": { "type": "string" },
                "nextSceneId": { "type": ["string", "null"] }
              }
            }
          }
        }
      }
    }
  }
}
```

### Personalization Tokens (Phase 2)
- `{{childName}}` — substituted from URL param `?childName=...`
- `{{adultName}}` — optional display name for adult

### Content Standards (summary)
- Length: 5–8 scenes
- Choices: 2–3 per decision point
- Themes: kindness, courage, friendship; age 3–8
- Human review before publish

### File Locations
- Stories: `apps/tell/stories/*.json`
- Backgrounds: `apps/tell/public/backgrounds/*`

### Future Extensions
- `audio`: per-scene narration assets
- `effects`: per-scene AR/particle directives
- `aiPrompt`: text prompt for background generation and caching key 