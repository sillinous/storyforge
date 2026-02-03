# Story Forge - Atomic Generation System

## Overview

Story Forge v3.7.6 provides **atomic-level generation** for publishing-ready graphic novel scripts. This document explains the complete hierarchy and how to generate content at each level.

## Generation Hierarchy

```
Series
└── Books (generateBooks)
    └── Chapters (generateChapters)
        └── Beats (generateBeats)
            └── Pages (generatePages)
                └── Panels (generatePanels) ← ATOMIC LEVEL
                    ├── Visual Description
                    ├── Characters
                    ├── Action
                    ├── Dialogue/Captions
                    ├── Sound Effects
                    └── Art Direction
```

## Complete Data Structure

### Series Level
```javascript
{
  title: "Series Title",
  logline: "One-sentence hook",
  themes: ["theme1", "theme2"],
  targetLength: 12  // target books
}
```

### Book Level
```javascript
{
  number: 1,
  title: "Book Title",
  logline: "Book-specific hook",
  themes: ["book-specific themes"],
  estimatedPages: 180,
  status: "draft"
}
```

### Chapter Level
```javascript
{
  number: 1,
  title: "Chapter Title",
  summary: "Chapter summary",
  pov: "POV Character",
  emotionalArc: "Emotional journey",
  estimatedPages: 22,
  status: "draft"
}
```

### Beat Level
```javascript
{
  sequence: 1,
  title: "Beat Title",
  beatType: "action|character|revelation|etc",
  purpose: "What this beat accomplishes",
  summary: "What happens",
  characters: ["Character1", "Character2"],
  location: "Location Name",
  estimatedPages: 4,
  status: "draft"
}
```

### Page Level
```javascript
{
  pageNumber: 1,
  visualFocus: "Key image/moment for this page",
  panelCount: 5,
  pacing: "slow|medium|fast",
  emotionalBeat: "What emotional beat this page hits",
  charactersOnPage: ["Character1", "Character2"],
  dialogueNotes: "Key dialogue exchanges",
  visualDirection: "Art direction notes",
  layoutNotes: "Page composition notes",
  panels: []  // Array of panels
}
```

### Panel Level (ATOMIC)
```javascript
{
  panelNumber: 1,
  size: "splash|large|medium|small|inset",
  shot: "establishing|wide|medium|close-up|extreme-close-up|over-shoulder|POV",
  visualDescription: "Detailed description for artist including character positions, expressions, lighting",
  characters: ["Character names exactly as defined"],
  action: "Physical action in this moment",
  dialogue: [
    {
      speaker: "Character name",
      text: "Actual dialogue",
      type: "speech|thought|caption|narration",
      direction: "whisper|shout|trembling|etc"
    }
  ],
  sfx: "Sound effect or empty string",
  artNotes: "Lighting, mood, angle, special instructions"
}
```

## API Reference

### generationService.generateBooks(project, entities, narrative, count, guidance)
Generates book outlines for a series.

**Parameters:**
- `project` - Project object with name, description, settings
- `entities` - Array of all entities (characters, locations, etc.)
- `narrative` - Narrative object with series logline, themes
- `count` - Number of books to generate (default: 12)
- `guidance` - Optional guidance string

**Returns:** Array of book objects

---

### generationService.generateChapters(project, entities, narrative, bookNumber, count, guidance)
Generates chapter outlines for a book.

**Parameters:**
- `bookNumber` - Which book (1-indexed)
- `count` - Number of chapters (default: 10)

**Returns:** Array of chapter objects

---

### generationService.generateBeats(project, entities, narrative, bookNumber, chapterNumber, count, guidance)
Generates scene beats for a chapter.

**Parameters:**
- `chapterNumber` - Which chapter (1-indexed)
- `count` - Number of beats (default: 5)

**Returns:** Array of beat objects with:
- `sequence` - Beat number
- `title` - Beat title
- `beatType` - opening, action, character, worldbuilding, tension, revelation, emotional, transition, resolution, hook
- `purpose` - What this beat accomplishes
- `summary` - 2-3 sentences of what happens
- `characters` - Array of character names
- `location` - Location name
- `estimatedPages` - Target page count

---

### generationService.generatePages(project, entities, narrative, bookNumber, chapterNumber, beatSequence, guidance)
Generates page breakdown for a beat.

**Returns:** Array of page objects with:
- `pageNumber` - Page number within beat
- `visualFocus` - Key image/moment for the page
- `panelCount` - Number of panels (typically 4-6)
- `pacing` - slow, medium, or fast
- `emotionalBeat` - What emotional beat this page hits
- `charactersOnPage` - Characters appearing on this page
- `dialogueNotes` - Key dialogue exchanges
- `visualDirection` - Art direction notes

---

### generationService.generatePanels(project, entities, narrative, bookNumber, chapterNumber, beatSequence, pageNumber, guidance)
**ATOMIC LEVEL** - Generates full panel-by-panel script for a single page.

**Returns:** Object with:
```javascript
{
  pageNumber: 1,
  layoutNotes: "Overall page composition notes",
  panels: [
    {
      panelNumber: 1,
      size: "large",          // splash, large, medium, small, inset
      shot: "establishing",   // establishing, wide, medium, close-up, extreme-close-up, over-shoulder, POV
      visualDescription: "Detailed description for artist",
      characters: ["Character1", "Character2"],
      action: "What's physically happening",
      dialogue: [
        {
          speaker: "Character1",
          text: "Actual dialogue",
          type: "speech",       // speech, thought, caption, whisper, shout
          direction: "Optional delivery note"
        }
      ],
      sfx: "CRASH!",
      artNotes: "Lighting, angle, mood notes"
    }
  ]
}
```

---

### generationService.generateAllPanelsForBeat(project, entities, narrative, bookNumber, chapterNumber, beatSequence, guidance)
Batch generates panels for ALL pages in a beat.

**Returns:** Array of panel script objects (one per page)

---

### generationService.exportScript(narrative, bookNumber, chapterNumber?, format?, includeContext?)
Exports generated content in multiple formats.

**Parameters:**
- `chapterNumber` - Optional, exports single chapter if provided
- `format` - 'full' (industry script), 'json' (complete data)
- `includeContext` - Include series/book metadata headers (default: false)

**Returns:** 
- `format='full'`: Formatted script text with all atomic elements
- `format='json'`: Complete JSON data structure

**Script Format Features:**
- Unicode box-drawing headers
- Beat/page/panel organization
- Character references per panel
- Dialogue with type indicators
- SFX and art notes
- Layout notes when available

**JSON Format Features:**
- Complete series → book → chapter → beat → page → panel hierarchy
- All atomic elements preserved
- Ready for backup/import

---

### generationService.exportProjectData(project, entities, relationships, narrative)
Exports complete project data for backup or migration.

**Returns:** JSON string with:
- Export metadata (version, date)
- Project settings
- All entities
- All relationships
- Complete narrative structure

---

### generationService.polishDialogue(project, entities, narrative, bookNumber, chapterNumber, beatSequence, pageNumber, guidance)
Refines dialogue for natural flow and character voice.

**Returns:** Polished dialogue in same structure

---

## Example Workflow

```javascript
import generationService from './generationService';

// 1. Generate the narrative structure
const books = await generationService.generateBooks(project, entities, narrative, 12);
// Save books to narrative

const chapters = await generationService.generateChapters(project, entities, narrative, 1, 10);
// Save chapters to book 1

const beats = await generationService.generateBeats(project, entities, narrative, 1, 1, 6);
// Save beats to chapter 1

// 2. Generate page breakdowns
const pages = await generationService.generatePages(project, entities, narrative, 1, 1, 1);
// Save pages to beat 1

// 3. Generate atomic-level panel scripts
const panelScript = await generationService.generatePanels(project, entities, narrative, 1, 1, 1, 1);
// Save panels to page 1

// Or batch generate all panels for a beat
const allPanels = await generationService.generateAllPanelsForBeat(project, entities, narrative, 1, 1, 1);

// 4. Polish dialogue
const polished = await generationService.polishDialogue(project, entities, narrative, 1, 1, 1, 1);
// Update dialogue in panels

// 5. Export final script
const script = await generationService.exportScript(narrative, 1);
// Download as .txt file
```

## Context Awareness

Every generation level receives full context of:

### What Came Before
- Prior books, chapters, beats, pages
- Character appearances and locations used
- Plot points and revelations

### Structural Position
- "Chapter 4 of 10 (40% through book)"
- "RISING ACTION phase"
- Page budget tracking

### What Comes After
- Planned future content (if defined)
- Number of remaining elements

## Panel Script Format

The atomic-level output is designed to be artist-ready:

```
PAGE 1

PANEL 1 (Large, establishing)
Wide shot of the Victorian mansion at night. Rain 
streaks across the windows. A single light burns
in the attic.

    CAPTION: London, 1892.
    CAPTION: The night everything changed.

PANEL 2 (Medium)
ALICIA (17) stands at the attic window, her reflection
ghostly in the glass. She wears a nightgown, hair loose.

    ALICIA: Mother said to never come up here...

PANEL 3 (Close-up)
Alicia's hand reaching for an antique mirror.

    SFX: creeeeak

PANEL 4 (Small, inset)
Extreme close-up of Alicia's eye, wide with fear.

    ALICIA (whisper): What—
```

## Next Steps

1. **UI Integration** - Add panel generation buttons to NarrativePanel
2. **Panel Editor** - Visual panel arrangement tool
3. **Script Export** - Download as .txt, .fdx (Final Draft), .fountain
4. **Art Reference** - Integration with image generation for reference panels
5. **Prose Mode** - Alternative generation path for novels (beats → prose blocks)
