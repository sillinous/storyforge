# Story Forge Deep Context System

## Overview

The Deep Context System ensures maximum consistency across all AI generations by tracking the complete state of every story element as it evolves through the narrative.

## Why Deep Context Matters

Without deep context tracking:
- Characters might change eye color between panels
- Items picked up in Chapter 1 disappear without explanation
- Injuries heal instantly without justification
- Character voices shift inconsistently
- World rules are applied inconsistently

With deep context tracking:
- Every physical detail is tracked and enforced
- Items flow naturally through the story
- Character state (emotional, physical) is maintained
- Dialogue matches established speech patterns
- World rules are consistently applied

## Context Hierarchy

```
Series Context
├── Project metadata (genre, tone, audience)
├── World Rules (all defined rules)
├── Characters (all definitions)
├── Locations (all definitions)
├── Factions, Motifs, Threads, Events, Artifacts
│
└── Book Context
    ├── Series position (book X of Y)
    ├── Book metadata
    ├── Prior books (summaries)
    │
    └── Chapter Context
        ├── Book position (chapter X of Y)
        ├── Chapter metadata (POV, emotional arc)
        ├── Prior chapters (full beats)
        ├── Character appearances tracking
        │
        └── Beat Context
            ├── Chapter position (beat X of Y)
            ├── Beat metadata
            ├── Prior beats in chapter
            │
            └── Page Context (ATOMIC LEVEL)
                ├── DEEP CONTEXT TRACKER
                │   ├── Character States
                │   ├── Item States
                │   ├── Event Timeline
                │   ├── Relationship States
                │   └── Visual Continuity
                ├── Scene Characters (full profiles)
                ├── Current Location (with established visuals)
                ├── Items in Scene
                ├── Active World Rules
                ├── Recent Events
                ├── Dialogue History
                └── CONSISTENCY CHECKLIST
```

## Deep Context Tracker Components

### Character States

For each character, tracks:

```javascript
{
  identity: {
    name: "Character Name",
    role: "protagonist|antagonist|supporting|etc",
    physicalDescription: "Full description",
    distinguishingFeatures: ["scar on left cheek", "silver eyes"],
    voiceCharacteristics: ["soft-spoken", "commanding tone"],
    speechPatterns: ["uses formal vocabulary", "contractions"],
    verbalTics: ["says 'indeed' often"],
    vocabulary: "formal|casual|archaic",
    accentOrDialect: "Scottish brogue"
  },
  
  personality: {
    core: "Full personality description",
    traits: ["brave", "loyal", "impulsive"],
    motivations: "What drives them",
    fears: "What they fear",
    flaws: "Character flaws",
    habits: ["twirls hair when nervous"],
    mannerisms: ["stands with arms crossed"]
  },
  
  visualDetails: {
    hairColor: "raven black",
    eyeColor: "emerald green",
    skinTone: "pale",
    height: "tall",
    build: "slender",
    distinctiveMarks: ["birthmark on shoulder"],
    defaultClothing: "dark traveling cloak",
    styleNotes: "Always wears mother's ring"
  },
  
  currentState: {
    emotionalState: "determined",
    physicalCondition: "wounded",
    currentClothing: "torn traveling cloak",
    injuries: [{ type: "wound", description: "arrow wound to shoulder" }],
    itemsCarrying: ["ancient sword", "map fragment"],
    knowledgeGained: ["learned the king is her father"],
    secretsLearned: ["knows location of the artifact"],
    currentLocation: "The Dark Forest"
  },
  
  relationships: {
    "Other Character": {
      type: "ally",
      description: "Trusted friend",
      dynamics: "She relies on his wisdom"
    }
  },
  
  arcProgress: {
    seriesArc: "From naive farm girl to queen",
    currentPhase: "rising action",
    keyMomentsPassed: [...],
    pendingDevelopments: [...]
  }
}
```

### Item States

For each artifact/item:

```javascript
{
  identity: {
    name: "The Sword of Light",
    description: "Ancient blade that glows...",
    type: "weapon",
    visualDescription: "Silver blade, golden hilt...",
    powers: ["cuts through any armor", "glows near evil"],
    limitations: ["only works for pure of heart"],
    origin: "Forged by the first king"
  },
  
  currentState: {
    location: "The Dark Forest",
    condition: "intact",
    currentHolder: "Alicia",
    isActive: false,
    lastUsed: { book: 1, chapter: 3, beat: 5 }
  },
  
  history: [
    { book: 1, chapter: 1, beat: 2, context: "Found in the ruins" },
    { book: 1, chapter: 3, beat: 5, context: "Used to defeat shadow beast" }
  ]
}
```

### Event Timeline

```javascript
{
  timeline: [
    {
      type: "defined_event",
      name: "The Great War",
      description: "War that shaped the kingdom",
      date: "50 years ago",
      impact: "Left scars on the land",
      isBackstory: true
    },
    {
      type: "story_event",
      name: "Discovery of the Prophecy",
      description: "Alicia learns she is the chosen one",
      location: { book: 1, chapter: 4, beat: 3 },
      isBackstory: false
    }
  ],
  
  activeConsequences: [
    {
      source: "The Great War",
      consequence: "Magic is feared and regulated",
      stillActive: true
    }
  ]
}
```

### Visual Continuity

```javascript
{
  locations: {
    "The Dark Forest": {
      details: ["gnarled ancient trees", "perpetual mist"],
      atmosphere: ["eerie", "dangerous", "mysterious"]
    }
  },
  lighting: [
    { beat: 1, value: "dim moonlight" },
    { beat: 2, value: "torch light" }
  ],
  weather: [
    { beat: 1, value: "light rain" }
  ]
}
```

## Consistency Checklist

Every panel generation includes:

```javascript
{
  characterAppearances: [
    {
      name: "Alicia",
      mustMatch: {
        hair: "raven black",
        eyes: "emerald green",
        distinguishing: ["scar on left cheek"],
        currentClothing: "torn traveling cloak",
        injuries: ["arrow wound to shoulder"]
      }
    }
  ],
  characterItems: [
    {
      name: "Alicia",
      carrying: ["ancient sword", "map fragment"]
    }
  ],
  establishedLighting: "dim moonlight",
  establishedWeather: "light rain",
  establishedLocationDetails: ["gnarled ancient trees", "perpetual mist"]
}
```

## How It Works

1. **During Beat Generation**: The system tracks which characters appear and where
2. **During Page Generation**: Character states are updated based on beat summaries
3. **During Panel Generation**: 
   - Full deep context is built
   - Character states are computed up to the current point
   - Prior panels are analyzed for visual consistency
   - Dialogue history is compiled for voice matching
   - Consistency checklist is generated
   - All of this is passed to the AI in a structured prompt

## Using Deep Context

The deep context is automatically built when generating panels. No additional action is required from users.

### Entity Fields That Enhance Deep Context

To get maximum benefit from deep context, ensure your entities include:

**Characters:**
- Full physical description
- Speech patterns and verbal tics
- Personality traits
- Relationships defined

**Locations:**
- Full visual description
- Atmosphere
- Key features

**Artifacts/Items:**
- Visual description
- Current location
- Current holder

**World Rules:**
- Clear statement
- Visual manifestation
- Implications

## Future Enhancements

- Knowledge graph for character knowledge tracking
- Automated visual reference generation
- Consistency validation before export
- Timeline visualization
- Character state viewer in UI
