# Story Forge Collaboration System

## Overview

Story Forge v3.7.0 introduces enhanced collaboration features that ensure all project data—from series planning to individual panel scripts—persists and synchronizes across all team members in real-time.

## Data Persistence Hierarchy

All data in Story Forge is stored in Firebase Firestore and persists automatically:

```
projects/
└── {projectId}/
    ├── [Project metadata, members, settings]
    ├── entities/
    │   └── {entityId}
    │       └── [Character, location, artifact data]
    ├── relationships/
    │   └── {relationshipId}
    ├── narrative/
    │   └── series/
    │       └── [Series metadata: title, logline, themes]
    │       └── books/
    │           └── {bookId}/
    │               └── [Book metadata]
    │               └── chapters/
    │                   └── {chapterId}/
    │                       └── [Chapter metadata]
    │                       └── beats/
    │                           └── {beatId}/
    │                               └── [Beat data]
    │                               └── pages: [
    │                                   {
    │                                     pageNumber,
    │                                     panels: [...]
    │                                   }
    │                               ]
    ├── activities/
    ├── presence/
    ├── comments/
    ├── invites/
    └── versions/
```

## Inviting Collaborators

### Method 1: Direct Email Invitation

1. Go to **Team** panel
2. Click **Add by Email**
3. Enter the collaborator's email (they must have signed in at least once)
4. Select their role (Editor, Commenter, or Viewer)
5. Click **Add to Team**

### Method 2: Shareable Invite Link

1. Go to **Team** panel
2. Click **Share Link**
3. Configure:
   - **Role**: Editor, Commenter, or Viewer
   - **Expiry**: 1, 7, 14, or 30 days
4. Click **Generate Link**
5. Copy the link and share with collaborators

When someone clicks the invite link:
1. They'll be redirected to Story Forge
2. If not signed in, they'll sign in/create an account
3. They're automatically added to the project with the specified role

### Managing Invites

Active invite links appear in the Team panel. Project owners can:
- View all pending invites with expiry dates
- Revoke invites at any time
- Generate new links as needed

## Real-Time Synchronization

### How It Works

Story Forge uses Firebase real-time subscriptions to sync data:

1. **Initial Load**: When a user opens a project, all narrative data loads
2. **Subscription**: The app subscribes to the series document for changes
3. **Change Detection**: Any modification "touches" the series document
4. **Propagation**: All connected clients receive the update
5. **UI Refresh**: The interface updates automatically

### What Syncs

All narrative components sync in real-time:
- Series metadata (title, logline, themes)
- Books (add, edit, delete)
- Chapters (add, edit, delete)
- Beats (add, edit, delete)
- Pages (generation, edits)
- Panels (scripts, art notes)

### Sync Triggers

The following actions trigger synchronization:
- Adding/editing/deleting books
- Adding/editing/deleting chapters
- Adding/editing/deleting beats
- Generating/saving pages
- Generating/saving panel scripts
- Batch operations (generate all chapters, etc.)

## Edit Locking

To prevent conflicts, Story Forge includes beat-level locking:

```javascript
// When a user starts editing a beat
narrativeService.lockBeat(projectId, bookId, chapterId, beatId, userId, userName)

// When done editing
narrativeService.unlockBeat(projectId, bookId, chapterId, beatId, userId)
```

Features:
- Locks auto-expire after 5 minutes
- Other users see who is editing
- Locks are released on sign-out or page close

## Role Permissions

### Owner
- Full access to all features
- Can delete project
- Can manage team members
- Can change roles
- Can create/revoke invite links

### Editor
- Read and write all content
- Can add comments
- Can approve changes
- Cannot delete project or manage members

### Commenter
- Read all content
- Can add comments
- Cannot edit content

### Viewer
- Read-only access
- Cannot comment or edit

## Activity Tracking

All significant actions are logged:
- Entity creation/modification
- Narrative changes
- Page/panel generation
- Team changes
- Comments

View activity in the **Activity** panel.

## Presence Awareness

See who's online and what they're working on:
- Online indicators in sidebar
- Current panel/entity tracking
- Edit status for beats

## Comments & Annotations

Add comments to any item:
- Entities
- Beats
- Pages
- Panels

Comments support:
- Threading (replies)
- Resolution status
- Real-time updates

## Version History

Save snapshots of your project:

```javascript
collaborationService.saveVersion(projectId, userId, "Before Chapter 5 Rewrite", "Backing up before major changes")
```

Restore previous versions if needed.

## Best Practices

### For Project Owners
1. Set appropriate roles for team members
2. Use invite links for quick onboarding
3. Review active invites periodically
4. Use version saves before major changes

### For Collaborators
1. Check who's editing before starting work
2. Use comments for feedback instead of direct edits when unsure
3. Keep the Activity panel open to see recent changes
4. Refresh if things seem out of sync

### For Teams
1. Establish clear ownership of sections
2. Use comments for coordination
3. Save versions before major rewrites
4. Communicate outside the app for real-time coordination

## Troubleshooting

### Changes Not Syncing
1. Check internet connection
2. Refresh the page
3. Sign out and back in
4. Clear browser cache

### Can't Accept Invite
- Ensure you're signed in
- Check if the invite has expired
- Verify you're not already a member
- Contact the project owner for a new link

### Edit Lock Issues
- Locks auto-expire after 5 minutes
- Close browser tabs to release locks
- Sign out properly to release locks

## API Reference

### Collaboration Service

```javascript
// Create invite link
collaborationService.createInviteLink(projectId, userId, role, expiresInDays)

// Accept invite
collaborationService.acceptInvite(projectId, inviteId, userId)

// Get active invites
collaborationService.getActiveInvites(projectId)

// Revoke invite
collaborationService.revokeInvite(projectId, inviteId)

// Comments
collaborationService.addComment(projectId, userId, userName, itemType, itemPath, text)
collaborationService.getComments(projectId, itemPath)
collaborationService.resolveComment(projectId, commentId, userId)

// Version history
collaborationService.saveVersion(projectId, userId, name, description)
collaborationService.getVersions(projectId)
collaborationService.restoreVersion(projectId, versionId, userId)
```

### Narrative Service (Real-Time Sync)

All methods automatically trigger sync:
- `addBook`, `updateBook`, `deleteBook`
- `addChapter`, `updateChapter`, `deleteChapter`
- `addBeat`, `updateBeat`, `deleteBeat`
- `savePages`, `savePanels`, `updatePage`
- Batch operations

### Presence Service

```javascript
// Set presence
presenceService.setPresence(projectId, userId, userData)

// Update activity
presenceService.updateActivity(projectId, userId, activity)

// Track editing
presenceService.setEditing(projectId, userId, itemType, itemPath)

// Subscribe to presence
presenceService.subscribe(projectId, callback)
```
