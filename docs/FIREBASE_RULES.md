# Firebase Security Rules for Story Forge v3.7.4

## Simplified Architecture

**v3.7.4 stores all collaboration data directly in the project document:**
- `pendingInvites` → stored as `project.pendingInvites` map
- `inviteLinks` → stored as `project.inviteLinks` map  
- `apiSettings` → stored as `project.apiSettings` object

This means **no new subcollections are required** - if your existing rules allow members to read and admins to write to the project document, everything will work.

## Recommended Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Email lookup (optional - for faster user lookup)
    match /emailLookup/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Global pending invites (optional - for faster invite processing)
    match /pendingInvites/{inviteId} {
      allow read, write: if request.auth != null;
    }
    
    // Projects - the main document holds everything
    match /projects/{projectId} {
      // Anyone authenticated can create a project
      allow create: if request.auth != null;
      
      // Members can read their projects
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.memberIds;
      
      // Owner and admins can write
      allow write: if request.auth != null && (
        resource.data.ownerId == request.auth.uid ||
        resource.data.members[request.auth.uid].role in ['admin', 'owner']
      );
      
      // Subcollections (entities, narrative, etc.)
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.memberIds;
      }
    }
  }
}
```

## What's Stored Where

| Feature | Location | Who Can Write |
|---------|----------|---------------|
| Project metadata | `projects/{id}` | Owner, Admin |
| Team members | `projects/{id}.members` | Owner, Admin |
| Pending email invites | `projects/{id}.pendingInvites` | Owner, Admin |
| Invite links | `projects/{id}.inviteLinks` | Owner, Admin |
| Shared API keys | `projects/{id}.apiSettings` | Owner, Admin |
| Entities | `projects/{id}/entities/{docId}` | All members |
| Narrative | `projects/{id}/narrative/{docId}` | All members |

## How Features Work

### Email Invites
1. Admin invites `user@example.com`
2. System stores invite in `project.pendingInvites["user_example_com"]`
3. When user signs in → System processes pending invites → User added to project

### Shareable Links
1. Admin creates invite link
2. Stored in `project.inviteLinks["inv_123..."]`
3. User clicks link → Invite validated → User added to project

### Shared API Keys
1. Admin configures API keys in Settings
2. Stored in `project.apiSettings`
3. All team members can use AI generation with shared keys

## Migration Note

If you have existing data in subcollections (`/invites`, `/pendingInvites`, `/settings`), the app will still try to read from them but will fall back to the project document. You can safely delete the old subcollections.

