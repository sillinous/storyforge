# Story Forge v3.7.6 - Complete Atomic Element System

## What's New in v3.7.6

### All Atomic Elements Now Properly Generated & Saved

Every level of the narrative hierarchy now generates and persists ALL atomic elements:

#### Page Generation (generatePages)
Now saves all fields:
- `pageNumber` - Sequential page number within beat
- `visualFocus` - Key image/moment for the page
- `panelCount` - Target number of panels
- `dialogueNotes` - Key dialogue exchanges
- `visualDirection` - Art direction notes
- `pacing` - slow/medium/fast
- `charactersOnPage` - **NEW** Array of character names on this page
- `emotionalBeat` - **NEW** What emotional beat this page hits
- `panels` - Array of panel scripts (initialized empty)

#### Panel Generation (generatePanels)
Now saves all fields with full structure:
- `panelNumber` - Sequential panel number on page
- `size` - splash/large/medium/small/inset
- `shot` - establishing/wide/medium/close-up/extreme-close-up/over-shoulder/POV
- `visualDescription` - Detailed artist reference
- `characters` - Array of characters in panel
- `action` - Physical action in the moment
- `dialogue` - Array of dialogue objects:
  - `speaker` - Character name
  - `text` - Dialogue text
  - `type` - speech/thought/caption/narration
  - `direction` - whisper/shout/trembling/etc
- `sfx` - Sound effects
- `artNotes` - Lighting, mood, special instructions
- `layoutNotes` - Page-level composition notes

### Enhanced Export System

#### New Export: Industry-Standard Comic Script
- `downloadComicScript(projectId, projectName, bookNumber, chapterNumber?)`
- Exports in professional comic script format for artists and letterers
- Includes all panel details, dialogue with directions, SFX, art notes
- Available for full book or single chapter

#### Updated Exports:

**Chapter Script (Markdown)**
- Now includes ALL pages and panels
- Full panel-by-panel breakdown
- Character and location references
- Statistics (beats, pages, panels)

**Beat Sheet**
- Shows page generation progress
- Shows script completion status
- Detailed beat breakdown with page info

**World Bible (Markdown)**
- Entity-specific fields (character voice, location atmosphere, etc.)
- Full narrative hierarchy with page/panel counts
- Statistics at every level

### Export Modal Improvements

- **Book Stats Display**: Shows chapters, beats, pages, scripted pages, panels
- **New Comic Script Exports**: Industry-standard format for entire book or single chapter
- **Better Descriptions**: Clearer export option descriptions

### Batch Panel Generation

`handleGenerateAllPanels` now:
- Skips pages that already have panels (no regeneration without explicit request)
- Properly saves all atomic elements for each panel
- Maintains full dialogue structure

---

# Story Forge v3.7.8 - Enhanced Detail Panel

## What's New in v3.7.8

### Resizable Detail Panel

The right-side detail panel now supports full width customization:

**Resize Features:**
- **Drag to Resize**: Grab the handle between tree and detail panel
- **Width Indicator**: Shows current width in pixels while dragging
- **Double-click to Reset**: Instantly returns to 600px default
- **Persistent Width**: Your preference saves to localStorage
- **Min/Max Limits**: 400px minimum, 1200px maximum

**Width Presets** (Page view only):
| Button | Width | Best For |
|--------|-------|----------|
| **S** | 450px | Compact view, narrow screens |
| **M** | 600px | Default balanced view |
| **L** | 800px | Comfortable editing |
| **XL** | 1100px | Full panel editing, wide monitors |

### Improved Page Detail Layout

**Full-Width Form Elements:**
- All inputs, textareas, and selects now stretch to fill available width
- Visual Focus section uses full panel width
- Form rows display side-by-side with equal flex sizing
- No more constrained input widths

**Reorganized Sections:**
- **📐 Page Structure**: Panel count, pacing, layout notes
- **📝 Story Content**: Emotional beat, characters on page
- **🎯 Visual Focus**: Key image, visual direction, dialogue notes (full width)

**Responsive Grid:**
- Sections display side-by-side on wider panels (L/XL)
- Single column on narrower widths (S/M)
- Form rows adapt to available space

### Visual Improvements

- Enhanced resize handle with dots grip indicator
- Glowing accent color when actively resizing
- Sticky headers stay visible while scrolling
- Better spacing and visual hierarchy
- Breadcrumb context shows Book → Chapter → Beat path

---

# Story Forge v3.7.7 - Full Panel Editing

## What's New in v3.7.7

### Complete Panel Editing Interface

Every atomic element of a panel can now be modified directly in the UI:

**Panel Properties:**
- **Size**: splash, large, medium, small, inset
- **Shot Type**: establishing, wide, medium, close-up, extreme-close-up, over-shoulder, POV
- **Characters**: Comma-separated list of characters in panel
- **Visual Description**: Full detailed artist description
- **Action**: Physical action happening in the moment
- **SFX**: Sound effects
- **Art Notes**: Lighting, mood, camera angles, special instructions

**Dialogue Editor:**
- Add/remove dialogue entries
- Set dialogue type: speech, thought, caption, narration
- Set speaker (for speech/thought)
- Set delivery direction (whisper, shout, etc.)
- Full text editing

### Panel Management
- Click any panel to enter edit mode
- Add new panels manually (without AI generation)
- Delete individual panels
- Panels auto-renumber when deleted
- Layout notes editable at page level

### Page-Level Save
- All page atomic elements now save properly:
  - `visualFocus`, `panelCount`, `pacing`
  - `emotionalBeat`, `charactersOnPage`
  - `dialogueNotes`, `visualDirection`, `layoutNotes`
  - Complete panel array with all atomic details

### UI Improvements
- Visual feedback when hovering editable panels
- Edit hint appears on hover
- Panel editing mode highlighted with accent border
- Responsive dialogue editor with flexible layout

---

# Story Forge v3.7.6 - Atomic Elements & Enhanced Export

## What's New in v3.7.6

### Complete Atomic Element Tracking

All narrative hierarchy levels now track and display complete atomic elements:

**Page Level:**
- `pageNumber` - Page position in beat
- `visualFocus` - Key image/moment
- `panelCount` - Target panel count
- `pacing` - slow/medium/fast
- `emotionalBeat` - What emotional beat this page hits (NEW)
- `charactersOnPage` - Characters appearing on this page (NEW)
- `dialogueNotes` - Key dialogue exchanges
- `visualDirection` - Art direction notes
- `layoutNotes` - Page composition notes (NEW)

**Panel Level (Atomic):**
- `panelNumber` - Panel position
- `size` - splash/large/medium/small/inset
- `shot` - establishing/wide/medium/close-up/etc.
- `visualDescription` - Detailed artist description
- `characters` - Characters in panel (NOW DISPLAYED)
- `action` - Physical action in moment
- `dialogue` - Array with speaker/text/type/direction
- `sfx` - Sound effects
- `artNotes` - Lighting, mood, special instructions

### Enhanced Export System

New export formats with all atomic elements:

**Script Format (Industry Standard)**
- Full chapter/book export
- Includes all metadata headers
- Beat/page/panel organization
- Character references per panel
- SFX and art notes properly formatted

**JSON Format (Complete Data)**
- Complete data structure export
- All atomic elements preserved
- Series → Book → Chapter → Beat → Page → Panel hierarchy
- Perfect for backup/import

### UI Enhancements

- Page detail panel now shows emotional beat and characters
- Panel cards now display characters in each panel
- Script export modal with format selection
- Visual improvements to export interface

---

# Story Forge v3.7.5 - Role-Based Permissions for AI Generation

## What's New in v3.7.5

### Comprehensive Permission System

All AI generation and editing features now properly respect user roles:

| Role | View | Edit | Generate AI | Delete |
|------|------|------|-------------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ✅ | ❌ |
| Writer | ✅ | ✅ | ✅ | ❌ |
| Artist | ✅ | ❌ | ❌ | ❌ |
| Commenter | ✅ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

### What's Changed

- **Generate Permission**: Added explicit `generate` permission to Editor and Writer roles
- **UI Updates**: All generation buttons now check `userCanGenerate` permission
- **Form Controls**: Edit fields are disabled for users without write permission
- **Delete Buttons**: Only visible to users with admin permissions
- **Entity Panel**: Full permission checks for adding, editing, and deleting entities
- **Relationships Panel**: Delete only available to admins
- **Narrative Panel**: All generation, regeneration, and editing respects permissions

### Permission Helpers

New helper functions for consistent permission checking:
- `hasPermission(role, permission)` - Check specific permission
- `canGenerate(role)` - Check if role can use AI generation
- `canWrite(role)` - Check if role can edit content

---

# Story Forge v3.7.4 - Firebase Permission Fix

## What's New in v3.7.4

### Fixed Firebase "Missing or insufficient permissions" Error

All collaboration data now stored directly in the project document:

| Feature | Before | After |
|---------|--------|-------|
| Pending Invites | `projects/{id}/pendingInvites/{doc}` | `projects/{id}.pendingInvites` |
| Invite Links | `projects/{id}/invites/{doc}` | `projects/{id}.inviteLinks` |
| API Settings | `projects/{id}/settings/api` | `projects/{id}.apiSettings` |

### Why This Works

Since admins can already write to the project document, **no Firebase rules changes are required**. Everything is stored in maps within the document you already have permission to edit.

### Also Fixed

- Added missing `deleteField` import (was causing runtime errors)
- Made all external collection reads fail gracefully
- Improved error handling throughout

---

# Story Forge v3.7.1 - Multi-Admin Support

## What's New in v3.7.1

### Multiple Owners/Admins

Projects can now have multiple users with full owner-level control:

- **Admin Role**: New "Admin" role with identical permissions to the original owner
- **Full Control**: Admins can:
  - Invite new members (including other Admins)
  - Change member roles (promote/demote anyone except the original creator)
  - Remove members from the project
  - Generate and revoke invite links
  - Access all project settings and features
- **Protected Creator**: The original project creator cannot be demoted or removed
- **Any Admin Can Promote**: Any admin can grant admin permissions to other members

### Visual Enhancements

- **Creator Badge**: Original project creator shows a gold "Creator" badge
- **Admin Badge**: Users with admin role show a purple "Admin" badge
- **Admin Highlighting**: Admin members have a subtle accent border
- **Role Cards**: Admin role card is highlighted in the permissions reference
- **Warnings**: Clear warnings when granting admin permissions

### How It Works

1. **Original Creator** creates the project (always protected, shown as "Owner")
2. **Creator or any Admin** can invite members with the "Admin" role
3. **Admins** have full control: manage members, invites, and all project features
4. **Only limitation**: Original creator cannot be modified or removed

This enables true collaborative ownership where multiple trusted team members can fully manage a project together.

---

# Story Forge v3.7.0 - Enhanced Collaboration & Real-Time Sync

## What's New in v3.7.0

### Complete Narrative Hierarchy Verified

All levels of the narrative structure are fully implemented with contextual awareness:

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

### Full Context Awareness at Every Level

Each generation function receives complete awareness of:
- **Prior content**: Full details of everything that came before
- **Current content**: Complete information about the item being generated
- **Future content**: What's planned to come next (when available)

| Level | Prior | Current | Future |
|-------|-------|---------|--------|
| Books | All prior books with chapters | Current book details | Planned future books |
| Chapters | All prior chapters with beats | Current chapter details | Upcoming chapters |
| Beats | All prior beats with pages | Current beat details | Next beats |
| Pages | All prior pages with panels | Current page metadata | Future pages |
| Panels | Full prior panel scripts | Current page context | Next page focus |

### Shareable Invite Links

Project owners can now generate shareable invite links for collaboration:

- **Generate Links**: Create invite links with configurable roles (Editor, Commenter, Viewer)
- **Expiry Control**: Set link expiration (1, 7, 14, or 30 days)
- **Copy to Clipboard**: Easy one-click copying
- **Manage Invites**: View and revoke active invite links
- **Auto-Join**: New users are automatically added when they click a valid link

### Real-Time Narrative Synchronization

All narrative changes now sync instantly across collaborators:

- **Series-Level Sync**: Any change to books, chapters, beats, pages, or panels triggers real-time updates
- **Automatic Detection**: The system automatically detects when collaborators make changes
- **Seamless Updates**: UI refreshes without manual intervention
- **Conflict Prevention**: Built-in edit locking prevents simultaneous edits

### Collaboration UI Improvements

- **Invite Status Toast**: Visual feedback when processing invite links
- **Active Invites Panel**: View all pending invite links with expiry dates
- **Enhanced Team Panel**: Better organized with Share Link and Add by Email options
- **Status Indicators**: Success, error, and processing states for invite actions

### Panel Script Enhancements

- **Narration Type**: Added support for story narration distinct from captions
- **Improved Dialogue Rendering**: All four dialogue types (speech, thought, caption, narration) properly styled
- **Script Export**: Full support for all dialogue types in exported scripts

### Technical Improvements

- All narrative modification functions now trigger real-time sync
- Series document "touch" mechanism ensures subscription updates
- Batch operations properly propagate sync events
- Improved error handling for collaboration edge cases
- Updated generationService to v3.7 with enhanced context flow

---

# Story Forge v3.6.0 - Deep Context Consistency System

## What's New in v3.6.0

### Deep Context Tracking System

A comprehensive context awareness system that ensures maximum consistency across all AI generations, from series-level planning down to individual panel scripts.

### Character State Tracking

Every character now has tracked:
- **Identity (Immutable)**: Name, physical description, distinguishing features, voice characteristics, speech patterns, verbal tics, vocabulary level, accent/dialect
- **Personality**: Core traits, motivations, fears, flaws, habits, mannerisms
- **Visual Details**: Hair color, eye color, skin tone, height, build, distinctive marks, default clothing
- **Dynamic State**: Current emotional state, physical condition, current clothing, injuries, knowledge gained, secrets learned, items carrying, current location
- **Relationships**: Full relationship map with other characters
- **Arc Progress**: Where they are in their character arc

### Item/Artifact Tracking

- Current location of items
- Current holder
- Condition (intact, damaged, etc.)
- Usage history through the narrative
- Powers and limitations

### Event Timeline & Consequences

- Full timeline of backstory and story events
- Active consequences still affecting the narrative
- Events traced through all generated content

### Visual Continuity

- Established lighting across scenes
- Weather conditions
- Location visual details already described
- Character appearances as drawn in prior panels

### Relationship State Tracking

- Relationship types between characters
- Current state of relationships
- Recent interactions
- Tension levels

### World Rule Application

- Active rules for each scene
- How rules manifest visually
- Rule applications and implications

### Enhanced Prompts

All generation prompts now include:

#### For Panel Scripts (Atomic Level):
- Complete character profiles with current state
- Mandatory consistency checklist
- Dialogue history for voice consistency
- Visual continuity requirements
- Items characters should be carrying
- Established lighting/weather
- Active world rules

#### For Page Breakdowns:
- Full character relationships
- Location with all details
- Items in scene
- Arc positions

#### For Beat Generation:
- Complete character reference
- Appearance tracking
- Active story threads
- Key artifacts/items
- World rules

### Consistency Checklist

Every panel generation now includes a "consistency checklist":
- Character appearances that MUST match
- Items characters should be carrying
- Injuries that must be visible
- Established lighting
- Established weather
- Location details already shown

---

## What's New in v3.5.0

### Script Preview & Export Enhancements

1. **Script Preview Modal** - View formatted scripts before downloading
   - Shows full script in monospace format
   - Copy to clipboard functionality
   - Word count, line count, and panel count stats

2. **Chapter-Level Progress Tracking**
   - Visual progress bar showing scripted pages vs total pages
   - Quick stats: beats, pages, scripted count
   - Preview and Export buttons directly in chapter detail panel

3. **Enhanced Visual Feedback**
   - Loading spinner during script generation
   - Progress indicators for batch operations
   - Improved panel card styling with accent border

### UI Improvements

- Added Eye icon for preview actions
- Added Copy icon for clipboard functionality
- Progress bar animations for script completion
- Better modal sizing for script previews

---

## What's New in v3.4.0

## What's New in v3.4.0

### Complete UI for Atomic-Level Generation

The Narrative Panel now supports the **full generation hierarchy** down to individual panel scripts:

```
Series
└── Books ─────────────── [Generate Books] button
    └── Chapters ─────────── [Generate Chapters] button  
        └── Beats ────────────── [Generate Beats] button
            └── Pages ─────────────── [Generate Pages] button ← NEW
                └── Panels ──────────────── [Generate Panel Script] button ← NEW (ATOMIC)
```

### UI Features

1. **Expandable Beats** - Click the arrow next to any beat to see its pages
2. **Page List** - Each page shows visual focus, panel count, and completion status (✓/○)
3. **Generate Pages Button** - Creates page breakdowns for a beat
4. **Generate All Panel Scripts** - Batch generates scripts for all pages in a beat
5. **Page Detail Panel** - Click a page to see/edit its details
6. **Panel Script Viewer** - Displays full panel-by-panel scripts with:
   - Panel size and shot type
   - Visual descriptions
   - Dialogue boxes (speech, thought, caption)
   - Sound effects
   - Art direction notes
7. **Script Export** - Download industry-standard comic scripts

### Workflow

1. **Build your narrative structure**
   - Generate or manually create Books → Chapters → Beats

2. **Generate page breakdowns**
   - Expand a beat and click "Generate Pages"
   - Each page gets: visual focus, panel count, pacing, dialogue notes

3. **Generate panel scripts** (Atomic Level)
   - Click on a page → "Generate Panel Script"
   - Or use "Generate All Panel Scripts" for batch processing

4. **Review and refine**
   - Edit panel details directly in the UI
   - Regenerate individual panels if needed

5. **Export**
   - Download as industry-standard script format
   - Ready to send to artists!

### Panel Script Format

Each panel includes:
```
PANEL 1 (Large, establishing)
Visual: Wide shot of Victorian mansion at night...

    CAPTION: London, 1892.
    ALICIA: Mother said never to come here...
    SFX: CREAK

[Art: Low angle, dramatic lighting, rain effects]
```

## Previous Releases

### v3.3.0 - Atomic Generation Backend
- Added `generatePanels()` for panel-by-panel scripts
- Added `generateAllPanelsForBeat()` for batch generation
- Added `exportScript()` for industry-standard format
- Added `polishDialogue()` for dialogue refinement

### v3.2.0 - Enhanced Context
- Full structural position awareness
- Complete prior context at all levels
- Forward awareness for pacing

### v3.1.x - Bug Fixes
- Fixed API model names
- Fixed narrative initialization
- Fixed export permissions

## Deployment

1. Extract the zip file
2. Run `npm install`
3. Run `npm run build`
4. Deploy `dist/` folder to your hosting
5. Update Firebase rules if needed (see firestore.rules)
