// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
// Replace these values with your Firebase project configuration
// Get these from: Firebase Console → Project Settings → Your Apps → Web App
// ============================================================================

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField
} from 'firebase/firestore';

// ============================================================================
// FIREBASE CONFIG - Story Forge Production
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAg2BP3TIAUQHGl2IpdzoY4hGe3dcWXV9g",
  authDomain: "api-project-646359516598.firebaseapp.com",
  projectId: "api-project-646359516598",
  storageBucket: "api-project-646359516598.firebasestorage.app",
  messagingSenderId: "646359516598",
  appId: "1:646359516598:web:2b79cf02c8a765d1102d17",
  measurementId: "G-VV95TMM3JX"
};

// Initialize Firebase
console.log('Initializing Firebase...');
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('Firebase initialized successfully');
} catch (err) {
  console.error('Firebase initialization failed:', err);
  throw err;
}

// Auth providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export const authService = {
  getCurrentUser: () => auth.currentUser,
  
  onAuthChange: (callback) => {
    console.log('Setting up auth state listener...');
    return onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? user.email : 'no user');
      callback(user);
    }, (error) => {
      console.error('Auth state error:', error);
    });
  },
  
  signUp: async (email, password, displayName) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    const normalizedEmail = email.toLowerCase().trim();
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      email: normalizedEmail,
      displayName: displayName || email.split('@')[0],
      photoURL: result.user.photoURL,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    });
    // Create email lookup for future invites
    await setDoc(doc(db, 'emailLookup', normalizedEmail), {
      uid: result.user.uid,
      createdAt: serverTimestamp()
    });
    // Process any pending invites for this email
    await projectService.processPendingInvites(result.user.uid, normalizedEmail);
    return result.user;
  },
  
  signIn: async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const normalizedEmail = email.toLowerCase().trim();
    await updateDoc(doc(db, 'users', result.user.uid), { lastActive: serverTimestamp() });
    // Ensure email lookup exists (for users created before this feature)
    try {
      await setDoc(doc(db, 'emailLookup', normalizedEmail), {
        uid: result.user.uid,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.log('Could not update email lookup:', err.message);
    }
    // Process any pending invites for this email
    const processedInvites = await projectService.processPendingInvites(result.user.uid, normalizedEmail);
    if (processedInvites.length > 0) {
      console.log('Processed pending invites:', processedInvites);
    }
    return result.user;
  },
  
  signInWithGoogle: async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    const normalizedEmail = result.user.email?.toLowerCase().trim();
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: result.user.uid,
        email: normalizedEmail,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      });
    } else {
      await updateDoc(userRef, { lastActive: serverTimestamp() });
    }
    // Ensure email lookup exists
    if (normalizedEmail) {
      try {
        await setDoc(doc(db, 'emailLookup', normalizedEmail), {
          uid: result.user.uid,
          createdAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.log('Could not update email lookup:', err.message);
      }
      // Process any pending invites
      await projectService.processPendingInvites(result.user.uid, normalizedEmail);
    }
    return result.user;
  },
  
  signInWithGithub: async () => {
    const result = await signInWithPopup(auth, githubProvider);
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    const normalizedEmail = result.user.email?.toLowerCase().trim();
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: result.user.uid,
        email: normalizedEmail,
        displayName: result.user.displayName || result.user.email?.split('@')[0],
        photoURL: result.user.photoURL,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        color: `hsl(${Math.random() * 360}, 70%, 60%)`
      });
    } else {
      await updateDoc(userRef, { lastActive: serverTimestamp() });
    }
    // Ensure email lookup exists
    if (normalizedEmail) {
      try {
        await setDoc(doc(db, 'emailLookup', normalizedEmail), {
          uid: result.user.uid,
          createdAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.log('Could not update email lookup:', err.message);
      }
      // Process any pending invites
      await projectService.processPendingInvites(result.user.uid, normalizedEmail);
    }
    return result.user;
  },
  
  signOut: () => signOut(auth),
  
  resetPassword: (email) => sendPasswordResetEmail(auth, email),
  
  getUserProfile: async (uid) => {
    const userSnap = await getDoc(doc(db, 'users', uid));
    return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
  },
  
  updateUserProfile: async (uid, updates) => {
    await updateDoc(doc(db, 'users', uid), { ...updates, lastActive: serverTimestamp() });
  }
};

// ============================================================================
// PROJECT FUNCTIONS
// ============================================================================

export const projectService = {
  create: async (userId, name, description = '') => {
    const projectRef = await addDoc(collection(db, 'projects'), {
      name,
      description,
      ownerId: userId,
      members: { [userId]: { role: 'owner', joinedAt: serverTimestamp() } },
      memberIds: [userId],
      settings: { genre: '', targetAudience: '', format: 'graphic_novel' },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1
    });
    await setDoc(doc(db, 'projects', projectRef.id, 'narrative', 'series'), {
      level: 'series',
      title: name,
      logline: '',
      themes: [],
      targetLength: 12,
      status: 'planned',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return projectRef.id;
  },
  
  getByUser: async (userId) => {
    const q = query(collection(db, 'projects'), where('memberIds', 'array-contains', userId), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  get: async (projectId) => {
    const snap = await getDoc(doc(db, 'projects', projectId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  
  update: async (projectId, updates) => {
    await updateDoc(doc(db, 'projects', projectId), { ...updates, updatedAt: serverTimestamp() });
  },
  
  delete: async (projectId) => {
    const collections = ['entities', 'relationships', 'narrative', 'activities', 'presence'];
    for (const coll of collections) {
      const snapshot = await getDocs(collection(db, 'projects', projectId, coll));
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, 'projects', projectId));
  },
  
  subscribe: (projectId, callback) => {
    return onSnapshot(doc(db, 'projects', projectId), (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  },
  
  addMember: async (projectId, email, role = 'viewer') => {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Strategy 1: Try to find user via email lookup (if collection exists and has rules)
    try {
      const lookupSnap = await getDoc(doc(db, 'emailLookup', normalizedEmail));
      if (lookupSnap.exists()) {
        const { uid } = lookupSnap.data();
        // Found the user, add them directly to the project
        await updateDoc(doc(db, 'projects', projectId), {
          [`members.${uid}`]: { role, joinedAt: serverTimestamp(), email: normalizedEmail },
          memberIds: arrayUnion(uid),
          updatedAt: serverTimestamp()
        });
        return { uid, email: normalizedEmail, displayName: normalizedEmail.split('@')[0] };
      }
    } catch (err) {
      console.log('Email lookup failed:', err.message);
    }
    
    // Strategy 2: Store pending invite IN the project document itself
    // This is guaranteed to work since admins can update their own projects
    try {
      const inviteId = `invite_${Date.now()}`;
      await updateDoc(doc(db, 'projects', projectId), {
        [`pendingInvites.${normalizedEmail.replace(/[.@]/g, '_')}`]: {
          email: normalizedEmail,
          role,
          createdAt: new Date().toISOString(),
          inviteId
        },
        updatedAt: serverTimestamp()
      });
      
      // Try to also store in global collection (for faster lookup on login)
      // This is optional - if it fails, we'll still find it by scanning projects
      try {
        await setDoc(doc(db, 'pendingInvites', `${projectId}_${normalizedEmail.replace(/[.@]/g, '_')}`), {
          projectId,
          email: normalizedEmail,
          role,
          createdAt: serverTimestamp()
        });
      } catch (globalErr) {
        console.log('Could not store global pending invite (optional):', globalErr.message);
      }
      
      return { 
        email: normalizedEmail, 
        displayName: normalizedEmail.split('@')[0],
        pending: true,
        message: 'Invitation sent. User will be added when they sign in.'
      };
    } catch (err) {
      console.error('Failed to create pending invite:', err);
      throw new Error(`Could not invite ${email}: ${err.message}`);
    }
  },
  
  // Check and process pending invites for a user (called on login)
  processPendingInvites: async (userId, userEmail) => {
    if (!userEmail) return [];
    const normalizedEmail = userEmail.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/[.@]/g, '_');
    const processed = [];
    
    // Strategy 1: Check global pendingInvites collection
    try {
      const q = query(
        collection(db, 'pendingInvites'), 
        where('email', '==', normalizedEmail)
      );
      const snapshot = await getDocs(q);
      
      for (const inviteDoc of snapshot.docs) {
        const invite = inviteDoc.data();
        try {
          await updateDoc(doc(db, 'projects', invite.projectId), {
            [`members.${userId}`]: { role: invite.role, joinedAt: serverTimestamp(), email: normalizedEmail },
            memberIds: arrayUnion(userId),
            [`pendingInvites.${emailKey}`]: deleteField(),
            updatedAt: serverTimestamp()
          });
          await deleteDoc(inviteDoc.ref);
          processed.push({ projectId: invite.projectId, role: invite.role });
        } catch (err) {
          console.error('Failed to process invite for project:', invite.projectId, err);
        }
      }
    } catch (err) {
      console.log('Could not query global pending invites:', err.message);
    }
    
    // Strategy 2: Check all user's accessible projects for embedded pending invites
    // This catches invites that couldn't be stored in the global collection
    try {
      const projectsQuery = query(collection(db, 'projects'));
      const projectsSnap = await getDocs(projectsQuery);
      
      for (const projectDoc of projectsSnap.docs) {
        const project = projectDoc.data();
        const pendingInvite = project.pendingInvites?.[emailKey];
        
        if (pendingInvite && pendingInvite.email === normalizedEmail) {
          // Don't process if already processed above
          if (processed.some(p => p.projectId === projectDoc.id)) continue;
          
          try {
            await updateDoc(doc(db, 'projects', projectDoc.id), {
              [`members.${userId}`]: { role: pendingInvite.role, joinedAt: serverTimestamp(), email: normalizedEmail },
              memberIds: arrayUnion(userId),
              [`pendingInvites.${emailKey}`]: deleteField(),
              updatedAt: serverTimestamp()
            });
            processed.push({ projectId: projectDoc.id, role: pendingInvite.role });
          } catch (err) {
            console.error('Failed to process embedded invite:', err);
          }
        }
      }
    } catch (err) {
      console.log('Could not scan projects for pending invites:', err.message);
    }
    
    return processed;
  },
  
  // Get pending invites for a project (from the project document itself)
  getPendingInvites: async (projectId) => {
    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) return [];
      
      const project = projectSnap.data();
      const pendingInvites = project.pendingInvites || {};
      
      return Object.values(pendingInvites).map(invite => ({
        id: invite.inviteId || invite.email,
        ...invite
      }));
    } catch (err) {
      console.error('Failed to get pending invites:', err);
      return [];
    }
  },
  
  // Cancel a pending invite
  cancelPendingInvite: async (projectId, email) => {
    const normalizedEmail = email.toLowerCase().trim();
    const emailKey = normalizedEmail.replace(/[.@]/g, '_');
    
    // Remove from project document
    await updateDoc(doc(db, 'projects', projectId), {
      [`pendingInvites.${emailKey}`]: deleteField(),
      updatedAt: serverTimestamp()
    });
    
    // Try to remove from global collection too
    try {
      await deleteDoc(doc(db, 'pendingInvites', `${projectId}_${emailKey}`));
    } catch (err) {
      console.log('Could not delete global pending invite:', err.message);
    }
  },
  
  removeMember: async (projectId, userId) => {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    const project = projectSnap.data();
    const newMembers = { ...project.members };
    delete newMembers[userId];
    await updateDoc(projectRef, {
      members: newMembers,
      memberIds: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });
  },
  
  updateMemberRole: async (projectId, userId, role) => {
    await updateDoc(doc(db, 'projects', projectId), {
      [`members.${userId}.role`]: role,
      updatedAt: serverTimestamp()
    });
  },
  
  getMembers: async (projectId) => {
    const project = await projectService.get(projectId);
    if (!project) return [];
    const members = [];
    for (const [uid, data] of Object.entries(project.members || {})) {
      const profile = await authService.getUserProfile(uid);
      if (profile) members.push({ ...profile, role: data.role, joinedAt: data.joinedAt });
    }
    return members;
  }
};

// ============================================================================
// ENTITY FUNCTIONS
// ============================================================================

export const entityService = {
  create: async (projectId, type, name, data = {}, userId) => {
    const entityRef = await addDoc(collection(db, 'projects', projectId, 'entities'), {
      type, name, status: 'draft', tags: [],
      createdBy: userId, createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(), updatedBy: userId, version: 1,
      ...data
    });
    await activityService.log(projectId, userId, 'create', 'entity', entityRef.id, { name, type });
    return entityRef.id;
  },
  
  getAll: async (projectId) => {
    const snapshot = await getDocs(query(collection(db, 'projects', projectId, 'entities'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  getByType: async (projectId, type) => {
    const q = query(collection(db, 'projects', projectId, 'entities'), where('type', '==', type), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  update: async (projectId, entityId, updates, userId) => {
    await updateDoc(doc(db, 'projects', projectId, 'entities', entityId), {
      ...updates, updatedAt: serverTimestamp(), updatedBy: userId, version: increment(1)
    });
    await activityService.log(projectId, userId, 'update', 'entity', entityId, { fields: Object.keys(updates) });
  },
  
  delete: async (projectId, entityId, userId, entityData) => {
    await deleteDoc(doc(db, 'projects', projectId, 'entities', entityId));
    const relQuery = query(collection(db, 'projects', projectId, 'relationships'), where('sourceId', '==', entityId));
    const relQuery2 = query(collection(db, 'projects', projectId, 'relationships'), where('targetId', '==', entityId));
    const [snap1, snap2] = await Promise.all([getDocs(relQuery), getDocs(relQuery2)]);
    const batch = writeBatch(db);
    snap1.docs.forEach(d => batch.delete(d.ref));
    snap2.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    await activityService.log(projectId, userId, 'delete', 'entity', entityId, { name: entityData?.name, type: entityData?.type });
  },
  
  subscribe: (projectId, callback) => {
    return onSnapshot(query(collection(db, 'projects', projectId, 'entities'), orderBy('createdAt', 'desc')), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },
  
  subscribeOne: (projectId, entityId, callback) => {
    return onSnapshot(doc(db, 'projects', projectId, 'entities', entityId), (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }
};

// ============================================================================
// RELATIONSHIP FUNCTIONS
// ============================================================================

export const relationshipService = {
  create: async (projectId, sourceId, targetId, type, description, userId) => {
    const relRef = await addDoc(collection(db, 'projects', projectId, 'relationships'), {
      sourceId, targetId, type, description, bidirectional: false,
      createdBy: userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    await activityService.log(projectId, userId, 'create', 'relationship', relRef.id, { sourceId, targetId, type });
    return relRef.id;
  },
  
  getAll: async (projectId) => {
    const snapshot = await getDocs(collection(db, 'projects', projectId, 'relationships'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  delete: async (projectId, relationshipId, userId) => {
    await deleteDoc(doc(db, 'projects', projectId, 'relationships', relationshipId));
    await activityService.log(projectId, userId, 'delete', 'relationship', relationshipId, {});
  },
  
  subscribe: (projectId, callback) => {
    return onSnapshot(collection(db, 'projects', projectId, 'relationships'), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }
};

// ============================================================================
// NARRATIVE FUNCTIONS
// ============================================================================

export const narrativeService = {
  get: async (projectId) => {
    try {
      console.log('narrativeService.get called for project:', projectId);
      const snap = await getDoc(doc(db, 'projects', projectId, 'narrative', 'series'));
      console.log('narrativeService.get - document exists:', snap.exists());
      if (!snap.exists()) return null;
      const series = { id: snap.id, ...snap.data() };
      const booksSnap = await getDocs(query(collection(db, 'projects', projectId, 'narrative', 'series', 'books'), orderBy('number')));
      series.books = await Promise.all(booksSnap.docs.map(async (bookDoc) => {
        const book = { id: bookDoc.id, ...bookDoc.data() };
        const chaptersSnap = await getDocs(query(collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookDoc.id, 'chapters'), orderBy('number')));
        book.chapters = await Promise.all(chaptersSnap.docs.map(async (chapterDoc) => {
          const chapter = { id: chapterDoc.id, ...chapterDoc.data() };
          const beatsSnap = await getDocs(query(collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookDoc.id, 'chapters', chapterDoc.id, 'beats'), orderBy('sequence')));
          chapter.beats = beatsSnap.docs.map(beatDoc => ({ id: beatDoc.id, ...beatDoc.data() }));
          return chapter;
        }));
        return book;
      }));
      console.log('narrativeService.get - returning series with', series.books?.length || 0, 'books');
      return series;
    } catch (err) {
      console.error('narrativeService.get error:', err);
      throw err;
    }
  },
  
  // Initialize narrative structure for a project (creates the series document if it doesn't exist)
  initialize: async (projectId, projectName, userId) => {
    try {
      console.log('narrativeService.initialize called:', { projectId, projectName, userId });
      const docRef = doc(db, 'projects', projectId, 'narrative', 'series');
      const snap = await getDoc(docRef);
      console.log('narrativeService.initialize - document exists:', snap.exists());
      
      if (snap.exists()) {
        console.log('narrativeService.initialize - returning existing');
        return narrativeService.get(projectId);
      }
      
      console.log('narrativeService.initialize - creating new series document');
      await setDoc(docRef, {
        title: projectName || 'Untitled Series',
        logline: '',
        themes: [],
        targetLength: 1,
        books: [],
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('narrativeService.initialize - document created successfully');
      
      return narrativeService.get(projectId);
    } catch (err) {
      console.error('narrativeService.initialize error:', err);
      throw err;
    }
  },
  
  // Get or initialize - ensures narrative always exists
  getOrInit: async (projectId, projectName, userId) => {
    try {
      console.log('narrativeService.getOrInit called:', { projectId, projectName, userId });
      const existing = await narrativeService.get(projectId);
      if (existing) {
        console.log('narrativeService.getOrInit - found existing narrative');
        return existing;
      }
      console.log('narrativeService.getOrInit - no existing narrative, initializing...');
      return await narrativeService.initialize(projectId, projectName, userId);
    } catch (err) {
      console.error('narrativeService.getOrInit error:', err);
      // Return a default empty narrative structure so UI doesn't break
      return {
        id: 'series',
        title: projectName || 'Untitled Series',
        logline: '',
        themes: [],
        targetLength: 1,
        books: []
      };
    }
  },
  
  updateSeries: async (projectId, updates, userId) => {
    await updateDoc(doc(db, 'projects', projectId, 'narrative', 'series'), { ...updates, updatedAt: serverTimestamp(), updatedBy: userId });
  },
  
  // Helper to touch series document - triggers subscription for all collaborators
  _touchSeries: async (projectId, userId) => {
    try {
      await updateDoc(doc(db, 'projects', projectId, 'narrative', 'series'), { 
        lastModified: serverTimestamp(), 
        lastModifiedBy: userId 
      });
    } catch (e) {
      // Ignore errors - this is just for real-time sync
      console.log('Touch series failed (non-critical):', e.message);
    }
  },
  
  addBook: async (projectId, data, userId) => {
    const bookRef = await addDoc(collection(db, 'projects', projectId, 'narrative', 'series', 'books'), {
      ...data, chapters: [], createdBy: userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    await narrativeService._touchSeries(projectId, userId);
    return bookRef.id;
  },
  
  updateBook: async (projectId, bookId, updates, userId) => {
    await updateDoc(doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId), { ...updates, updatedAt: serverTimestamp(), updatedBy: userId });
    await narrativeService._touchSeries(projectId, userId);
  },
  
  addChapter: async (projectId, bookId, data, userId) => {
    const chapterRef = await addDoc(collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters'), {
      ...data, beats: [], createdBy: userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    await narrativeService._touchSeries(projectId, userId);
    return chapterRef.id;
  },
  
  addBeat: async (projectId, bookId, chapterId, data, userId) => {
    const beatRef = await addDoc(collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats'), {
      ...data, createdBy: userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    await narrativeService._touchSeries(projectId, userId);
    return beatRef.id;
  },
  
  updateChapter: async (projectId, bookId, chapterId, updates, userId) => {
    await updateDoc(doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId), { 
      ...updates, updatedAt: serverTimestamp(), updatedBy: userId 
    });
    await narrativeService._touchSeries(projectId, userId);
  },
  
  updateBeat: async (projectId, bookId, chapterId, beatId, updates, userId) => {
    await updateDoc(doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId), { 
      ...updates, updatedAt: serverTimestamp(), updatedBy: userId 
    });
    await narrativeService._touchSeries(projectId, userId);
  },
  
  deleteBook: async (projectId, bookId, userId) => {
    // Delete all chapters and beats first
    const chaptersSnap = await getDocs(collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters'));
    for (const chapterDoc of chaptersSnap.docs) {
      const beatsSnap = await getDocs(collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterDoc.id, 'beats'));
      for (const beatDoc of beatsSnap.docs) {
        await deleteDoc(beatDoc.ref);
      }
      await deleteDoc(chapterDoc.ref);
    }
    await deleteDoc(doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId));
    await narrativeService._touchSeries(projectId, userId);
  },
  
  deleteChapter: async (projectId, bookId, chapterId, userId) => {
    // Delete all beats first
    const beatsSnap = await getDocs(collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats'));
    for (const beatDoc of beatsSnap.docs) {
      await deleteDoc(beatDoc.ref);
    }
    await deleteDoc(doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId));
    await activityService.log(projectId, userId, 'delete', 'chapter', chapterId, { bookId });
    await narrativeService._touchSeries(projectId, userId);
  },
  
  deleteBeat: async (projectId, bookId, chapterId, beatId, userId) => {
    await deleteDoc(doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId));
    await activityService.log(projectId, userId, 'delete', 'beat', beatId, { bookId, chapterId });
    await narrativeService._touchSeries(projectId, userId);
  },

  // ============================================================================
  // PAGES & PANELS (Atomic Level) - Stored within beats
  // ============================================================================
  
  // Save pages to a beat (pages include panel scripts)
  savePages: async (projectId, bookId, chapterId, beatId, pages, userId) => {
    const beatRef = doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId);
    await updateDoc(beatRef, { 
      pages: pages,
      pagesUpdatedAt: serverTimestamp(),
      pagesUpdatedBy: userId,
      updatedAt: serverTimestamp(), 
      updatedBy: userId 
    });
    await activityService.log(projectId, userId, 'update', 'pages', beatId, { 
      pageCount: pages.length,
      bookId, chapterId 
    });
    await narrativeService._touchSeries(projectId, userId);
  },
  
  // Save panels to a specific page within a beat
  savePanels: async (projectId, bookId, chapterId, beatId, pageNumber, panels, layoutNotes, userId) => {
    // First get current beat data
    const beatRef = doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId);
    const beatSnap = await getDoc(beatRef);
    if (!beatSnap.exists()) throw new Error('Beat not found');
    
    const beatData = beatSnap.data();
    const pages = beatData.pages || [];
    
    // Find and update the specific page
    const pageIndex = pages.findIndex(p => p.pageNumber === pageNumber);
    if (pageIndex === -1) throw new Error(`Page ${pageNumber} not found in beat`);
    
    pages[pageIndex] = {
      ...pages[pageIndex],
      panels: panels,
      layoutNotes: layoutNotes,
      panelsUpdatedAt: new Date().toISOString(),
      panelsUpdatedBy: userId
    };
    
    await updateDoc(beatRef, { 
      pages: pages,
      updatedAt: serverTimestamp(), 
      updatedBy: userId 
    });
    
    await activityService.log(projectId, userId, 'update', 'panels', beatId, { 
      pageNumber,
      panelCount: panels.length,
      bookId, chapterId 
    });
    await narrativeService._touchSeries(projectId, userId);
  },
  
  // Update a single page's metadata (not panels)
  updatePage: async (projectId, bookId, chapterId, beatId, pageNumber, pageUpdates, userId) => {
    const beatRef = doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId);
    const beatSnap = await getDoc(beatRef);
    if (!beatSnap.exists()) throw new Error('Beat not found');
    
    const beatData = beatSnap.data();
    const pages = beatData.pages || [];
    
    const pageIndex = pages.findIndex(p => p.pageNumber === pageNumber);
    if (pageIndex === -1) throw new Error(`Page ${pageNumber} not found in beat`);
    
    pages[pageIndex] = {
      ...pages[pageIndex],
      ...pageUpdates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };
    
    await updateDoc(beatRef, { 
      pages: pages,
      updatedAt: serverTimestamp(), 
      updatedBy: userId 
    });
  },
  
  // Update a single panel within a page
  updatePanel: async (projectId, bookId, chapterId, beatId, pageNumber, panelNumber, panelUpdates, userId) => {
    const beatRef = doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId);
    const beatSnap = await getDoc(beatRef);
    if (!beatSnap.exists()) throw new Error('Beat not found');
    
    const beatData = beatSnap.data();
    const pages = beatData.pages || [];
    
    const pageIndex = pages.findIndex(p => p.pageNumber === pageNumber);
    if (pageIndex === -1) throw new Error(`Page ${pageNumber} not found in beat`);
    
    const panels = pages[pageIndex].panels || [];
    const panelIndex = panels.findIndex(p => p.panelNumber === panelNumber);
    if (panelIndex === -1) throw new Error(`Panel ${panelNumber} not found on page ${pageNumber}`);
    
    panels[panelIndex] = {
      ...panels[panelIndex],
      ...panelUpdates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };
    
    pages[pageIndex].panels = panels;
    
    await updateDoc(beatRef, { 
      pages: pages,
      updatedAt: serverTimestamp(), 
      updatedBy: userId 
    });
  },
  
  // ============================================================================
  // REAL-TIME COLLABORATION SUBSCRIPTIONS
  // ============================================================================
  
  // Subscribe to full narrative (series + all books + chapters + beats with pages/panels)
  subscribe: (projectId, callback) => {
    return onSnapshot(doc(db, 'projects', projectId, 'narrative', 'series'), async () => {
      const narrative = await narrativeService.get(projectId);
      callback(narrative);
    });
  },
  
  // Subscribe to a specific book's changes
  subscribeToBook: (projectId, bookId, callback) => {
    return onSnapshot(doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId), async (snap) => {
      if (snap.exists()) {
        const book = { id: snap.id, ...snap.data() };
        // Also fetch chapters
        const chaptersSnap = await getDocs(query(
          collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters'),
          orderBy('number')
        ));
        book.chapters = await Promise.all(chaptersSnap.docs.map(async (chapterDoc) => {
          const chapter = { id: chapterDoc.id, ...chapterDoc.data() };
          const beatsSnap = await getDocs(query(
            collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterDoc.id, 'beats'),
            orderBy('sequence')
          ));
          chapter.beats = beatsSnap.docs.map(beatDoc => ({ id: beatDoc.id, ...beatDoc.data() }));
          return chapter;
        }));
        callback(book);
      } else {
        callback(null);
      }
    });
  },
  
  // Subscribe to a specific chapter's changes
  subscribeToChapter: (projectId, bookId, chapterId, callback) => {
    return onSnapshot(doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId), async (snap) => {
      if (snap.exists()) {
        const chapter = { id: snap.id, ...snap.data() };
        const beatsSnap = await getDocs(query(
          collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats'),
          orderBy('sequence')
        ));
        chapter.beats = beatsSnap.docs.map(beatDoc => ({ id: beatDoc.id, ...beatDoc.data() }));
        callback(chapter);
      } else {
        callback(null);
      }
    });
  },
  
  // Subscribe to a specific beat's changes (includes pages and panels)
  subscribeToBeat: (projectId, bookId, chapterId, beatId, callback) => {
    return onSnapshot(
      doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId),
      (snap) => {
        if (snap.exists()) {
          callback({ id: snap.id, ...snap.data() });
        } else {
          callback(null);
        }
      }
    );
  },
  
  // ============================================================================
  // COLLABORATIVE EDITING SUPPORT
  // ============================================================================
  
  // Lock a beat for editing (prevents conflicts)
  lockBeat: async (projectId, bookId, chapterId, beatId, userId, userName) => {
    const beatRef = doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId);
    const beatSnap = await getDoc(beatRef);
    
    if (beatSnap.exists()) {
      const beat = beatSnap.data();
      // Check if already locked by someone else
      if (beat.editLock && beat.editLock.userId !== userId) {
        const lockTime = beat.editLock.lockedAt?.toDate?.() || new Date(beat.editLock.lockedAt);
        const minutesLocked = (Date.now() - lockTime.getTime()) / 60000;
        // Auto-expire locks after 5 minutes
        if (minutesLocked < 5) {
          throw new Error(`This beat is being edited by ${beat.editLock.userName || 'another user'}`);
        }
      }
    }
    
    await updateDoc(beatRef, {
      editLock: {
        userId,
        userName,
        lockedAt: serverTimestamp()
      }
    });
    return true;
  },
  
  // Unlock a beat
  unlockBeat: async (projectId, bookId, chapterId, beatId, userId) => {
    const beatRef = doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId);
    const beatSnap = await getDoc(beatRef);
    
    if (beatSnap.exists()) {
      const beat = beatSnap.data();
      // Only the user who locked can unlock (or auto-expire)
      if (beat.editLock && beat.editLock.userId === userId) {
        await updateDoc(beatRef, { editLock: null });
      }
    }
  },
  
  // Get edit status for a beat
  getEditStatus: async (projectId, bookId, chapterId, beatId) => {
    const beatRef = doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beatId);
    const beatSnap = await getDoc(beatRef);
    
    if (beatSnap.exists()) {
      const beat = beatSnap.data();
      if (beat.editLock) {
        const lockTime = beat.editLock.lockedAt?.toDate?.() || new Date(beat.editLock.lockedAt);
        const minutesLocked = (Date.now() - lockTime.getTime()) / 60000;
        if (minutesLocked < 5) {
          return {
            isLocked: true,
            lockedBy: beat.editLock.userId,
            lockedByName: beat.editLock.userName,
            lockedAt: lockTime
          };
        }
      }
    }
    return { isLocked: false };
  },
  
  // ============================================================================
  // BATCH OPERATIONS FOR GENERATION
  // ============================================================================
  
  // Save multiple beats at once (for batch generation)
  saveBeatsForChapter: async (projectId, bookId, chapterId, beats, userId) => {
    const batch = writeBatch(db);
    
    for (const beat of beats) {
      if (beat.id) {
        // Update existing
        const beatRef = doc(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats', beat.id);
        const { id, ...beatData } = beat;
        batch.update(beatRef, { ...beatData, updatedAt: serverTimestamp(), updatedBy: userId });
      } else {
        // Create new
        const beatRef = doc(collection(db, 'projects', projectId, 'narrative', 'series', 'books', bookId, 'chapters', chapterId, 'beats'));
        batch.set(beatRef, { ...beat, createdBy: userId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
    }
    
    await batch.commit();
    await activityService.log(projectId, userId, 'batch_update', 'beats', chapterId, { beatCount: beats.length });
    await narrativeService._touchSeries(projectId, userId);
  },
  
  // Save multiple chapters at once (for batch generation)
  saveChaptersForBook: async (projectId, bookId, chapters, userId) => {
    for (const chapter of chapters) {
      if (chapter.id) {
        await narrativeService.updateChapter(projectId, bookId, chapter.id, chapter, userId);
      } else {
        const chapterId = await narrativeService.addChapter(projectId, bookId, chapter, userId);
        // If chapter has beats, save those too
        if (chapter.beats?.length) {
          await narrativeService.saveBeatsForChapter(projectId, bookId, chapterId, chapter.beats, userId);
        }
      }
    }
    await activityService.log(projectId, userId, 'batch_update', 'chapters', bookId, { chapterCount: chapters.length });
    // Note: Individual functions already touch series, but one final touch ensures sync
    await narrativeService._touchSeries(projectId, userId);
  },
  
  // Save multiple books at once (for batch generation)
  saveBooksForSeries: async (projectId, books, userId) => {
    for (const book of books) {
      if (book.id) {
        await narrativeService.updateBook(projectId, book.id, book, userId);
      } else {
        const bookId = await narrativeService.addBook(projectId, book, userId);
        // If book has chapters, save those too
        if (book.chapters?.length) {
          await narrativeService.saveChaptersForBook(projectId, bookId, book.chapters, userId);
        }
      }
    }
    await activityService.log(projectId, userId, 'batch_update', 'books', projectId, { bookCount: books.length });
    // Note: Individual functions already touch series, but one final touch ensures sync
    await narrativeService._touchSeries(projectId, userId);
  }
};

// ============================================================================
// ACTIVITY FUNCTIONS
// ============================================================================

export const activityService = {
  log: async (projectId, userId, type, entityType, entityId, details = {}) => {
    await addDoc(collection(db, 'projects', projectId, 'activities'), {
      type, entityType, entityId, userId, details, timestamp: serverTimestamp()
    });
  },
  
  getRecent: async (projectId, limitCount = 50) => {
    const q = query(collection(db, 'projects', projectId, 'activities'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  subscribe: (projectId, callback, limitCount = 50) => {
    return onSnapshot(query(collection(db, 'projects', projectId, 'activities'), orderBy('timestamp', 'desc'), limit(limitCount)), (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }
};

// ============================================================================
// PRESENCE FUNCTIONS - Real-time Collaboration Awareness
// ============================================================================

export const presenceService = {
  setPresence: async (projectId, userId, userData) => {
    await setDoc(doc(db, 'projects', projectId, 'presence', userId), {
      ...userData, 
      online: true, 
      lastSeen: serverTimestamp(), 
      currentEntity: null, 
      currentPanel: 'entities',
      currentView: null,
      editingItem: null
    });
  },
  
  updateActivity: async (projectId, userId, activity) => {
    await updateDoc(doc(db, 'projects', projectId, 'presence', userId), { 
      ...activity, 
      lastSeen: serverTimestamp() 
    });
  },
  
  // Track what specific item a user is editing (for conflict prevention)
  setEditing: async (projectId, userId, itemType, itemPath) => {
    await updateDoc(doc(db, 'projects', projectId, 'presence', userId), {
      editingItem: itemType ? {
        type: itemType, // 'beat', 'chapter', 'book', 'entity', 'panel'
        path: itemPath, // e.g., 'book/1/chapter/3/beat/2' or 'entity/abc123'
        startedAt: serverTimestamp()
      } : null,
      lastSeen: serverTimestamp()
    });
  },
  
  // Track current view location for "follow" feature
  setCurrentView: async (projectId, userId, viewData) => {
    await updateDoc(doc(db, 'projects', projectId, 'presence', userId), {
      currentView: {
        panel: viewData.panel, // 'narrative', 'entities', etc.
        bookNumber: viewData.bookNumber,
        chapterNumber: viewData.chapterNumber,
        beatSequence: viewData.beatSequence,
        pageNumber: viewData.pageNumber,
        entityId: viewData.entityId
      },
      lastSeen: serverTimestamp()
    });
  },
  
  setOffline: async (projectId, userId) => {
    try {
      await updateDoc(doc(db, 'projects', projectId, 'presence', userId), { 
        online: false, 
        lastSeen: serverTimestamp(),
        editingItem: null 
      });
    } catch (e) { /* Ignore errors when going offline */ }
  },
  
  subscribe: (projectId, callback) => {
    return onSnapshot(collection(db, 'projects', projectId, 'presence'), (snapshot) => {
      const presence = {};
      snapshot.docs.forEach(doc => { presence[doc.id] = { id: doc.id, ...doc.data() }; });
      callback(presence);
    });
  },
  
  // Get who is editing what (for conflict detection)
  getEditingStatus: async (projectId) => {
    const snapshot = await getDocs(collection(db, 'projects', projectId, 'presence'));
    const editing = {};
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.online && data.editingItem) {
        editing[data.editingItem.path] = {
          userId: docSnap.id,
          userName: data.displayName || data.email,
          startedAt: data.editingItem.startedAt
        };
      }
    });
    return editing;
  }
};

// ============================================================================
// COLLABORATION SERVICE - Sharing, Comments, Invitations
// ============================================================================

export const collaborationService = {
  // ===== PROJECT SHARING =====
  
  // Create a shareable invite link
  createInviteLink: async (projectId, createdBy, role = 'editor', expiresInDays = 7) => {
    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    
    // Store invite in project document (guaranteed to work for admins)
    await updateDoc(doc(db, 'projects', projectId), {
      [`inviteLinks.${inviteId}`]: {
        createdBy,
        role,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        used: false,
        usedBy: null
      },
      updatedAt: serverTimestamp()
    });
    
    return inviteId;
  },
  
  // Accept an invite
  acceptInvite: async (projectId, inviteId, userId) => {
    const projectSnap = await getDoc(doc(db, 'projects', projectId));
    if (!projectSnap.exists()) throw new Error('Project not found');
    
    const project = projectSnap.data();
    const invite = project.inviteLinks?.[inviteId];
    
    if (!invite) throw new Error('Invite not found');
    if (invite.used) throw new Error('Invite has already been used');
    if (new Date(invite.expiresAt) < new Date()) throw new Error('Invite has expired');
    
    // Add user to project and mark invite as used
    await updateDoc(doc(db, 'projects', projectId), {
      [`members.${userId}`]: { role: invite.role, joinedAt: serverTimestamp(), invitedBy: invite.createdBy },
      memberIds: arrayUnion(userId),
      [`inviteLinks.${inviteId}.used`]: true,
      [`inviteLinks.${inviteId}.usedBy`]: userId,
      [`inviteLinks.${inviteId}.usedAt`]: new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
    
    return invite.role;
  },
  
  // Get active invites for a project (from project document)
  getActiveInvites: async (projectId) => {
    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) return [];
      
      const project = projectSnap.data();
      const inviteLinks = project.inviteLinks || {};
      const now = new Date();
      
      return Object.entries(inviteLinks)
        .filter(([_, invite]) => !invite.used && new Date(invite.expiresAt) > now)
        .map(([id, invite]) => ({ 
          id, 
          ...invite,
          expiresAt: { toDate: () => new Date(invite.expiresAt) }
        }));
    } catch (err) {
      console.log('Could not fetch active invites:', err.message);
      return [];
    }
  },
  
  // Revoke an invite
  revokeInvite: async (projectId, inviteId) => {
    await updateDoc(doc(db, 'projects', projectId), {
      [`inviteLinks.${inviteId}`]: deleteField(),
      updatedAt: serverTimestamp()
    });
  },
  
  // ===== COMMENTS & ANNOTATIONS =====
  
  // Add a comment to any item (entity, beat, page, panel)
  addComment: async (projectId, userId, userName, itemType, itemPath, text, parentCommentId = null) => {
    const commentRef = await addDoc(collection(db, 'projects', projectId, 'comments'), {
      itemType,
      itemPath,
      text,
      userId,
      userName,
      parentCommentId,
      resolved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await activityService.log(projectId, userId, 'comment', itemType, itemPath, { commentId: commentRef.id });
    return commentRef.id;
  },
  
  // Get comments for an item
  getComments: async (projectId, itemPath) => {
    const q = query(
      collection(db, 'projects', projectId, 'comments'),
      where('itemPath', '==', itemPath),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  // Get all comments for a project (for comment panel)
  getAllComments: async (projectId, unresolvedOnly = false) => {
    let q = query(
      collection(db, 'projects', projectId, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    if (unresolvedOnly) {
      q = query(
        collection(db, 'projects', projectId, 'comments'),
        where('resolved', '==', false),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  // Resolve a comment
  resolveComment: async (projectId, commentId, resolvedBy) => {
    await updateDoc(doc(db, 'projects', projectId, 'comments', commentId), {
      resolved: true,
      resolvedBy,
      resolvedAt: serverTimestamp()
    });
  },
  
  // Delete a comment
  deleteComment: async (projectId, commentId, userId) => {
    // Only allow deleting own comments
    const commentSnap = await getDoc(doc(db, 'projects', projectId, 'comments', commentId));
    if (commentSnap.exists() && commentSnap.data().userId === userId) {
      await deleteDoc(doc(db, 'projects', projectId, 'comments', commentId));
    }
  },
  
  // Subscribe to comments for real-time updates
  subscribeToComments: (projectId, itemPath, callback) => {
    const q = query(
      collection(db, 'projects', projectId, 'comments'),
      where('itemPath', '==', itemPath),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  },
  
  // ===== VERSION HISTORY =====
  
  // Save a version snapshot of narrative content
  saveVersion: async (projectId, userId, versionName, description = '') => {
    const narrative = await narrativeService.get(projectId);
    const entities = await entityService.getAll(projectId);
    
    const versionRef = await addDoc(collection(db, 'projects', projectId, 'versions'), {
      name: versionName,
      description,
      createdBy: userId,
      createdAt: serverTimestamp(),
      snapshot: {
        narrative,
        entities,
        // Store a compressed summary of content
        stats: {
          bookCount: narrative?.books?.length || 0,
          totalChapters: narrative?.books?.reduce((sum, b) => sum + (b.chapters?.length || 0), 0) || 0,
          totalBeats: narrative?.books?.reduce((sum, b) => 
            b.chapters?.reduce((cSum, c) => cSum + (c.beats?.length || 0), 0) || 0, 0) || 0,
          totalPanels: narrative?.books?.reduce((sum, b) => 
            b.chapters?.reduce((cSum, c) => 
              c.beats?.reduce((bSum, bt) => 
                bt.pages?.reduce((pSum, p) => pSum + (p.panels?.length || 0), 0) || 0, 0) || 0, 0) || 0, 0) || 0,
          entityCount: entities?.length || 0
        }
      }
    });
    
    await activityService.log(projectId, userId, 'version_save', 'project', projectId, { 
      versionId: versionRef.id, 
      versionName 
    });
    
    return versionRef.id;
  },
  
  // Get version history
  getVersions: async (projectId) => {
    const q = query(
      collection(db, 'projects', projectId, 'versions'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Return metadata without full snapshot for listing
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
        stats: data.snapshot?.stats
      };
    });
  },
  
  // Get a specific version's full data
  getVersion: async (projectId, versionId) => {
    const snap = await getDoc(doc(db, 'projects', projectId, 'versions', versionId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  
  // Restore from a version
  restoreVersion: async (projectId, versionId, userId) => {
    const version = await collaborationService.getVersion(projectId, versionId);
    if (!version) throw new Error('Version not found');
    
    // Save current state as a backup version first
    await collaborationService.saveVersion(projectId, userId, `Backup before restore`, `Auto-saved before restoring to "${version.name}"`);
    
    // Restore narrative
    if (version.snapshot.narrative) {
      await narrativeService.updateSeries(projectId, {
        title: version.snapshot.narrative.title,
        logline: version.snapshot.narrative.logline,
        themes: version.snapshot.narrative.themes,
        targetLength: version.snapshot.narrative.targetLength
      }, userId);
      
      // Note: Full restoration of books/chapters/beats would require more complex logic
      // This is a simplified version that restores series-level data
    }
    
    await activityService.log(projectId, userId, 'version_restore', 'project', projectId, { 
      versionId, 
      versionName: version.name 
    });
    
    return true;
  },
  
  // ===== NOTIFICATIONS =====
  
  // Create a notification for a user
  notifyUser: async (userId, notification) => {
    await addDoc(collection(db, 'users', userId, 'notifications'), {
      ...notification,
      read: false,
      createdAt: serverTimestamp()
    });
  },
  
  // Get user's notifications
  getUserNotifications: async (userId, unreadOnly = false) => {
    let q = query(
      collection(db, 'users', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    if (unreadOnly) {
      q = query(
        collection(db, 'users', userId, 'notifications'),
        where('read', '==', false),
        orderBy('createdAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  // Mark notification as read
  markNotificationRead: async (userId, notificationId) => {
    await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
  },
  
  // Subscribe to notifications
  subscribeToNotifications: (userId, callback) => {
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }
};

// ============================================================================
// PROJECT API SETTINGS SERVICE - Shared API keys for project members
// ============================================================================

export const projectApiService = {
  // Get project API settings (from project document)
  get: async (projectId) => {
    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) return null;
      return projectSnap.data().apiSettings || null;
    } catch (err) {
      console.error('Failed to get project API settings:', err);
      return null;
    }
  },
  
  // Save project API settings (stored in project document)
  save: async (projectId, settings, userId) => {
    await updateDoc(doc(db, 'projects', projectId), {
      apiSettings: {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: userId
      },
      updatedAt: serverTimestamp()
    });
  },
  
  // Clear project API settings
  clear: async (projectId) => {
    await updateDoc(doc(db, 'projects', projectId), {
      apiSettings: deleteField(),
      updatedAt: serverTimestamp()
    });
  },
  
  // Check if project has shared API settings
  hasSharedSettings: async (projectId) => {
    try {
      const projectSnap = await getDoc(doc(db, 'projects', projectId));
      if (!projectSnap.exists()) return false;
      const settings = projectSnap.data().apiSettings;
      if (!settings) return false;
      return !!(settings.claudeKey || settings.openaiKey || settings.customEndpoint);
    } catch (err) {
      return false;
    }
  },
  
  // Subscribe to project API settings changes (via project document)
  subscribe: (projectId, callback) => {
    return onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) {
        callback(snap.data().apiSettings || null);
      } else {
        callback(null);
      }
    });
  }
};

// ============================================================================
// IMPORT/EXPORT FUNCTIONS
// ============================================================================

export const importExportService = {
  exportProject: async (projectId) => {
    const project = await projectService.get(projectId);
    const entities = await entityService.getAll(projectId);
    const relationships = await relationshipService.getAll(projectId);
    const narrative = await narrativeService.get(projectId);
    
    // Activities might fail due to permissions - make it optional
    let activities = [];
    try {
      activities = await activityService.getRecent(projectId, 100);
    } catch (err) {
      console.warn('Could not fetch activities for export:', err.message);
    }
    
    return {
      version: '3.0', // v3.0 includes full pages and panel scripts
      exportedAt: new Date().toISOString(),
      project: { name: project.name, description: project.description, settings: project.settings },
      entities, relationships, narrative, activities
    };
  },
  
  downloadJSON: async (projectId, projectName) => {
    const data = await importExportService.exportProject(projectId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-world-bible.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  downloadMarkdown: async (projectId, projectName) => {
    const data = await importExportService.exportProject(projectId);
    let md = `# ${data.project.name}\n\n${data.project.description || ''}\n\n`;
    md += `**Genre:** ${data.project.settings?.genre || 'Not specified'}\n`;
    md += `**Audience:** ${data.project.settings?.targetAudience || 'Not specified'}\n`;
    md += `**Format:** ${data.project.settings?.format || 'Not specified'}\n`;
    md += `**Tone:** ${data.project.settings?.tone || 'Not specified'}\n\n---\n\n`;
    
    const entityTypes = ['world_rule', 'character', 'creature', 'location', 'faction', 'artifact', 'event', 'visual_note', 'motif', 'thread', 'component', 'feature', 'system'];
    const typeLabels = { world_rule: 'World Rules', character: 'Characters', creature: 'Creatures', location: 'Locations', faction: 'Factions', artifact: 'Artifacts', event: 'Events', visual_note: 'Visual Notes', motif: 'Motifs', thread: 'Story Threads', component: 'Components', feature: 'Features', system: 'Systems' };
    
    for (const type of entityTypes) {
      const typeEntities = data.entities.filter(e => e.type === type);
      if (typeEntities.length > 0) {
        md += `## ${typeLabels[type]}\n\n`;
        for (const entity of typeEntities) {
          md += `### ${entity.name}\n\n`;
          md += `**Status:** ${entity.status}\n\n`;
          if (entity.description) md += `${entity.description}\n\n`;
          
          // Character-specific fields
          if (type === 'character') {
            if (entity.role) md += `**Role:** ${entity.role}\n`;
            if (entity.physicalDescription) md += `**Physical:** ${entity.physicalDescription}\n`;
            if (entity.personality) md += `**Personality:** ${entity.personality}\n`;
            if (entity.motivations) md += `**Motivations:** ${entity.motivations}\n`;
            if (entity.flaws) md += `**Flaws:** ${entity.flaws}\n`;
            if (entity.speechPattern) md += `**Speech Pattern:** ${entity.speechPattern}\n`;
            if (entity.verbalTics) md += `**Verbal Tics:** ${entity.verbalTics}\n`;
            md += `\n`;
          }
          
          // Location-specific fields
          if (type === 'location') {
            if (entity.atmosphere) md += `**Atmosphere:** ${entity.atmosphere}\n`;
            if (entity.keyFeatures?.length) md += `**Key Features:** ${entity.keyFeatures.join(', ')}\n`;
            md += `\n`;
          }
          
          // Artifact-specific fields
          if (type === 'artifact') {
            if (entity.powers?.length) md += `**Powers:** ${entity.powers.join(', ')}\n`;
            if (entity.currentHolder) md += `**Current Holder:** ${entity.currentHolder}\n`;
            md += `\n`;
          }
          
          if (entity.tags?.length) md += `**Tags:** ${entity.tags.join(', ')}\n\n`;
        }
      }
    }
    
    // Full Narrative Structure with Pages and Panels
    if (data.narrative) {
      md += `## Narrative Structure\n\n### ${data.narrative.title || 'Untitled Series'}\n\n`;
      if (data.narrative.logline) md += `*${data.narrative.logline}*\n\n`;
      if (data.narrative.themes?.length) md += `**Themes:** ${data.narrative.themes.join(', ')}\n\n`;
      
      // Statistics
      const totalBooks = data.narrative.books?.length || 0;
      const totalChapters = (data.narrative.books || []).reduce((sum, b) => sum + (b.chapters?.length || 0), 0);
      const totalBeats = (data.narrative.books || []).reduce((sum, b) => 
        sum + (b.chapters?.reduce((csum, c) => csum + (c.beats?.length || 0), 0) || 0), 0);
      const totalPages = (data.narrative.books || []).reduce((sum, b) => 
        sum + (b.chapters?.reduce((csum, c) => 
          csum + (c.beats?.reduce((bsum, bt) => bsum + (bt.pages?.length || 0), 0) || 0), 0) || 0), 0);
      const totalPanels = (data.narrative.books || []).reduce((sum, b) => 
        sum + (b.chapters?.reduce((csum, c) => 
          csum + (c.beats?.reduce((bsum, bt) => 
            bsum + (bt.pages?.reduce((psum, p) => psum + (p.panels?.length || 0), 0) || 0), 0) || 0), 0) || 0), 0);
      
      md += `**Stats:** ${totalBooks} books, ${totalChapters} chapters, ${totalBeats} beats, ${totalPages} pages, ${totalPanels} panels\n\n`;
      
      for (const book of data.narrative.books || []) {
        md += `#### Book ${book.number}: ${book.title || 'Untitled'}\n\n`;
        if (book.logline) md += `*${book.logline}*\n\n`;
        if (book.themes?.length) md += `**Themes:** ${book.themes.join(', ')}\n`;
        md += `**Status:** ${book.status || 'planned'} | **Pages:** ${book.estimatedPages || '?'}\n\n`;
        
        for (const chapter of book.chapters || []) {
          md += `##### Chapter ${chapter.number}: ${chapter.title || 'Untitled'}\n\n`;
          if (chapter.pov) md += `**POV:** ${chapter.pov}\n`;
          if (chapter.emotionalArc) md += `**Arc:** ${chapter.emotionalArc}\n`;
          if (chapter.summary) md += `${chapter.summary}\n\n`;
          
          // Beats with pages
          for (const beat of chapter.beats || []) {
            md += `###### Beat ${beat.sequence}: ${beat.title || 'Untitled'} (${beat.beatType})\n\n`;
            if (beat.location) md += `**Location:** ${beat.location}\n`;
            if (beat.characters?.length) md += `**Characters:** ${beat.characters.join(', ')}\n`;
            if (beat.purpose) md += `**Purpose:** ${beat.purpose}\n`;
            if (beat.summary) md += `${beat.summary}\n`;
            md += `\n`;
            
            // Pages
            if (beat.pages?.length > 0) {
              for (const page of beat.pages) {
                md += `**Page ${page.pageNumber}:** ${page.visualFocus || 'No focus'}\n`;
                if (page.pacing) md += `- Pacing: ${page.pacing}\n`;
                if (page.emotionalBeat) md += `- Emotional: ${page.emotionalBeat}\n`;
                
                // Panels (summarized for world bible)
                if (page.panels?.length > 0) {
                  md += `- Panels: ${page.panels.length} [`;
                  md += page.panels.map(p => p.shot || p.size || '?').join(', ');
                  md += `]\n`;
                }
                md += `\n`;
              }
            }
          }
        }
      }
    }
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-world-bible.md`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  importProject: async (userId, jsonData) => {
    if (!jsonData.version || !jsonData.project) throw new Error('Invalid export file format');
    
    // Helper to remove undefined values from objects (Firestore doesn't accept undefined)
    const cleanObject = (obj) => {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = value;
        }
      }
      return cleaned;
    };
    
    const projectId = await projectService.create(userId, jsonData.project.name + ' (Imported)', jsonData.project.description);
    await projectService.update(projectId, { settings: jsonData.project.settings });
    
    const idMap = {};
    for (const entity of jsonData.entities || []) {
      const oldId = entity.id;
      const { id, createdAt, updatedAt, ...entityData } = entity;
      const newId = await entityService.create(projectId, entity.type, entity.name, cleanObject(entityData), userId);
      idMap[oldId] = newId;
    }
    
    for (const rel of jsonData.relationships || []) {
      const newSourceId = idMap[rel.sourceId] || rel.sourceId;
      const newTargetId = idMap[rel.targetId] || rel.targetId;
      await relationshipService.create(projectId, newSourceId, newTargetId, rel.type, rel.description, userId);
    }
    
    if (jsonData.narrative) {
      await narrativeService.updateSeries(projectId, cleanObject({
        title: jsonData.narrative.title, logline: jsonData.narrative.logline,
        themes: jsonData.narrative.themes, targetLength: jsonData.narrative.targetLength
      }), userId);
      
      for (const book of jsonData.narrative.books || []) {
        const bookId = await narrativeService.addBook(projectId, cleanObject({
          number: book.number, title: book.title, subtitle: book.subtitle, logline: book.logline,
          themes: book.themes, arc: book.arc, estimatedPages: book.estimatedPages, status: book.status
        }), userId);
        
        for (const chapter of book.chapters || []) {
          const chapterId = await narrativeService.addChapter(projectId, bookId, cleanObject({
            number: chapter.number, title: chapter.title, summary: chapter.summary,
            estimatedPages: chapter.estimatedPages, status: chapter.status, pov: chapter.pov,
            emotionalArc: chapter.emotionalArc
          }), userId);
          
          for (const beat of chapter.beats || []) {
            // Include pages and panels data for full script persistence
            await narrativeService.addBeat(projectId, bookId, chapterId, cleanObject({
              sequence: beat.sequence, 
              title: beat.title, 
              summary: beat.summary,
              beatType: beat.beatType, 
              purpose: beat.purpose, 
              estimatedPages: beat.estimatedPages,
              characters: beat.characters,
              location: beat.location,
              emotionalNote: beat.emotionalNote,
              dialogueNotes: beat.dialogueNotes,
              visualDirection: beat.visualDirection,
              // CRITICAL: Include pages with full panel scripts
              pages: beat.pages ? beat.pages.map(page => cleanObject({
                pageNumber: page.pageNumber,
                visualFocus: page.visualFocus,
                panelCount: page.panelCount,
                dialogueNotes: page.dialogueNotes,
                visualDirection: page.visualDirection,
                pacing: page.pacing,
                layoutNotes: page.layoutNotes,
                charactersOnPage: page.charactersOnPage,
                emotionalBeat: page.emotionalBeat,
                // Include full panel scripts
                panels: page.panels ? page.panels.map(panel => cleanObject({
                  panelNumber: panel.panelNumber,
                  size: panel.size,
                  shot: panel.shot,
                  visualDescription: panel.visualDescription,
                  characters: panel.characters,
                  action: panel.action,
                  dialogue: panel.dialogue,
                  sfx: panel.sfx,
                  artNotes: panel.artNotes
                })) : []
              })) : []
            }), userId);
          }
        }
      }
    }
    
    return projectId;
  },
  
  // Export a beat sheet for a specific book with page/panel progress
  downloadBeatSheet: async (projectId, projectName, bookNumber) => {
    const data = await importExportService.exportProject(projectId);
    const book = data.narrative?.books?.find(b => b.number === bookNumber);
    if (!book) throw new Error(`Book ${bookNumber} not found`);
    
    let md = `# ${data.narrative?.title || 'Untitled Series'}\n`;
    md += `## Book ${book.number}: ${book.title || 'Untitled'} — Beat Sheet\n\n`;
    if (book.logline) md += `*${book.logline}*\n\n`;
    md += `**Estimated Pages:** ${book.estimatedPages || '?'}\n`;
    md += `**Status:** ${book.status || 'planned'}\n\n`;
    md += `---\n\n`;
    
    const totalBeats = (book.chapters || []).reduce((sum, ch) => sum + (ch.beats?.length || 0), 0);
    const totalPages = (book.chapters || []).reduce((sum, ch) => 
      sum + (ch.beats?.reduce((bsum, b) => bsum + (b.pages?.length || 0), 0) || 0), 0);
    const scriptedPages = (book.chapters || []).reduce((sum, ch) => 
      sum + (ch.beats?.reduce((bsum, b) => bsum + (b.pages?.filter(p => p.panels?.length > 0).length || 0), 0) || 0), 0);
    const totalPanels = (book.chapters || []).reduce((sum, ch) => 
      sum + (ch.beats?.reduce((bsum, b) => bsum + (b.pages?.reduce((psum, p) => psum + (p.panels?.length || 0), 0) || 0), 0) || 0), 0);
    
    md += `**Overview:** ${book.chapters?.length || 0} chapters, ${totalBeats} beats, ${totalPages} pages generated, ${scriptedPages} scripted\n`;
    md += `**Total Panels:** ${totalPanels}\n\n`;
    
    for (const chapter of book.chapters || []) {
      md += `### Chapter ${chapter.number}: ${chapter.title || 'Untitled'}\n\n`;
      if (chapter.summary) md += `*${chapter.summary}*\n\n`;
      if (chapter.pov) md += `**POV:** ${chapter.pov}\n`;
      if (chapter.emotionalArc) md += `**Arc:** ${chapter.emotionalArc}\n`;
      md += `**Pages:** ~${chapter.estimatedPages || '?'}\n\n`;
      
      if (chapter.beats?.length) {
        md += `| # | Beat | Type | Est. | Gen. | Script | Purpose |\n`;
        md += `|---|------|------|------|------|--------|--------|\n`;
        for (const beat of chapter.beats) {
          const purpose = (beat.purpose || beat.summary || '').substring(0, 40);
          const genPages = beat.pages?.length || 0;
          const scriptPages = beat.pages?.filter(p => p.panels?.length > 0).length || 0;
          md += `| ${beat.sequence} | ${beat.title || 'Untitled'} | ${beat.beatType || '-'} | ${beat.estimatedPages || '?'} | ${genPages} | ${scriptPages} | ${purpose}${purpose.length >= 40 ? '...' : ''} |\n`;
        }
        md += `\n`;
        
        // Detailed beat breakdown with pages
        md += `#### Beat Details\n\n`;
        for (const beat of chapter.beats) {
          md += `**Beat ${beat.sequence}: ${beat.title || 'Untitled'}** (${beat.beatType})\n`;
          if (beat.location) md += `- Location: ${beat.location}\n`;
          if (beat.characters?.length) md += `- Characters: ${beat.characters.join(', ')}\n`;
          if (beat.purpose) md += `- Purpose: ${beat.purpose}\n`;
          if (beat.summary) md += `- Summary: ${beat.summary}\n`;
          
          // Page details
          if (beat.pages?.length > 0) {
            md += `- Pages:\n`;
            for (const page of beat.pages) {
              const panelStatus = page.panels?.length > 0 ? `✓ ${page.panels.length} panels` : '○ no script';
              md += `  - Page ${page.pageNumber}: ${page.visualFocus || 'No focus'} [${panelStatus}]\n`;
            }
          }
          md += `\n`;
        }
      }
    }
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-book-${bookNumber}-beat-sheet.md`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  // Export a detailed chapter script with ALL atomic elements (pages, panels, dialogue)
  downloadChapterScript: async (projectId, projectName, bookNumber, chapterNumber) => {
    const data = await importExportService.exportProject(projectId);
    const book = data.narrative?.books?.find(b => b.number === bookNumber);
    if (!book) throw new Error(`Book ${bookNumber} not found`);
    const chapter = book.chapters?.find(c => c.number === chapterNumber);
    if (!chapter) throw new Error(`Chapter ${chapterNumber} not found`);
    
    // Get relevant entities for reference
    const characters = data.entities.filter(e => e.type === 'character');
    const locations = data.entities.filter(e => e.type === 'location');
    
    let md = `# ${data.narrative?.title || 'Untitled Series'}\n`;
    md += `## Book ${book.number}: ${book.title || 'Untitled'}\n`;
    md += `### Chapter ${chapter.number}: ${chapter.title || 'Untitled'}\n\n`;
    
    md += `---\n\n`;
    md += `**Summary:** ${chapter.summary || 'No summary'}\n\n`;
    if (chapter.pov) md += `**POV Character:** ${chapter.pov}\n\n`;
    if (chapter.emotionalArc) md += `**Emotional Arc:** ${chapter.emotionalArc}\n\n`;
    md += `**Estimated Pages:** ${chapter.estimatedPages || '?'}\n`;
    md += `**Status:** ${chapter.status || 'draft'}\n\n`;
    md += `---\n\n`;
    
    // Character Reference with full details
    const chapterCharacters = new Set();
    for (const beat of chapter.beats || []) {
      (beat.characters || []).forEach(c => chapterCharacters.add(c));
    }
    if (chapterCharacters.size > 0) {
      md += `## Characters in This Chapter\n\n`;
      for (const charName of chapterCharacters) {
        const char = characters.find(c => c.name === charName);
        if (char) {
          md += `### ${char.name} (${char.role || 'Unknown'})\n\n`;
          if (char.physicalDescription) md += `**Physical:** ${char.physicalDescription}\n\n`;
          if (char.personality) md += `**Personality:** ${char.personality}\n\n`;
          if (char.verbalTics) md += `**Verbal Tics:** ${char.verbalTics}\n\n`;
          if (char.speechPattern) md += `**Speech Pattern:** ${char.speechPattern}\n\n`;
        } else {
          md += `### ${charName}\n\n`;
        }
      }
      md += `---\n\n`;
    }
    
    // Location Reference
    const chapterLocations = new Set();
    for (const beat of chapter.beats || []) {
      if (beat.location) chapterLocations.add(beat.location);
    }
    if (chapterLocations.size > 0) {
      md += `## Locations in This Chapter\n\n`;
      for (const locName of chapterLocations) {
        const loc = locations.find(l => l.name === locName);
        if (loc) {
          md += `### ${loc.name}\n\n`;
          if (loc.description) md += `**Description:** ${loc.description}\n\n`;
          if (loc.atmosphere) md += `**Atmosphere:** ${loc.atmosphere}\n\n`;
          if (loc.keyFeatures?.length) md += `**Key Features:** ${loc.keyFeatures.join(', ')}\n\n`;
        } else {
          md += `### ${locName}\n\n`;
        }
      }
      md += `---\n\n`;
    }
    
    // Beat-by-Beat Breakdown with FULL PAGE and PANEL details
    md += `## Full Script\n\n`;
    
    let pageCounter = 1;
    
    for (const beat of chapter.beats || []) {
      md += `### Beat ${beat.sequence}: ${beat.title || 'Untitled'}\n\n`;
      md += `**Type:** ${beat.beatType || 'action'} | **Est. Pages:** ${beat.estimatedPages || '?'}\n\n`;
      
      if (beat.purpose) md += `**Purpose:** ${beat.purpose}\n\n`;
      if (beat.location) {
        const loc = locations.find(l => l.name === beat.location);
        md += `**Location:** ${beat.location}`;
        if (loc?.atmosphere) md += ` — *${loc.atmosphere}*`;
        md += `\n\n`;
      }
      if (beat.characters?.length) md += `**Characters:** ${beat.characters.join(', ')}\n\n`;
      
      if (beat.summary) {
        md += `**Summary:** ${beat.summary}\n\n`;
      }
      
      // PAGES with all atomic elements
      if (beat.pages?.length > 0) {
        for (const page of beat.pages) {
          md += `---\n\n`;
          md += `## PAGE ${pageCounter} (Beat ${beat.sequence}, Page ${page.pageNumber})\n\n`;
          
          // Page atomic elements
          if (page.visualFocus) md += `**Visual Focus:** ${page.visualFocus}\n\n`;
          if (page.emotionalBeat) md += `**Emotional Beat:** ${page.emotionalBeat}\n\n`;
          if (page.pacing) md += `**Pacing:** ${page.pacing}\n`;
          if (page.panelCount) md += `**Panel Count:** ${page.panelCount}\n`;
          if (page.charactersOnPage?.length) md += `**Characters:** ${page.charactersOnPage.join(', ')}\n`;
          md += `\n`;
          
          if (page.dialogueNotes) md += `**Dialogue Notes:** ${page.dialogueNotes}\n\n`;
          if (page.visualDirection) md += `**Visual Direction:** ${page.visualDirection}\n\n`;
          if (page.layoutNotes) md += `**Layout Notes:** ${page.layoutNotes}\n\n`;
          
          // PANELS with full atomic elements
          if (page.panels?.length > 0) {
            for (const panel of page.panels) {
              md += `### PANEL ${panel.panelNumber}`;
              if (panel.size || panel.shot) {
                md += ` (${[panel.size, panel.shot].filter(Boolean).join(', ')})`;
              }
              md += `\n\n`;
              
              // Visual description (for artist)
              if (panel.visualDescription) {
                md += `${panel.visualDescription}\n\n`;
              }
              
              // Action
              if (panel.action) {
                md += `**Action:** ${panel.action}\n\n`;
              }
              
              // Characters in panel
              if (panel.characters?.length) {
                md += `**Characters:** ${panel.characters.join(', ')}\n\n`;
              }
              
              // Dialogue with full formatting
              if (panel.dialogue?.length > 0) {
                for (const d of panel.dialogue) {
                  if (d.type === 'caption') {
                    md += `    CAPTION: ${d.text}\n`;
                  } else if (d.type === 'narration') {
                    md += `    NARRATION: ${d.text}\n`;
                  } else if (d.type === 'thought') {
                    md += `    ${d.speaker} (thought): ${d.text}\n`;
                  } else {
                    const direction = d.direction ? ` (${d.direction})` : '';
                    md += `    ${d.speaker}${direction}: ${d.text}\n`;
                  }
                }
                md += `\n`;
              }
              
              // Sound effects
              if (panel.sfx) {
                md += `    SFX: ${panel.sfx}\n\n`;
              }
              
              // Art notes
              if (panel.artNotes) {
                md += `    [Art Notes: ${panel.artNotes}]\n\n`;
              }
            }
          } else {
            // No panels yet, show page breakdown only
            md += `*[Panel scripts not yet generated]*\n\n`;
          }
          
          pageCounter++;
        }
      } else {
        // No pages yet
        md += `*[Page breakdown not yet generated]*\n\n`;
      }
      
      md += `\n`;
    }
    
    // Statistics
    md += `---\n\n## Statistics\n\n`;
    const totalBeats = chapter.beats?.length || 0;
    const totalPages = chapter.beats?.reduce((sum, b) => sum + (b.pages?.length || 0), 0) || 0;
    const totalPanels = chapter.beats?.reduce((sum, b) => 
      sum + (b.pages?.reduce((psum, p) => psum + (p.panels?.length || 0), 0) || 0), 0) || 0;
    const scriptedPages = chapter.beats?.reduce((sum, b) => 
      sum + (b.pages?.filter(p => p.panels?.length > 0).length || 0), 0) || 0;
    
    md += `- **Beats:** ${totalBeats}\n`;
    md += `- **Pages Generated:** ${totalPages}\n`;
    md += `- **Pages with Panel Scripts:** ${scriptedPages}\n`;
    md += `- **Total Panels:** ${totalPanels}\n`;
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-book-${bookNumber}-chapter-${chapterNumber}-full-script.md`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  // Export industry-standard comic script format (for letterers/artists)
  downloadComicScript: async (projectId, projectName, bookNumber, chapterNumber = null) => {
    const data = await importExportService.exportProject(projectId);
    const book = data.narrative?.books?.find(b => b.number === bookNumber);
    if (!book) throw new Error(`Book ${bookNumber} not found`);
    
    const chapters = chapterNumber 
      ? [book.chapters?.find(c => c.number === chapterNumber)]
      : book.chapters || [];
    
    let script = `${data.narrative?.title || 'UNTITLED SERIES'}\n`;
    script += `Book ${book.number}: ${book.title || 'UNTITLED'}\n`;
    script += `${'='.repeat(60)}\n\n`;
    
    let absolutePageNumber = 1;
    
    for (const chapter of chapters) {
      if (!chapter) continue;
      
      script += `\n${'='.repeat(60)}\n`;
      script += `CHAPTER ${chapter.number}: ${(chapter.title || 'UNTITLED').toUpperCase()}\n`;
      script += `${'='.repeat(60)}\n\n`;
      
      if (chapter.pov) script += `POV: ${chapter.pov}\n`;
      if (chapter.summary) script += `Summary: ${chapter.summary}\n`;
      script += `\n`;
      
      for (const beat of (chapter.beats || [])) {
        script += `--- ${beat.title || 'SCENE'} (${beat.beatType || 'action'}) ---\n`;
        if (beat.location) script += `LOCATION: ${beat.location}\n`;
        script += `\n`;
        
        for (const page of (beat.pages || [])) {
          script += `${'─'.repeat(40)}\n`;
          script += `PAGE ${absolutePageNumber}\n`;
          script += `${'─'.repeat(40)}\n\n`;
          
          if (page.layoutNotes) {
            script += `[LAYOUT: ${page.layoutNotes}]\n\n`;
          }
          
          if (page.panels?.length > 0) {
            for (const panel of page.panels) {
              script += `PANEL ${panel.panelNumber}`;
              if (panel.size) script += ` [${panel.size.toUpperCase()}]`;
              if (panel.shot) script += ` - ${panel.shot}`;
              script += `\n`;
              
              // Visual description
              if (panel.visualDescription) {
                script += `${panel.visualDescription}\n`;
              }
              
              // Action (if different from visual)
              if (panel.action && panel.action !== panel.visualDescription) {
                script += `ACTION: ${panel.action}\n`;
              }
              
              script += `\n`;
              
              // Dialogue
              if (panel.dialogue?.length > 0) {
                for (const d of panel.dialogue) {
                  if (d.type === 'caption') {
                    script += `  CAPTION:\n`;
                    script += `  "${d.text}"\n`;
                  } else if (d.type === 'narration') {
                    script += `  NARRATION:\n`;
                    script += `  "${d.text}"\n`;
                  } else if (d.type === 'thought') {
                    script += `  ${d.speaker.toUpperCase()} (THOUGHT):\n`;
                    script += `  "${d.text}"\n`;
                  } else {
                    const direction = d.direction ? ` (${d.direction})` : '';
                    script += `  ${d.speaker.toUpperCase()}${direction}:\n`;
                    script += `  "${d.text}"\n`;
                  }
                  script += `\n`;
                }
              }
              
              // SFX
              if (panel.sfx) {
                script += `  SFX: ${panel.sfx}\n\n`;
              }
              
              // Art notes
              if (panel.artNotes) {
                script += `  [ART NOTE: ${panel.artNotes}]\n\n`;
              }
            }
          } else {
            // Page without panels
            script += `[VISUAL FOCUS: ${page.visualFocus || 'Not specified'}]\n`;
            script += `[PANELS: ${page.panelCount || 5}]\n`;
            script += `[PACING: ${page.pacing || 'medium'}]\n`;
            if (page.dialogueNotes) script += `[DIALOGUE NOTES: ${page.dialogueNotes}]\n`;
            script += `\n`;
          }
          
          absolutePageNumber++;
        }
      }
    }
    
    script += `\n${'='.repeat(60)}\n`;
    script += `END OF SCRIPT\n`;
    script += `Total Pages: ${absolutePageNumber - 1}\n`;
    
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const chapterSuffix = chapterNumber ? `-chapter-${chapterNumber}` : '';
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-book-${bookNumber}${chapterSuffix}-comic-script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },
  
  // Export full series outline
  downloadSeriesOutline: async (projectId, projectName) => {
    const data = await importExportService.exportProject(projectId);
    const narrative = data.narrative;
    if (!narrative) throw new Error('No narrative data found');
    
    let md = `# ${narrative.title || 'Untitled Series'} — Series Outline\n\n`;
    if (narrative.logline) md += `*${narrative.logline}*\n\n`;
    if (narrative.themes?.length) md += `**Themes:** ${narrative.themes.join(', ')}\n\n`;
    
    const totalBooks = narrative.books?.length || 0;
    const totalChapters = (narrative.books || []).reduce((sum, b) => sum + (b.chapters?.length || 0), 0);
    const totalPages = (narrative.books || []).reduce((sum, b) => sum + (b.estimatedPages || 0), 0);
    
    md += `**Series Stats:** ${totalBooks} books, ${totalChapters} chapters, ~${totalPages} pages\n\n`;
    md += `---\n\n`;
    
    for (const book of narrative.books || []) {
      md += `## Book ${book.number}: ${book.title || 'Untitled'}\n\n`;
      md += `**Status:** ${book.status || 'planned'} | **Pages:** ~${book.estimatedPages || '?'}\n\n`;
      if (book.logline) md += `*${book.logline}*\n\n`;
      if (book.themes?.length) md += `**Themes:** ${book.themes.join(', ')}\n\n`;
      
      if (book.chapters?.length) {
        md += `### Chapters\n\n`;
        for (const chapter of book.chapters) {
          md += `**${chapter.number}. ${chapter.title || 'Untitled'}**`;
          if (chapter.pov) md += ` *(${chapter.pov} POV)*`;
          md += `\n`;
          if (chapter.summary) md += `${chapter.summary}\n`;
          md += `\n`;
        }
      }
      md += `---\n\n`;
    }
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-series-outline.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

export { db, auth };
