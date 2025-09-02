# Interactive Story Framework Template

## Overview
This framework provides a character-agnostic structure for creating interactive children's stories with branching narratives. The template ensures consistent pacing, decision point logic, and educational value while allowing complete flexibility in themes, characters, and settings.

## Core Story Architecture

### Scene-Based Structure (Aligned with Existing JSON Format)
- **Opening Scenes (2-3 scenes):** Character introduction, setting establishment, initial situation
- **Development Scenes (3-5 scenes):** Supporting character encounters, setup development
- **Decision Point 1 (1 scene):** First choice (A or B) - fundamental approach dichotomy
- **Branch A Journey (2-3 scenes):** Side journey based on DP1-A choice
- **Branch B Journey (2-3 scenes):** Side journey based on DP1-B choice  
- **Decision Point 2 (2 scenes):** Contextual versions based on DP1 (DP2-A and DP2-B), each with 2 choices
- **Combined Journey Scenes (3-4 scenes):** Side journeys based on DP1+DP2 combinations
- **Decision Point 3 (2 scenes):** Resolution versions grouping pathways by thematic effect
- **Ending Scenes (2-3 scenes):** Final pathways leading to themed resolutions

*Total: ~15-25 scenes - optimized for [TARGET_AGE_GROUP] engagement and digital interaction*

## Decision Point Logic System

### Pathway Mapping (Mapped to Scene IDs)
**DP1:** Choice A or B (fundamental approach dichotomy)
- DP1-A path: scenes prefixed with "branch-a-"
- DP1-B path: scenes prefixed with "branch-b-"

**DP2:** Two contextual versions based on DP1 (DP2-A version, DP2-B version), each with 2 choices
- Creates 4 possible pathways: 1A2A, 1A2B, 1B2A, 1B2B
- DP2 scenes: "dp2-a-1", "dp2-a-2", "dp2-b-1", "dp2-b-2"

**DP3:** Three resolution versions that group pathways by thematic "net effect"
- **Version 1:** 1A2A (consistent approach in primary direction) → "ending-consistent-primary"
- **Version 2:** 1B2B (consistent approach in secondary direction) → "ending-consistent-secondary" 
- **Version 3:** 1A2B + 1B2A (balanced approaches = "integrated" version) → "ending-balanced"

### Ending Connections
Each DP3 version connects to one core ending theme:
- **Consistent Primary** → [ENDING_THEME_1]
- **Consistent Secondary** → [ENDING_THEME_2]  
- **Balanced/Integrated** → [ENDING_THEME_3]

## Character Role Framework (JSON Implementation)

### Core Character Roles
- **[PROTAGONIST]:** Main character referenced as `{{childName}}` in text
- **[MENTOR_CHARACTER]:** Wise figure providing guidance and perspective
- **[ALLY_CHARACTER]:** Peer-level companion for collaboration and learning
- **[CHALLENGE_CHARACTER]:** Character presenting obstacles and teaching resilience

### Supporting Character Functions
- **Role 1:** Energetic/immediate problem (teaches about [THEME_ASPECT_1])
- **Role 2:** Thoughtful/complex situation (teaches about [THEME_ASPECT_2])
- **Role 3:** Practical/culminating challenge (tests application of learned concepts)

## Thematic Framework Configuration

### Core Learning Objectives
Configure these based on story theme:
1. **[PRIMARY_DICHOTOMY]** (e.g., "Individual vs. Community", "Action vs. Reflection")
2. **[SECONDARY_DICHOTOMY]** (e.g., "Risk vs. Safety", "Rules vs. Creativity")
3. **[INTEGRATION_LEARNING]** (e.g., "Finding Balance", "Creative Problem-Solving")

### Choice Value Configurations
Customize these choice pairs for your theme:
- **[SPEED_CHOICE] vs. [THOUGHTFUL_CHOICE]**
- **[INDEPENDENT_CHOICE] vs. [COLLABORATIVE_CHOICE]**  
- **[DIRECT_CHOICE] vs. [STRATEGIC_CHOICE]**
- **[TRADITIONAL_CHOICE] vs. [INNOVATIVE_CHOICE]**

## JSON Data Structure Template

```json
{
  "id": "[THEME_NAME]-[UNIQUE_IDENTIFIER]",
  "title": "[STORY_TITLE]",
  "ageRange": [[MIN_AGE], [MAX_AGE]],
  "themes": ["[PRIMARY_THEME]", "[SECONDARY_THEME]", "[TERTIARY_THEME]"],
  "scenes": [
    {
      "id": "opening-1",
      "background": "[BACKGROUND_SVG]",
      "text": "{{childName}} [PROTAGONIST_INTRODUCTION]. [SETTING_ESTABLISHMENT]",
      "choices": [
        { "label": "[DP1_CHOICE_A_LABEL]", "nextSceneId": "branch-a-1" },
        { "label": "[DP1_CHOICE_B_LABEL]", "nextSceneId": "branch-b-1" }
      ]
    },
    {
      "id": "branch-a-1",
      "background": "[BACKGROUND_SVG]",
      "text": "[DP1-A_BRANCH_NARRATIVE]",
      "choices": [
        { "label": "[CONTINUE_CHOICE]", "nextSceneId": "dp2-a-1" }
      ]
    },
    {
      "id": "dp2-a-1",
      "background": "[BACKGROUND_SVG]",
      "text": "[DP2-A_INTRODUCTION]",
      "choices": [
        { "label": "[DP2_CHOICE_A_LABEL]", "nextSceneId": "journey-1a2a-1" },
        { "label": "[DP2_CHOICE_B_LABEL]", "nextSceneId": "journey-1a2b-1" }
      ]
    },
    {
      "id": "ending-consistent-primary",
      "background": "[BACKGROUND_SVG]",
      "text": "[ENDING_THEME_1_RESOLUTION]",
      "choices": []
    }
  ]
}
```

## Writing Consistency Elements

### Universal Story Elements
- Protagonist voice consistency through {{childName}} integration
- Age-appropriate rhythm and repetition patterns
- Gentle consequences that teach without punishment
- Circular storytelling (endings that demonstrate character growth)
- [TARGET_AGE_GROUP] vocabulary with occasional "stretch" words

### Narrative Flow Principles
- Clear emotional beats at each decision point
- Logical consequence progression
- Character development through choices
- Thematic reinforcement across pathways

## Visual Design Framework

### Illustration Integration
- Each scene should visually support choice point decisions
- Background SVGs track story tension and progression
- Character expressions and body language reinforce emotional journeys
- Visual cues suggest different pathway directions
- Consistent art style maintains immersion across branches

### Accessibility Considerations
- Clear visual hierarchy for choice presentation
- Intuitive icons/symbols for decision options
- Color coding that supports thematic choices
- Scalable text and interactive elements

## Framework-to-JSON Mapping Guide

### Decision Point Implementation
1. **DP1**: First scene with 2 choices leading to different branch prefixes
2. **DP2**: Branch-specific scenes (dp2-a-*, dp2-b-*) with 2 choices each
3. **DP3**: Resolution scenes that combine pathways thematically

### Pathway Tracking
- Use scene ID prefixes to track pathway progression
- 1A2A: branch-a-* → dp2-a-* → journey-1a2a-* → ending-consistent-primary
- 1A2B: branch-a-* → dp2-a-* → journey-1a2b-* → ending-balanced
- 1B2A: branch-b-* → dp2-b-* → journey-1b2a-* → ending-balanced
- 1B2B: branch-b-* → dp2-b-* → journey-1b2b-* → ending-consistent-secondary

## Quality Assurance Checklist

- [ ] All 4 pathways (1A2A, 1A2B, 1B2A, 1B2B) lead to coherent endings
- [ ] Decision points clearly differentiate choices
- [ ] Character growth arcs maintain consistency across branches
- [ ] Age-appropriate content in all scenes
- [ ] Thematic learning objectives achieved
- [ ] Scene IDs follow consistent naming convention
- [ ] Background SVGs exist and are appropriate for each scene
- [ ] {{childName}} placeholder used consistently in narrative text

This framework provides the structural foundation for generating engaging, educational interactive stories using your existing JSON format while maintaining complete flexibility for theme, character, and setting customization.
