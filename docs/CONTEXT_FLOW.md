# Story Forge v3.7 - Context Flow Documentation

## Narrative Hierarchy & Context Awareness

Story Forge maintains full contextual awareness at every level of the narrative hierarchy. Each generation function receives comprehensive context about what came before (prior), what is current, and what comes next (future).

```
Series
└── Books ─────────────── generateBooks()
    └── Chapters ─────────── generateChapters()
        └── Beats ────────────── generateBeats()
            └── Pages ─────────────── generatePages()
                └── Panels ──────────────── generatePanels() ← ATOMIC LEVEL
                    ├── Visual Description (for artist)
                    ├── Dialogue (speech balloons)
                    ├── Captions (narrator boxes)
                    ├── Narration (story text)
                    ├── Thoughts (thought bubbles)
                    ├── Sound Effects (SFX)
                    └── Art Direction (lighting, mood, angles)
```

## Context Builders

### 1. buildSeriesContext(project, entities)
**Input:** Project settings, all entities (characters, locations, artifacts, etc.)
**Provides:**
- Project metadata (title, genre, tone, audience, format)
- All characters with full profiles
- All locations with details
- All artifacts/items
- World rules
- Events timeline

### 2. buildBookContext(seriesContext, narrative, bookNumber)
**Input:** Series context, full narrative, target book number
**Provides:**
- Everything from series context
- **priorBooks**: Full details of all books before this one, including:
  - Chapter summaries
  - Key beats and revelations
  - Themes explored
- **currentBook**: Current book details
- **futureBooks**: Planned books after this one (titles, loglines)
- **structure**: Position awareness (opening/midpoint/climax)

### 3. buildChapterContext(bookContext, book, chapterNumber, targetChapters)
**Input:** Book context, book data, target chapter number
**Provides:**
- Everything from book context
- **priorChapters**: Full details including:
  - All beats with summaries
  - Character appearances
  - Locations visited
- **currentChapter**: POV, emotional arc, status
- **futureChapters**: Upcoming chapters (titles, summaries)
- **chapterStructure**: Position (opening/rising/midpoint/falling/climax)
- **characterAppearances**: Track where each character has appeared

### 4. buildBeatContext(chapterContext, chapter, beatSequence, targetBeats)
**Input:** Chapter context, chapter data, target beat sequence
**Provides:**
- Everything from chapter context
- **priorBeats**: Full details including:
  - Beat type and purpose
  - Characters and locations
  - Dialogue notes
  - Visual direction
  - Pages if generated
- **currentBeat**: Complete beat data
- **futureBeats**: Upcoming beats (titles, types, summaries)
- **beatStructure**: Opening/closing indicators, page budget

### 5. buildPageContext(beatContext, beat, pageNumber, project, entities, narrative)
**Input:** Beat context, beat data, target page number, full project data
**Provides:**
- Everything from beat context
- **deepContext**: Full deep context tracking:
  - Character states (current emotional, physical, items carrying)
  - Item states (location, holder, condition)
  - Relationship states (current dynamics)
  - Visual continuity (established lighting, weather, location details)
- **priorPages**: Full panel details from prior pages:
  - Visual descriptions
  - Dialogue history
  - Action summaries
  - Established visual elements
- **currentPage**: Page metadata (focus, panel count, pacing)
- **futurePages**: Upcoming pages (visual focus, pacing)
- **sceneCharacters**: Complete character profiles with:
  - Current state (emotion, clothing, injuries, items)
  - Voice characteristics and speech patterns
  - Relationships with others in scene
- **currentLocation**: Location with established visuals
- **itemsInScene**: Items present and their holders
- **activeWorldRules**: Rules that apply to this scene
- **dialogueHistory**: All dialogue from prior pages for voice consistency
- **consistencyChecklist**: Mandatory consistency requirements

## Panel Script Output Structure

Each panel generated includes:

```json
{
  "panelNumber": 1,
  "size": "large|medium|small|splash|inset",
  "shot": "establishing|wide|medium|close-up|extreme-close-up|over-shoulder|POV",
  "visualDescription": "Detailed description for artist",
  "characters": ["List of characters in panel"],
  "action": "What is physically happening",
  "dialogue": [
    {
      "speaker": "Character name",
      "text": "Dialogue text",
      "type": "speech|thought|caption|narration",
      "direction": "whisper|shout|trembling (optional)"
    }
  ],
  "sfx": "Sound effect text",
  "artNotes": "Lighting, mood, special instructions"
}
```

## Consistency Enforcement

### Mandatory Consistency Checklist
Every panel generation receives:

1. **Character Appearances**
   - Hair color, eye color, distinguishing features
   - Current clothing
   - Visible injuries
   - Items they're carrying

2. **Established Visuals**
   - Lighting from prior panels
   - Weather conditions
   - Location details already shown

3. **Voice Consistency**
   - Speech patterns for each character
   - Verbal tics and catchphrases
   - Vocabulary level
   - Recent dialogue for reference

4. **World Rules**
   - Active rules for the scene
   - How magic/technology manifests
   - Implications for current scene

## Deep Context Tracking

The `deepContextTracker` module extracts and maintains:

### Character States
- **Identity** (immutable): Name, physical description, voice characteristics
- **Personality** (consistent): Core traits, motivations, fears, habits
- **Visual Details**: Hair, eyes, build, distinctive marks
- **Dynamic State** (changes): Emotional state, clothing, injuries, knowledge

### Item States
- Current location
- Current holder
- Condition (intact/damaged/destroyed)
- Usage history

### Event Timeline
- Backstory events
- Story events with timestamps
- Active consequences still affecting narrative

### Visual Continuity
- Established lighting per location
- Weather conditions
- Location details already described

### Relationship States
- Current relationship type
- Tension levels
- Recent interactions

## Generation Flow Example

When generating panels for Book 2, Chapter 5, Beat 3, Page 2:

1. **buildSeriesContext** loads all project data
2. **buildBookContext** adds:
   - Full summaries of Books 1
   - Book 2 current position
   - Books 3+ planned titles
3. **buildChapterContext** adds:
   - Chapters 1-4 with all beats
   - Chapter 5 details
   - Chapters 6+ planned
4. **buildBeatContext** adds:
   - Beats 1-2 with full content
   - Beat 3 current details
   - Beats 4+ planned
5. **buildPageContext** adds:
   - Page 1 with full panels
   - Page 2 metadata
   - Pages 3+ planned
   - Deep context (character states, items, visuals)
6. **generatePanels** creates scripts with:
   - All context awareness
   - Consistency checklist
   - Voice history for dialogue

## API Reference

```javascript
// Generate books for a series
const books = await generationService.generateBooks(project, entities, narrative, count, guidance);

// Generate chapters for a book
const chapters = await generationService.generateChapters(project, entities, narrative, bookNumber, count, guidance);

// Generate beats for a chapter
const beats = await generationService.generateBeats(project, entities, narrative, bookNumber, chapterNumber, count, guidance);

// Generate pages for a beat
const pages = await generationService.generatePages(project, entities, narrative, bookNumber, chapterNumber, beatSequence, guidance);

// Generate panels for a page (ATOMIC LEVEL)
const panelScript = await generationService.generatePanels(project, entities, narrative, bookNumber, chapterNumber, beatSequence, pageNumber, guidance);

// Generate all panels for a beat (batch)
const fullScript = await generationService.generateAllPanelsForBeat(project, entities, narrative, bookNumber, chapterNumber, beatSequence, guidance);
```

## Best Practices

1. **Always generate top-down**: Series → Books → Chapters → Beats → Pages → Panels
2. **Review at each level**: Ensure prior content is correct before generating next level
3. **Use guidance parameter**: Provide specific direction for better results
4. **Check consistency**: Review generated content against character profiles
5. **Edit as needed**: The AI provides a starting point; human refinement improves quality

## Troubleshooting

### Inconsistent Character Appearances
- Verify character entity has complete physical description
- Check that distinguishing features are clearly listed
- Review prior panels for established visuals

### Wrong Character Voice
- Ensure speech patterns are defined in character entity
- Check verbal tics and vocabulary level
- Review dialogue history for voice consistency

### Missing Context
- Verify all prior content is saved to Firebase
- Check that narrative hierarchy is complete
- Ensure entities are properly linked to project
