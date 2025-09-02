# Framework Mapping Example: Dragon Adventure

## Dragon Adventure Story Analysis

### Existing JSON Structure Mapped to Framework

**Story Metadata:**
```json
{
  "id": "dragon-adventure",
  "title": "The Friendly Dragon", 
  "ageRange": [3, 8],
  "themes": ["kindness", "courage", "friendship", "understanding"]
}
```

**Framework Mapping:**
- **Primary Dichotomy:** Direct Approach (Wave hello) vs. Careful Approach (Walk closer)
- **Secondary Dichotomy:** Immediate Action (Accept ride/fly) vs. Thoughtful Action (Walk/ask questions)
- **Integration Learning:** Finding balance between courage and understanding

### Scene Structure Analysis

**Opening Scenes (scene-1):**
- Introduces protagonist ({{childName}}) and setting
- Presents first decision point with clear choice dichotomy

**Decision Point 1 (scene-1):**
- **Choice A:** "Wave hello to the dragon" → scene-2 (Direct/Friendly approach)
- **Choice B:** "Walk closer to the moat" → scene-3 (Careful/Exploratory approach)

**Branch A Journey (scene-2, scene-4, scene-5):**
- Direct approach leads to immediate friendship and adventure
- Involves accepting dragon ride (scene-4) or walking together (scene-5)
- Teaches about immediate kindness and trust-building

**Branch B Journey (scene-3, scene-6, scene-7):**
- Careful approach discovers treasure pebbles
- Leads to choosing blue "friendship pebble" (scene-6) or golden "courage pebble" (scene-7)
- Teaches about thoughtful discovery and meaningful connections

**Decision Point 2 (scene-4, scene-5, scene-6, scene-7):**
- Branch A DP2: scene-4 (Accept ride) vs scene-5 (Walk together)
- Branch B DP2: scene-6 (Blue pebble) vs scene-7 (Golden pebble)

**Combined Journey Scenes (scene-8, scene-9):**
- Both branches converge to final activities
- scene-8: Making flower crowns (from scene-4/scene-5 convergence)
- scene-9: Cloud watching (alternative from scene-4/scene-5)

**Decision Point 3 (scene-8, scene-9):**
- scene-8 choices lead to scene-10 (Weekly meetings) or scene-11 (Mutual visits)
- scene-9 choices lead to scene-10 or scene-11
- Creates thematic grouping by commitment level

### Pathway Analysis

**Pathway 1A2A (Direct + Immediate):** scene-1 → scene-2 → scene-4 → scene-8 → scene-10
- Consistent direct approach throughout
- Leads to "Weekly meetings" ending (frequent, structured friendship)

**Pathway 1A2B (Direct + Alternative):** scene-1 → scene-2 → scene-4 → scene-9 → scene-11  
- Direct start but thoughtful continuation
- Leads to "Mutual visits" ending (balanced, reciprocal friendship)

**Pathway 1B2A (Careful + Friendship):** scene-1 → scene-3 → scene-6 → scene-8 → scene-10
- Careful start but friendship-focused continuation
- Leads to "Weekly meetings" ending

**Pathway 1B2B (Careful + Courage):** scene-1 → scene-3 → scene-7 → scene-9 → scene-11
- Careful start but courage-focused continuation  
- Leads to "Mutual visits" ending

### Thematic Resolution Mapping

**Ending Theme 1 (scene-10 - "Weekly meetings"):**
- Achieved by consistent approaches (1A2A, 1B2A)
- Emphasizes regular, predictable friendship commitments
- Teaches about reliability and consistent kindness

**Ending Theme 2 (scene-11 - "Mutual visits"):**
- Achieved by mixed approaches (1A2B, 1B2B)  
- Emphasizes balanced, reciprocal relationships
- Teaches about adaptability and mutual understanding

### Character Role Implementation

**Protagonist:** {{childName}} (already character-agnostic)
**Mentor Character:** Emerald the Dragon (provides guidance, shares wisdom)
**Ally Character:** Various supporting elements (moon, clouds, flowers)
**Challenge Character:** Initial uncertainty about approaching the dragon

### Visual Integration
- Background SVGs change appropriately: castle.svg → meadow.svg → sunset.svg
- Environmental progression tracks story tension and resolution
- Sunset backgrounds used for emotional, reflective scenes

This example demonstrates how the existing Dragon Adventure story already embodies the framework principles, confirming that your JSON format is ideally suited for the interactive story framework.
