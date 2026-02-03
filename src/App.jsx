import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  authService,
  projectService,
  entityService,
  relationshipService,
  narrativeService,
  activityService,
  presenceService,
  collaborationService,
  importExportService,
  projectApiService
} from './firebase';
import {
  TEMPLATE_DATA,
  extractEntitiesFromContext,
  analyzeNarrativeContext,
  suggestRelationships,
  buildProjectFromExtraction
} from './seedData';
import {
  generationService,
  apiConfig,
  AI_PROVIDERS
} from './generationService';

// ============================================================================
// STORY FORGE v3.0 - Collaborative Narrative Architecture Platform
// Now with AI-Powered Generation
// ============================================================================

const ENTITY_TYPES = {
  CHARACTER: { id: 'character', label: 'Characters', icon: '👤', color: '#E6A855' },
  CREATURE: { id: 'creature', label: 'Creatures', icon: '🐉', color: '#8B5CF6' },
  LOCATION: { id: 'location', label: 'Locations', icon: '🏰', color: '#10B981' },
  FACTION: { id: 'faction', label: 'Factions', icon: '⚔️', color: '#EF4444' },
  ARTIFACT: { id: 'artifact', label: 'Artifacts', icon: '💎', color: '#06B6D4' },
  WORLD_RULE: { id: 'world_rule', label: 'World Rules', icon: '⚖️', color: '#F59E0B' },
  EVENT: { id: 'event', label: 'Events', icon: '📅', color: '#EC4899' },
  VISUAL_NOTE: { id: 'visual_note', label: 'Visual Notes', icon: '🎨', color: '#A855F7' },
  MOTIF: { id: 'motif', label: 'Motifs', icon: '🔮', color: '#F472B6' },
  THREAD: { id: 'thread', label: 'Story Threads', icon: '🧵', color: '#22D3EE' },
  COMPONENT: { id: 'component', label: 'Components', icon: '🧩', color: '#14B8A6' },
  FEATURE: { id: 'feature', label: 'Features', icon: '⚡', color: '#F97316' },
  SYSTEM: { id: 'system', label: 'Systems', icon: '⚙️', color: '#6366F1' },
};

const RELATIONSHIP_TYPES = ['ally', 'enemy', 'family', 'romantic', 'mentor', 'rival', 'employs', 'serves', 'fears', 'respects', 'owns', 'inhabits', 'created', 'destroyed', 'depends_on', 'enables', 'conflicts_with'];

const USER_ROLES = {
  OWNER: { id: 'owner', label: 'Owner', permissions: ['all'], isAdmin: true, description: 'Project creator - full control' },
  ADMIN: { id: 'admin', label: 'Admin', permissions: ['all'], isAdmin: true, description: 'Full control, can manage team' },
  EDITOR: { id: 'editor', label: 'Editor', permissions: ['read', 'write', 'comment', 'approve', 'generate'], description: 'Can edit and generate content' },
  WRITER: { id: 'writer', label: 'Writer', permissions: ['read', 'write', 'comment', 'generate'], description: 'Can write and generate content' },
  ARTIST: { id: 'artist', label: 'Artist', permissions: ['read', 'comment', 'upload_assets'], description: 'Can upload artwork' },
  COMMENTER: { id: 'commenter', label: 'Commenter', permissions: ['read', 'comment'], description: 'Can read and comment only' },
  VIEWER: { id: 'viewer', label: 'Viewer', permissions: ['read'], description: 'Read-only access' },
};

// Helper to check if a role has admin-level permissions
const hasAdminPermissions = (role) => {
  const roleConfig = USER_ROLES[role?.toUpperCase()];
  return roleConfig?.isAdmin || role === 'owner' || role === 'admin';
};

// Helper to check if a role has a specific permission
const hasPermission = (role, permission) => {
  const roleConfig = USER_ROLES[role?.toUpperCase()];
  if (!roleConfig) return false;
  return roleConfig.permissions.includes('all') || roleConfig.permissions.includes(permission);
};

// Helper to check if user can generate content
const canGenerate = (role) => {
  return hasPermission(role, 'generate');
};

// Helper to check if user can write/edit content
const canWrite = (role) => {
  return hasPermission(role, 'write');
};

const formatDate = (ts) => {
  if (!ts) return 'Unknown';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatRelativeTime = (ts) => {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const getEntityDefaults = (type) => {
  const defaults = {
    character: { 
      role: 'supporting', 
      physicalDescription: '', 
      personality: '', 
      backstory: '', 
      arc: { seriesArc: '', bookArcs: {} },
      skills: [],
      abilities: [],
      visualDesign: '',
      equipment: [],
      relationships_notes: ''
    },
    creature: { 
      classification: { class: '', threatLevel: 'moderate' }, 
      physiology: { appearance: '', size: '', anatomy: '' },
      behavior: '',
      weaknesses: [],
      habitat: ''
    },
    location: { locationType: 'region', description: '', atmosphere: '', keyFeatures: [] },
    faction: { factionType: 'organization', description: '', goals: [], methods: [], leadership: '' },
    artifact: { artifactType: 'object', description: '', origin: '', powers: [], limitations: [] },
    world_rule: { category: 'physics', statement: '', explanation: '', implications: [] },
    event: { eventType: 'historical', description: '', date: '', participants: [], consequences: '' },
    visual_note: { noteType: 'art_direction', subject: '', description: '', colorPalette: [], references: [] },
    motif: { symbol: '', meaning: '', appearances: [], significance: '' },
    thread: { threadType: 'mystery', question: '', clues: [], resolution: '', revealedIn: '' },
    component: { componentType: 'ui', description: '', purpose: '', technicalNotes: '' },
    feature: { featureType: 'core', description: '', userStory: '', priority: 'medium' },
    system: { systemType: 'subsystem', description: '', purpose: '', dataFlow: '' },
  };
  return defaults[type] || { description: '' };
};

// ============================================================================
// ICONS
// ============================================================================
const Icons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Settings: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Book: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Layers: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Network: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/></svg>,
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Link: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Clock: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Folder: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  UserPlus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
  Wand: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h0"/><path d="M17.8 6.2L19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2L11 5"/></svg>,
  Sparkles: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
  BookOpen: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  RefreshCw: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
};

// ============================================================================
// MODAL COMPONENT
// ============================================================================
function Modal({ title, children, onClose, wide }) {
  return (
    <div className="sf-modal-overlay" onClick={onClose}>
      <div className={`sf-modal ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header">
          <h2>{title}</h2>
          <button className="sf-modal-close" onClick={onClose}><Icons.X /></button>
        </div>
        <div className="sf-modal-content">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// AI SETTINGS MODAL - Personal and Project-Level API Keys
// ============================================================================
function AISettingsModal({ onClose, project, user, isAdmin }) {
  // Tab state: 'personal' or 'project'
  const [activeTab, setActiveTab] = useState('personal');
  
  // Personal settings state
  const [provider, setProvider] = useState(apiConfig.getProvider());
  const [claudeKey, setClaudeKey] = useState(localStorage.getItem('storyforge_claude_api_key') || '');
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('storyforge_openai_api_key') || '');
  const [customEndpoint, setCustomEndpoint] = useState(localStorage.getItem('storyforge_custom_endpoint') || '');
  const [customModel, setCustomModel] = useState(localStorage.getItem('storyforge_custom_model') || '');
  const [customKey, setCustomKey] = useState(localStorage.getItem('storyforge_custom_api_key') || '');
  
  // Project settings state
  const [projectProvider, setProjectProvider] = useState('claude');
  const [projectClaudeKey, setProjectClaudeKey] = useState('');
  const [projectOpenaiKey, setProjectOpenaiKey] = useState('');
  const [projectCustomEndpoint, setProjectCustomEndpoint] = useState('');
  const [projectCustomModel, setProjectCustomModel] = useState('');
  const [projectCustomKey, setProjectCustomKey] = useState('');
  const [projectSettingsEnabled, setProjectSettingsEnabled] = useState(false);
  const [loadingProject, setLoadingProject] = useState(true);
  
  const [testStatus, setTestStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load project settings on mount
  useEffect(() => {
    if (project?.id) {
      projectApiService.get(project.id).then(settings => {
        if (settings) {
          setProjectSettingsEnabled(true);
          setProjectProvider(settings.provider || 'claude');
          setProjectClaudeKey(settings.claudeKey || '');
          setProjectOpenaiKey(settings.openaiKey || '');
          setProjectCustomEndpoint(settings.customEndpoint || '');
          setProjectCustomModel(settings.customModel || '');
          setProjectCustomKey(settings.customKey || '');
        }
        setLoadingProject(false);
      }).catch(() => setLoadingProject(false));
    } else {
      setLoadingProject(false);
    }
  }, [project?.id]);

  const handleSavePersonal = () => {
    apiConfig.setProvider(provider);
    apiConfig.setApiKey('claude', claudeKey);
    apiConfig.setApiKey('openai', openaiKey);
    apiConfig.setApiKey('custom', customKey);
    apiConfig.setCustomConfig(customEndpoint, customModel);
    onClose();
  };
  
  const handleSaveProject = async () => {
    if (!project?.id || !user?.uid) return;
    setSaving(true);
    try {
      if (projectSettingsEnabled) {
        await projectApiService.save(project.id, {
          provider: projectProvider,
          claudeKey: projectClaudeKey,
          openaiKey: projectOpenaiKey,
          customEndpoint: projectCustomEndpoint,
          customModel: projectCustomModel,
          customKey: projectCustomKey
        }, user.uid);
        
        // Update the in-memory project settings
        apiConfig.setProjectSettings({
          provider: projectProvider,
          claudeKey: projectClaudeKey,
          openaiKey: projectOpenaiKey,
          customEndpoint: projectCustomEndpoint,
          customModel: projectCustomModel,
          customKey: projectCustomKey
        });
      } else {
        await projectApiService.clear(project.id);
        apiConfig.clearProjectSettings();
      }
      onClose();
    } catch (err) {
      setTestStatus({ success: false, message: 'Failed to save: ' + err.message });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestStatus(null);
    try {
      // Temporarily set config for test based on active tab
      if (activeTab === 'personal') {
        apiConfig.setProvider(provider);
        if (provider === 'claude') apiConfig.setApiKey('claude', claudeKey);
        else if (provider === 'openai') apiConfig.setApiKey('openai', openaiKey);
        else {
          apiConfig.setApiKey('custom', customKey);
          apiConfig.setCustomConfig(customEndpoint, customModel);
        }
      } else {
        // Test project settings
        const testProvider = projectProvider;
        apiConfig.setProjectSettings({
          provider: testProvider,
          claudeKey: projectClaudeKey,
          openaiKey: projectOpenaiKey,
          customEndpoint: projectCustomEndpoint,
          customModel: projectCustomModel,
          customKey: projectCustomKey
        });
      }
      
      await generationService.testConnection();
      setTestStatus({ success: true, message: 'Connection successful!' });
    } catch (err) {
      setTestStatus({ success: false, message: err.message });
    }
    setTesting(false);
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const currentSource = apiConfig.getConfigSource();

  return (
    <Modal title="AI Generation Settings" onClose={onClose} wide>
      <div className="sf-ai-settings">
        {/* Status indicator */}
        <div className={`sf-api-status sf-api-status-${currentSource}`}>
          <span className="sf-api-status-dot" />
          {apiConfig.isConfigured() ? (
            <>Currently using: <strong>{currentSource === 'project' ? 'Shared Project Key' : 'Your Personal Key'}</strong></>
          ) : (
            <>No API key configured</>
          )}
        </div>
        
        {/* Tabs */}
        <div className="sf-settings-tabs">
          <button 
            className={`sf-settings-tab ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            👤 Your Personal Keys
          </button>
          {project && (
            <button 
              className={`sf-settings-tab ${activeTab === 'project' ? 'active' : ''}`}
              onClick={() => setActiveTab('project')}
              disabled={!isAdmin && !projectSettingsEnabled}
            >
              👥 Shared Project Keys
              {projectSettingsEnabled && <span className="sf-tab-badge">Active</span>}
            </button>
          )}
        </div>
        
        {/* Personal Settings Tab */}
        {activeTab === 'personal' && (
          <div className="sf-settings-panel">
            <p className="sf-settings-description">
              Personal keys are stored in your browser and only accessible to you. 
              {projectSettingsEnabled && ' Note: Project keys take priority when available.'}
            </p>
            
            <div className="sf-form-group">
              <label>AI Provider</label>
              <select value={provider} onChange={e => setProvider(e.target.value)}>
                <option value="claude">Anthropic Claude</option>
                <option value="openai">OpenAI</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            {provider === 'claude' && (
              <div className="sf-form-group">
                <label>Claude API Key</label>
                <input
                  type="password"
                  value={claudeKey}
                  onChange={e => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-..."
                />
                <small>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></small>
              </div>
            )}

            {provider === 'openai' && (
              <div className="sf-form-group">
                <label>OpenAI API Key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                />
                <small>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></small>
              </div>
            )}

            {provider === 'custom' && (
              <>
                <div className="sf-form-group">
                  <label>Custom Endpoint URL</label>
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={e => setCustomEndpoint(e.target.value)}
                    placeholder="https://your-server.com/v1/chat/completions"
                  />
                </div>
                <div className="sf-form-group">
                  <label>Model Name</label>
                  <input
                    type="text"
                    value={customModel}
                    onChange={e => setCustomModel(e.target.value)}
                    placeholder="llama-3.1-70b"
                  />
                </div>
                <div className="sf-form-group">
                  <label>API Key (optional)</label>
                  <input
                    type="password"
                    value={customKey}
                    onChange={e => setCustomKey(e.target.value)}
                    placeholder="Bearer token if required"
                  />
                </div>
              </>
            )}

            {testStatus && activeTab === 'personal' && (
              <div className={`sf-test-status ${testStatus.success ? 'success' : 'error'}`}>
                {testStatus.success ? '✓' : '✗'} {testStatus.message}
              </div>
            )}

            <div className="sf-modal-actions">
              <button className="sf-btn" onClick={handleTest} disabled={testing}>
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button className="sf-btn" onClick={onClose}>Cancel</button>
              <button className="sf-btn sf-btn-primary" onClick={handleSavePersonal}>Save Personal Settings</button>
            </div>
          </div>
        )}
        
        {/* Project Settings Tab */}
        {activeTab === 'project' && project && (
          <div className="sf-settings-panel">
            {loadingProject ? (
              <div className="sf-loading">Loading project settings...</div>
            ) : !isAdmin ? (
              <div className="sf-settings-readonly">
                <p className="sf-settings-description">
                  This project has shared API keys configured by the admin. 
                  All team members can use AI generation without needing their own API keys.
                </p>
                {projectSettingsEnabled && (
                  <div className="sf-shared-key-info">
                    <h4>Shared Configuration</h4>
                    <p><strong>Provider:</strong> {projectProvider === 'claude' ? 'Anthropic Claude' : projectProvider === 'openai' ? 'OpenAI' : 'Custom'}</p>
                    <p><strong>Key:</strong> {maskKey(projectProvider === 'claude' ? projectClaudeKey : projectProvider === 'openai' ? projectOpenaiKey : projectCustomKey) || 'Configured'}</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <p className="sf-settings-description">
                  <strong>Admin:</strong> Configure shared API keys that all team members can use. 
                  Keys are stored securely in the project and team members don't need their own keys.
                </p>
                
                <div className="sf-form-group sf-form-group-checkbox">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={projectSettingsEnabled} 
                      onChange={e => setProjectSettingsEnabled(e.target.checked)} 
                    />
                    Enable shared API keys for this project
                  </label>
                  <small>When enabled, all team members can use AI generation with these keys.</small>
                </div>
                
                {projectSettingsEnabled && (
                  <>
                    <div className="sf-form-group">
                      <label>AI Provider</label>
                      <select value={projectProvider} onChange={e => setProjectProvider(e.target.value)}>
                        <option value="claude">Anthropic Claude</option>
                        <option value="openai">OpenAI</option>
                        <option value="custom">Custom Endpoint</option>
                      </select>
                    </div>

                    {projectProvider === 'claude' && (
                      <div className="sf-form-group">
                        <label>Claude API Key (Shared)</label>
                        <input
                          type="password"
                          value={projectClaudeKey}
                          onChange={e => setProjectClaudeKey(e.target.value)}
                          placeholder="sk-ant-..."
                        />
                        <small>⚠️ This key will be accessible to all project members</small>
                      </div>
                    )}

                    {projectProvider === 'openai' && (
                      <div className="sf-form-group">
                        <label>OpenAI API Key (Shared)</label>
                        <input
                          type="password"
                          value={projectOpenaiKey}
                          onChange={e => setProjectOpenaiKey(e.target.value)}
                          placeholder="sk-..."
                        />
                        <small>⚠️ This key will be accessible to all project members</small>
                      </div>
                    )}

                    {projectProvider === 'custom' && (
                      <>
                        <div className="sf-form-group">
                          <label>Custom Endpoint URL</label>
                          <input
                            type="text"
                            value={projectCustomEndpoint}
                            onChange={e => setProjectCustomEndpoint(e.target.value)}
                            placeholder="https://your-server.com/v1/chat/completions"
                          />
                        </div>
                        <div className="sf-form-group">
                          <label>Model Name</label>
                          <input
                            type="text"
                            value={projectCustomModel}
                            onChange={e => setProjectCustomModel(e.target.value)}
                            placeholder="llama-3.1-70b"
                          />
                        </div>
                        <div className="sf-form-group">
                          <label>API Key (optional)</label>
                          <input
                            type="password"
                            value={projectCustomKey}
                            onChange={e => setProjectCustomKey(e.target.value)}
                            placeholder="Bearer token if required"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                {testStatus && activeTab === 'project' && (
                  <div className={`sf-test-status ${testStatus.success ? 'success' : 'error'}`}>
                    {testStatus.success ? '✓' : '✗'} {testStatus.message}
                  </div>
                )}

                <div className="sf-modal-actions">
                  {projectSettingsEnabled && (
                    <button className="sf-btn" onClick={handleTest} disabled={testing}>
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                  )}
                  <button className="sf-btn" onClick={onClose}>Cancel</button>
                  <button className="sf-btn sf-btn-primary" onClick={handleSaveProject} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Project Settings'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// GENERATION MODAL - For generating content at any level
// ============================================================================
function GenerationModal({ type, context, onClose, onApply }) {
  const [count, setCount] = useState(type === 'books' ? 12 : type === 'chapters' ? 10 : 5);
  const [guidance, setGuidance] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const typeLabels = {
    books: 'Book Outlines',
    chapters: 'Chapters',
    beats: 'Scene Beats',
    pages: 'Page Breakdown'
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setPreview(null);
    
    try {
      let result;
      switch (type) {
        case 'books':
          result = await generationService.generateBooks(
            context.project, context.entities, context.narrative, count, guidance
          );
          break;
        case 'chapters':
          result = await generationService.generateChapters(
            context.project, context.entities, context.narrative, context.bookNumber, count, guidance
          );
          break;
        case 'beats':
          result = await generationService.generateBeats(
            context.project, context.entities, context.narrative, 
            context.bookNumber, context.chapterNumber, count, guidance
          );
          break;
        case 'pages':
          result = await generationService.generatePages(
            context.project, context.entities, context.narrative,
            context.bookNumber, context.chapterNumber, context.beatSequence, guidance
          );
          break;
      }
      setPreview(result);
    } catch (err) {
      setError(err.message);
    }
    setGenerating(false);
  };

  const handleApply = () => {
    if (preview) {
      onApply(preview);
      onClose();
    }
  };

  return (
    <Modal title={`Generate ${typeLabels[type]}`} onClose={onClose} wide>
      <div className="sf-generation-modal">
        {!apiConfig.isConfigured() ? (
          <div className="sf-generation-unconfigured">
            <Icons.Settings />
            <h3>AI Not Configured</h3>
            <p>Please configure your AI provider in Settings to enable generation.</p>
            <small>Click the ⚙️ icon in the sidebar to add your API key.</small>
          </div>
        ) : (
          <>
            <div className="sf-generation-config">
              <div className="sf-form-group">
                <label>Number to Generate</label>
                <input
                  type="number"
                  min="1"
                  max={type === 'books' ? 20 : type === 'chapters' ? 15 : 10}
                  value={count}
                  onChange={e => setCount(parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div className="sf-form-group">
                <label>Additional Guidance (optional)</label>
                <textarea
                  value={guidance}
                  onChange={e => setGuidance(e.target.value)}
                  placeholder={`Any specific direction for the ${type}? E.g., "Focus on building tension" or "Include more action sequences"`}
                  rows={3}
                />
              </div>

              <div className="sf-generation-context">
                <h4>Context Being Used:</h4>
                <ul>
                  <li>✓ Series premise and settings</li>
                  <li>✓ {context.entities?.filter(e => e.type === 'character').length || 0} characters</li>
                  <li>✓ {context.entities?.filter(e => e.type === 'location').length || 0} locations</li>
                  <li>✓ {context.entities?.filter(e => e.type === 'world_rule').length || 0} world rules</li>
                  {type !== 'books' && <li>✓ Book {context.bookNumber} context</li>}
                  {(type === 'beats' || type === 'pages') && <li>✓ Chapter {context.chapterNumber} context</li>}
                </ul>
              </div>

              {!preview && (
                <button 
                  className="sf-btn sf-btn-primary sf-btn-generate"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <>Generating...</>
                  ) : (
                    <><Icons.Sparkles /> Generate {typeLabels[type]}</>
                  )}
                </button>
              )}
            </div>

            {error && (
              <div className="sf-generation-error">
                <strong>Error:</strong> {error}
              </div>
            )}

            {preview && (
              <div className="sf-generation-preview">
                <h4>Preview Generated {typeLabels[type]}:</h4>
                <div className="sf-preview-list">
                  {preview.map((item, idx) => (
                    <div key={idx} className="sf-preview-item">
                      <div className="sf-preview-header">
                        <strong>
                          {type === 'books' && `Book ${item.number}: ${item.title}`}
                          {type === 'chapters' && `Chapter ${item.number}: ${item.title}`}
                          {type === 'beats' && `Beat ${item.sequence}: ${item.title}`}
                          {type === 'pages' && `Page ${item.pageNumber}`}
                        </strong>
                        {item.estimatedPages && <span className="sf-preview-pages">{item.estimatedPages}pp</span>}
                        {item.beatType && <span className="sf-preview-type">{item.beatType}</span>}
                      </div>
                      <p>{item.logline || item.summary || item.visualFocus || item.purpose}</p>
                      {item.characters && <small>Characters: {item.characters.join(', ')}</small>}
                    </div>
                  ))}
                </div>

                <div className="sf-modal-actions">
                  <button className="sf-btn" onClick={() => setPreview(null)}>
                    Regenerate
                  </button>
                  <button className="sf-btn sf-btn-primary" onClick={handleApply}>
                    <Icons.Check /> Apply to Project
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// NAV ITEM COMPONENT
// ============================================================================
function NavItem({ icon, label, active, collapsed, onClick, badge }) {
  return (
    <button className={`sf-nav-item ${active ? 'active' : ''}`} onClick={onClick} title={collapsed ? label : undefined}>
      {icon}
      {!collapsed && <span>{label}</span>}
      {badge && <span className="sf-nav-badge">{badge}</span>}
    </button>
  );
}

// ============================================================================
// ONLINE INDICATOR
// ============================================================================
function OnlineIndicator({ presence }) {
  const online = Object.values(presence).filter(p => p.online);
  if (online.length === 0) return null;
  return (
    <div className="sf-online-indicator">
      <div className="sf-online-avatars">
        {online.slice(0, 5).map(u => (
          <div key={u.id} className="sf-online-avatar" style={{ background: u.color || '#666' }} title={`${u.displayName || 'User'} - ${u.currentPanel || 'browsing'}`}>
            {(u.displayName || '?')[0].toUpperCase()}
            <span className="sf-online-dot" />
          </div>
        ))}
        {online.length > 5 && <div className="sf-online-more">+{online.length - 5}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// ENTITY EDITOR
// ============================================================================
function EntityEditor({ entity, onUpdate, disabled }) {
  const [local, setLocal] = useState(entity);
  useEffect(() => { setLocal(entity); }, [entity]);
  
  const handleChange = (f, v) => setLocal(p => ({ ...p, [f]: v }));
  const handleBlur = (f) => { if (local[f] !== entity[f]) onUpdate({ [f]: local[f] }); };
  const handleNestedChange = (p, f, v) => setLocal(prev => ({ ...prev, [p]: { ...prev[p], [f]: v } }));
  const handleNestedBlur = (p) => { if (JSON.stringify(local[p]) !== JSON.stringify(entity[p])) onUpdate({ [p]: local[p] }); };

  const renderTypeFields = () => {
    switch (entity.type) {
      case 'character': return (<>
        <div className="sf-form-group"><label>Role</label><select value={local.role||'supporting'} onChange={e=>handleChange('role',e.target.value)} onBlur={()=>handleBlur('role')} disabled={disabled}><option value="protagonist">Protagonist</option><option value="antagonist">Antagonist</option><option value="deuteragonist">Deuteragonist</option><option value="supporting">Supporting</option><option value="minor">Minor</option></select></div>
        <div className="sf-form-group"><label>Physical Description</label><textarea value={local.physicalDescription||''} onChange={e=>handleChange('physicalDescription',e.target.value)} onBlur={()=>handleBlur('physicalDescription')} rows={3} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Personality</label><textarea value={local.personality||''} onChange={e=>handleChange('personality',e.target.value)} onBlur={()=>handleBlur('personality')} rows={3} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Backstory</label><textarea value={local.backstory||''} onChange={e=>handleChange('backstory',e.target.value)} onBlur={()=>handleBlur('backstory')} rows={4} disabled={disabled}/></div>
      </>);
      case 'creature': return (<>
        <div className="sf-form-row"><div className="sf-form-group"><label>Class</label><input type="text" value={local.classification?.class||''} onChange={e=>handleNestedChange('classification','class',e.target.value)} onBlur={()=>handleNestedBlur('classification')} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Threat Level</label><select value={local.classification?.threatLevel||'moderate'} onChange={e=>handleNestedChange('classification','threatLevel',e.target.value)} onBlur={()=>handleNestedBlur('classification')} disabled={disabled}><option value="minimal">Minimal</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="extreme">Extreme</option></select></div></div>
        <div className="sf-form-group"><label>Appearance</label><textarea value={local.physiology?.appearance||''} onChange={e=>handleNestedChange('physiology','appearance',e.target.value)} onBlur={()=>handleNestedBlur('physiology')} rows={3} disabled={disabled}/></div>
      </>);
      case 'location': return (<>
        <div className="sf-form-group"><label>Type</label><select value={local.locationType||'region'} onChange={e=>handleChange('locationType',e.target.value)} onBlur={()=>handleBlur('locationType')} disabled={disabled}><option value="region">Region</option><option value="city">City</option><option value="building">Building</option><option value="landmark">Landmark</option><option value="dimensional_space">Dimensional Space</option></select></div>
        <div className="sf-form-group"><label>Description</label><textarea value={local.description||''} onChange={e=>handleChange('description',e.target.value)} onBlur={()=>handleBlur('description')} rows={4} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Atmosphere</label><textarea value={local.atmosphere||''} onChange={e=>handleChange('atmosphere',e.target.value)} onBlur={()=>handleBlur('atmosphere')} rows={2} disabled={disabled}/></div>
      </>);
      case 'world_rule': return (<>
        <div className="sf-form-group"><label>Category</label><select value={local.category||'physics'} onChange={e=>handleChange('category',e.target.value)} onBlur={()=>handleBlur('category')} disabled={disabled}><option value="physics">Physics</option><option value="magic">Magic</option><option value="dimensional">Dimensional</option><option value="social">Social</option><option value="biological">Biological</option></select></div>
        <div className="sf-form-group"><label>Rule Statement</label><textarea value={local.statement||''} onChange={e=>handleChange('statement',e.target.value)} onBlur={()=>handleBlur('statement')} rows={2} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Explanation</label><textarea value={local.explanation||''} onChange={e=>handleChange('explanation',e.target.value)} onBlur={()=>handleBlur('explanation')} rows={4} disabled={disabled}/></div>
      </>);
      case 'faction': return (<>
        <div className="sf-form-group"><label>Type</label><select value={local.factionType||'organization'} onChange={e=>handleChange('factionType',e.target.value)} onBlur={()=>handleBlur('factionType')} disabled={disabled}><option value="organization">Organization</option><option value="government">Government</option><option value="military">Military</option><option value="religious">Religious</option><option value="criminal">Criminal</option></select></div>
        <div className="sf-form-group"><label>Description</label><textarea value={local.description||''} onChange={e=>handleChange('description',e.target.value)} onBlur={()=>handleBlur('description')} rows={4} disabled={disabled}/></div>
      </>);
      case 'artifact': return (<>
        <div className="sf-form-group"><label>Type</label><select value={local.artifactType||'object'} onChange={e=>handleChange('artifactType',e.target.value)} onBlur={()=>handleBlur('artifactType')} disabled={disabled}><option value="object">Object</option><option value="weapon">Weapon</option><option value="tool">Tool</option><option value="document">Document</option><option value="relic">Relic</option></select></div>
        <div className="sf-form-group"><label>Description</label><textarea value={local.description||''} onChange={e=>handleChange('description',e.target.value)} onBlur={()=>handleBlur('description')} rows={3} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Origin</label><textarea value={local.origin||''} onChange={e=>handleChange('origin',e.target.value)} onBlur={()=>handleBlur('origin')} rows={2} disabled={disabled}/></div>
      </>);
      case 'event': return (<>
        <div className="sf-form-group"><label>Type</label><select value={local.eventType||'historical'} onChange={e=>handleChange('eventType',e.target.value)} onBlur={()=>handleBlur('eventType')} disabled={disabled}><option value="historical">Historical</option><option value="plot">Plot</option><option value="backstory">Backstory</option><option value="future">Future</option></select></div>
        <div className="sf-form-group"><label>Date/Era</label><input type="text" value={local.date||''} onChange={e=>handleChange('date',e.target.value)} onBlur={()=>handleBlur('date')} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Description</label><textarea value={local.description||''} onChange={e=>handleChange('description',e.target.value)} onBlur={()=>handleBlur('description')} rows={4} disabled={disabled}/></div>
      </>);
      case 'component': return (<>
        <div className="sf-form-group"><label>Type</label><select value={local.componentType||'ui'} onChange={e=>handleChange('componentType',e.target.value)} onBlur={()=>handleBlur('componentType')} disabled={disabled}><option value="ui">UI Component</option><option value="layout">Layout</option><option value="form">Form</option><option value="display">Display</option></select></div>
        <div className="sf-form-group"><label>Purpose</label><textarea value={local.purpose||''} onChange={e=>handleChange('purpose',e.target.value)} onBlur={()=>handleBlur('purpose')} rows={2} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Description</label><textarea value={local.description||''} onChange={e=>handleChange('description',e.target.value)} onBlur={()=>handleBlur('description')} rows={3} disabled={disabled}/></div>
      </>);
      case 'feature': return (<>
        <div className="sf-form-row"><div className="sf-form-group"><label>Type</label><select value={local.featureType||'core'} onChange={e=>handleChange('featureType',e.target.value)} onBlur={()=>handleBlur('featureType')} disabled={disabled}><option value="core">Core</option><option value="enhancement">Enhancement</option><option value="integration">Integration</option></select></div>
        <div className="sf-form-group"><label>Priority</label><select value={local.priority||'medium'} onChange={e=>handleChange('priority',e.target.value)} onBlur={()=>handleBlur('priority')} disabled={disabled}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div></div>
        <div className="sf-form-group"><label>User Story</label><textarea value={local.userStory||''} onChange={e=>handleChange('userStory',e.target.value)} onBlur={()=>handleBlur('userStory')} rows={2} placeholder="As a [user], I want [feature] so that [benefit]" disabled={disabled}/></div>
        <div className="sf-form-group"><label>Description</label><textarea value={local.description||''} onChange={e=>handleChange('description',e.target.value)} onBlur={()=>handleBlur('description')} rows={3} disabled={disabled}/></div>
      </>);
      case 'system': return (<>
        <div className="sf-form-group"><label>Type</label><select value={local.systemType||'subsystem'} onChange={e=>handleChange('systemType',e.target.value)} onBlur={()=>handleBlur('systemType')} disabled={disabled}><option value="subsystem">Subsystem</option><option value="infrastructure">Infrastructure</option><option value="integration">Integration</option><option value="data">Data Layer</option></select></div>
        <div className="sf-form-group"><label>Purpose</label><textarea value={local.purpose||''} onChange={e=>handleChange('purpose',e.target.value)} onBlur={()=>handleBlur('purpose')} rows={2} disabled={disabled}/></div>
        <div className="sf-form-group"><label>Data Flow</label><textarea value={local.dataFlow||''} onChange={e=>handleChange('dataFlow',e.target.value)} onBlur={()=>handleBlur('dataFlow')} rows={2} placeholder="Input → Process → Output" disabled={disabled}/></div>
        <div className="sf-form-group"><label>Description</label><textarea value={local.description||''} onChange={e=>handleChange('description',e.target.value)} onBlur={()=>handleBlur('description')} rows={3} disabled={disabled}/></div>
      </>);
      default: return <div className="sf-form-group"><label>Description</label><textarea value={local.description||''} onChange={e=>handleChange('description',e.target.value)} onBlur={()=>handleBlur('description')} rows={6} disabled={disabled}/></div>;
    }
  };

  return (
    <div className="sf-entity-editor">
      <div className="sf-form-group"><label>Name</label><input type="text" value={local.name||''} onChange={e=>handleChange('name',e.target.value)} onBlur={()=>handleBlur('name')} disabled={disabled}/></div>
      <div className="sf-form-group"><label>Status</label><select value={local.status||'draft'} onChange={e=>handleChange('status',e.target.value)} onBlur={()=>handleBlur('status')} disabled={disabled}><option value="draft">Draft</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="approved">Approved</option></select></div>
      {renderTypeFields()}
      <div className="sf-form-group"><label>Tags</label><input type="text" value={local.tags?.join(', ')||''} onChange={e=>handleChange('tags',e.target.value.split(',').map(t=>t.trim()).filter(Boolean))} onBlur={()=>handleBlur('tags')} placeholder="tag1, tag2, tag3..." disabled={disabled}/></div>
    </div>
  );
}

// ============================================================================
// ENTITIES PANEL
// ============================================================================
function EntitiesPanel({ projectId, project, user, entities, relationships, presence, members }) {
  // Determine user's role and permissions
  const userRole = project?.ownerId === user?.uid ? 'owner' : 
    (project?.members?.[user?.uid]?.role || members?.find(m => m.uid === user?.uid)?.role || 'viewer');
  const userCanWrite = canWrite(userRole);
  const userIsAdmin = hasAdminPermissions(userRole);
  
  const [selectedType, setSelectedType] = useState('character');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [showRelModal, setShowRelModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredEntities = useMemo(() => entities.filter(e => e.type === selectedType).filter(e => !searchQuery || e.name?.toLowerCase().includes(searchQuery.toLowerCase())), [entities, selectedType, searchQuery]);
  const entityRels = useMemo(() => selectedEntity ? relationships.filter(r => r.sourceId === selectedEntity.id || r.targetId === selectedEntity.id) : [], [relationships, selectedEntity]);

  useEffect(() => { if (selectedEntity) presenceService.updateActivity(projectId, user.uid, { currentEntity: selectedEntity.id, currentPanel: 'entities' }); }, [selectedEntity, projectId, user.uid]);

  const handleAddEntity = async (e) => { e.preventDefault(); if (!newName.trim() || loading || !userCanWrite) return; setLoading(true); try { await entityService.create(projectId, selectedType, newName.trim(), getEntityDefaults(selectedType), user.uid); setNewName(''); } catch (err) { console.error(err); } setLoading(false); };
  const handleUpdateEntity = async (updates) => { if (!selectedEntity || !userCanWrite) return; try { await entityService.update(projectId, selectedEntity.id, updates, user.uid); } catch (err) { console.error(err); } };
  const handleDeleteEntity = async () => { if (!selectedEntity || !userIsAdmin || !confirm('Delete this entity?')) return; try { await entityService.delete(projectId, selectedEntity.id, user.uid, selectedEntity); setSelectedEntity(null); } catch (err) { console.error(err); } };
  const handleAddRelationship = async (e) => { e.preventDefault(); const f = e.target; if (!f.target.value || !f.type.value || !userCanWrite) return; try { await relationshipService.create(projectId, selectedEntity.id, f.target.value, f.type.value, f.description.value, user.uid); setShowRelModal(false); } catch (err) { console.error(err); } };

  const viewingEntity = selectedEntity ? Object.values(presence).filter(p => p.online && p.currentEntity === selectedEntity.id && p.id !== user.uid) : [];

  return (
    <div className="sf-panel sf-entities-panel">
      <div className="sf-entity-types">
        {Object.values(ENTITY_TYPES).map(type => (
          <button key={type.id} className={`sf-entity-type-btn ${selectedType === type.id ? 'active' : ''}`} onClick={() => { setSelectedType(type.id); setSelectedEntity(null); }} style={{ '--type-color': type.color }}>
            <span className="sf-entity-type-icon">{type.icon}</span><span>{type.label}</span><span className="sf-entity-type-count">{entities.filter(e => e.type === type.id).length}</span>
          </button>
        ))}
      </div>
      <div className="sf-entities-content">
        <div className="sf-entity-list">
          <div className="sf-entity-list-header">
            <div className="sf-search"><Icons.Search /><input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
            {userCanWrite && <form className="sf-add-entity" onSubmit={handleAddEntity}><input type="text" placeholder={`New ${ENTITY_TYPES[selectedType.toUpperCase()]?.label.slice(0, -1) || 'entity'}...`} value={newName} onChange={e => setNewName(e.target.value)} /><button type="submit" disabled={!newName.trim() || loading}><Icons.Plus /></button></form>}
          </div>
          <div className="sf-entity-items">
            {filteredEntities.length === 0 ? <div className="sf-empty-state"><p>No {ENTITY_TYPES[selectedType.toUpperCase()]?.label.toLowerCase()} yet.</p></div> : filteredEntities.map(entity => {
              const viewers = Object.values(presence).filter(p => p.online && p.currentEntity === entity.id && p.id !== user.uid);
              return (
                <button key={entity.id} className={`sf-entity-item ${selectedEntity?.id === entity.id ? 'selected' : ''}`} onClick={() => setSelectedEntity(entity)}>
                  <span className="sf-entity-name">{entity.name}</span>
                  {viewers.length > 0 && <span className="sf-entity-viewers">{viewers.map(v => <span key={v.id} className="sf-viewer-dot" style={{ background: v.color }} title={v.displayName} />)}</span>}
                  <span className={`sf-entity-status sf-status-${entity.status}`}>{entity.status}</span>
                </button>
              );
            })}
          </div>
        </div>
        {selectedEntity ? (
          <div className="sf-entity-detail">
            <div className="sf-entity-detail-header">
              <h2>{selectedEntity.name}</h2>
              <div className="sf-entity-actions">
                {viewingEntity.length > 0 && <span className="sf-viewing-indicator">🟢 {viewingEntity.map(v => v.displayName).join(', ')} viewing</span>}
                {userCanWrite && <button className="sf-btn sf-btn-small" onClick={() => setShowRelModal(true)}><Icons.Link /> Relationship</button>}
                {userIsAdmin && <button className="sf-btn sf-btn-small sf-btn-danger" onClick={handleDeleteEntity}><Icons.Trash /></button>}
              </div>
            </div>
            <EntityEditor entity={selectedEntity} onUpdate={handleUpdateEntity} disabled={!userCanWrite} />
            {entityRels.length > 0 && (
              <div className="sf-entity-relationships"><h3>Relationships</h3><div className="sf-relationship-list">
                {entityRels.map(rel => { const isSource = rel.sourceId === selectedEntity.id; const other = entities.find(e => e.id === (isSource ? rel.targetId : rel.sourceId)); return (<div key={rel.id} className="sf-relationship-item"><span className="sf-relationship-type">{rel.type}</span><span className="sf-relationship-direction">{isSource ? '→' : '←'}</span><span>{other?.name || 'Unknown'}</span></div>); })}
              </div></div>
            )}
            <div className="sf-entity-meta"><span>Created: {formatDate(selectedEntity.createdAt)}</span><span>Updated: {formatDate(selectedEntity.updatedAt)}</span></div>
          </div>
        ) : <div className="sf-entity-detail sf-empty"><div className="sf-empty-state"><p>Select an entity to view details</p></div></div>}
      </div>
      {showRelModal && selectedEntity && (
        <Modal title="Add Relationship" onClose={() => setShowRelModal(false)}>
          <form onSubmit={handleAddRelationship}>
            <div className="sf-form-group"><label>Related Entity</label><select name="target" required><option value="">Select...</option>{entities.filter(e => e.id !== selectedEntity.id).map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}</select></div>
            <div className="sf-form-group"><label>Type</label><select name="type" required>{RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="sf-form-group"><label>Description</label><input type="text" name="description" placeholder="Describe this relationship..." /></div>
            <div className="sf-modal-actions"><button type="button" className="sf-btn" onClick={() => setShowRelModal(false)}>Cancel</button><button type="submit" className="sf-btn sf-btn-primary">Add</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// RELATIONSHIPS PANEL
// ============================================================================
function RelationshipsPanel({ projectId, project, user, entities, relationships, members }) {
  // Determine user's role and permissions
  const userRole = project?.ownerId === user?.uid ? 'owner' : 
    (project?.members?.[user?.uid]?.role || members?.find(m => m.uid === user?.uid)?.role || 'viewer');
  const userIsAdmin = hasAdminPermissions(userRole);
  
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? relationships : relationships.filter(r => r.type === filter);
  const handleDelete = async (id) => { if (!userIsAdmin || !confirm('Delete this relationship?')) return; try { await relationshipService.delete(projectId, id, user.uid); } catch (err) { console.error(err); } };
  return (
    <div className="sf-panel sf-relationships-panel">
      <div className="sf-panel-header"><h2>Relationships</h2><div className="sf-filter"><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All Types</option>{RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div></div>
      <div className="sf-relationships-grid">
        {filtered.length === 0 ? <div className="sf-empty-state"><p>No relationships defined yet.</p></div> : filtered.map(rel => {
          const source = entities.find(e => e.id === rel.sourceId); const target = entities.find(e => e.id === rel.targetId);
          return (<div key={rel.id} className="sf-relationship-card"><div className="sf-relationship-entities"><span className="sf-relationship-source">{source?.name || 'Unknown'}</span><span className="sf-relationship-arrow">→</span><span className="sf-relationship-target">{target?.name || 'Unknown'}</span></div><div className="sf-relationship-type-badge">{rel.type}</div>{rel.description && <p className="sf-relationship-description">{rel.description}</p>}{userIsAdmin && <button className="sf-relationship-delete" onClick={() => handleDelete(rel.id)}><Icons.X /></button>}</div>);
        })}
      </div>
    </div>
  );
}

// ============================================================================
// NARRATIVE PANEL
// ============================================================================
// Status options for narrative items
const NARRATIVE_STATUS = {
  planned: { id: 'planned', label: 'Planned', color: '#6B7280', icon: '○' },
  draft: { id: 'draft', label: 'Draft', color: '#F59E0B', icon: '◐' },
  in_progress: { id: 'in_progress', label: 'In Progress', color: '#3B82F6', icon: '◑' },
  review: { id: 'review', label: 'Review', color: '#8B5CF6', icon: '◕' },
  approved: { id: 'approved', label: 'Approved', color: '#10B981', icon: '●' },
  locked: { id: 'locked', label: 'Locked', color: '#059669', icon: '🔒' }
};

const BEAT_TYPES = ['opening', 'action', 'character', 'worldbuilding', 'tension', 'revelation', 'emotional', 'transition', 'resolution', 'hook'];

function NarrativePanel({ projectId, project, user, narrative: narrativeProp, entities, members, onRefresh }) {
  // Determine user's role and permissions
  const userRole = project?.ownerId === user?.uid ? 'owner' : 
    (project?.members?.[user?.uid]?.role || members?.find(m => m.uid === user?.uid)?.role || 'viewer');
  const userCanGenerate = canGenerate(userRole);
  const userCanWrite = canWrite(userRole);
  const userIsAdmin = hasAdminPermissions(userRole);
  
  // Create a default narrative if none provided
  const defaultNarrative = {
    id: 'series',
    title: project?.name || 'Untitled Series',
    logline: '',
    themes: [],
    targetLength: 1,
    books: []
  };
  
  const narrative = narrativeProp || defaultNarrative;
  
  const [expandedBooks, setExpandedBooks] = useState({});
  const [expandedChapters, setExpandedChapters] = useState({});
  const [expandedBeats, setExpandedBeats] = useState({});
  const [local, setLocal] = useState(narrative);
  const [selected, setSelected] = useState(null); // { type: 'series'|'book'|'chapter'|'beat'|'page', bookId?, chapterId?, beatId?, pageNumber? }
  const [editData, setEditData] = useState(null);
  const [editingPanelIdx, setEditingPanelIdx] = useState(null); // Index of panel being edited
  const [showGenerate, setShowGenerate] = useState(null);
  const [showRegenerate, setShowRegenerate] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [initError, setInitError] = useState(null);
  const [showScriptExport, setShowScriptExport] = useState(null);
  const [scriptPreview, setScriptPreview] = useState(null);
  
  // Resizable detail panel
  const [detailPanelWidth, setDetailPanelWidth] = useState(() => {
    const saved = localStorage.getItem('storyforge_detail_panel_width');
    return saved ? parseInt(saved, 10) : 600; // Default 600px
  });
  const [isResizing, setIsResizing] = useState(false);
  const detailPanelRef = useRef(null);
  
  // Handle panel resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const container = detailPanelRef.current?.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const clampedWidth = Math.max(400, Math.min(1200, newWidth)); // Min 400, Max 1200
      setDetailPanelWidth(clampedWidth);
    };
    
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('storyforge_detail_panel_width', detailPanelWidth.toString());
      }
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, detailPanelWidth]);
  
  // Initialize narrative in Firebase if it doesn't exist
  useEffect(() => {
    if (!narrativeProp && projectId && user?.uid) {
      console.log('NarrativePanel: No narrative prop, initializing...');
      narrativeService.initialize(projectId, project?.name, user.uid)
        .then(() => {
          console.log('NarrativePanel: Initialized, refreshing...');
          onRefresh?.();
        })
        .catch(err => {
          console.error('NarrativePanel: Failed to initialize narrative:', err);
          setInitError(err.message);
        });
    }
  }, [narrativeProp, projectId, user?.uid, project?.name, onRefresh]);
  
  useEffect(() => { setLocal(narrative); }, [narrative]);
  
  // Update editData when selection changes
  useEffect(() => {
    if (!selected) {
      setEditData(null);
      return;
    }
    if (selected.type === 'series') {
      setEditData({ ...narrative });
    } else if (selected.type === 'book') {
      const book = narrative?.books?.find(b => b.id === selected.bookId);
      setEditData(book ? { ...book } : null);
    } else if (selected.type === 'chapter') {
      const book = narrative?.books?.find(b => b.id === selected.bookId);
      const chapter = book?.chapters?.find(c => c.id === selected.chapterId);
      setEditData(chapter ? { ...chapter } : null);
    } else if (selected.type === 'beat') {
      const book = narrative?.books?.find(b => b.id === selected.bookId);
      const chapter = book?.chapters?.find(c => c.id === selected.chapterId);
      const beat = chapter?.beats?.find(b => b.id === selected.beatId);
      setEditData(beat ? { ...beat } : null);
    } else if (selected.type === 'page') {
      const book = narrative?.books?.find(b => b.id === selected.bookId);
      const chapter = book?.chapters?.find(c => c.id === selected.chapterId);
      const beat = chapter?.beats?.find(b => b.id === selected.beatId);
      const page = beat?.pages?.find(p => p.pageNumber === selected.pageNumber);
      setEditData(page ? { ...page, beat, chapter, book } : null);
    }
  }, [selected, narrative]);
  
  const toggleBook = (id, e) => { e?.stopPropagation(); setExpandedBooks(p => ({ ...p, [id]: !p[id] })); };
  const toggleChapter = (id, e) => { e?.stopPropagation(); setExpandedChapters(p => ({ ...p, [id]: !p[id] })); };
  const toggleBeat = (id, e) => { e?.stopPropagation(); setExpandedBeats(p => ({ ...p, [id]: !p[id] })); };
  
  // Selection handlers
  const selectSeries = () => setSelected({ type: 'series' });
  const selectBook = (bookId) => setSelected({ type: 'book', bookId });
  const selectChapter = (bookId, chapterId) => setSelected({ type: 'chapter', bookId, chapterId });
  const selectBeat = (bookId, chapterId, beatId) => setSelected({ type: 'beat', bookId, chapterId, beatId });
  const selectPage = (bookId, chapterId, beatId, pageNumber) => setSelected({ type: 'page', bookId, chapterId, beatId, pageNumber });
  
  // Save handlers
  const handleSave = async () => {
    if (!editData || !selected) return;
    setSaving(true);
    try {
      if (selected.type === 'series') {
        // Ensure series document exists first, then update
        await narrativeService.initialize(projectId, project?.name, user.uid);
        await narrativeService.updateSeries(projectId, {
          title: editData.title,
          logline: editData.logline,
          themes: editData.themes,
          targetLength: editData.targetLength
        }, user.uid);
      } else if (selected.type === 'book') {
        await narrativeService.updateBook(projectId, selected.bookId, {
          title: editData.title,
          logline: editData.logline,
          themes: editData.themes,
          estimatedPages: editData.estimatedPages,
          status: editData.status
        }, user.uid);
      } else if (selected.type === 'chapter') {
        await narrativeService.updateChapter(projectId, selected.bookId, selected.chapterId, {
          title: editData.title,
          summary: editData.summary,
          pov: editData.pov,
          estimatedPages: editData.estimatedPages,
          status: editData.status
        }, user.uid);
      } else if (selected.type === 'beat') {
        await narrativeService.updateBeat(projectId, selected.bookId, selected.chapterId, selected.beatId, {
          title: editData.title,
          summary: editData.summary,
          beatType: editData.beatType,
          purpose: editData.purpose,
          estimatedPages: editData.estimatedPages,
          characters: editData.characters,
          location: editData.location
        }, user.uid);
      } else if (selected.type === 'page') {
        // Save page data including all atomic elements and panels
        const book = narrative?.books?.find(b => b.id === selected.bookId);
        const chapter = book?.chapters?.find(c => c.id === selected.chapterId);
        const beat = chapter?.beats?.find(b => b.id === selected.beatId);
        
        const updatedPages = (beat?.pages || []).map(p => 
          p.pageNumber === selected.pageNumber
            ? {
                ...p,
                visualFocus: editData.visualFocus,
                panelCount: editData.panelCount,
                pacing: editData.pacing,
                emotionalBeat: editData.emotionalBeat,
                charactersOnPage: editData.charactersOnPage,
                dialogueNotes: editData.dialogueNotes,
                visualDirection: editData.visualDirection,
                layoutNotes: editData.layoutNotes,
                panels: editData.panels || []
              }
            : p
        );
        
        await narrativeService.updateBeat(projectId, selected.bookId, selected.chapterId, selected.beatId, {
          pages: updatedPages
        }, user.uid);
      }
      onRefresh();
    } catch (err) {
      console.error('Save failed:', err);
      alert('Save failed: ' + err.message);
    }
    setSaving(false);
  };
  
  // Delete handlers
  const handleDelete = async () => {
    if (!selected) return;
    const confirmMsg = selected.type === 'book' ? 'Delete this book and all its chapters?' 
      : selected.type === 'chapter' ? 'Delete this chapter and all its beats?'
      : selected.type === 'beat' ? 'Delete this beat?' : null;
    if (!confirmMsg || !confirm(confirmMsg)) return;
    
    try {
      if (selected.type === 'book') {
        await narrativeService.deleteBook(projectId, selected.bookId, user.uid);
      } else if (selected.type === 'chapter') {
        await narrativeService.deleteChapter(projectId, selected.bookId, selected.chapterId, user.uid);
      } else if (selected.type === 'beat') {
        await narrativeService.deleteBeat(projectId, selected.bookId, selected.chapterId, selected.beatId, user.uid);
      }
      setSelected(null);
      onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed: ' + err.message);
    }
  };
  
  // Add handlers - ensure narrative document exists first
  const handleAddBook = async () => { 
    const num = (narrative?.books?.length || 0) + 1; 
    try { 
      // Ensure the series document exists first
      await narrativeService.initialize(projectId, project?.name, user.uid);
      await narrativeService.addBook(projectId, { number: num, title: `Book ${num}`, logline: '', themes: [], estimatedPages: 180, status: 'planned' }, user.uid); 
      onRefresh(); 
    } catch (err) { 
      console.error('Add book failed:', err); 
      alert('Failed to add book: ' + err.message);
    } 
  };
  
  const handleAddChapter = async (bookId) => { 
    const book = narrative?.books?.find(b => b.id === bookId); 
    const num = (book?.chapters?.length || 0) + 1; 
    try { 
      await narrativeService.addChapter(projectId, bookId, { number: num, title: `Chapter ${num}`, summary: '', pov: '', estimatedPages: 22, status: 'draft' }, user.uid); 
      onRefresh(); 
    } catch (err) { console.error(err); } 
  };
  
  const handleAddBeat = async (bookId, chapterId) => { 
    const book = narrative?.books?.find(b => b.id === bookId); 
    const ch = book?.chapters?.find(c => c.id === chapterId); 
    const num = (ch?.beats?.length || 0) + 1; 
    try { 
      await narrativeService.addBeat(projectId, bookId, chapterId, { sequence: num, title: `Beat ${num}`, summary: '', beatType: 'action', purpose: '', estimatedPages: 4 }, user.uid); 
      onRefresh(); 
    } catch (err) { console.error(err); } 
  };

  // AI Generation handlers
  const handleGenerateBooks = async (count, guidance) => {
    setGenerating(true);
    setGenError(null);
    try {
      // Ensure narrative document exists first
      await narrativeService.initialize(projectId, project?.name, user.uid);
      
      const books = await generationService.generateBooks(project, entities, narrative, count, guidance);
      for (const book of books) {
        await narrativeService.addBook(projectId, {
          number: book.number,
          title: book.title,
          logline: book.logline,
          themes: book.themes || [],
          estimatedPages: book.estimatedPages || 180,
          status: 'planned'
        }, user.uid);
      }
      onRefresh();
      setShowGenerate(null);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
  };

  const handleGenerateChapters = async (bookId, count, guidance) => {
    setGenerating(true);
    setGenError(null);
    try {
      const book = narrative?.books?.find(b => b.id === bookId);
      const chapters = await generationService.generateChapters(project, entities, narrative, book.number, count, guidance);
      for (const ch of chapters) {
        await narrativeService.addChapter(projectId, bookId, {
          number: ch.number,
          title: ch.title,
          summary: ch.summary,
          pov: ch.pov || '',
          estimatedPages: ch.estimatedPages || 22,
          status: 'draft'
        }, user.uid);
      }
      onRefresh();
      setShowGenerate(null);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
  };

  const handleGenerateBeats = async (bookId, chapterId, count, guidance) => {
    setGenerating(true);
    setGenError(null);
    try {
      const book = narrative?.books?.find(b => b.id === bookId);
      const chapter = book?.chapters?.find(c => c.id === chapterId);
      const beats = await generationService.generateBeats(project, entities, narrative, book.number, chapter.number, count, guidance);
      for (const beat of beats) {
        await narrativeService.addBeat(projectId, bookId, chapterId, {
          sequence: beat.sequence,
          title: beat.title,
          summary: beat.summary,
          beatType: beat.beatType || 'action',
          purpose: beat.purpose || '',
          estimatedPages: beat.estimatedPages || 4,
          characters: beat.characters || [],
          location: beat.location || ''
        }, user.uid);
      }
      onRefresh();
      setShowGenerate(null);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
  };

  // Generate pages for a beat
  const handleGeneratePages = async (bookId, chapterId, beatId, guidance = '') => {
    setGenerating(true);
    setGenError(null);
    try {
      const book = narrative?.books?.find(b => b.id === bookId);
      const chapter = book?.chapters?.find(c => c.id === chapterId);
      const beat = chapter?.beats?.find(b => b.id === beatId);
      
      const pages = await generationService.generatePages(
        project, entities, narrative, 
        book.number, chapter.number, beat.sequence, 
        guidance
      );
      
      // Update the beat with pages - include ALL atomic elements
      await narrativeService.updateBeat(projectId, bookId, chapterId, beatId, {
        pages: pages.map(p => ({
          pageNumber: p.pageNumber,
          visualFocus: p.visualFocus,
          panelCount: p.panelCount,
          dialogueNotes: p.dialogueNotes,
          visualDirection: p.visualDirection,
          pacing: p.pacing,
          // NEW: Include all atomic elements
          charactersOnPage: p.charactersOnPage || [],
          emotionalBeat: p.emotionalBeat || '',
          // Initialize empty panels array
          panels: []
        }))
      }, user.uid);
      
      onRefresh();
      setShowGenerate(null);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
  };

  // Generate panel scripts for a page (ATOMIC LEVEL)
  const handleGeneratePanels = async (bookId, chapterId, beatId, pageNumber, guidance = '') => {
    setGenerating(true);
    setGenError(null);
    try {
      const book = narrative?.books?.find(b => b.id === bookId);
      const chapter = book?.chapters?.find(c => c.id === chapterId);
      const beat = chapter?.beats?.find(b => b.id === beatId);
      
      const panelScript = await generationService.generatePanels(
        project, entities, narrative,
        book.number, chapter.number, beat.sequence, pageNumber,
        guidance
      );
      
      // Update the page with panels - include ALL atomic elements
      const updatedPages = (beat.pages || []).map(p => 
        p.pageNumber === pageNumber 
          ? { 
              ...p, 
              layoutNotes: panelScript.layoutNotes || '',
              // Save ALL panel atomic elements
              panels: (panelScript.panels || []).map(panel => ({
                panelNumber: panel.panelNumber,
                size: panel.size || 'medium',
                shot: panel.shot || 'medium',
                visualDescription: panel.visualDescription || '',
                characters: panel.characters || [],
                action: panel.action || '',
                dialogue: (panel.dialogue || []).map(d => ({
                  speaker: d.speaker || '',
                  text: d.text || '',
                  type: d.type || 'speech',
                  direction: d.direction || ''
                })),
                sfx: panel.sfx || '',
                artNotes: panel.artNotes || ''
              }))
            }
          : p
      );
      
      await narrativeService.updateBeat(projectId, bookId, chapterId, beatId, {
        pages: updatedPages
      }, user.uid);
      
      onRefresh();
      setShowGenerate(null);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
  };

  // Generate ALL panels for a beat (batch)
  const handleGenerateAllPanels = async (bookId, chapterId, beatId, guidance = '') => {
    setGenerating(true);
    setGenError(null);
    try {
      const book = narrative?.books?.find(b => b.id === bookId);
      const chapter = book?.chapters?.find(c => c.id === chapterId);
      const beat = chapter?.beats?.find(b => b.id === beatId);
      
      if (!beat?.pages?.length) {
        throw new Error('No pages found. Generate page breakdown first.');
      }
      
      const updatedPages = [...beat.pages];
      
      for (let i = 0; i < updatedPages.length; i++) {
        const page = updatedPages[i];
        
        // Skip pages that already have panels
        if (page.panels?.length > 0) {
          console.log(`Page ${page.pageNumber} already has panels, skipping...`);
          continue;
        }
        
        console.log(`Generating panels for page ${page.pageNumber}...`);
        
        const panelScript = await generationService.generatePanels(
          project, entities, narrative,
          book.number, chapter.number, beat.sequence, page.pageNumber,
          guidance
        );
        
        // Save ALL atomic elements for panels
        updatedPages[i] = {
          ...page,
          layoutNotes: panelScript.layoutNotes || '',
          panels: (panelScript.panels || []).map(panel => ({
            panelNumber: panel.panelNumber,
            size: panel.size || 'medium',
            shot: panel.shot || 'medium',
            visualDescription: panel.visualDescription || '',
            characters: panel.characters || [],
            action: panel.action || '',
            dialogue: (panel.dialogue || []).map(d => ({
              speaker: d.speaker || '',
              text: d.text || '',
              type: d.type || 'speech',
              direction: d.direction || ''
            })),
            sfx: panel.sfx || '',
            artNotes: panel.artNotes || ''
          }))
        };
      }
      
      await narrativeService.updateBeat(projectId, bookId, chapterId, beatId, {
        pages: updatedPages
      }, user.uid);
      
      onRefresh();
      setShowGenerate(null);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
  };

  // Export script
  const handleExportScript = async (bookNumber, chapterNumber = null, format = 'full') => {
    try {
      const script = await generationService.exportScript(narrative, bookNumber, chapterNumber, format, true);
      
      // Create and download file
      const isJson = format === 'json';
      const blob = new Blob([script], { type: isJson ? 'application/json' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const book = narrative?.books?.find(b => b.number === bookNumber);
      const chapter = chapterNumber ? book?.chapters?.find(c => c.number === chapterNumber) : null;
      const ext = isJson ? 'json' : 'txt';
      a.href = url;
      a.download = chapter 
        ? `${project.name}-Book${bookNumber}-Ch${chapterNumber}-script.${ext}`
        : `${project.name}-Book${bookNumber}-script.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowScriptExport(null);
    } catch (err) {
      console.error('Script export failed:', err);
      alert('Script export failed: ' + err.message);
    }
  };
  
  // Regenerate single item
  const handleRegenerateSingle = async (guidance) => {
    if (!showRegenerate) return;
    setGenerating(true);
    setGenError(null);
    try {
      if (showRegenerate.type === 'book') {
        const books = await generationService.generateBooks(project, entities, narrative, 1, 
          `Regenerate Book ${showRegenerate.book.number} with title "${showRegenerate.book.title}". ${guidance}`);
        if (books[0]) {
          await narrativeService.updateBook(projectId, showRegenerate.bookId, {
            title: books[0].title,
            logline: books[0].logline,
            themes: books[0].themes || [],
            estimatedPages: books[0].estimatedPages || 180
          }, user.uid);
        }
      } else if (showRegenerate.type === 'chapter') {
        const book = narrative?.books?.find(b => b.id === showRegenerate.bookId);
        const chapters = await generationService.generateChapters(project, entities, narrative, book.number, 1,
          `Regenerate Chapter ${showRegenerate.chapter.number} with title "${showRegenerate.chapter.title}". ${guidance}`);
        if (chapters[0]) {
          await narrativeService.updateChapter(projectId, showRegenerate.bookId, showRegenerate.chapterId, {
            title: chapters[0].title,
            summary: chapters[0].summary,
            pov: chapters[0].pov || '',
            estimatedPages: chapters[0].estimatedPages || 22
          }, user.uid);
        }
      } else if (showRegenerate.type === 'beat') {
        const book = narrative?.books?.find(b => b.id === showRegenerate.bookId);
        const chapter = book?.chapters?.find(c => c.id === showRegenerate.chapterId);
        const beats = await generationService.generateBeats(project, entities, narrative, book.number, chapter.number, 1,
          `Regenerate Beat ${showRegenerate.beat.sequence} with title "${showRegenerate.beat.title}". ${guidance}`);
        if (beats[0]) {
          await narrativeService.updateBeat(projectId, showRegenerate.bookId, showRegenerate.chapterId, showRegenerate.beatId, {
            title: beats[0].title,
            summary: beats[0].summary,
            beatType: beats[0].beatType || 'action',
            purpose: beats[0].purpose || '',
            estimatedPages: beats[0].estimatedPages || 4,
            characters: beats[0].characters || [],
            location: beats[0].location || ''
          }, user.uid);
        }
      }
      onRefresh();
      setShowRegenerate(null);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
  };
  
  const aiConfigured = generationService.isAvailable();
  
  // Calculate totals
  const totalPages = narrative?.books?.reduce((sum, b) => sum + (b.estimatedPages || 0), 0) || 0;
  const totalChapters = narrative?.books?.reduce((sum, b) => sum + (b.chapters?.length || 0), 0) || 0;
  const totalBeats = narrative?.books?.reduce((sum, b) => 
    sum + (b.chapters?.reduce((csum, c) => csum + (c.beats?.length || 0), 0) || 0), 0) || 0;
  
  // Show error if initialization failed
  if (initError) {
    return (
      <div className="sf-panel">
        <div className="sf-empty-state">
          <Icons.BookOpen />
          <h3>Error Loading Narrative</h3>
          <p>{initError}</p>
          <button className="sf-btn sf-btn-primary" onClick={onRefresh}>
            <Icons.RefreshCw /> Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="sf-panel sf-narrative-panel">
      <div className="sf-narrative-content">
        {/* Tree View */}
        <div className="sf-narrative-tree">
          <div className={`sf-series-header ${selected?.type === 'series' ? 'selected' : ''}`} onClick={selectSeries}>
            <div className="sf-series-title-row">
              <h2>{narrative?.title || 'Untitled Series'}</h2>
              <button className="sf-btn sf-btn-icon" onClick={(e) => { e.stopPropagation(); selectSeries(); }} title="Edit Series">
                <Icons.Edit />
              </button>
            </div>
            <p className="sf-series-logline">{narrative?.logline || 'Click to add a series logline...'}</p>
            <div className="sf-series-meta">
              <span>{narrative.books?.length || 0} Books</span>
              <span>{totalChapters} Chapters</span>
              <span>{totalBeats} Beats</span>
              <span>~{totalPages} Pages</span>
            </div>
            <div className="sf-series-actions">
              {userCanWrite && <button className="sf-btn sf-btn-small" onClick={(e) => { e.stopPropagation(); handleAddBook(); }}><Icons.Plus /> Add Book</button>}
              {aiConfigured && userCanGenerate && (
                <button className="sf-btn sf-btn-small sf-btn-ai" onClick={(e) => { e.stopPropagation(); setShowGenerate({ type: 'books' }); }}>
                  <Icons.Sparkles /> Generate Books
                </button>
              )}
            </div>
          </div>
          
          <div className="sf-narrative-books">
            {narrative.books?.map(book => (
              <div key={book.id} className={`sf-narrative-book ${selected?.bookId === book.id && selected?.type === 'book' ? 'selected' : ''}`}>
                <div className="sf-book-header">
                  <button className="sf-expand-btn" onClick={(e) => toggleBook(book.id, e)}>
                    {expandedBooks[book.id] ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                  </button>
                  <div className="sf-book-info" onClick={() => selectBook(book.id)}>
                    <span className="sf-book-number">Book {book.number}</span>
                    <span className="sf-book-title">{book.title || 'Untitled'}</span>
                  </div>
                  <span className={`sf-status-badge sf-status-${book.status || 'planned'}`}>
                    {NARRATIVE_STATUS[book.status || 'planned']?.icon}
                  </span>
                  <span className="sf-book-meta">{book.chapters?.length || 0} ch · {book.estimatedPages || 0}pp</span>
                </div>
                
                {expandedBooks[book.id] && (
                  <div className="sf-book-content">
                    <div className="sf-book-actions">
                      {userCanWrite && <button className="sf-btn sf-btn-small" onClick={() => handleAddChapter(book.id)}><Icons.Plus /> Chapter</button>}
                      {aiConfigured && userCanGenerate && (
                        <button className="sf-btn sf-btn-small sf-btn-ai" onClick={() => setShowGenerate({ type: 'chapters', bookId: book.id, bookNumber: book.number })}>
                          <Icons.Sparkles /> Generate
                        </button>
                      )}
                    </div>
                    
                    <div className="sf-narrative-chapters">
                      {book.chapters?.map(ch => (
                        <div key={ch.id} className={`sf-narrative-chapter ${selected?.chapterId === ch.id && selected?.type === 'chapter' ? 'selected' : ''}`}>
                          <div className="sf-chapter-header">
                            <button className="sf-expand-btn" onClick={(e) => toggleChapter(ch.id, e)}>
                              {expandedChapters[ch.id] ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                            </button>
                            <div className="sf-chapter-info" onClick={() => selectChapter(book.id, ch.id)}>
                              <span className="sf-chapter-number">Ch. {ch.number}</span>
                              <span className="sf-chapter-title">{ch.title || 'Untitled'}</span>
                            </div>
                            <span className={`sf-status-badge sf-status-${ch.status || 'draft'}`}>
                              {NARRATIVE_STATUS[ch.status || 'draft']?.icon}
                            </span>
                            <span className="sf-chapter-meta">{ch.beats?.length || 0} beats · {ch.estimatedPages || 0}pp</span>
                          </div>
                          
                          {expandedChapters[ch.id] && (
                            <div className="sf-chapter-content">
                              <div className="sf-chapter-actions">
                                {userCanWrite && <button className="sf-btn sf-btn-small" onClick={() => handleAddBeat(book.id, ch.id)}><Icons.Plus /> Beat</button>}
                                {aiConfigured && userCanGenerate && (
                                  <button className="sf-btn sf-btn-small sf-btn-ai" onClick={() => setShowGenerate({ type: 'beats', bookId: book.id, bookNumber: book.number, chapterId: ch.id, chapterNumber: ch.number })}>
                                    <Icons.Sparkles /> Generate
                                  </button>
                                )}
                              </div>
                              
                              <div className="sf-narrative-beats">
                                {ch.beats?.map(beat => (
                                  <div 
                                    key={beat.id} 
                                    className={`sf-narrative-beat-container ${selected?.beatId === beat.id ? 'selected-container' : ''}`}
                                  >
                                    <div className={`sf-narrative-beat ${selected?.beatId === beat.id && selected?.type === 'beat' ? 'selected' : ''}`}>
                                      <button className="sf-expand-btn sf-expand-btn-small" onClick={(e) => toggleBeat(beat.id, e)}>
                                        {expandedBeats[beat.id] ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                                      </button>
                                      <span className="sf-beat-sequence" onClick={() => selectBeat(book.id, ch.id, beat.id)}>{beat.sequence}</span>
                                      <span className="sf-beat-title" onClick={() => selectBeat(book.id, ch.id, beat.id)}>{beat.title || 'Untitled'}</span>
                                      <span className={`sf-beat-type sf-beat-type-${beat.beatType}`}>{beat.beatType}</span>
                                      <span className="sf-beat-pages">{beat.pages?.length || 0}/{beat.estimatedPages || 0}pp</span>
                                      {beat.pages?.some(p => p.panels?.length > 0) && (
                                        <span className="sf-beat-scripted" title="Has panel scripts">📝</span>
                                      )}
                                    </div>
                                    
                                    {expandedBeats[beat.id] && (
                                      <div className="sf-beat-content">
                                        <div className="sf-beat-actions">
                                          {aiConfigured && userCanGenerate && !beat.pages?.length && (
                                            <button 
                                              className="sf-btn sf-btn-small sf-btn-ai" 
                                              onClick={() => setShowGenerate({ 
                                                type: 'pages', 
                                                bookId: book.id, 
                                                chapterId: ch.id, 
                                                beatId: beat.id,
                                                beat 
                                              })}
                                            >
                                              <Icons.Sparkles /> Generate Pages
                                            </button>
                                          )}
                                          {aiConfigured && userCanGenerate && beat.pages?.length > 0 && !beat.pages?.every(p => p.panels?.length > 0) && (
                                            <button 
                                              className="sf-btn sf-btn-small sf-btn-ai" 
                                              onClick={() => setShowGenerate({ 
                                                type: 'allPanels', 
                                                bookId: book.id, 
                                                chapterId: ch.id, 
                                                beatId: beat.id,
                                                beat 
                                              })}
                                            >
                                              <Icons.Sparkles /> Generate All Panel Scripts
                                            </button>
                                          )}
                                          {beat.pages?.some(p => p.panels?.length > 0) && (
                                            <button 
                                              className="sf-btn sf-btn-small" 
                                              onClick={() => setShowScriptExport({ bookNumber: book.number, chapterNumber: ch.number, beat })}
                                            >
                                              <Icons.FileText /> Export Script
                                            </button>
                                          )}
                                        </div>
                                        
                                        {beat.pages?.length > 0 ? (
                                          <div className="sf-narrative-pages">
                                            {beat.pages.map(page => (
                                              <div 
                                                key={page.pageNumber}
                                                className={`sf-narrative-page ${selected?.pageNumber === page.pageNumber && selected?.beatId === beat.id && selected?.type === 'page' ? 'selected' : ''}`}
                                                onClick={() => selectPage(book.id, ch.id, beat.id, page.pageNumber)}
                                              >
                                                <span className="sf-page-number">Page {page.pageNumber}</span>
                                                <span className="sf-page-focus">{page.visualFocus?.substring(0, 40) || 'No focus'}...</span>
                                                <span className="sf-page-panels">{page.panels?.length || page.panelCount || 0} panels</span>
                                                {page.panels?.length > 0 ? (
                                                  <span className="sf-page-status sf-status-complete" title="Script complete">✓</span>
                                                ) : (
                                                  <span className="sf-page-status sf-status-pending" title="Needs panel script">○</span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="sf-no-pages">
                                            <p>No page breakdown yet. Generate pages to continue.</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Resize Handle */}
        <div 
          className={`sf-resize-handle ${isResizing ? 'sf-resizing' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          onDoubleClick={() => {
            setDetailPanelWidth(600);
            localStorage.setItem('storyforge_detail_panel_width', '600');
          }}
          title="Drag to resize • Double-click to reset"
        >
          <div className="sf-resize-grip">
            <span className="sf-resize-dots">⋮</span>
          </div>
          {isResizing && (
            <div className="sf-resize-indicator">{detailPanelWidth}px</div>
          )}
        </div>
        
        {/* Detail Panel */}
        <div 
          className="sf-narrative-detail" 
          ref={detailPanelRef}
          style={{ width: detailPanelWidth, minWidth: 400, maxWidth: 1200 }}
        >
          {!selected && (
            <div className="sf-detail-placeholder">
              <Icons.BookOpen />
              <h3>Select an Item</h3>
              <p>Click on the series, a book, chapter, or beat to view and edit details.</p>
              {!aiConfigured && (
                <div className="sf-ai-setup-hint">
                  <Icons.Sparkles />
                  <div>
                    <strong>AI Generation Available</strong>
                    <p>Configure your API key in AI Settings to enable story generation.</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {selected?.type === 'series' && editData && (
            <div className="sf-detail-form">
              <h3>Series Settings</h3>
              <div className="sf-form-group">
                <label>Title</label>
                <input type="text" value={editData.title || ''} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} disabled={!userCanWrite} />
              </div>
              <div className="sf-form-group">
                <label>Logline</label>
                <textarea value={editData.logline || ''} onChange={e => setEditData(p => ({ ...p, logline: e.target.value }))} rows={3} placeholder="A compelling one-sentence summary of your series..." disabled={!userCanWrite} />
              </div>
              <div className="sf-form-group">
                <label>Themes</label>
                <input type="text" value={editData.themes?.join(', ') || ''} onChange={e => setEditData(p => ({ ...p, themes: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} placeholder="courage, identity, sacrifice" disabled={!userCanWrite} />
                <small>Comma-separated list of themes</small>
              </div>
              <div className="sf-form-group">
                <label>Target Books</label>
                <input type="number" min="1" max="100" value={editData.targetLength || 1} onChange={e => setEditData(p => ({ ...p, targetLength: parseInt(e.target.value) || 1 }))} disabled={!userCanWrite} />
              </div>
              {userCanWrite && (
                <div className="sf-detail-actions">
                  <button className="sf-btn sf-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              )}
            </div>
          )}
          
          {selected?.type === 'book' && editData && (
            <div className="sf-detail-form">
              <div className="sf-detail-header">
                <h3>Book {editData.number}</h3>
                <div className="sf-detail-header-actions">
                  {aiConfigured && userCanGenerate && (
                    <button className="sf-btn sf-btn-small sf-btn-ai" onClick={() => setShowRegenerate({ type: 'book', bookId: selected.bookId, book: editData })}>
                      <Icons.Sparkles /> Regenerate
                    </button>
                  )}
                  {userIsAdmin && <button className="sf-btn sf-btn-small sf-btn-danger" onClick={handleDelete}><Icons.Trash /></button>}
                </div>
              </div>
              <div className="sf-form-group">
                <label>Title</label>
                <input type="text" value={editData.title || ''} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} disabled={!userCanWrite} />
              </div>
              <div className="sf-form-group">
                <label>Logline</label>
                <textarea value={editData.logline || ''} onChange={e => setEditData(p => ({ ...p, logline: e.target.value }))} rows={3} placeholder="What is this book about?" disabled={!userCanWrite} />
              </div>
              <div className="sf-form-group">
                <label>Themes</label>
                <input type="text" value={editData.themes?.join(', ') || ''} onChange={e => setEditData(p => ({ ...p, themes: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} placeholder="Book-specific themes" disabled={!userCanWrite} />
              </div>
              <div className="sf-form-row">
                <div className="sf-form-group">
                  <label>Estimated Pages</label>
                  <input type="number" min="1" value={editData.estimatedPages || 180} onChange={e => setEditData(p => ({ ...p, estimatedPages: parseInt(e.target.value) || 180 }))} disabled={!userCanWrite} />
                </div>
                <div className="sf-form-group">
                  <label>Status</label>
                  <select value={editData.status || 'planned'} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))} disabled={!userCanWrite}>
                    {Object.values(NARRATIVE_STATUS).map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                  </select>
                </div>
              </div>
              {userCanWrite && (
                <div className="sf-detail-actions">
                  <button className="sf-btn sf-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              )}
            </div>
          )}
          
          {selected?.type === 'chapter' && editData && (
            <div className="sf-detail-form">
              <div className="sf-detail-header">
                <h3>Chapter {editData.number}</h3>
                <div className="sf-detail-header-actions">
                  {aiConfigured && userCanGenerate && (
                    <button className="sf-btn sf-btn-small sf-btn-ai" onClick={() => setShowRegenerate({ type: 'chapter', bookId: selected.bookId, chapterId: selected.chapterId, chapter: editData })}>
                      <Icons.Sparkles /> Regenerate
                    </button>
                  )}
                  {userIsAdmin && <button className="sf-btn sf-btn-small sf-btn-danger" onClick={handleDelete}><Icons.Trash /></button>}
                </div>
              </div>
              <div className="sf-form-group">
                <label>Title</label>
                <input type="text" value={editData.title || ''} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} disabled={!userCanWrite} />
              </div>
              <div className="sf-form-group">
                <label>Summary</label>
                <textarea value={editData.summary || ''} onChange={e => setEditData(p => ({ ...p, summary: e.target.value }))} rows={4} placeholder="What happens in this chapter?" disabled={!userCanWrite} />
              </div>
              <div className="sf-form-row">
                <div className="sf-form-group">
                  <label>POV Character</label>
                  <input type="text" value={editData.pov || ''} onChange={e => setEditData(p => ({ ...p, pov: e.target.value }))} placeholder="Whose perspective?" disabled={!userCanWrite} />
                </div>
                <div className="sf-form-group">
                  <label>Estimated Pages</label>
                  <input type="number" min="1" value={editData.estimatedPages || 22} onChange={e => setEditData(p => ({ ...p, estimatedPages: parseInt(e.target.value) || 22 }))} disabled={!userCanWrite} />
                </div>
              </div>
              <div className="sf-form-group">
                <label>Status</label>
                <select value={editData.status || 'draft'} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))} disabled={!userCanWrite}>
                  {Object.values(NARRATIVE_STATUS).map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
              </div>
              {userCanWrite && (
                <div className="sf-detail-actions">
                  <button className="sf-btn sf-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              )}
              
              {/* Chapter Script Actions */}
              {(() => {
                const book = narrative?.books?.find(b => b.id === selected.bookId);
                const chapter = book?.chapters?.find(c => c.id === selected.chapterId);
                const hasScripts = chapter?.beats?.some(b => b.pages?.some(p => p.panels?.length > 0));
                const totalPages = chapter?.beats?.reduce((sum, b) => sum + (b.pages?.length || 0), 0) || 0;
                const scriptedPages = chapter?.beats?.reduce((sum, b) => sum + (b.pages?.filter(p => p.panels?.length > 0).length || 0), 0) || 0;
                
                return (
                  <div className="sf-chapter-script-section">
                    <h4>📝 Script Progress</h4>
                    <div className="sf-script-progress">
                      <div className="sf-progress-stats">
                        <span>{chapter?.beats?.length || 0} beats</span>
                        <span>{totalPages} pages</span>
                        <span>{scriptedPages} scripted</span>
                      </div>
                      {totalPages > 0 && (
                        <div className="sf-progress-bar">
                          <div 
                            className="sf-progress-fill" 
                            style={{ width: `${(scriptedPages / totalPages) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {hasScripts && (
                      <div className="sf-script-actions">
                        <button 
                          className="sf-btn sf-btn-small"
                          onClick={() => setScriptPreview({ bookNumber: book.number, chapterNumber: chapter.number })}
                        >
                          <Icons.Eye /> Preview Script
                        </button>
                        <button 
                          className="sf-btn sf-btn-small"
                          onClick={() => handleExportScript(book.number, chapter.number)}
                        >
                          <Icons.Download /> Export Script
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          
          {selected?.type === 'beat' && editData && (
            <div className="sf-detail-form">
              <div className="sf-detail-header">
                <h3>Beat {editData.sequence}</h3>
                <div className="sf-detail-header-actions">
                  {aiConfigured && userCanGenerate && (
                    <button className="sf-btn sf-btn-small sf-btn-ai" onClick={() => setShowRegenerate({ type: 'beat', bookId: selected.bookId, chapterId: selected.chapterId, beatId: selected.beatId, beat: editData })}>
                      <Icons.Sparkles /> Regenerate
                    </button>
                  )}
                  {userIsAdmin && <button className="sf-btn sf-btn-small sf-btn-danger" onClick={handleDelete}><Icons.Trash /></button>}
                </div>
              </div>
              <div className="sf-form-group">
                <label>Title</label>
                <input type="text" value={editData.title || ''} onChange={e => setEditData(p => ({ ...p, title: e.target.value }))} disabled={!userCanWrite} />
              </div>
              <div className="sf-form-row">
                <div className="sf-form-group">
                  <label>Beat Type</label>
                  <select value={editData.beatType || 'action'} onChange={e => setEditData(p => ({ ...p, beatType: e.target.value }))} disabled={!userCanWrite}>
                    {BEAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="sf-form-group">
                  <label>Estimated Pages</label>
                  <input type="number" min="1" value={editData.estimatedPages || 4} onChange={e => setEditData(p => ({ ...p, estimatedPages: parseInt(e.target.value) || 4 }))} disabled={!userCanWrite} />
                </div>
              </div>
              <div className="sf-form-group">
                <label>Purpose</label>
                <input type="text" value={editData.purpose || ''} onChange={e => setEditData(p => ({ ...p, purpose: e.target.value }))} placeholder="What does this beat accomplish?" disabled={!userCanWrite} />
              </div>
              <div className="sf-form-group">
                <label>Summary</label>
                <textarea value={editData.summary || ''} onChange={e => setEditData(p => ({ ...p, summary: e.target.value }))} rows={4} placeholder="What happens in this beat?" disabled={!userCanWrite} />
              </div>
              <div className="sf-form-row">
                <div className="sf-form-group">
                  <label>Characters</label>
                  <input type="text" value={editData.characters?.join(', ') || ''} onChange={e => setEditData(p => ({ ...p, characters: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} placeholder="Who's in this scene?" disabled={!userCanWrite} />
                </div>
                <div className="sf-form-group">
                  <label>Location</label>
                  <input type="text" value={editData.location || ''} onChange={e => setEditData(p => ({ ...p, location: e.target.value }))} placeholder="Where does this happen?" disabled={!userCanWrite} />
                </div>
              </div>
              {userCanWrite && (
                <div className="sf-detail-actions">
                  <button className="sf-btn sf-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              )}
              
              {/* Page Generation Section */}
              {aiConfigured && userCanGenerate && (
                <div className="sf-beat-generation-section">
                  <h4>📄 Page Generation</h4>
                  {editData.pages?.length > 0 ? (
                    <div className="sf-pages-summary">
                      <p>{editData.pages.length} pages generated</p>
                      <p>{editData.pages.filter(p => p.panels?.length > 0).length} with panel scripts</p>
                      {!editData.pages.every(p => p.panels?.length > 0) && (
                        <button 
                          className="sf-btn sf-btn-ai sf-btn-small"
                          onClick={() => setShowGenerate({ 
                            type: 'allPanels', 
                            bookId: selected.bookId, 
                            chapterId: selected.chapterId, 
                            beatId: selected.beatId,
                            beat: editData 
                          })}
                        >
                          <Icons.Sparkles /> Generate Missing Panel Scripts
                        </button>
                      )}
                    </div>
                  ) : (
                    <button 
                      className="sf-btn sf-btn-ai"
                      onClick={() => setShowGenerate({ 
                        type: 'pages', 
                        bookId: selected.bookId, 
                        chapterId: selected.chapterId, 
                        beatId: selected.beatId,
                        beat: editData 
                      })}
                    >
                      <Icons.Sparkles /> Generate Page Breakdown
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Page Detail Panel */}
          {selected?.type === 'page' && editData && (
            <div className="sf-detail-form sf-page-detail">
              <div className="sf-detail-header">
                <h3>📄 Page {editData.pageNumber}</h3>
                <div className="sf-detail-header-actions">
                  {/* Width Presets */}
                  <div className="sf-width-presets">
                    <button 
                      className={`sf-width-btn ${detailPanelWidth <= 500 ? 'active' : ''}`}
                      onClick={() => { setDetailPanelWidth(450); localStorage.setItem('storyforge_detail_panel_width', '450'); }}
                      title="Compact view"
                    >
                      S
                    </button>
                    <button 
                      className={`sf-width-btn ${detailPanelWidth > 500 && detailPanelWidth <= 700 ? 'active' : ''}`}
                      onClick={() => { setDetailPanelWidth(600); localStorage.setItem('storyforge_detail_panel_width', '600'); }}
                      title="Default view"
                    >
                      M
                    </button>
                    <button 
                      className={`sf-width-btn ${detailPanelWidth > 700 && detailPanelWidth <= 900 ? 'active' : ''}`}
                      onClick={() => { setDetailPanelWidth(800); localStorage.setItem('storyforge_detail_panel_width', '800'); }}
                      title="Wide view"
                    >
                      L
                    </button>
                    <button 
                      className={`sf-width-btn ${detailPanelWidth > 900 ? 'active' : ''}`}
                      onClick={() => { setDetailPanelWidth(1100); localStorage.setItem('storyforge_detail_panel_width', '1100'); }}
                      title="Extra wide view"
                    >
                      XL
                    </button>
                  </div>
                  {aiConfigured && userCanGenerate && !editData.panels?.length && (
                    <button 
                      className="sf-btn sf-btn-small sf-btn-ai" 
                      onClick={() => setShowGenerate({ 
                        type: 'panels', 
                        bookId: selected.bookId, 
                        chapterId: selected.chapterId, 
                        beatId: selected.beatId,
                        pageNumber: selected.pageNumber 
                      })}
                    >
                      <Icons.Sparkles /> Generate Panels
                    </button>
                  )}
                  {aiConfigured && userCanGenerate && editData.panels?.length > 0 && (
                    <button 
                      className="sf-btn sf-btn-small sf-btn-ai" 
                      onClick={() => setShowGenerate({ 
                        type: 'panels', 
                        bookId: selected.bookId, 
                        chapterId: selected.chapterId, 
                        beatId: selected.beatId,
                        pageNumber: selected.pageNumber,
                        regenerate: true
                      })}
                    >
                      <Icons.Sparkles /> Regenerate
                    </button>
                  )}
                </div>
              </div>
              
              {/* Breadcrumb Context */}
              <div className="sf-page-context">
                <span className="sf-context-item">📚 Book {editData.book?.number}</span>
                <span className="sf-context-item">📖 Ch {editData.chapter?.number}</span>
                <span className="sf-context-item">🎬 {editData.beat?.title}</span>
              </div>
              
              {/* Page Info Grid - responsive columns based on panel width */}
              <div className="sf-page-sections-grid">
                {/* Page Structure Section */}
                <div className="sf-page-info-section">
                  <h4>📐 Page Structure</h4>
                  
                  <div className="sf-form-row">
                    <div className="sf-form-group">
                      <label>Panel Count</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="12"
                        value={editData.panelCount || 5} 
                        onChange={e => setEditData(p => ({ ...p, panelCount: parseInt(e.target.value) || 5 }))} 
                        disabled={!userCanWrite}
                      />
                    </div>
                    <div className="sf-form-group">
                      <label>Pacing</label>
                      <select value={editData.pacing || 'medium'} onChange={e => setEditData(p => ({ ...p, pacing: e.target.value }))} disabled={!userCanWrite}>
                        <option value="slow">Slow (emotional)</option>
                        <option value="medium">Medium (dialogue)</option>
                        <option value="fast">Fast (action)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="sf-form-group">
                    <label>Layout Notes</label>
                    <input 
                      type="text"
                      value={editData.layoutNotes || ''} 
                      onChange={e => setEditData(p => ({ ...p, layoutNotes: e.target.value }))} 
                      placeholder="Page composition and layout instructions"
                      disabled={!userCanWrite}
                    />
                  </div>
                </div>
                
                {/* Story Content Section */}
                <div className="sf-page-info-section">
                  <h4>📝 Story Content</h4>
                  
                  <div className="sf-form-group">
                    <label>Emotional Beat</label>
                    <input 
                      type="text"
                      value={editData.emotionalBeat || ''} 
                      onChange={e => setEditData(p => ({ ...p, emotionalBeat: e.target.value }))} 
                      placeholder="What emotional beat does this page hit?"
                      disabled={!userCanWrite}
                    />
                  </div>
                  
                  <div className="sf-form-group">
                    <label>Characters on Page</label>
                    <input 
                      type="text"
                      value={editData.charactersOnPage?.join(', ') || ''} 
                      onChange={e => setEditData(p => ({ ...p, charactersOnPage: e.target.value.split(',').map(c => c.trim()).filter(Boolean) }))} 
                      placeholder="Characters appearing (comma-separated)"
                      disabled={!userCanWrite}
                    />
                  </div>
                </div>
              </div>
              
              {/* Visual Focus Section - Full width */}
              <div className="sf-page-info-section sf-full-width">
                <h4>🎯 Visual Focus</h4>
                
                <div className="sf-form-group">
                  <label>Key Image/Moment</label>
                  <textarea 
                    value={editData.visualFocus || ''} 
                    onChange={e => setEditData(p => ({ ...p, visualFocus: e.target.value }))} 
                    rows={3} 
                    placeholder="What should the reader's eye be drawn to on this page?"
                    disabled={!userCanWrite}
                  />
                </div>
                
                <div className="sf-form-row">
                  <div className="sf-form-group">
                    <label>Visual Direction</label>
                    <textarea 
                      value={editData.visualDirection || ''} 
                      onChange={e => setEditData(p => ({ ...p, visualDirection: e.target.value }))} 
                      rows={2} 
                      placeholder="Camera angles, lighting, mood notes"
                      disabled={!userCanWrite}
                    />
                  </div>
                  <div className="sf-form-group">
                    <label>Dialogue Notes</label>
                    <textarea 
                      value={editData.dialogueNotes || ''} 
                      onChange={e => setEditData(p => ({ ...p, dialogueNotes: e.target.value }))} 
                      rows={2} 
                      placeholder="Key dialogue exchanges or captions"
                      disabled={!userCanWrite}
                    />
                  </div>
                </div>
              </div>
              
              {userCanWrite && (
                <div className="sf-detail-actions">
                  <button className="sf-btn sf-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              )}
              
              {/* Panel Script Display */}
              {editData.panels?.length > 0 && (
                <div className="sf-panel-script-section">
                  <div className="sf-section-header">
                    <h4>📝 Panel Script ({editData.panels.length} panels)</h4>
                    {userCanWrite && (
                      <button 
                        className="sf-btn sf-btn-small"
                        onClick={() => {
                          const newPanel = {
                            panelNumber: editData.panels.length + 1,
                            size: 'medium',
                            shot: 'medium',
                            visualDescription: '',
                            characters: [],
                            action: '',
                            dialogue: [],
                            sfx: '',
                            artNotes: ''
                          };
                          setEditData(p => ({ ...p, panels: [...(p.panels || []), newPanel] }));
                          setEditingPanelIdx(editData.panels.length);
                        }}
                      >
                        <Icons.Plus /> Add Panel
                      </button>
                    )}
                  </div>
                  
                  <div className="sf-panels-list">
                    {editData.panels.map((panel, idx) => (
                      <div key={idx} className={`sf-panel-card ${editingPanelIdx === idx ? 'sf-panel-editing' : ''}`}>
                        {editingPanelIdx === idx && userCanWrite ? (
                          // EDITING MODE
                          <div className="sf-panel-edit-form">
                            <div className="sf-panel-edit-header">
                              <h5>Editing Panel {panel.panelNumber}</h5>
                              <div className="sf-panel-edit-actions">
                                <button className="sf-btn sf-btn-small sf-btn-primary" onClick={() => setEditingPanelIdx(null)}>
                                  <Icons.Check /> Done
                                </button>
                                <button 
                                  className="sf-btn sf-btn-small sf-btn-danger"
                                  onClick={() => {
                                    if (confirm('Delete this panel?')) {
                                      setEditData(p => ({
                                        ...p,
                                        panels: p.panels.filter((_, i) => i !== idx).map((pnl, i) => ({ ...pnl, panelNumber: i + 1 }))
                                      }));
                                      setEditingPanelIdx(null);
                                    }
                                  }}
                                >
                                  <Icons.Trash />
                                </button>
                              </div>
                            </div>
                            
                            <div className="sf-form-row">
                              <div className="sf-form-group">
                                <label>Size</label>
                                <select 
                                  value={panel.size || 'medium'} 
                                  onChange={e => setEditData(p => ({
                                    ...p,
                                    panels: p.panels.map((pnl, i) => i === idx ? { ...pnl, size: e.target.value } : pnl)
                                  }))}
                                >
                                  <option value="splash">Splash (Full Page)</option>
                                  <option value="large">Large (1/2 Page)</option>
                                  <option value="medium">Medium (1/3-1/4 Page)</option>
                                  <option value="small">Small (1/6 or less)</option>
                                  <option value="inset">Inset</option>
                                </select>
                              </div>
                              <div className="sf-form-group">
                                <label>Shot</label>
                                <select 
                                  value={panel.shot || 'medium'} 
                                  onChange={e => setEditData(p => ({
                                    ...p,
                                    panels: p.panels.map((pnl, i) => i === idx ? { ...pnl, shot: e.target.value } : pnl)
                                  }))}
                                >
                                  <option value="establishing">Establishing</option>
                                  <option value="wide">Wide</option>
                                  <option value="medium">Medium</option>
                                  <option value="close-up">Close-up</option>
                                  <option value="extreme-close-up">Extreme Close-up</option>
                                  <option value="over-shoulder">Over-shoulder</option>
                                  <option value="POV">POV</option>
                                </select>
                              </div>
                            </div>
                            
                            <div className="sf-form-group">
                              <label>Characters in Panel</label>
                              <input 
                                type="text" 
                                value={panel.characters?.join(', ') || ''} 
                                onChange={e => setEditData(p => ({
                                  ...p,
                                  panels: p.panels.map((pnl, i) => i === idx ? { 
                                    ...pnl, 
                                    characters: e.target.value.split(',').map(c => c.trim()).filter(Boolean) 
                                  } : pnl)
                                }))}
                                placeholder="Character names, comma separated"
                              />
                            </div>
                            
                            <div className="sf-form-group">
                              <label>Visual Description (for artist)</label>
                              <textarea 
                                value={panel.visualDescription || ''} 
                                onChange={e => setEditData(p => ({
                                  ...p,
                                  panels: p.panels.map((pnl, i) => i === idx ? { ...pnl, visualDescription: e.target.value } : pnl)
                                }))}
                                rows={3}
                                placeholder="Detailed description including character positions, expressions, lighting, environment..."
                              />
                            </div>
                            
                            <div className="sf-form-group">
                              <label>Action</label>
                              <input 
                                type="text" 
                                value={panel.action || ''} 
                                onChange={e => setEditData(p => ({
                                  ...p,
                                  panels: p.panels.map((pnl, i) => i === idx ? { ...pnl, action: e.target.value } : pnl)
                                }))}
                                placeholder="Physical action happening in this moment"
                              />
                            </div>
                            
                            {/* Dialogue Editor */}
                            <div className="sf-dialogue-editor">
                              <div className="sf-dialogue-header">
                                <label>Dialogue & Captions</label>
                                <button 
                                  className="sf-btn sf-btn-small"
                                  onClick={() => setEditData(p => ({
                                    ...p,
                                    panels: p.panels.map((pnl, i) => i === idx ? {
                                      ...pnl,
                                      dialogue: [...(pnl.dialogue || []), { speaker: '', text: '', type: 'speech', direction: '' }]
                                    } : pnl)
                                  }))}
                                >
                                  <Icons.Plus /> Add
                                </button>
                              </div>
                              
                              {(panel.dialogue || []).map((d, didx) => (
                                <div key={didx} className="sf-dialogue-edit-row">
                                  <select 
                                    value={d.type || 'speech'}
                                    onChange={e => setEditData(p => ({
                                      ...p,
                                      panels: p.panels.map((pnl, i) => i === idx ? {
                                        ...pnl,
                                        dialogue: pnl.dialogue.map((dlg, di) => di === didx ? { ...dlg, type: e.target.value } : dlg)
                                      } : pnl)
                                    }))}
                                  >
                                    <option value="speech">Speech</option>
                                    <option value="thought">Thought</option>
                                    <option value="caption">Caption</option>
                                    <option value="narration">Narration</option>
                                  </select>
                                  
                                  {d.type !== 'caption' && d.type !== 'narration' && (
                                    <input 
                                      type="text" 
                                      value={d.speaker || ''} 
                                      onChange={e => setEditData(p => ({
                                        ...p,
                                        panels: p.panels.map((pnl, i) => i === idx ? {
                                          ...pnl,
                                          dialogue: pnl.dialogue.map((dlg, di) => di === didx ? { ...dlg, speaker: e.target.value } : dlg)
                                        } : pnl)
                                      }))}
                                      placeholder="Speaker"
                                      className="sf-dialogue-speaker"
                                    />
                                  )}
                                  
                                  <input 
                                    type="text" 
                                    value={d.text || ''} 
                                    onChange={e => setEditData(p => ({
                                      ...p,
                                      panels: p.panels.map((pnl, i) => i === idx ? {
                                        ...pnl,
                                        dialogue: pnl.dialogue.map((dlg, di) => di === didx ? { ...dlg, text: e.target.value } : dlg)
                                      } : pnl)
                                    }))}
                                    placeholder="Dialogue text"
                                    className="sf-dialogue-text"
                                  />
                                  
                                  <input 
                                    type="text" 
                                    value={d.direction || ''} 
                                    onChange={e => setEditData(p => ({
                                      ...p,
                                      panels: p.panels.map((pnl, i) => i === idx ? {
                                        ...pnl,
                                        dialogue: pnl.dialogue.map((dlg, di) => di === didx ? { ...dlg, direction: e.target.value } : dlg)
                                      } : pnl)
                                    }))}
                                    placeholder="Direction"
                                    className="sf-dialogue-direction"
                                  />
                                  
                                  <button 
                                    className="sf-btn sf-btn-small sf-btn-danger"
                                    onClick={() => setEditData(p => ({
                                      ...p,
                                      panels: p.panels.map((pnl, i) => i === idx ? {
                                        ...pnl,
                                        dialogue: pnl.dialogue.filter((_, di) => di !== didx)
                                      } : pnl)
                                    }))}
                                  >
                                    <Icons.X />
                                  </button>
                                </div>
                              ))}
                            </div>
                            
                            <div className="sf-form-row">
                              <div className="sf-form-group">
                                <label>SFX (Sound Effects)</label>
                                <input 
                                  type="text" 
                                  value={panel.sfx || ''} 
                                  onChange={e => setEditData(p => ({
                                    ...p,
                                    panels: p.panels.map((pnl, i) => i === idx ? { ...pnl, sfx: e.target.value } : pnl)
                                  }))}
                                  placeholder="CRASH!, WHOOSH, etc."
                                />
                              </div>
                            </div>
                            
                            <div className="sf-form-group">
                              <label>Art Notes</label>
                              <textarea 
                                value={panel.artNotes || ''} 
                                onChange={e => setEditData(p => ({
                                  ...p,
                                  panels: p.panels.map((pnl, i) => i === idx ? { ...pnl, artNotes: e.target.value } : pnl)
                                }))}
                                rows={2}
                                placeholder="Lighting, mood, camera angle, special instructions..."
                              />
                            </div>
                          </div>
                        ) : (
                          // VIEW MODE
                          <>
                            <div className="sf-panel-header" onClick={() => userCanWrite && setEditingPanelIdx(idx)}>
                              <span className="sf-panel-number">Panel {panel.panelNumber}</span>
                              <span className="sf-panel-size">{panel.size}</span>
                              <span className="sf-panel-shot">{panel.shot}</span>
                              {userCanWrite && <span className="sf-panel-edit-hint"><Icons.Edit /> Edit</span>}
                            </div>
                            
                            {panel.characters?.length > 0 && (
                              <div className="sf-panel-characters">
                                <strong>Characters:</strong> {panel.characters.join(', ')}
                              </div>
                            )}
                            
                            <div className="sf-panel-visual">
                              <strong>Visual:</strong> {panel.visualDescription}
                            </div>
                            
                            {panel.action && (
                              <div className="sf-panel-action">
                                <strong>Action:</strong> {panel.action}
                              </div>
                            )}
                            
                            {panel.dialogue?.length > 0 && (
                              <div className="sf-panel-dialogue">
                                {panel.dialogue.map((d, didx) => (
                                  <div key={didx} className={`sf-dialogue-line sf-dialogue-${d.type}`}>
                                    {d.type === 'caption' ? (
                                      <span className="sf-caption">CAPTION: {d.text}</span>
                                    ) : d.type === 'narration' ? (
                                      <span className="sf-narration">NARRATION: {d.text}</span>
                                    ) : d.type === 'thought' ? (
                                      <span className="sf-thought">{d.speaker} (thought): {d.text}</span>
                                    ) : (
                                      <span className="sf-speech">
                                        <strong>{d.speaker}</strong>
                                        {d.direction && <em> ({d.direction})</em>}: {d.text}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {panel.sfx && (
                              <div className="sf-panel-sfx">
                                <strong>SFX:</strong> {panel.sfx}
                              </div>
                            )}
                            
                            {panel.artNotes && (
                              <div className="sf-panel-art-notes">
                                <strong>Art Notes:</strong> <em>{panel.artNotes}</em>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!editData.panels?.length && (
                <div className="sf-no-panels">
                  <Icons.FileText />
                  <p>No panel script generated yet.</p>
                  <div className="sf-no-panels-actions">
                    {aiConfigured && userCanGenerate && (
                      <button 
                        className="sf-btn sf-btn-ai"
                        onClick={() => setShowGenerate({ 
                          type: 'panels', 
                          bookId: selected.bookId, 
                          chapterId: selected.chapterId, 
                          beatId: selected.beatId,
                          pageNumber: selected.pageNumber 
                        })}
                      >
                        <Icons.Sparkles /> Generate Panel Script
                      </button>
                    )}
                    {userCanWrite && (
                      <button 
                        className="sf-btn"
                        onClick={() => {
                          const newPanel = {
                            panelNumber: 1,
                            size: 'medium',
                            shot: 'medium',
                            visualDescription: '',
                            characters: [],
                            action: '',
                            dialogue: [],
                            sfx: '',
                            artNotes: ''
                          };
                          setEditData(p => ({ ...p, panels: [newPanel] }));
                          setEditingPanelIdx(0);
                        }}
                      >
                        <Icons.Plus /> Add Panel Manually
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generation Modal */}
      {showGenerate && (
        <GenerationModalInline
          type={showGenerate.type}
          generating={generating}
          error={genError}
          onClose={() => { setShowGenerate(null); setGenError(null); }}
          onGenerate={(count, guidance) => {
            if (showGenerate.type === 'books') handleGenerateBooks(count, guidance);
            else if (showGenerate.type === 'chapters') handleGenerateChapters(showGenerate.bookId, count, guidance);
            else if (showGenerate.type === 'beats') handleGenerateBeats(showGenerate.bookId, showGenerate.chapterId, count, guidance);
            else if (showGenerate.type === 'pages') handleGeneratePages(showGenerate.bookId, showGenerate.chapterId, showGenerate.beatId, guidance);
            else if (showGenerate.type === 'panels') handleGeneratePanels(showGenerate.bookId, showGenerate.chapterId, showGenerate.beatId, showGenerate.pageNumber, guidance);
            else if (showGenerate.type === 'allPanels') handleGenerateAllPanels(showGenerate.bookId, showGenerate.chapterId, showGenerate.beatId, guidance);
          }}
          context={{ 
            project, entities, narrative, 
            bookNumber: showGenerate.bookNumber, 
            chapterNumber: showGenerate.chapterNumber,
            beat: showGenerate.beat,
            pageNumber: showGenerate.pageNumber
          }}
        />
      )}
      
      {/* Script Export Modal */}
      {showScriptExport && (
        <Modal title="Export Script" onClose={() => setShowScriptExport(null)}>
          <div className="sf-script-export">
            <p>Export panel scripts for:</p>
            <div className="sf-script-export-info">
              <strong>Book {showScriptExport.bookNumber}, Chapter {showScriptExport.chapterNumber}</strong>
              <br />
              Beat: {showScriptExport.beat?.title}
            </div>
            
            <h4>Script Format (Industry Standard)</h4>
            <div className="sf-export-options">
              <button 
                className="sf-btn sf-btn-primary"
                onClick={() => handleExportScript(showScriptExport.bookNumber, showScriptExport.chapterNumber, 'full')}
              >
                <Icons.FileText /> Export Chapter Script
              </button>
              <button 
                className="sf-btn"
                onClick={() => handleExportScript(showScriptExport.bookNumber, null, 'full')}
              >
                <Icons.BookOpen /> Export Full Book Script
              </button>
            </div>
            
            <h4>JSON Format (Complete Data)</h4>
            <div className="sf-export-options">
              <button 
                className="sf-btn sf-btn-secondary"
                onClick={() => handleExportScript(showScriptExport.bookNumber, showScriptExport.chapterNumber, 'json')}
              >
                <Icons.Code /> Export Chapter JSON
              </button>
              <button 
                className="sf-btn sf-btn-secondary"
                onClick={() => handleExportScript(showScriptExport.bookNumber, null, 'json')}
              >
                <Icons.Code /> Export Book JSON
              </button>
            </div>
            
            <p className="sf-export-note">
              <small>Script format is ready for artists/letterers. JSON includes all atomic elements for backup/import.</small>
            </p>
          </div>
        </Modal>
      )}
      
      {/* Script Preview Modal */}
      {scriptPreview && (
        <ScriptPreviewModal
          narrative={narrative}
          bookNumber={scriptPreview.bookNumber}
          chapterNumber={scriptPreview.chapterNumber}
          onClose={() => setScriptPreview(null)}
          onExport={handleExportScript}
        />
      )}
      
      {/* Regenerate Single Item Modal */}
      {showRegenerate && (
        <RegenerateModal
          type={showRegenerate.type}
          item={showRegenerate.book || showRegenerate.chapter || showRegenerate.beat}
          generating={generating}
          error={genError}
          onClose={() => { setShowRegenerate(null); setGenError(null); }}
          onRegenerate={handleRegenerateSingle}
        />
      )}
    </div>
  );
}

// Export Modal with multiple format options
function ExportModal({ project, narrative, onClose }) {
  const [exporting, setExporting] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  
  const handleExport = async (type) => {
    setExporting(true);
    try {
      switch (type) {
        case 'json':
          await importExportService.downloadJSON(project.id, project.name);
          break;
        case 'markdown':
          await importExportService.downloadMarkdown(project.id, project.name);
          break;
        case 'series-outline':
          await importExportService.downloadSeriesOutline(project.id, project.name);
          break;
        case 'beat-sheet':
          if (!selectedBook) { alert('Please select a book first'); setExporting(false); return; }
          await importExportService.downloadBeatSheet(project.id, project.name, selectedBook);
          break;
        case 'chapter-script':
          if (!selectedBook || !selectedChapter) { alert('Please select a book and chapter first'); setExporting(false); return; }
          await importExportService.downloadChapterScript(project.id, project.name, selectedBook, selectedChapter);
          break;
        case 'comic-script-book':
          if (!selectedBook) { alert('Please select a book first'); setExporting(false); return; }
          await importExportService.downloadComicScript(project.id, project.name, selectedBook);
          break;
        case 'comic-script-chapter':
          if (!selectedBook || !selectedChapter) { alert('Please select a book and chapter first'); setExporting(false); return; }
          await importExportService.downloadComicScript(project.id, project.name, selectedBook, selectedChapter);
          break;
      }
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    }
    setExporting(false);
  };
  
  const books = narrative?.books || [];
  const chapters = selectedBook ? (books.find(b => b.number === selectedBook)?.chapters || []) : [];
  
  // Calculate stats for the selected book
  const selectedBookData = selectedBook ? books.find(b => b.number === selectedBook) : null;
  const bookStats = selectedBookData ? {
    chapters: selectedBookData.chapters?.length || 0,
    beats: selectedBookData.chapters?.reduce((sum, c) => sum + (c.beats?.length || 0), 0) || 0,
    pages: selectedBookData.chapters?.reduce((sum, c) => 
      sum + (c.beats?.reduce((bsum, b) => bsum + (b.pages?.length || 0), 0) || 0), 0) || 0,
    scriptedPages: selectedBookData.chapters?.reduce((sum, c) => 
      sum + (c.beats?.reduce((bsum, b) => bsum + (b.pages?.filter(p => p.panels?.length > 0).length || 0), 0) || 0), 0) || 0,
    panels: selectedBookData.chapters?.reduce((sum, c) => 
      sum + (c.beats?.reduce((bsum, b) => bsum + (b.pages?.reduce((psum, p) => psum + (p.panels?.length || 0), 0) || 0), 0) || 0), 0) || 0
  } : null;
  
  return (
    <Modal title="Export Project" onClose={onClose} wide>
      <div className="sf-export-modal">
        <div className="sf-export-section">
          <h4>Full Project</h4>
          <div className="sf-export-options">
            <button className="sf-export-option" onClick={() => handleExport('json')} disabled={exporting}>
              <Icons.FileText />
              <div>
                <strong>World Bible (JSON)</strong>
                <span>Complete data with all pages & panels, can be re-imported</span>
              </div>
            </button>
            <button className="sf-export-option" onClick={() => handleExport('markdown')} disabled={exporting}>
              <Icons.FileText />
              <div>
                <strong>World Bible (Markdown)</strong>
                <span>Human-readable with entities, narrative structure & stats</span>
              </div>
            </button>
          </div>
        </div>
        
        <div className="sf-export-section">
          <h4>Narrative Exports</h4>
          <div className="sf-export-options">
            <button className="sf-export-option" onClick={() => handleExport('series-outline')} disabled={exporting || !narrative?.books?.length}>
              <Icons.BookOpen />
              <div>
                <strong>Series Outline</strong>
                <span>All books and chapters overview</span>
              </div>
            </button>
          </div>
        </div>
        
        <div className="sf-export-section">
          <h4>Book-Level Exports</h4>
          <div className="sf-export-selector">
            <select value={selectedBook || ''} onChange={e => { setSelectedBook(parseInt(e.target.value) || null); setSelectedChapter(null); }}>
              <option value="">Select a book...</option>
              {books.map(b => <option key={b.number} value={b.number}>Book {b.number}: {b.title}</option>)}
            </select>
          </div>
          {bookStats && (
            <div className="sf-export-stats">
              <span>{bookStats.chapters} chapters</span>
              <span>{bookStats.beats} beats</span>
              <span>{bookStats.pages} pages</span>
              <span>{bookStats.scriptedPages} scripted</span>
              <span>{bookStats.panels} panels</span>
            </div>
          )}
          <div className="sf-export-options">
            <button className="sf-export-option" onClick={() => handleExport('beat-sheet')} disabled={exporting || !selectedBook}>
              <Icons.Layers />
              <div>
                <strong>Beat Sheet</strong>
                <span>Chapters, beats, page progress in table format</span>
              </div>
            </button>
            <button className="sf-export-option" onClick={() => handleExport('comic-script-book')} disabled={exporting || !selectedBook || !bookStats?.panels}>
              <Icons.FileText />
              <div>
                <strong>Full Comic Script (Book)</strong>
                <span>Industry-standard format for artists/letterers</span>
              </div>
            </button>
          </div>
        </div>
        
        <div className="sf-export-section">
          <h4>Chapter-Level Exports</h4>
          <div className="sf-export-selector">
            <select value={selectedChapter || ''} onChange={e => setSelectedChapter(parseInt(e.target.value) || null)} disabled={!selectedBook}>
              <option value="">Select a chapter...</option>
              {chapters.map(c => <option key={c.number} value={c.number}>Chapter {c.number}: {c.title}</option>)}
            </select>
          </div>
          <div className="sf-export-options">
            <button className="sf-export-option" onClick={() => handleExport('chapter-script')} disabled={exporting || !selectedBook || !selectedChapter}>
              <Icons.FileText />
              <div>
                <strong>Chapter Script (Full)</strong>
                <span>All pages & panels with character references</span>
              </div>
            </button>
            <button className="sf-export-option" onClick={() => handleExport('comic-script-chapter')} disabled={exporting || !selectedBook || !selectedChapter}>
              <Icons.FileText />
              <div>
                <strong>Comic Script (Chapter)</strong>
                <span>Industry-standard format for this chapter</span>
              </div>
            </button>
          </div>
        </div>
        
        {exporting && <div className="sf-export-status">Exporting...</div>}
      </div>
    </Modal>
  );
}

// Regenerate Single Item Modal
function RegenerateModal({ type, item, generating, error, onClose, onRegenerate }) {
  const [guidance, setGuidance] = useState('');
  
  const typeLabels = { book: 'Book', chapter: 'Chapter', beat: 'Beat' };
  
  return (
    <Modal title={`Regenerate ${typeLabels[type]}: ${item.title || 'Untitled'}`} onClose={onClose}>
      <div className="sf-regenerate-modal">
        <div className="sf-current-content">
          <h4>Current Content:</h4>
          <div className="sf-current-preview">
            <strong>{item.title}</strong>
            <p>{item.logline || item.summary || item.purpose || 'No content'}</p>
          </div>
        </div>
        
        <div className="sf-form-group">
          <label>Regeneration Guidance</label>
          <textarea
            value={guidance}
            onChange={e => setGuidance(e.target.value)}
            placeholder={`How should this ${type} be different? E.g., "Make it more suspenseful" or "Focus on character development"`}
            rows={3}
          />
        </div>
        
        {error && <div className="sf-generation-error"><strong>Error:</strong> {error}</div>}
        
        <div className="sf-modal-actions">
          <button className="sf-btn" onClick={onClose} disabled={generating}>Cancel</button>
          <button className="sf-btn sf-btn-ai" onClick={() => onRegenerate(guidance)} disabled={generating}>
            {generating ? 'Regenerating...' : <><Icons.Sparkles /> Regenerate</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Script Preview Modal - Shows formatted script before export
function ScriptPreviewModal({ narrative, bookNumber, chapterNumber, onClose, onExport }) {
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const generateScript = async () => {
      setLoading(true);
      try {
        const text = await generationService.exportScript(narrative, bookNumber, chapterNumber);
        setScript(text);
      } catch (err) {
        setScript(`Error generating script: ${err.message}`);
      }
      setLoading(false);
    };
    generateScript();
  }, [narrative, bookNumber, chapterNumber]);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const book = narrative?.books?.find(b => b.number === bookNumber);
  const chapter = chapterNumber ? book?.chapters?.find(c => c.number === chapterNumber) : null;
  
  return (
    <Modal 
      title={chapter 
        ? `Script: Chapter ${chapterNumber} - ${chapter.title}` 
        : `Script: Book ${bookNumber} - ${book?.title}`
      } 
      onClose={onClose} 
      wide
    >
      <div className="sf-script-preview-modal">
        <div className="sf-script-info">
          <span>Book {bookNumber}: {book?.title}</span>
          {chapter && <span>Chapter {chapterNumber}: {chapter.title}</span>}
        </div>
        
        {loading ? (
          <div className="sf-script-loading">
            <div className="sf-loading-spinner" />
            <p>Generating script preview...</p>
          </div>
        ) : (
          <>
            <div className="sf-script-content">
              <pre>{script}</pre>
            </div>
            
            <div className="sf-script-stats">
              <span>{script.split('\n').length} lines</span>
              <span>~{Math.round(script.length / 5)} words</span>
              <span>{(script.match(/PANEL \d+/g) || []).length} panels</span>
            </div>
          </>
        )}
        
        <div className="sf-modal-actions">
          <button className="sf-btn" onClick={handleCopy} disabled={loading}>
            {copied ? <><Icons.Check /> Copied!</> : <><Icons.Copy /> Copy to Clipboard</>}
          </button>
          <button className="sf-btn" onClick={onClose}>Close</button>
          <button 
            className="sf-btn sf-btn-primary" 
            onClick={() => { onExport(bookNumber, chapterNumber); onClose(); }}
            disabled={loading}
          >
            <Icons.Download /> Download Script
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Inline generation modal for narrative panel
function GenerationModalInline({ type, generating, error, onClose, onGenerate, context }) {
  const [count, setCount] = useState(
    type === 'books' ? 12 : 
    type === 'chapters' ? 10 : 
    type === 'beats' ? 5 : 1
  );
  const [guidance, setGuidance] = useState('');

  const typeLabels = { 
    books: 'Book Outlines', 
    chapters: 'Chapters', 
    beats: 'Scene Beats',
    pages: 'Page Breakdown',
    panels: 'Panel Script',
    allPanels: 'All Panel Scripts'
  };
  
  const typeDescriptions = {
    books: 'Generate book outlines for your series with loglines, themes, and page estimates.',
    chapters: 'Generate chapter outlines with summaries, POV characters, and emotional arcs.',
    beats: 'Generate scene beats with purposes, characters, and locations.',
    pages: 'Break down this beat into individual pages with visual focus and pacing.',
    panels: 'Generate a detailed panel-by-panel script with dialogue, action, and art notes.',
    allPanels: 'Generate panel scripts for ALL pages in this beat at once.'
  };
  
  const maxCounts = { books: 20, chapters: 15, beats: 10, pages: 1, panels: 1, allPanels: 1 };
  const showCount = ['books', 'chapters', 'beats'].includes(type);

  return (
    <Modal title={`Generate ${typeLabels[type]}`} onClose={onClose} wide>
      <div className="sf-generation-modal">
        <div className="sf-generation-config">
          <p className="sf-generation-description">{typeDescriptions[type]}</p>
          
          {showCount && (
            <div className="sf-form-group">
              <label>Number to Generate</label>
              <input
                type="number"
                min="1"
                max={maxCounts[type]}
                value={count}
                onChange={e => setCount(parseInt(e.target.value) || 1)}
              />
            </div>
          )}
          
          <div className="sf-form-group">
            <label>Additional Guidance (optional)</label>
            <textarea
              value={guidance}
              onChange={e => setGuidance(e.target.value)}
              placeholder={
                type === 'pages' ? 'E.g., "Use dramatic pacing" or "Focus on dialogue"' :
                type === 'panels' || type === 'allPanels' ? 'E.g., "Use close-ups for emotional beats" or "Include establishing shots"' :
                'Any specific direction? E.g., "Focus on building tension" or "Include more action"'
              }
              rows={3}
            />
          </div>

          <div className="sf-generation-context">
            <h4>Context Being Used:</h4>
            <ul>
              <li>✓ Series: {context.project?.name || 'Untitled'}</li>
              <li>✓ {context.entities?.filter(e => e.type === 'character').length || 0} characters</li>
              <li>✓ {context.entities?.filter(e => e.type === 'location').length || 0} locations</li>
              <li>✓ {context.entities?.filter(e => e.type === 'world_rule').length || 0} world rules</li>
              {type !== 'books' && <li>✓ Book {context.bookNumber} context</li>}
              {['beats', 'pages', 'panels', 'allPanels'].includes(type) && <li>✓ Chapter {context.chapterNumber} context</li>}
              {['pages', 'panels', 'allPanels'].includes(type) && context.beat && (
                <li>✓ Beat: {context.beat.title} ({context.beat.estimatedPages}pp)</li>
              )}
              {type === 'panels' && context.pageNumber && (
                <li>✓ Page {context.pageNumber}</li>
              )}
              {type === 'allPanels' && context.beat?.pages && (
                <li>✓ {context.beat.pages.length} pages to script</li>
              )}
            </ul>
          </div>

          {type === 'allPanels' && (
            <div className="sf-generation-warning">
              <strong>⚠️ Note:</strong> This will generate scripts for all {context.beat?.pages?.length || 0} pages sequentially. 
              This may take a few minutes.
            </div>
          )}

          {error && (
            <div className="sf-generation-error">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="sf-modal-actions">
            <button className="sf-btn" onClick={onClose} disabled={generating}>Cancel</button>
            <button 
              className="sf-btn sf-btn-primary sf-btn-generate"
              onClick={() => onGenerate(count, guidance)}
              disabled={generating}
            >
              {generating ? (
                <>{type === 'allPanels' ? 'Generating (this may take a minute)...' : 'Generating...'}</>
              ) : (
                <><Icons.Sparkles /> Generate {typeLabels[type]}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// TEAM PANEL
// ============================================================================
function TeamPanel({ projectId, project, user, members, onRefresh }) {
  const [showInvite, setShowInvite] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [shareRole, setShareRole] = useState('editor');
  const [shareLinkExpiry, setShareLinkExpiry] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeInvites, setActiveInvites] = useState([]);
  const [pendingEmailInvites, setPendingEmailInvites] = useState([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Check if current user is the original owner
  const isOriginalOwner = project?.ownerId === user?.uid;
  
  // Check if current user has admin-level permissions (owner or admin role)
  const currentUserMember = members.find(m => m.uid === user?.uid);
  const isAdmin = isOriginalOwner || hasAdminPermissions(currentUserMember?.role);
  
  // For backward compatibility, isOwner now means "has admin permissions"
  const isOwner = isAdmin;
  const isEditor = isOwner || currentUserMember?.role === 'editor';
  
  // Load active invites and pending email invites
  useEffect(() => {
    if (isAdmin && projectId) {
      collaborationService.getActiveInvites(projectId).then(setActiveInvites).catch(console.error);
      projectService.getPendingInvites(projectId).then(setPendingEmailInvites).catch(console.error);
    }
  }, [projectId, isAdmin]);
  
  const handleInvite = async (e) => { 
    e.preventDefault(); 
    if (!inviteEmail.trim() || loading) return; 
    setLoading(true); 
    setError(''); 
    setSuccessMessage('');
    try { 
      const result = await projectService.addMember(projectId, inviteEmail.trim(), inviteRole);
      if (result.pending) {
        // User not found, invitation is pending
        setSuccessMessage(`Invitation sent to ${inviteEmail}. They will be added when they sign in.`);
        // Refresh pending invites list
        const pending = await projectService.getPendingInvites(projectId);
        setPendingEmailInvites(pending);
      } else {
        // User was found and added immediately
        setSuccessMessage(`${result.displayName || result.email} has been added to the project!`);
        onRefresh();
      }
      setInviteEmail('');
      setTimeout(() => {
        setShowInvite(false);
        setSuccessMessage('');
      }, 2000);
    } catch (err) { 
      setError(err.message); 
    } 
    setLoading(false); 
  };
  
  const handleCancelPendingInvite = async (email) => {
    try {
      await projectService.cancelPendingInvite(projectId, email);
      setPendingEmailInvites(prev => prev.filter(p => p.email !== email));
    } catch (err) {
      console.error('Failed to cancel invite:', err);
    }
  };
  
  const handleGenerateLink = async () => {
    setLoading(true);
    setError('');
    try {
      const inviteId = await collaborationService.createInviteLink(projectId, user.uid, shareRole, shareLinkExpiry);
      const link = `${window.location.origin}${window.location.pathname}?join=${projectId}&invite=${inviteId}`;
      setGeneratedLink(link);
      // Refresh active invites
      const invites = await collaborationService.getActiveInvites(projectId);
      setActiveInvites(invites);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };
  
  const handleRevokeInvite = async (inviteId) => {
    try {
      await collaborationService.revokeInvite(projectId, inviteId);
      setActiveInvites(activeInvites.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleRemove = async (memberId) => { 
    if (!confirm('Remove this team member?')) return; 
    try { 
      await projectService.removeMember(projectId, memberId); 
      onRefresh(); 
    } catch (err) { 
      console.error(err); 
    } 
  };
  
  const handleRoleChange = async (memberId, newRole) => { 
    try { 
      await projectService.updateMemberRole(projectId, memberId, newRole); 
      onRefresh(); 
    } catch (err) { 
      console.error(err); 
    } 
  };
  
  return (
    <div className="sf-panel sf-team-panel">
      <div className="sf-panel-header">
        <h2>Team</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isOwner && (
            <button className="sf-btn sf-btn-secondary" onClick={() => setShowShareLink(true)}>
              <Icons.Link /> Share Link
            </button>
          )}
          {isOwner && (
            <button className="sf-btn sf-btn-primary" onClick={() => setShowInvite(true)}>
              <Icons.UserPlus /> Add by Email
            </button>
          )}
        </div>
      </div>
      
      {/* Team Members Grid */}
      <div className="sf-team-grid">
        {members.map(member => {
          const memberIsOriginalOwner = member.uid === project?.ownerId;
          const memberIsAdmin = hasAdminPermissions(member.role);
          // Admins can edit non-admin members. Admins can also edit other admins (except original owner).
          // Original owner is always protected and cannot be edited/removed.
          const canEditThisMember = isAdmin && member.uid !== user?.uid && !memberIsOriginalOwner;
          // Any admin can grant admin permissions (not just original owner)
          const canChangeToAdmin = isAdmin;
          
          return (
            <div key={member.uid || member.id} className={`sf-team-member ${member.uid === user?.uid ? 'sf-team-member-current' : ''} ${memberIsAdmin ? 'sf-team-member-admin' : ''}`}>
              <div className="sf-member-avatar" style={{ background: member.color || '#666' }}>
                {(member.displayName || member.email || '?')[0].toUpperCase()}
              </div>
              <div className="sf-member-info">
                <h4>
                  {member.displayName || member.email}
                  {member.uid === user?.uid && <span className="sf-badge">You</span>}
                  {memberIsOriginalOwner && <span className="sf-badge sf-badge-owner">Creator</span>}
                  {memberIsAdmin && !memberIsOriginalOwner && <span className="sf-badge sf-badge-admin">Admin</span>}
                </h4>
                {canEditThisMember ? (
                  <select 
                    value={member.role} 
                    onChange={e => handleRoleChange(member.uid, e.target.value)} 
                    className="sf-member-role-select"
                  >
                    {Object.values(USER_ROLES)
                      .filter(r => r.id !== 'owner') // Never show "owner" in dropdown
                      .map(r => <option key={r.id} value={r.id}>{r.label}</option>)
                    }
                  </select>
                ) : (
                  <span className="sf-member-role">
                    {memberIsOriginalOwner ? 'Owner' : (USER_ROLES[member.role?.toUpperCase()]?.label || member.role)}
                  </span>
                )}
                {member.email && <span className="sf-member-email">{member.email}</span>}
              </div>
              {canEditThisMember && (
                <button className="sf-member-remove" onClick={() => handleRemove(member.uid)} title="Remove from team">
                  <Icons.X />
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Active Invite Links */}
      {isAdmin && activeInvites.length > 0 && (
        <div className="sf-active-invites">
          <h3>Active Invite Links</h3>
          <div className="sf-invites-list">
            {activeInvites.map(invite => (
              <div key={invite.id} className="sf-invite-item">
                <div className="sf-invite-info">
                  <span className="sf-invite-role">{USER_ROLES[invite.role?.toUpperCase()]?.label || invite.role}</span>
                  <span className="sf-invite-expiry">
                    Expires: {new Date(invite.expiresAt?.toDate?.() || invite.expiresAt).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  className="sf-btn sf-btn-small sf-btn-danger" 
                  onClick={() => handleRevokeInvite(invite.id)}
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Pending Email Invites */}
      {isAdmin && pendingEmailInvites.length > 0 && (
        <div className="sf-pending-invites">
          <h3>📧 Pending Email Invites</h3>
          <p className="sf-pending-description">These users will be added automatically when they sign in.</p>
          <div className="sf-invites-list">
            {pendingEmailInvites.map(invite => (
              <div key={invite.id} className="sf-invite-item sf-invite-pending">
                <div className="sf-invite-info">
                  <span className="sf-invite-email">{invite.email}</span>
                  <span className="sf-invite-role">{USER_ROLES[invite.role?.toUpperCase()]?.label || invite.role}</span>
                </div>
                <button 
                  className="sf-btn sf-btn-small sf-btn-danger" 
                  onClick={() => handleCancelPendingInvite(invite.email)}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Role Permissions Reference */}
      <div className="sf-team-roles">
        <h3>Role Permissions</h3>
        <div className="sf-roles-grid">
          {Object.values(USER_ROLES).filter(r => r.id !== 'owner').map(r => (
            <div key={r.id} className={`sf-role-card ${r.isAdmin ? 'sf-role-card-admin' : ''}`}>
              <h4>{r.label}</h4>
              {r.description && <p className="sf-role-description">{r.description}</p>}
              <ul>{r.permissions.map(p => <li key={p}>{p}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
      
      {/* Add by Email Modal */}
      {showInvite && (
        <Modal title="Add Collaborator by Email" onClose={() => { setShowInvite(false); setSuccessMessage(''); setError(''); }}>
          <form onSubmit={handleInvite}>
            {error && <div className="sf-error-message">{error}</div>}
            {successMessage && <div className="sf-success-message">{successMessage}</div>}
            <div className="sf-form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={inviteEmail} 
                onChange={e => setInviteEmail(e.target.value)} 
                placeholder="collaborator@example.com" 
                required 
              />
              <small>
                Enter their email address. If they already have an account, they'll be added immediately. 
                Otherwise, they'll be added automatically when they sign in.
              </small>
            </div>
            <div className="sf-form-group">
              <label>Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                {Object.values(USER_ROLES)
                  .filter(r => r.id !== 'owner')
                  .map(r => <option key={r.id} value={r.id}>{r.label}{r.isAdmin ? ' (Full Control)' : ''}</option>)
                }
              </select>
              {inviteRole === 'admin' && (
                <small className="sf-admin-warning">⚠️ Admins have full control over this project, same as you.</small>
              )}
            </div>
            <div className="sf-modal-actions">
              <button type="button" className="sf-btn" onClick={() => { setShowInvite(false); setSuccessMessage(''); setError(''); }}>Cancel</button>
              <button type="submit" className="sf-btn sf-btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add to Team'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      
      {/* Share Link Modal */}
      {showShareLink && (
        <Modal title="Create Shareable Invite Link" onClose={() => { setShowShareLink(false); setGeneratedLink(''); }}>
          {error && <div className="sf-error-message">{error}</div>}
          
          {!generatedLink ? (
            <>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Generate a link that anyone can use to join this project. The link will expire after the specified time.
              </p>
              <div className="sf-form-group">
                <label>Role for Invitees</label>
                <select value={shareRole} onChange={e => setShareRole(e.target.value)}>
                  {Object.values(USER_ROLES)
                    .filter(r => r.id !== 'owner')
                    .map(r => <option key={r.id} value={r.id}>{r.label}{r.isAdmin ? ' (Full Control)' : ''}</option>)
                  }
                </select>
                {shareRole === 'admin' && (
                  <small className="sf-admin-warning">⚠️ Anyone with this link will get full admin control.</small>
                )}
              </div>
              <div className="sf-form-group">
                <label>Link Expires In</label>
                <select value={shareLinkExpiry} onChange={e => setShareLinkExpiry(Number(e.target.value))}>
                  <option value={1}>1 day</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <div className="sf-modal-actions">
                <button type="button" className="sf-btn" onClick={() => setShowShareLink(false)}>Cancel</button>
                <button 
                  className="sf-btn sf-btn-primary" 
                  onClick={handleGenerateLink}
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Link'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Share this link with your collaborators. They'll need to sign in (or create an account) to join.
              </p>
              <div className="sf-form-group">
                <label>Invite Link</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    value={generatedLink} 
                    readOnly 
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                  <button 
                    className={`sf-btn ${copySuccess ? 'sf-btn-success' : 'sf-btn-primary'}`}
                    onClick={handleCopyLink}
                  >
                    {copySuccess ? <><Icons.Check /> Copied!</> : <><Icons.Copy /> Copy</>}
                  </button>
                </div>
              </div>
              <div className="sf-modal-actions">
                <button 
                  className="sf-btn" 
                  onClick={() => { setShowShareLink(false); setGeneratedLink(''); }}
                >
                  Done
                </button>
                <button className="sf-btn sf-btn-secondary" onClick={() => setGeneratedLink('')}>
                  Generate Another
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// ACTIVITY PANEL
// ============================================================================
function ActivityPanel({ activities, entities, members, user }) {
  const getDesc = (a) => { const actor = members.find(m => m.uid === a.userId) || { displayName: 'Someone' }; const entity = entities.find(e => e.id === a.entityId); switch (a.type) { case 'create': return `${actor.displayName} created ${a.entityType} "${a.details?.name || entity?.name || 'Unknown'}"`; case 'update': return `${actor.displayName} updated ${entity?.name || 'an entity'}`; case 'delete': return `${actor.displayName} deleted ${a.entityType} "${a.details?.name || 'Unknown'}"`; default: return `${actor.displayName} performed an action`; } };
  return (
    <div className="sf-panel sf-activity-panel">
      <div className="sf-panel-header"><h2>Activity</h2></div>
      <div className="sf-activity-list">{activities.length === 0 ? <div className="sf-empty-state"><p>No activity yet.</p></div> : activities.map(a => (<div key={a.id} className="sf-activity-item"><div className="sf-activity-icon">{a.type === 'create' && <Icons.Plus />}{a.type === 'update' && <Icons.Edit />}{a.type === 'delete' && <Icons.Trash />}</div><div className="sf-activity-content"><p>{getDesc(a)}</p><span className="sf-activity-time">{formatRelativeTime(a.timestamp)}</span></div></div>))}</div>
    </div>
  );
}

// ============================================================================
// AUTH SCREEN
// ============================================================================
function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setError(''); try { if (mode === 'signup') { await authService.signUp(email, password, name); } else { await authService.signIn(email, password); } } catch (err) { setError(err.message); } setLoading(false); };
  const handleGoogle = async () => { setLoading(true); setError(''); try { await authService.signInWithGoogle(); } catch (err) { setError(err.message); } setLoading(false); };
  const handleGithub = async () => { setLoading(true); setError(''); try { await authService.signInWithGithub(); } catch (err) { setError(err.message); } setLoading(false); };
  
  return (
    <div className="sf-auth"><div className="sf-auth-card"><div className="sf-auth-logo">⚒️</div><h1>STORY FORGE</h1><p>Collaborative Narrative Architecture</p>{error && <div className="sf-error-message">{error}</div>}
      <form onSubmit={handleSubmit}>{mode === 'signup' && <div className="sf-form-group"><label>Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required /></div>}<div className="sf-form-group"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required /></div><div className="sf-form-group"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} /></div><button type="submit" className="sf-btn sf-btn-primary sf-btn-block" disabled={loading}>{loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}</button></form>
      <div className="sf-auth-divider"><span>or continue with</span></div><div className="sf-auth-social"><button className="sf-btn sf-btn-social" onClick={handleGoogle} disabled={loading}><span>🔵</span> Google</button><button className="sf-btn sf-btn-social" onClick={handleGithub} disabled={loading}><span>⚫</span> GitHub</button></div>
      <div className="sf-auth-switch">{mode === 'signin' ? <p>Don't have an account? <button onClick={() => setMode('signup')}>Sign up</button></p> : <p>Already have an account? <button onClick={() => setMode('signin')}>Sign in</button></p>}</div>
    </div></div>
  );
}

// ============================================================================
// CONTEXT SEEDING WIZARD
// ============================================================================
function ContextSeedingWizard({ user, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [contextText, setContextText] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [selectedEntities, setSelectedEntities] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  
  const handleExtract = () => {
    if (!contextText.trim()) return;
    const extractedData = extractEntitiesFromContext(contextText);
    const analysisData = analyzeNarrativeContext(contextText);
    setExtracted(extractedData);
    setAnalysis(analysisData);
    // Pre-select all extracted entities
    const selected = {};
    Object.entries(extractedData).forEach(([type, entities]) => {
      entities.forEach((e, i) => { selected[`${type}-${i}`] = true; });
    });
    setSelectedEntities(selected);
    setStep(2);
  };
  
  const toggleEntity = (key) => {
    setSelectedEntities(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const updateEntity = (type, index, updates) => {
    setExtracted(prev => {
      const newExtracted = { ...prev };
      newExtracted[type] = [...prev[type]];
      newExtracted[type][index] = { ...newExtracted[type][index], ...updates };
      return newExtracted;
    });
    setEditingEntity(null);
  };
  
  const handleCreate = async () => {
    setLoading(true);
    try {
      // Filter selected entities
      const filteredExtracted = {};
      Object.entries(extracted).forEach(([type, entities]) => {
        filteredExtracted[type] = entities.filter((_, i) => selectedEntities[`${type}-${i}`]);
      });
      
      const projectData = buildProjectFromExtraction(projectName, filteredExtracted, analysis, contextText);
      await onComplete(projectData);
    } catch (err) {
      console.error(err);
      alert('Failed to create project: ' + err.message);
    }
    setLoading(false);
  };
  
  const totalSelected = Object.values(selectedEntities).filter(Boolean).length;
  const totalExtracted = extracted ? Object.values(extracted).flat().length : 0;
  
  const typeLabels = { character: 'Characters', location: 'Locations', faction: 'Factions', artifact: 'Artifacts', creature: 'Creatures', world_rule: 'World Rules', event: 'Events' };
  const typeIcons = { character: '👤', location: '🏰', faction: '⚔️', artifact: '💎', creature: '🐉', world_rule: '⚖️', event: '📅' };
  
  return (
    <div className="sf-modal-overlay">
      <div className="sf-modal sf-modal-wizard">
        <div className="sf-modal-header">
          <h2><Icons.Sparkles /> Seed from Your Writing</h2>
          <button className="sf-modal-close" onClick={onClose}><Icons.X /></button>
        </div>
        <div className="sf-modal-content">
          {/* Progress */}
          <div className="sf-wizard-progress">
            <div className={`sf-wizard-step ${step >= 1 ? 'active' : ''}`}><span>1</span> Paste Context</div>
            <div className={`sf-wizard-step ${step >= 2 ? 'active' : ''}`}><span>2</span> Review Entities</div>
            <div className={`sf-wizard-step ${step >= 3 ? 'active' : ''}`}><span>3</span> Create Project</div>
          </div>
          
          {step === 1 && (
            <div className="sf-wizard-content">
              <div className="sf-form-group">
                <label>Project Name</label>
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="My Epic Story" />
              </div>
              <div className="sf-form-group">
                <label>Paste Your Story Notes, Outline, or World-Building Document</label>
                <textarea value={contextText} onChange={e => setContextText(e.target.value)} placeholder="Paste your story concept, character descriptions, world-building notes, plot outline, or any other relevant text here...

Example:
The story follows Kira Nightshade, a young mage who discovers she's the heir to the fallen kingdom of Valdoria. She must gather allies - including the gruff warrior Marcus Stone and the mysterious elf scholar Elara - to reclaim the Throne of Stars from the Dark Lord Malachar.

The world runs on Aether magic, drawn from emotional resonance. The ancient Keepers once maintained balance, but after the Sundering, magic became unpredictable...

Just paste your content and we'll extract characters, locations, factions, artifacts, and world rules automatically!" rows={12} className="sf-context-textarea" />
                <small>{contextText.length} characters • Tip: The more detail you include, the better the extraction</small>
              </div>
              <div className="sf-modal-actions">
                <button className="sf-btn" onClick={onClose}>Cancel</button>
                <button className="sf-btn sf-btn-primary" onClick={handleExtract} disabled={!projectName.trim() || !contextText.trim()}>
                  <Icons.Sparkles /> Extract Entities
                </button>
              </div>
            </div>
          )}
          
          {step === 2 && extracted && (
            <div className="sf-wizard-content">
              <div className="sf-extraction-summary">
                <p><strong>Found {totalExtracted} potential entities.</strong> Select which ones to include:</p>
                {analysis && analysis.themes.length > 0 && (
                  <p className="sf-detected-themes">Detected themes: {analysis.themes.join(', ')}</p>
                )}
                {analysis && analysis.genres.length > 0 && (
                  <p className="sf-detected-genres">Detected genres: {analysis.genres.join(', ')}</p>
                )}
              </div>
              
              <div className="sf-extracted-entities">
                {Object.entries(extracted).map(([type, entities]) => entities.length > 0 && (
                  <div key={type} className="sf-entity-type-group">
                    <h4>{typeIcons[type]} {typeLabels[type]} ({entities.filter((_, i) => selectedEntities[`${type}-${i}`]).length}/{entities.length})</h4>
                    <div className="sf-entity-list-extracted">
                      {entities.map((entity, i) => {
                        const key = `${type}-${i}`;
                        const isSelected = selectedEntities[key];
                        const isEditing = editingEntity === key;
                        
                        return (
                          <div key={key} className={`sf-extracted-entity ${isSelected ? 'selected' : ''}`}>
                            <label className="sf-entity-checkbox">
                              <input type="checkbox" checked={isSelected} onChange={() => toggleEntity(key)} />
                              <span className="sf-checkmark"><Icons.Check /></span>
                            </label>
                            {isEditing ? (
                              <div className="sf-entity-edit-inline">
                                <input type="text" value={entity.name} onChange={e => updateEntity(type, i, { name: e.target.value })} autoFocus />
                                <button className="sf-btn sf-btn-small" onClick={() => setEditingEntity(null)}>Done</button>
                              </div>
                            ) : (
                              <>
                                <div className="sf-entity-info">
                                  <strong>{entity.name}</strong>
                                  <span className="sf-entity-context">{entity.context?.slice(0, 100)}...</span>
                                </div>
                                <button className="sf-btn-icon" onClick={() => setEditingEntity(key)}><Icons.Edit /></button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {totalExtracted === 0 && (
                  <div className="sf-empty-state">
                    <p>No entities detected. Try adding more specific names, places, or descriptions to your text.</p>
                  </div>
                )}
              </div>
              
              <div className="sf-modal-actions">
                <button className="sf-btn" onClick={() => setStep(1)}>← Back</button>
                <button className="sf-btn sf-btn-primary" onClick={() => setStep(3)} disabled={totalSelected === 0}>
                  Continue with {totalSelected} entities →
                </button>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="sf-wizard-content">
              <div className="sf-creation-preview">
                <h3>Ready to Create: {projectName}</h3>
                <div className="sf-preview-stats">
                  {Object.entries(extracted).map(([type, entities]) => {
                    const count = entities.filter((_, i) => selectedEntities[`${type}-${i}`]).length;
                    return count > 0 ? <span key={type} className="sf-preview-stat">{typeIcons[type]} {count} {typeLabels[type]}</span> : null;
                  })}
                </div>
                {analysis && (
                  <div className="sf-preview-meta">
                    <p><strong>Genre:</strong> {analysis.genres[0] || 'Fantasy'}</p>
                    <p><strong>Themes:</strong> {analysis.themes.length > 0 ? analysis.themes.join(', ') : 'To be determined'}</p>
                  </div>
                )}
                <p className="sf-preview-note">All entities will be created as drafts. You can edit, add relationships, and expand them after creation.</p>
              </div>
              <div className="sf-modal-actions">
                <button className="sf-btn" onClick={() => setStep(2)}>← Back</button>
                <button className="sf-btn sf-btn-primary" onClick={handleCreate} disabled={loading}>
                  {loading ? 'Creating...' : <><Icons.Sparkles /> Create Project</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PROJECTS SCREEN
// ============================================================================
function ProjectsScreen({ user, projects, onSelectProject, onCreateProject, onDeleteProject, onSignOut, onCreateFromTemplate, onCreateFromContext }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [showContextSeed, setShowContextSeed] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleCreate = async (e) => { e.preventDefault(); if (!newName.trim() || loading) return; setLoading(true); try { await onCreateProject(newName.trim(), newDesc.trim()); setShowCreate(false); setNewName(''); setNewDesc(''); } catch (err) { console.error(err); } setLoading(false); };
  const handleImport = async (e) => { const file = e.target.files[0]; if (!file) return; setLoading(true); try { const text = await file.text(); const data = JSON.parse(text); await importExportService.importProject(user.uid, data); setShowImport(false); window.location.reload(); } catch (err) { console.error(err); alert('Import failed: ' + err.message); } setLoading(false); };
  
  const handleCreateTemplate = async () => {
    setLoading(true);
    try {
      await onCreateFromTemplate(TEMPLATE_DATA);
      setShowTemplate(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to create template: ' + err.message);
    }
    setLoading(false);
  };
  
  const handleContextSeedComplete = async (projectData) => {
    await onCreateFromContext(projectData);
    setShowContextSeed(false);
    window.location.reload();
  };
  
  return (
    <div className="sf-projects">
      <div className="sf-projects-header"><div className="sf-logo"><span className="sf-logo-icon">⚒️</span><span className="sf-logo-text">STORY FORGE</span></div><div className="sf-header-actions"><div className="sf-user-badge"><span className="sf-user-avatar" style={{ background: user?.color || '#666' }}>{(user?.displayName || user?.email || '?')[0].toUpperCase()}</span><span>{user?.displayName || user?.email}</span></div><button className="sf-btn sf-btn-small" onClick={onSignOut}><Icons.LogOut /> Sign Out</button></div></div>
      <div className="sf-projects-content"><h1>Your Projects</h1><p>Select a project to continue, or create a new one.</p>
        <div className="sf-projects-grid">
          <button className="sf-project-card sf-project-new" onClick={() => setShowCreate(true)}><Icons.Plus /><span>Create Blank Project</span></button>
          <button className="sf-project-card sf-project-new sf-project-template" onClick={() => setShowTemplate(true)}><Icons.BookOpen /><span>Start from Template</span><small>Demo world included</small></button>
          <button className="sf-project-card sf-project-new sf-project-seed" onClick={() => setShowContextSeed(true)}><Icons.Sparkles /><span>Seed from Your Writing</span><small>Paste notes, extract entities</small></button>
          <button className="sf-project-card sf-project-new" onClick={() => setShowImport(true)}><Icons.Upload /><span>Import Project</span></button>
          {projects.map(p => (<div key={p.id} className="sf-project-card" onClick={() => onSelectProject(p)}><div className="sf-project-icon">📚</div><h3>{p.name}</h3><p>{p.description || 'No description'}</p><div className="sf-project-meta"><span>{formatDate(p.updatedAt)}</span>{p.memberIds?.length > 1 && <span>{p.memberIds.length} members</span>}</div>{p.ownerId === user?.uid && <button className="sf-project-delete" onClick={e => { e.stopPropagation(); onDeleteProject(p.id); }}><Icons.Trash /></button>}</div>))}
        </div>
      </div>
      {showCreate && <Modal title="Create Blank Project" onClose={() => setShowCreate(false)}><form onSubmit={handleCreate}><div className="sf-form-group"><label>Project Name</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="My Epic Story" required autoFocus /></div><div className="sf-form-group"><label>Description</label><textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="A brief description..." rows={3} /></div><div className="sf-modal-actions"><button type="button" className="sf-btn" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="sf-btn sf-btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button></div></form></Modal>}
      {showImport && <Modal title="Import Project" onClose={() => setShowImport(false)}><div className="sf-import-content"><p>Select a Story Forge export file (.json) to import:</p><input type="file" accept=".json" onChange={handleImport} disabled={loading} />{loading && <p>Importing...</p>}</div></Modal>}
      {showTemplate && (
        <Modal title="Start from Template" onClose={() => setShowTemplate(false)}>
          <div className="sf-template-preview">
            <div className="sf-template-header">
              <h3>📚 Chronicles of the Shattered Realms</h3>
              <p>An epic fantasy saga exploring themes of power, redemption, and the cost of immortality.</p>
            </div>
            <div className="sf-template-stats">
              <div className="sf-stat"><span className="sf-stat-value">8</span><span className="sf-stat-label">Characters</span></div>
              <div className="sf-stat"><span className="sf-stat-value">6</span><span className="sf-stat-label">Locations</span></div>
              <div className="sf-stat"><span className="sf-stat-value">5</span><span className="sf-stat-label">Factions</span></div>
              <div className="sf-stat"><span className="sf-stat-value">4</span><span className="sf-stat-label">World Rules</span></div>
              <div className="sf-stat"><span className="sf-stat-value">3</span><span className="sf-stat-label">Books</span></div>
              <div className="sf-stat"><span className="sf-stat-value">15</span><span className="sf-stat-label">Relationships</span></div>
            </div>
            <p className="sf-template-note">This self-documenting example demonstrates all Story Forge features. Perfect for learning or as a starting point for your own epic fantasy.</p>
            <div className="sf-modal-actions">
              <button className="sf-btn" onClick={() => setShowTemplate(false)}>Cancel</button>
              <button className="sf-btn sf-btn-primary" onClick={handleCreateTemplate} disabled={loading}>
                {loading ? 'Creating...' : <><Icons.BookOpen /> Create from Template</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {showContextSeed && <ContextSeedingWizard user={user} onClose={() => setShowContextSeed(false)} onComplete={handleContextSeedComplete} />}
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [narrative, setNarrative] = useState(null);
  const [activities, setActivities] = useState([]);
  const [presence, setPresence] = useState({});
  const [activeTab, setActiveTab] = useState('entities');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [inviteStatus, setInviteStatus] = useState(null);
  const unsubscribesRef = useRef([]);

  // Check for invite link in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('join');
    const inviteId = params.get('invite');
    
    if (projectId && inviteId) {
      setPendingInvite({ projectId, inviteId });
      // Clean up URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Process pending invite when user is authenticated
  useEffect(() => {
    if (!pendingInvite || !user) return;
    
    const processInvite = async () => {
      setInviteStatus({ status: 'processing', message: 'Processing invite...' });
      try {
        // Check if user is already a member
        const project = await projectService.get(pendingInvite.projectId);
        if (!project) {
          setInviteStatus({ status: 'error', message: 'Project not found. The invite may be invalid.' });
          setPendingInvite(null);
          return;
        }
        
        if (project.memberIds?.includes(user.uid)) {
          setInviteStatus({ status: 'info', message: 'You are already a member of this project!' });
          // Load the project
          setCurrentProject(project);
          setTimeout(() => setInviteStatus(null), 3000);
          setPendingInvite(null);
          return;
        }
        
        // Accept the invite
        const role = await collaborationService.acceptInvite(pendingInvite.projectId, pendingInvite.inviteId, user.uid);
        setInviteStatus({ 
          status: 'success', 
          message: `Successfully joined "${project.name}" as ${role}!` 
        });
        
        // Refresh projects list and select the new project
        const userProjects = await projectService.getByUser(user.uid);
        setProjects(userProjects);
        setCurrentProject(project);
        
        setTimeout(() => setInviteStatus(null), 3000);
        setPendingInvite(null);
      } catch (err) {
        console.error('Invite error:', err);
        setInviteStatus({ 
          status: 'error', 
          message: err.message || 'Failed to process invite. It may have expired or already been used.'
        });
        setPendingInvite(null);
      }
    };
    
    processInvite();
  }, [pendingInvite, user]);

  useEffect(() => {
    let mounted = true;
    let timeoutId;
    
    // Timeout after 15 seconds
    timeoutId = setTimeout(() => {
      if (mounted && authLoading) {
        console.error('Auth timeout - Firebase may not be configured correctly');
        setAuthError('Connection timeout. Check Firebase configuration and internet connection.');
        setAuthLoading(false);
      }
    }, 15000);
    
    try {
      const unsubscribe = authService.onAuthChange(async (firebaseUser) => {
        if (!mounted) return;
        clearTimeout(timeoutId);
        
        try {
          if (firebaseUser) {
            console.log('User authenticated:', firebaseUser.email);
            setUser(firebaseUser);
            const profile = await authService.getUserProfile(firebaseUser.uid);
            setUserProfile(profile);
            const userProjects = await projectService.getByUser(firebaseUser.uid);
            setProjects(userProjects);
          } else {
            console.log('No user signed in');
            setUser(null);
            setUserProfile(null);
            setProjects([]);
            setCurrentProject(null);
          }
          setAuthError(null);
        } catch (err) {
          console.error('Auth callback error:', err);
          setAuthError(err.message);
        }
        setAuthLoading(false);
      });
      
      return () => {
        mounted = false;
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (err) {
      console.error('Auth setup error:', err);
      setAuthError(err.message);
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    unsubscribesRef.current.forEach(unsub => unsub()); unsubscribesRef.current = [];
    if (!currentProject || !user) {
      apiConfig.clearProjectSettings();
      return;
    }
    presenceService.setPresence(currentProject.id, user.uid, { displayName: userProfile?.displayName || user.email, color: userProfile?.color });
    const unsubEntities = entityService.subscribe(currentProject.id, setEntities); unsubscribesRef.current.push(unsubEntities);
    const unsubRels = relationshipService.subscribe(currentProject.id, setRelationships); unsubscribesRef.current.push(unsubRels);
    const unsubActs = activityService.subscribe(currentProject.id, setActivities); unsubscribesRef.current.push(unsubActs);
    const unsubPresence = presenceService.subscribe(currentProject.id, setPresence); unsubscribesRef.current.push(unsubPresence);
    
    // Subscribe to real-time narrative updates
    const unsubNarrative = narrativeService.subscribe(currentProject.id, (updatedNarrative) => {
      console.log('Narrative updated in real-time');
      setNarrative(updatedNarrative);
    });
    unsubscribesRef.current.push(unsubNarrative);
    
    // Subscribe to project API settings
    const unsubApiSettings = projectApiService.subscribe(currentProject.id, (settings) => {
      if (settings) {
        console.log('Project API settings loaded');
        apiConfig.setProjectSettings(settings);
      } else {
        apiConfig.clearProjectSettings();
      }
    });
    unsubscribesRef.current.push(unsubApiSettings);
    
    // Load narrative with error handling
    console.log('Loading narrative for project:', currentProject.id);
    narrativeService.getOrInit(currentProject.id, currentProject.name, user.uid)
      .then(data => {
        console.log('Narrative loaded:', data);
        setNarrative(data);
      })
      .catch(err => {
        console.error('Failed to load narrative:', err);
        // Set a default empty narrative so UI doesn't get stuck
        setNarrative({
          id: 'series',
          title: currentProject.name || 'Untitled Series',
          logline: '',
          themes: [],
          targetLength: 1,
          books: []
        });
      });
    
    projectService.getMembers(currentProject.id).then(setMembers);
    return () => { presenceService.setOffline(currentProject.id, user.uid); unsubscribesRef.current.forEach(unsub => unsub()); };
  }, [currentProject, user, userProfile]);

  useEffect(() => { if (currentProject && user) presenceService.updateActivity(currentProject.id, user.uid, { currentPanel: activeTab }); }, [activeTab, currentProject, user]);
  useEffect(() => { const handleBeforeUnload = () => { if (currentProject && user) presenceService.setOffline(currentProject.id, user.uid); }; window.addEventListener('beforeunload', handleBeforeUnload); return () => window.removeEventListener('beforeunload', handleBeforeUnload); }, [currentProject, user]);

  const handleCreateProject = async (name, description) => { const projectId = await projectService.create(user.uid, name, description); const newProject = await projectService.get(projectId); setProjects(prev => [newProject, ...prev]); return projectId; };
  const handleDeleteProject = async (projectId) => { if (!confirm('Delete this project and all its data? This cannot be undone.')) return; await projectService.delete(projectId); setProjects(prev => prev.filter(p => p.id !== projectId)); if (currentProject?.id === projectId) setCurrentProject(null); };
  const handleSignOut = async () => { if (currentProject && user) await presenceService.setOffline(currentProject.id, user.uid); await authService.signOut(); };
  const handleExportJSON = async () => { 
    try {
      setLoading(true);
      await importExportService.downloadJSON(currentProject.id, currentProject.name); 
      setShowModal(null);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleExportMarkdown = async () => { 
    try {
      setLoading(true);
      await importExportService.downloadMarkdown(currentProject.id, currentProject.name); 
      setShowModal(null);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  const refreshNarrative = () => { narrativeService.getOrInit(currentProject.id, currentProject.name, user.uid).then(setNarrative).catch(err => console.error('Failed to refresh narrative:', err)); };
  const refreshMembers = () => { projectService.getMembers(currentProject.id).then(setMembers); };
  
  // Template and Context Seeding handlers
  const handleCreateFromTemplate = async (templateData) => {
    const projectId = await projectService.create(user.uid, templateData.project.name, templateData.project.description);
    await projectService.update(projectId, { settings: templateData.project.settings });
    
    // Create entities and build ID map for relationships
    const idMap = {};
    for (let i = 0; i < templateData.entities.length; i++) {
      const entity = templateData.entities[i];
      const { type, name, ...rest } = entity;
      const newId = await entityService.create(projectId, type, name, rest, user.uid);
      idMap[i] = newId;
    }
    
    // Create relationships using the ID map
    for (const rel of templateData.relationships) {
      const sourceId = idMap[rel.sourceIdx];
      const targetId = idMap[rel.targetIdx];
      if (sourceId && targetId) {
        await relationshipService.create(projectId, sourceId, targetId, rel.type, rel.description, user.uid);
      }
    }
    
    // Set up narrative structure
    if (templateData.narrative) {
      await narrativeService.updateSeries(projectId, {
        title: templateData.narrative.title,
        logline: templateData.narrative.logline,
        themes: templateData.narrative.themes,
        targetLength: templateData.narrative.targetLength,
        status: templateData.narrative.status
      }, user.uid);
      
      for (const book of templateData.narrative.books || []) {
        const bookId = await narrativeService.addBook(projectId, {
          number: book.number,
          title: book.title,
          logline: book.logline,
          estimatedPages: book.estimatedPages,
          status: book.status
        }, user.uid);
        
        for (const chapter of book.chapters || []) {
          await narrativeService.addChapter(projectId, bookId, {
            number: chapter.number,
            title: chapter.title,
            summary: chapter.summary,
            estimatedPages: chapter.estimatedPages,
            status: chapter.status
          }, user.uid);
        }
      }
    }
    
    const newProject = await projectService.get(projectId);
    setProjects(prev => [newProject, ...prev]);
    return projectId;
  };
  
  const handleCreateFromContext = async (projectData) => {
    const projectId = await projectService.create(user.uid, projectData.project.name, projectData.project.description);
    await projectService.update(projectId, { settings: projectData.project.settings });
    
    // Create entities
    for (const entity of projectData.entities) {
      const { type, name, ...rest } = entity;
      await entityService.create(projectId, type, name, rest, user.uid);
    }
    
    // Set up narrative
    if (projectData.narrative) {
      await narrativeService.updateSeries(projectId, {
        title: projectData.narrative.title,
        logline: projectData.narrative.logline,
        themes: projectData.narrative.themes,
        targetLength: projectData.narrative.targetLength,
        status: projectData.narrative.status
      }, user.uid);
    }
    
    const newProject = await projectService.get(projectId);
    setProjects(prev => [newProject, ...prev]);
    return projectId;
  };

  if (authLoading) return (
    <div className="sf-loading">
      <div className="sf-loading-content">
        <div className="sf-loading-logo">⚒️</div>
        <h1>STORY FORGE</h1>
        <p>Loading...</p>
        <div className="sf-loading-bar"><div className="sf-loading-progress" /></div>
      </div>
    </div>
  );
  
  if (authError) return (
    <div className="sf-loading">
      <div className="sf-loading-content">
        <div className="sf-loading-logo">⚠️</div>
        <h1>Connection Error</h1>
        <p style={{ color: '#EF4444', marginBottom: '1rem' }}>{authError}</p>
        <p style={{ fontSize: '0.85rem', color: '#888' }}>Please check:</p>
        <ul style={{ fontSize: '0.85rem', color: '#888', textAlign: 'left', marginBottom: '1rem' }}>
          <li>Your internet connection</li>
          <li>Firebase domain authorization</li>
          <li>Browser console for details (F12)</li>
        </ul>
        <button onClick={() => window.location.reload()} className="sf-btn sf-btn-primary">Retry</button>
      </div>
    </div>
  );
  
  if (!user) return <AuthScreen />;
  if (!currentProject) return <ProjectsScreen user={userProfile || user} projects={projects} onSelectProject={setCurrentProject} onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject} onSignOut={handleSignOut} onCreateFromTemplate={handleCreateFromTemplate} onCreateFromContext={handleCreateFromContext} />;

  return (
    <div className="sf-app">
      {/* Invite Status Toast */}
      {inviteStatus && (
        <div className={`sf-invite-toast sf-invite-toast-${inviteStatus.status}`}>
          {inviteStatus.status === 'processing' && <span className="sf-toast-spinner" />}
          {inviteStatus.status === 'success' && <Icons.Check />}
          {inviteStatus.status === 'error' && <Icons.X />}
          {inviteStatus.status === 'info' && <Icons.Users />}
          <span>{inviteStatus.message}</span>
          <button onClick={() => setInviteStatus(null)}><Icons.X /></button>
        </div>
      )}
      <aside className={`sf-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sf-sidebar-header"><div className="sf-logo"><span className="sf-logo-icon">⚒️</span>{!sidebarCollapsed && <span className="sf-logo-text">STORY FORGE</span>}</div><button className="sf-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>{sidebarCollapsed ? <Icons.ChevronRight /> : <Icons.ChevronDown />}</button></div>
        <div className="sf-sidebar-project"><button className="sf-project-switcher" onClick={() => setCurrentProject(null)}><Icons.Folder />{!sidebarCollapsed && <><span>{currentProject.name}</span><Icons.ChevronRight /></>}</button></div>
        {!sidebarCollapsed && <OnlineIndicator presence={presence} />}
        <nav className="sf-sidebar-nav"><NavItem icon={<Icons.Layers />} label="Entities" active={activeTab === 'entities'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('entities')} /><NavItem icon={<Icons.Network />} label="Relationships" active={activeTab === 'relationships'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('relationships')} /><NavItem icon={<Icons.Book />} label="Narrative" active={activeTab === 'narrative'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('narrative')} /><NavItem icon={<Icons.Users />} label="Team" active={activeTab === 'team'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('team')} badge={members.length > 1 ? members.length : null} /><NavItem icon={<Icons.Clock />} label="Activity" active={activeTab === 'activity'} collapsed={sidebarCollapsed} onClick={() => setActiveTab('activity')} /></nav>
        <div className="sf-sidebar-footer"><NavItem icon={<Icons.Sparkles />} label="AI Settings" collapsed={sidebarCollapsed} onClick={() => setShowModal('ai-settings')} /><NavItem icon={<Icons.Download />} label="Export" collapsed={sidebarCollapsed} onClick={() => setShowModal('export')} /><NavItem icon={<Icons.Settings />} label="Settings" collapsed={sidebarCollapsed} onClick={() => setShowModal('settings')} /><NavItem icon={<Icons.LogOut />} label="Sign Out" collapsed={sidebarCollapsed} onClick={handleSignOut} /></div>
        <div className="sf-sidebar-user"><span className="sf-user-avatar" style={{ background: userProfile?.color || '#666' }}>{(userProfile?.displayName || user?.email || '?')[0].toUpperCase()}</span>{!sidebarCollapsed && <span>{userProfile?.displayName || user?.email}</span>}</div>
      </aside>
      <main className="sf-main">
        {activeTab === 'entities' && <EntitiesPanel projectId={currentProject.id} project={currentProject} user={user} entities={entities} relationships={relationships} presence={presence} members={members} />}
        {activeTab === 'relationships' && <RelationshipsPanel projectId={currentProject.id} project={currentProject} user={user} entities={entities} relationships={relationships} members={members} />}
        {activeTab === 'narrative' && <NarrativePanel projectId={currentProject.id} project={currentProject} user={user} narrative={narrative} entities={entities} members={members} onRefresh={refreshNarrative} />}
        {activeTab === 'team' && <TeamPanel projectId={currentProject.id} project={currentProject} user={user} members={members} onRefresh={refreshMembers} />}
        {activeTab === 'activity' && <ActivityPanel activities={activities} entities={entities} members={members} user={user} />}
      </main>
      {showModal === 'export' && <ExportModal project={currentProject} narrative={narrative} onClose={() => setShowModal(null)} />}
      {showModal === 'ai-settings' && (
        <AISettingsModal 
          onClose={() => setShowModal(null)} 
          project={currentProject}
          user={user}
          isAdmin={(() => {
            if (!currentProject || !user) return false;
            if (currentProject.ownerId === user.uid) return true;
            const memberRole = currentProject.members?.[user.uid]?.role;
            return hasAdminPermissions(memberRole);
          })()}
        />
      )}
      {showModal === 'settings' && <Modal title="Project Settings" onClose={() => setShowModal(null)}><form onSubmit={async (e) => { e.preventDefault(); const f = e.target; await projectService.update(currentProject.id, { name: f.projectName.value, description: f.description.value, settings: { genre: f.genre.value, targetAudience: f.audience.value, format: f.format.value, tone: f.tone.value } }); const updated = await projectService.get(currentProject.id); setCurrentProject(updated); setShowModal(null); }}><div className="sf-form-group"><label>Project Name</label><input type="text" name="projectName" defaultValue={currentProject.name} required /></div><div className="sf-form-group"><label>Description</label><textarea name="description" defaultValue={currentProject.description} rows={3} /></div><div className="sf-form-row"><div className="sf-form-group"><label>Genre</label><input type="text" name="genre" defaultValue={currentProject.settings?.genre} placeholder="Dark Fantasy" /></div><div className="sf-form-group"><label>Tone</label><input type="text" name="tone" defaultValue={currentProject.settings?.tone} placeholder="Dark, suspenseful" /></div></div><div className="sf-form-row"><div className="sf-form-group"><label>Audience</label><input type="text" name="audience" defaultValue={currentProject.settings?.targetAudience} placeholder="Young Adult" /></div><div className="sf-form-group"><label>Format</label><select name="format" defaultValue={currentProject.settings?.format || 'graphic_novel'}><option value="graphic_novel">Graphic Novel</option><option value="novel">Novel</option><option value="screenplay">Screenplay</option><option value="game">Game</option><option value="other">Other</option></select></div></div><div className="sf-modal-actions"><button type="button" className="sf-btn" onClick={() => setShowModal(null)}>Cancel</button><button type="submit" className="sf-btn sf-btn-primary">Save</button></div></form></Modal>}
    </div>
  );
}
