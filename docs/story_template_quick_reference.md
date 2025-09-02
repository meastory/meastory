# Story Template Quick Reference

## Essential Structure Checklist

### Required Fields
- [ ] `id`: "[theme]-[identifier]" (e.g., "friendship-garden-001")
- [ ] `title`: "Story Title"
- [ ] `ageRange`: [min, max] (e.g., [3, 8])
- [ ] `themes`: ["theme1", "theme2", "theme3"]

### Scene Structure (Each scene needs):
- [ ] `id`: "scene-identifier"
- [ ] `background`: "background.svg"
- [ ] `text`: "Story text with {{childName}}"
- [ ] `choices`: [] or [{label, nextSceneId}]

## Decision Point Flow

### DP1 (Opening Choice)
```
opening-1 → branch-a-1 OR branch-b-1
```

### DP2 (Pathway Choices)
```
branch-a-1 → dp2-a-1 → journey-1a2a-1 OR journey-1a2b-1
branch-b-1 → dp2-b-1 → journey-1b2a-1 OR journey-1b2b-1
```

### DP3 (Ending Resolution)
```
1A2A path → ending-consistent-primary
1A2B path → ending-balanced  
1B2A path → ending-balanced
1B2B path → ending-consistent-secondary
```

## Scene ID Naming Convention

| Scene Type | ID Pattern | Example |
|------------|------------|---------|
| Opening | `opening-1` | `opening-1` |
| Branch A | `branch-a-1` | `branch-a-1` |
| Branch B | `branch-b-1` | `branch-b-1` |
| DP2 A | `dp2-a-1` | `dp2-a-1` |
| DP2 B | `dp2-b-1` | `dp2-b-1` |
| Journey | `journey-1a2a-1` | `journey-1a2a-1` |
| Ending | `ending-[type]` | `ending-balanced` |

## Background SVG Options

Available backgrounds (in `/apps/mvp/public/backgrounds/`):
- `castle.svg`
- `forest.svg` 
- `meadow.svg`
- `sunset.svg`

## Choice Writing Tips

### Good Choice Labels:
- ✅ "Help the dragon with their treasure"
- ✅ "Ask the dragon to show you around first"
- ❌ "Choice A" (too generic)
- ❌ "Click here" (not descriptive)

### Balance Choices:
- One choice: **Direct/Immediate** action
- Other choice: **Thoughtful/Careful** approach
- Avoid: One obviously "right" choice

## Text Writing Guidelines

### Include in Scene Text:
- [ ] {{childName}} placeholder (at least once per scene)
- [ ] Character actions and reactions
- [ ] Setting descriptions
- [ ] Emotional beats
- [ ] Clear setup for next choice

### Scene Text Length:
- Opening scenes: 2-3 sentences
- Journey scenes: 2-4 sentences  
- Ending scenes: 3-5 sentences

## Quality Assurance Checklist

### Story Structure:
- [ ] All 4 pathways (1A2A, 1A2B, 1B2A, 1B2B) work
- [ ] No dead ends or broken scene references
- [ ] Each pathway leads to appropriate ending
- [ ] Decision points create meaningful branches

### Content Quality:
- [ ] Age-appropriate language and themes
- [ ] Consistent character voice and tone
- [ ] Emotional engagement throughout
- [ ] Clear learning objectives achieved
- [ ] Satisfying resolution for each ending

### Technical:
- [ ] Valid JSON syntax
- [ ] All background SVGs exist
- [ ] Scene IDs follow naming convention
- [ ] No template placeholders remain

## Common Patterns

### Opening Scene Pattern:
```
{{childName}} [discovers/saw/found] [setting/situation]. [Character introduction]. [Hook question/challenge].
```

### Choice Scene Pattern:
```
[Continue story]. [Show consequence]. [Present new decision].
```

### Ending Scene Pattern:
```
[Resolution of main conflict]. [Character growth]. [Theme reinforcement]. [Satisfying closure].
```

## Theme Examples

### Adventure Themes:
- Exploration vs. Caution
- Physical vs. Mental challenges
- Individual vs. Team approaches

### Friendship Themes:
- Direct vs. Diplomatic communication
- Inclusion vs. Selective friendship
- Immediate vs. Gradual trust-building

### Learning Themes:
- Memorization vs. Understanding
- Individual vs. Group study
- Rules vs. Creative problem-solving

## Final Steps

1. [ ] Fill all `[BRACKETED_VALUES]` in template
2. [ ] Remove all `_comment` fields
3. [ ] Test all 4 pathways manually
4. [ ] Validate JSON syntax
5. [ ] Run quality checklist
6. [ ] Save to `/apps/mvp/stories/[filename].json`
