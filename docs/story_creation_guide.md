# Story Creation Guide

## Using the Story Template

This guide walks you through creating new interactive stories using the `story_template.json` file.

### Step 1: Story Planning

#### Define Your Story Elements
1. **Theme & Age Range:**
   - Choose 3-4 core themes (e.g., "friendship", "courage", "kindness")
   - Set appropriate age range [3,8] for target audience

2. **Decision Point Structure:**
   - **DP1:** Fundamental choice (e.g., Direct vs. Careful approach)
   - **DP2:** Contextual choices based on DP1 (2 versions with 2 choices each)
   - **DP3:** Thematic resolution (3 ending types)

3. **Character Roles:**
   - Protagonist: Always use `{{childName}}` placeholder
   - Mentor: Wise guide character
   - Ally: Peer-level companion
   - Challenge: Character presenting obstacles

### Step 2: Fill Out the Template

#### Metadata Section
```json
{
  "id": "friendship-adventure-001",
  "title": "The Magical Friendship Garden",
  "ageRange": [3, 8],
  "themes": ["friendship", "kindness", "sharing", "understanding"]
}
```

#### Scene Creation Guidelines

**Opening Scene (opening-1):**
- Introduce {{childName}} and the setting
- Hook the reader with initial situation
- Present clear, engaging choices for DP1

**Branch Scenes (branch-a-1, branch-b-1):**
- Continue story based on DP1 choice
- Develop character relationships
- Show different perspectives
- Lead to appropriate DP2 scene

**Decision Point 2 Scenes (dp2-a-1, dp2-b-1):**
- Present new situations based on DP1 choice
- Show consequences of first decision
- Offer 2 choices each leading to different journey paths

**Journey Scenes:**
- Continue story development
- Show learning moments
- Build toward resolution
- Maintain consistent pathway logic

**Ending Scenes:**
- Provide satisfying closure
- Demonstrate character growth
- Connect back to story themes
- No choices (terminal scenes)

### Step 3: Best Practices

#### Writing Quality
- **Age-Appropriate:** Use simple language with occasional "stretch" words
- **Engaging:** Start sentences with action or questions
- **Emotional:** Include emotional beats and character reactions
- **Consistent:** Maintain voice and tone throughout pathways

#### Choice Design
- **Clear Contrast:** Choices should be distinctly different
- **Consequential:** Each choice should lead to meaningful differences
- **Balanced:** No choice should be obviously "better"
- **Engaging:** Use active, descriptive language

#### Visual Integration
- **Background Selection:** Choose SVGs that match scene mood
- **Progression:** Use different backgrounds for different story phases
- **Consistency:** Maintain visual style across pathways

### Step 4: Pathway Testing

#### Verify All Paths
Ensure these 4 pathways work correctly:
1. **1A2A:** DP1-A → DP2-A → Ending 1 (Consistent Primary)
2. **1A2B:** DP1-A → DP2-B → Ending 3 (Balanced)
3. **1B2A:** DP1-B → DP2-A → Ending 3 (Balanced)
4. **1B2B:** DP1-B → DP2-B → Ending 2 (Consistent Secondary)

#### Quality Checks
- [ ] All scenes have valid background SVGs
- [ ] All nextSceneId references exist
- [ ] All pathways lead to coherent endings
- [ ] Character development is consistent
- [ ] Themes are reinforced throughout
- [ ] Age-appropriate content in all scenes

### Step 5: Example Implementation

#### Sample Opening Scene
```json
{
  "id": "opening-1",
  "background": "garden.svg",
  "text": "{{childName}} discovered a hidden garden filled with magical flowers that could talk! The flowers looked worried because their friend, the ancient oak tree, was sick. 'Please help us!' they whispered. {{childName}} could either start helping immediately or ask the flowers more about what was wrong.",
  "choices": [
    { "label": "Start helping the flowers right away", "nextSceneId": "branch-a-1" },
    { "label": "Ask the flowers to tell you more first", "nextSceneId": "branch-b-1" }
  ]
}
```

#### Sample Ending Scene
```json
{
  "id": "ending-consistent-primary",
  "background": "sunset.svg", 
  "text": "{{childName}} had learned that sometimes the best way to help is to jump right in with kindness and action. The oak tree recovered beautifully, and all the flowers threw a celebration in {{childName}}'s honor. From that day on, {{childName}} knew that a little courage and immediate kindness could solve many problems.",
  "choices": []
}
```

### Step 6: Final Steps

1. **Remove Template Comments:** Delete all `_comment` fields before using
2. **Validate JSON:** Ensure proper JSON syntax
3. **Test Pathways:** Play through all 4 story paths
4. **Review Quality:** Use the quality checklist
5. **Add to Platform:** Place in `/apps/mvp/stories/` directory

### Additional Resources

- **Background SVGs:** Available in `/apps/mvp/public/backgrounds/`
- **Framework Guide:** See `interactive_story_framework_template.md`
- **Example Stories:** Reference `dragon-adventure.json` and `space-journey.json`
- **Mapping Example:** See `framework_mapping_example.md`

### Common Mistakes to Avoid

- **Dead Ends:** Ensure all pathways lead to endings
- **Inconsistent Choices:** DP2 choices should feel appropriate to DP1 choice
- **Weak Endings:** Each ending should feel earned and satisfying
- **Generic Text:** Make scenes vivid and character-specific
- **Missing Placeholders:** Always use `{{childName}}` for protagonist
- **Invalid References:** Double-check all `nextSceneId` values

This template and guide will help you create engaging, educational interactive stories that work perfectly with your platform's architecture.
