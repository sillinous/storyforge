// ============================================================================
// STORY FORGE v3.7 - AI GENERATION SERVICE
// Multi-provider support: Claude, OpenAI, Custom endpoints
// Deep Context Tracking for Maximum Consistency
// Full Prior/Current/Future Awareness at All Levels
// ============================================================================

// Storage keys for API configuration
const STORAGE_KEYS = {
  PROVIDER: 'storyforge_ai_provider',
  CLAUDE_KEY: 'storyforge_claude_api_key',
  OPENAI_KEY: 'storyforge_openai_api_key',
  CUSTOM_ENDPOINT: 'storyforge_custom_endpoint',
  CUSTOM_KEY: 'storyforge_custom_api_key',
  CUSTOM_MODEL: 'storyforge_custom_model'
};

// Provider configurations
export const AI_PROVIDERS = {
  CLAUDE: {
    id: 'claude',
    name: 'Anthropic Claude',
    models: ['claude-sonnet-4-5-20250929', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-5-20250929',
    endpoint: 'https://api.anthropic.com/v1/messages',
    requiresKey: true
  },
  OPENAI: {
    id: 'openai',
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    defaultModel: 'gpt-4o',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    requiresKey: true
  },
  CUSTOM: {
    id: 'custom',
    name: 'Custom Endpoint',
    models: [],
    defaultModel: '',
    endpoint: '',
    requiresKey: false
  }
};

// ============================================================================
// DEEP CONTEXT TRACKER - Extracts and tracks all story elements for consistency
// ============================================================================

export const deepContextTracker = {
  
  // Extract character state from narrative progression
  buildCharacterStates: (characters, narrative, upToBook, upToChapter, upToBeat) => {
    const characterStates = {};
    
    characters.forEach(char => {
      characterStates[char.name] = {
        // Core identity (immutable)
        identity: {
          name: char.name,
          role: char.role,
          physicalDescription: char.physicalDescription || '',
          age: char.age || '',
          distinguishingFeatures: extractDistinguishingFeatures(char.physicalDescription),
          voiceCharacteristics: extractVoiceCharacteristics(char.personality, char),
          speechPatterns: extractSpeechPatterns(char),
          verbalTics: char.verbalTics || [],
          vocabulary: char.vocabularyLevel || 'standard',
          accentOrDialect: char.accent || ''
        },
        
        // Personality (consistent but can evolve)
        personality: {
          core: char.personality || '',
          traits: extractTraits(char.personality),
          motivations: char.motivations || '',
          fears: char.fears || '',
          flaws: char.flaws || '',
          habits: char.habits || [],
          mannerisms: char.mannerisms || []
        },
        
        // Visual consistency
        visualDetails: {
          hairColor: extractDetail(char.physicalDescription, 'hair'),
          eyeColor: extractDetail(char.physicalDescription, 'eye'),
          skinTone: extractDetail(char.physicalDescription, 'skin'),
          height: extractDetail(char.physicalDescription, 'height'),
          build: extractDetail(char.physicalDescription, 'build'),
          distinctiveMarks: char.distinctiveMarks || [],
          defaultClothing: char.defaultClothing || '',
          styleNotes: char.styleNotes || ''
        },
        
        // Dynamic state (changes through story)
        currentState: {
          emotionalState: 'neutral',
          physicalCondition: 'normal',
          currentClothing: char.defaultClothing || '',
          injuries: [],
          knowledgeGained: [],
          secretsLearned: [],
          itemsCarrying: [],
          currentLocation: ''
        },
        
        // Relationship states
        relationships: buildRelationshipMap(char, characters),
        
        // Arc tracking
        arcProgress: {
          seriesArc: char.arc?.seriesArc || '',
          currentPhase: 'beginning',
          keyMomentsPassed: [],
          pendingDevelopments: []
        }
      };
    });
    
    // Now trace through narrative to update states
    if (narrative?.books) {
      for (const book of narrative.books) {
        if (book.number > upToBook) break;
        
        for (const chapter of (book.chapters || [])) {
          if (book.number === upToBook && chapter.number > upToChapter) break;
          
          for (const beat of (chapter.beats || [])) {
            if (book.number === upToBook && chapter.number === upToChapter && beat.sequence > upToBeat) break;
            
            // Update character states based on beat content
            (beat.characters || []).forEach(charName => {
              if (characterStates[charName]) {
                characterStates[charName].currentState.currentLocation = beat.location || '';
                
                // Track appearances for continuity
                if (!characterStates[charName].arcProgress.keyMomentsPassed.find(m => 
                  m.book === book.number && m.chapter === chapter.number && m.beat === beat.sequence)) {
                  characterStates[charName].arcProgress.keyMomentsPassed.push({
                    book: book.number,
                    chapter: chapter.number,
                    beat: beat.sequence,
                    beatTitle: beat.title,
                    location: beat.location
                  });
                }
                
                // Extract emotional/knowledge changes from beat summary
                if (beat.summary) {
                  const emotionalState = extractEmotionalState(beat.summary, charName);
                  if (emotionalState) {
                    characterStates[charName].currentState.emotionalState = emotionalState;
                  }
                }
              }
            });
            
            // Process page/panel level if available for detailed tracking
            if (beat.pages) {
              for (const page of beat.pages) {
                if (page.panels) {
                  for (const panel of page.panels) {
                    // Track items picked up/used
                    if (panel.action) {
                      const itemsFound = extractItemInteractions(panel.action);
                      itemsFound.forEach(item => {
                        const charInPanel = panel.characters?.[0];
                        if (charInPanel && characterStates[charInPanel]) {
                          if (item.action === 'pickup' || item.action === 'receive') {
                            characterStates[charInPanel].currentState.itemsCarrying.push(item.name);
                          } else if (item.action === 'drop' || item.action === 'give') {
                            const idx = characterStates[charInPanel].currentState.itemsCarrying.indexOf(item.name);
                            if (idx > -1) characterStates[charInPanel].currentState.itemsCarrying.splice(idx, 1);
                          }
                        }
                      });
                    }
                    
                    // Track injuries
                    if (panel.action && panel.characters) {
                      panel.characters.forEach(charName => {
                        if (characterStates[charName]) {
                          const injury = extractInjury(panel.action, charName);
                          if (injury) {
                            characterStates[charName].currentState.injuries.push(injury);
                          }
                        }
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return characterStates;
  },
  
  // Build artifact/item tracking
  buildItemStates: (artifacts, narrative, upToBook, upToChapter, upToBeat) => {
    const itemStates = {};
    
    artifacts.forEach(item => {
      itemStates[item.name] = {
        identity: {
          name: item.name,
          description: item.description || '',
          type: item.artifactType || 'object',
          visualDescription: item.visualDescription || item.description || '',
          powers: item.powers || [],
          limitations: item.limitations || [],
          origin: item.origin || ''
        },
        currentState: {
          location: item.currentLocation || 'unknown',
          condition: 'intact',
          currentHolder: item.currentHolder || null,
          isActive: false,
          lastUsed: null,
          hiddenLocation: item.hiddenLocation || null
        },
        history: []
      };
    });
    
    // Trace through narrative to track item movements
    if (narrative?.books) {
      for (const book of narrative.books) {
        if (book.number > upToBook) break;
        for (const chapter of (book.chapters || [])) {
          if (book.number === upToBook && chapter.number > upToChapter) break;
          for (const beat of (chapter.beats || [])) {
            if (book.number === upToBook && chapter.number === upToChapter && beat.sequence > upToBeat) break;
            
            // Check beat summary for item mentions
            Object.keys(itemStates).forEach(itemName => {
              if (beat.summary?.toLowerCase().includes(itemName.toLowerCase())) {
                itemStates[itemName].history.push({
                  book: book.number, chapter: chapter.number, beat: beat.sequence,
                  context: beat.summary
                });
              }
            });
          }
        }
      }
    }
    
    return itemStates;
  },
  
  // Build event timeline and consequences
  buildEventTimeline: (events, narrative, upToBook, upToChapter, upToBeat) => {
    const timeline = [];
    const activeConsequences = [];
    
    // Add defined events
    events.forEach(event => {
      timeline.push({
        type: 'defined_event',
        name: event.name,
        description: event.description,
        date: event.date,
        impact: event.impact,
        participants: event.participants || [],
        isBackstory: true
      });
      
      // Track ongoing consequences
      if (event.ongoingConsequences) {
        activeConsequences.push({
          source: event.name,
          consequence: event.ongoingConsequences,
          stillActive: true
        });
      }
    });
    
    // Extract events from narrative
    if (narrative?.books) {
      for (const book of narrative.books) {
        if (book.number > upToBook) break;
        for (const chapter of (book.chapters || [])) {
          if (book.number === upToBook && chapter.number > upToChapter) break;
          for (const beat of (chapter.beats || [])) {
            if (book.number === upToBook && chapter.number === upToChapter && beat.sequence > upToBeat) break;
            
            if (beat.beatType === 'revelation' || beat.beatType === 'crisis' || beat.beatType === 'climax') {
              timeline.push({
                type: 'story_event',
                name: beat.title,
                description: beat.summary,
                location: { book: book.number, chapter: chapter.number, beat: beat.sequence },
                participants: beat.characters || [],
                isBackstory: false
              });
            }
          }
        }
      }
    }
    
    return { timeline, activeConsequences };
  },
  
  // Build world rule applications for scene
  buildActiveWorldRules: (worldRules, location, characters, currentAction) => {
    const activeRules = [];
    const ruleApplications = [];
    
    worldRules.forEach(rule => {
      // Check if rule applies to current scene
      const appliesToLocation = !rule.locationRestrictions || 
        rule.locationRestrictions.some(loc => location?.toLowerCase().includes(loc.toLowerCase()));
      
      const appliesToCharacters = !rule.characterRestrictions ||
        rule.characterRestrictions.some(char => characters.includes(char));
      
      if (appliesToLocation || appliesToCharacters) {
        activeRules.push({
          name: rule.name,
          statement: rule.statement,
          explanation: rule.explanation,
          implications: rule.implications,
          exceptions: rule.exceptions,
          visualManifestation: rule.visualManifestation || ''
        });
        
        // Generate specific applications
        if (rule.implications) {
          ruleApplications.push({
            rule: rule.name,
            application: `In this scene: ${rule.implications}`
          });
        }
      }
    });
    
    return { activeRules, ruleApplications };
  },
  
  // Build visual continuity tracking
  buildVisualContinuity: (narrative, upToBook, upToChapter, upToBeat) => {
    const establishedVisuals = {
      locations: {},
      characters: {},
      items: {},
      lighting: [],
      weather: [],
      timeOfDay: []
    };
    
    if (narrative?.books) {
      for (const book of narrative.books) {
        if (book.number > upToBook) break;
        for (const chapter of (book.chapters || [])) {
          if (book.number === upToBook && chapter.number > upToChapter) break;
          for (const beat of (chapter.beats || [])) {
            if (book.number === upToBook && chapter.number === upToChapter && beat.sequence > upToBeat) break;
            
            // Extract visual details from panels
            if (beat.pages) {
              for (const page of beat.pages) {
                if (page.panels) {
                  for (const panel of page.panels) {
                    if (panel.visualDescription) {
                      // Track location visuals
                      if (beat.location && !establishedVisuals.locations[beat.location]) {
                        establishedVisuals.locations[beat.location] = {
                          details: [],
                          atmosphere: []
                        };
                      }
                      if (beat.location) {
                        establishedVisuals.locations[beat.location].details.push(panel.visualDescription);
                      }
                      
                      // Track lighting/weather/time
                      const lighting = extractLighting(panel.visualDescription);
                      if (lighting) establishedVisuals.lighting.push({ beat: beat.sequence, value: lighting });
                      
                      const weather = extractWeather(panel.visualDescription);
                      if (weather) establishedVisuals.weather.push({ beat: beat.sequence, value: weather });
                    }
                    
                    if (panel.artNotes) {
                      establishedVisuals.locations[beat.location]?.atmosphere.push(panel.artNotes);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return establishedVisuals;
  },
  
  // Build relationship state map
  buildRelationshipStates: (characters, narrative, upToBook, upToChapter, upToBeat) => {
    const relationshipMap = {};
    
    characters.forEach(char => {
      relationshipMap[char.name] = {};
      
      (char.relationships || []).forEach(rel => {
        relationshipMap[char.name][rel.target] = {
          type: rel.type,
          description: rel.description || '',
          currentState: rel.type, // Will be updated by narrative events
          tension: 0,
          recentInteractions: []
        };
      });
    });
    
    // Update based on narrative events
    if (narrative?.books) {
      for (const book of narrative.books) {
        if (book.number > upToBook) break;
        for (const chapter of (book.chapters || [])) {
          if (book.number === upToBook && chapter.number > upToChapter) break;
          for (const beat of (chapter.beats || [])) {
            if (book.number === upToBook && chapter.number === upToChapter && beat.sequence > upToBeat) break;
            
            const chars = beat.characters || [];
            // Track character interactions
            if (chars.length >= 2) {
              for (let i = 0; i < chars.length; i++) {
                for (let j = i + 1; j < chars.length; j++) {
                  const char1 = chars[i];
                  const char2 = chars[j];
                  
                  if (relationshipMap[char1] && relationshipMap[char1][char2]) {
                    relationshipMap[char1][char2].recentInteractions.push({
                      book: book.number, chapter: chapter.number, beat: beat.sequence,
                      context: beat.summary
                    });
                  }
                  if (relationshipMap[char2] && relationshipMap[char2][char1]) {
                    relationshipMap[char2][char1].recentInteractions.push({
                      book: book.number, chapter: chapter.number, beat: beat.sequence,
                      context: beat.summary
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
    
    return relationshipMap;
  },
  
  // Build the comprehensive deep context
  buildDeepContext: (project, entities, narrative, upToBook = 999, upToChapter = 999, upToBeat = 999) => {
    const characters = entities.filter(e => e.type === 'character');
    const artifacts = entities.filter(e => e.type === 'artifact');
    const events = entities.filter(e => e.type === 'event');
    const worldRules = entities.filter(e => e.type === 'world_rule');
    const locations = entities.filter(e => e.type === 'location');
    
    return {
      characterStates: deepContextTracker.buildCharacterStates(characters, narrative, upToBook, upToChapter, upToBeat),
      itemStates: deepContextTracker.buildItemStates(artifacts, narrative, upToBook, upToChapter, upToBeat),
      eventTimeline: deepContextTracker.buildEventTimeline(events, narrative, upToBook, upToChapter, upToBeat),
      relationshipStates: deepContextTracker.buildRelationshipStates(characters, narrative, upToBook, upToChapter, upToBeat),
      visualContinuity: deepContextTracker.buildVisualContinuity(narrative, upToBook, upToChapter, upToBeat),
      locationDetails: locations.reduce((acc, loc) => {
        acc[loc.name] = {
          type: loc.locationType,
          description: loc.description,
          atmosphere: loc.atmosphere,
          keyFeatures: loc.keyFeatures || [],
          visualElements: loc.visualElements || [],
          connectedTo: loc.connectedTo || []
        };
        return acc;
      }, {}),
      worldRules: worldRules
    };
  }
};

// Helper functions for extraction
function extractDistinguishingFeatures(description) {
  if (!description) return [];
  const features = [];
  const patterns = [
    /scar[s]?\s+(?:on|across|over)?\s*(?:his|her|their)?\s*(\w+)/gi,
    /missing\s+(\w+)/gi,
    /tattoo[s]?\s+(?:of|depicting)?\s*([^,.]+)/gi,
    /birthmark[s]?\s+(?:on|shaped like)?\s*([^,.]+)/gi,
    /(\w+)\s+eye[s]?/gi,
    /(\w+)\s+hair/gi
  ];
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      features.push(match[0]);
    }
  });
  return features;
}

function extractVoiceCharacteristics(personality, char) {
  const characteristics = [];
  if (personality?.toLowerCase().includes('quiet')) characteristics.push('soft-spoken');
  if (personality?.toLowerCase().includes('loud')) characteristics.push('booming voice');
  if (personality?.toLowerCase().includes('confident')) characteristics.push('commanding tone');
  if (personality?.toLowerCase().includes('nervous')) characteristics.push('hesitant speech');
  if (char.accent) characteristics.push(char.accent);
  return characteristics;
}

function extractSpeechPatterns(char) {
  const patterns = [];
  if (char.verbalTics) patterns.push(...char.verbalTics);
  if (char.catchphrases) patterns.push(...char.catchphrases);
  if (char.vocabularyLevel === 'formal') patterns.push('formal vocabulary', 'complete sentences');
  if (char.vocabularyLevel === 'casual') patterns.push('contractions', 'slang');
  if (char.vocabularyLevel === 'archaic') patterns.push('thee/thou', 'formal archaic');
  return patterns;
}

function extractTraits(personality) {
  if (!personality) return [];
  const commonTraits = ['brave', 'coward', 'loyal', 'treacherous', 'kind', 'cruel', 
    'intelligent', 'cunning', 'naive', 'wise', 'impulsive', 'calculating',
    'honest', 'deceptive', 'gentle', 'fierce', 'patient', 'impatient'];
  return commonTraits.filter(trait => personality.toLowerCase().includes(trait));
}

function buildRelationshipMap(char, allCharacters) {
  const map = {};
  (char.relationships || []).forEach(rel => {
    map[rel.target] = {
      type: rel.type,
      description: rel.description || '',
      dynamics: rel.dynamics || ''
    };
  });
  return map;
}

function extractEmotionalState(summary, charName) {
  if (!summary || !charName) return null;
  const emotions = {
    'angry': ['angry', 'furious', 'enraged', 'livid'],
    'sad': ['sad', 'grief', 'mourning', 'devastated', 'heartbroken'],
    'happy': ['happy', 'joyful', 'elated', 'excited'],
    'fearful': ['afraid', 'terrified', 'scared', 'frightened'],
    'determined': ['determined', 'resolute', 'focused'],
    'confused': ['confused', 'bewildered', 'uncertain'],
    'suspicious': ['suspicious', 'wary', 'distrustful']
  };
  
  const lowerSummary = summary.toLowerCase();
  for (const [emotion, keywords] of Object.entries(emotions)) {
    if (keywords.some(kw => lowerSummary.includes(kw))) {
      return emotion;
    }
  }
  return null;
}

function extractItemInteractions(action) {
  const items = [];
  const pickupPatterns = [
    /picks?\s+up\s+(?:the\s+)?(\w+)/gi,
    /grabs?\s+(?:the\s+)?(\w+)/gi,
    /takes?\s+(?:the\s+)?(\w+)/gi,
    /receives?\s+(?:the\s+)?(\w+)/gi
  ];
  const dropPatterns = [
    /drops?\s+(?:the\s+)?(\w+)/gi,
    /releases?\s+(?:the\s+)?(\w+)/gi,
    /gives?\s+(?:the\s+)?(\w+)/gi,
    /hands?\s+over\s+(?:the\s+)?(\w+)/gi
  ];
  
  pickupPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(action)) !== null) {
      items.push({ name: match[1], action: 'pickup' });
    }
  });
  dropPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(action)) !== null) {
      items.push({ name: match[1], action: 'drop' });
    }
  });
  return items;
}

function extractInjury(action, charName) {
  const injuryPatterns = [
    /(\w+)\s+is\s+(?:hit|struck|wounded|injured|cut|burned)/gi,
    /(\w+)\s+receives?\s+(?:a\s+)?(?:wound|injury|cut|burn)/gi,
    /blood\s+(?:flows?|pours?)\s+from\s+(\w+)/gi
  ];
  
  for (const pattern of injuryPatterns) {
    let match;
    while ((match = pattern.exec(action)) !== null) {
      if (match[1].toLowerCase() === charName.toLowerCase()) {
        return { type: 'wound', description: match[0], severity: 'moderate' };
      }
    }
  }
  return null;
}

function extractDetail(description, type) {
  if (!description) return '';
  const patterns = {
    'hair': /(\w+(?:\s+\w+)?)\s+hair/i,
    'eye': /(\w+)\s+eyes?/i,
    'skin': /(\w+)\s+skin/i,
    'height': /(tall|short|average height|\d+'?\d*"?)/i,
    'build': /(slender|thin|muscular|stocky|heavyset|athletic|lean)/i
  };
  const match = description.match(patterns[type]);
  return match ? match[1] : '';
}

function extractLighting(description) {
  const patterns = [
    /(dim|bright|harsh|soft|flickering|candlelit|moonlit|sunlit|shadowy|dark)\s+light/i,
    /(darkness|shadow|sunlight|moonlight|torchlight)/i
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractWeather(description) {
  const patterns = [
    /(rain|snow|storm|fog|mist|wind|sunshine|cloudy|overcast)/i
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ============================================================================
// API CONFIGURATION MANAGEMENT
// ============================================================================

export const apiConfig = {
  // Project-level settings cache (set by App when project loads)
  _projectSettings: null,
  
  // Set project-level settings (called by App when project loads/changes)
  setProjectSettings: (settings) => {
    apiConfig._projectSettings = settings;
  },
  
  // Clear project settings (called when switching projects or logging out)
  clearProjectSettings: () => {
    apiConfig._projectSettings = null;
  },
  
  // Get current provider (project settings take priority)
  getProvider: () => {
    if (apiConfig._projectSettings?.provider) {
      return apiConfig._projectSettings.provider;
    }
    return localStorage.getItem(STORAGE_KEYS.PROVIDER) || 'claude';
  },

  // Set provider (always saves to local - project settings managed separately)
  setProvider: (provider) => {
    localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
  },

  // Get API key for current provider (project settings take priority)
  getApiKey: (provider = null) => {
    const p = provider || apiConfig.getProvider();
    
    // Check project settings first
    if (apiConfig._projectSettings) {
      switch (p) {
        case 'claude': 
          if (apiConfig._projectSettings.claudeKey) return apiConfig._projectSettings.claudeKey;
          break;
        case 'openai': 
          if (apiConfig._projectSettings.openaiKey) return apiConfig._projectSettings.openaiKey;
          break;
        case 'custom': 
          if (apiConfig._projectSettings.customKey) return apiConfig._projectSettings.customKey;
          break;
      }
    }
    
    // Fall back to local storage
    switch (p) {
      case 'claude': return localStorage.getItem(STORAGE_KEYS.CLAUDE_KEY) || '';
      case 'openai': return localStorage.getItem(STORAGE_KEYS.OPENAI_KEY) || '';
      case 'custom': return localStorage.getItem(STORAGE_KEYS.CUSTOM_KEY) || '';
      default: return '';
    }
  },

  // Set API key (always saves to local)
  setApiKey: (provider, key) => {
    switch (provider) {
      case 'claude': localStorage.setItem(STORAGE_KEYS.CLAUDE_KEY, key); break;
      case 'openai': localStorage.setItem(STORAGE_KEYS.OPENAI_KEY, key); break;
      case 'custom': localStorage.setItem(STORAGE_KEYS.CUSTOM_KEY, key); break;
    }
  },

  // Get custom endpoint config (project settings take priority)
  getCustomConfig: () => {
    if (apiConfig._projectSettings?.customEndpoint) {
      return {
        endpoint: apiConfig._projectSettings.customEndpoint || '',
        model: apiConfig._projectSettings.customModel || ''
      };
    }
    return {
      endpoint: localStorage.getItem(STORAGE_KEYS.CUSTOM_ENDPOINT) || '',
      model: localStorage.getItem(STORAGE_KEYS.CUSTOM_MODEL) || ''
    };
  },

  // Set custom endpoint config (always saves to local)
  setCustomConfig: (endpoint, model) => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ENDPOINT, endpoint);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_MODEL, model);
  },

  // Check if API is configured (from either project or local)
  isConfigured: () => {
    const provider = apiConfig.getProvider();
    const key = apiConfig.getApiKey();
    if (provider === 'custom') {
      const { endpoint } = apiConfig.getCustomConfig();
      return endpoint.length > 0;
    }
    return key.length > 0;
  },
  
  // Check if using project-level settings
  isUsingProjectSettings: () => {
    if (!apiConfig._projectSettings) return false;
    const provider = apiConfig.getProvider();
    switch (provider) {
      case 'claude': return !!apiConfig._projectSettings.claudeKey;
      case 'openai': return !!apiConfig._projectSettings.openaiKey;
      case 'custom': return !!apiConfig._projectSettings.customEndpoint;
      default: return false;
    }
  },
  
  // Get source of current API config
  getConfigSource: () => {
    return apiConfig.isUsingProjectSettings() ? 'project' : 'local';
  },

  // Get full configuration
  getFullConfig: () => ({
    provider: apiConfig.getProvider(),
    apiKey: apiConfig.getApiKey(),
    customConfig: apiConfig.getCustomConfig(),
    isConfigured: apiConfig.isConfigured(),
    source: apiConfig.getConfigSource(),
    hasProjectSettings: !!apiConfig._projectSettings
  })
};

// ============================================================================
// CONTEXT BUILDERS - Assemble relevant context for generation
// ============================================================================

export const contextBuilders = {
  // Build series-level context with full entity details
  buildSeriesContext: (project, entities) => {
    const worldRules = entities.filter(e => e.type === 'world_rule');
    const characters = entities.filter(e => e.type === 'character');
    const locations = entities.filter(e => e.type === 'location');
    const factions = entities.filter(e => e.type === 'faction');
    const motifs = entities.filter(e => e.type === 'motif');
    const threads = entities.filter(e => e.type === 'thread');
    const visualNotes = entities.filter(e => e.type === 'visual_note');
    const events = entities.filter(e => e.type === 'event');
    const artifacts = entities.filter(e => e.type === 'artifact');

    return {
      title: project.name,
      description: project.description,
      genre: project.settings?.genre || 'Fantasy',
      tone: project.settings?.tone || 'Dark',
      targetAudience: project.settings?.targetAudience || 'Adult',
      format: project.settings?.format || 'graphic_novel',
      // Full world rules
      worldRules: worldRules.map(r => ({ 
        name: r.name, 
        statement: r.statement, 
        explanation: r.explanation,
        implications: r.implications,
        exceptions: r.exceptions
      })),
      // Full character details for continuity
      characters: characters.map(c => ({
        name: c.name,
        role: c.role,
        physicalDescription: c.physicalDescription || '',
        personality: c.personality || '',
        background: c.background || '',
        motivations: c.motivations || '',
        flaws: c.flaws || '',
        arc: c.arc || {},
        relationships: c.relationships || [],
        tags: c.tags || []
      })),
      // Full location details
      locations: locations.map(l => ({ 
        name: l.name, 
        type: l.locationType,
        description: l.description || '',
        atmosphere: l.atmosphere,
        significance: l.significance || '',
        connectedTo: l.connectedTo || []
      })),
      factions: factions.map(f => ({ 
        name: f.name, 
        goals: f.goals,
        methods: f.methods || '',
        members: f.members || []
      })),
      motifs: motifs.map(m => ({ 
        symbol: m.symbol || m.name, 
        meaning: m.meaning,
        appearances: m.appearances || []
      })),
      threads: threads.map(t => ({ 
        question: t.question || t.name, 
        type: t.threadType,
        hints: t.hints || [],
        resolution: t.resolution || ''
      })),
      events: events.map(e => ({
        name: e.name,
        description: e.description,
        date: e.date,
        impact: e.impact || ''
      })),
      artifacts: artifacts.map(a => ({
        name: a.name,
        description: a.description,
        powers: a.powers || '',
        location: a.currentLocation || ''
      })),
      visualNotes: visualNotes.map(v => ({ 
        subject: v.subject || v.name, 
        description: v.description 
      }))
    };
  },

  // Build book-level context with full structural awareness
  buildBookContext: (seriesContext, narrative, bookNumber) => {
    const books = narrative?.books || [];
    const totalBooks = narrative?.targetLength || books.length || 12;
    const currentBook = books.find(b => b.number === bookNumber);
    const priorBooks = books.filter(b => b.number < bookNumber);
    const futureBooks = books.filter(b => b.number > bookNumber);
    const remainingBooks = totalBooks - bookNumber;

    return {
      ...seriesContext,
      seriesArc: narrative?.logline || '',
      seriesThemes: narrative?.themes || [],
      
      // Structural position awareness
      structure: {
        totalBooks: totalBooks,
        currentBookNumber: bookNumber,
        booksCompleted: priorBooks.length,
        booksRemaining: remainingBooks,
        positionDescription: `Book ${bookNumber} of ${totalBooks} (${Math.round((bookNumber / totalBooks) * 100)}% through series)`,
        isOpening: bookNumber <= Math.ceil(totalBooks * 0.25),
        isMidpoint: bookNumber > Math.ceil(totalBooks * 0.25) && bookNumber <= Math.ceil(totalBooks * 0.75),
        isClimax: bookNumber > Math.ceil(totalBooks * 0.75)
      },
      
      currentBook: currentBook ? {
        number: currentBook.number,
        title: currentBook.title,
        logline: currentBook.logline,
        themes: currentBook.themes || [],
        estimatedPages: currentBook.estimatedPages,
        status: currentBook.status,
        totalChapters: currentBook.chapters?.length || 0
      } : { number: bookNumber },
      
      // Full details of prior books for continuity
      priorBooks: priorBooks.map(b => ({
        number: b.number,
        title: b.title,
        logline: b.logline,
        themes: b.themes || [],
        // Include chapter summaries for continuity
        chapterSummaries: (b.chapters || []).map(c => ({
          number: c.number,
          title: c.title,
          summary: c.summary,
          pov: c.pov,
          // Key events/revelations from this chapter
          keyBeats: (c.beats || []).filter(bt => 
            ['revelation', 'resolution', 'hook'].includes(bt.beatType)
          ).map(bt => bt.summary)
        }))
      })),
      
      // Awareness of future planned books
      futureBooks: futureBooks.map(b => ({
        number: b.number,
        title: b.title,
        logline: b.logline
      }))
    };
  },

  // Build chapter-level context with full awareness
  buildChapterContext: (bookContext, book, chapterNumber, targetChapters = null) => {
    const chapters = book?.chapters || [];
    const totalChapters = targetChapters || chapters.length || 10;
    const currentChapter = chapters.find(c => c.number === chapterNumber);
    const priorChapters = chapters.filter(c => c.number < chapterNumber);
    const futureChapters = chapters.filter(c => c.number > chapterNumber);
    const remainingChapters = totalChapters - chapterNumber;

    // Track what characters have appeared and where
    const characterAppearances = {};
    priorChapters.forEach(ch => {
      (ch.beats || []).forEach(beat => {
        (beat.characters || []).forEach(char => {
          if (!characterAppearances[char]) characterAppearances[char] = [];
          characterAppearances[char].push({ chapter: ch.number, beat: beat.title });
        });
      });
    });

    return {
      ...bookContext,
      bookTitle: book?.title,
      bookLogline: book?.logline,
      bookThemes: book?.themes || [],
      
      // Structural position awareness
      chapterStructure: {
        totalChapters: totalChapters,
        currentChapterNumber: chapterNumber,
        chaptersCompleted: priorChapters.length,
        chaptersRemaining: remainingChapters,
        positionDescription: `Chapter ${chapterNumber} of ${totalChapters} (${Math.round((chapterNumber / totalChapters) * 100)}% through book)`,
        isOpening: chapterNumber <= Math.ceil(totalChapters * 0.2),
        isRisingAction: chapterNumber > Math.ceil(totalChapters * 0.2) && chapterNumber <= Math.ceil(totalChapters * 0.5),
        isMidpoint: chapterNumber === Math.ceil(totalChapters * 0.5),
        isFallingAction: chapterNumber > Math.ceil(totalChapters * 0.5) && chapterNumber <= Math.ceil(totalChapters * 0.8),
        isClimax: chapterNumber > Math.ceil(totalChapters * 0.8)
      },
      
      currentChapter: currentChapter ? {
        number: currentChapter.number,
        title: currentChapter.title,
        summary: currentChapter.summary,
        pov: currentChapter.pov,
        emotionalArc: currentChapter.emotionalArc,
        estimatedPages: currentChapter.estimatedPages,
        status: currentChapter.status,
        totalBeats: currentChapter.beats?.length || 0
      } : { number: chapterNumber },
      
      // Full details of prior chapters
      priorChapters: priorChapters.map(c => ({
        number: c.number,
        title: c.title,
        summary: c.summary,
        pov: c.pov,
        emotionalArc: c.emotionalArc,
        // Include all beats for continuity
        beats: (c.beats || []).map(b => ({
          sequence: b.sequence,
          title: b.title,
          beatType: b.beatType,
          summary: b.summary,
          purpose: b.purpose,
          characters: b.characters || [],
          location: b.location
        }))
      })),
      
      // What's planned next (if defined)
      futureChapters: futureChapters.slice(0, 3).map(c => ({
        number: c.number,
        title: c.title,
        summary: c.summary
      })),
      
      // Character appearance tracking for continuity
      characterAppearances: characterAppearances
    };
  },

  // Build beat-level context with full chapter awareness
  buildBeatContext: (chapterContext, chapter, beatSequence, targetBeats = null) => {
    const beats = chapter?.beats || [];
    const totalBeats = targetBeats || beats.length || 6;
    const currentBeat = beats.find(b => b.sequence === beatSequence);
    const priorBeats = beats.filter(b => b.sequence < beatSequence);
    const futureBeats = beats.filter(b => b.sequence > beatSequence);
    const remainingBeats = totalBeats - beatSequence;

    return {
      ...chapterContext,
      chapterTitle: chapter?.title,
      chapterSummary: chapter?.summary,
      chapterPov: chapter?.pov,
      chapterEmotionalArc: chapter?.emotionalArc,
      
      // Structural position awareness
      beatStructure: {
        totalBeats: totalBeats,
        currentBeatNumber: beatSequence,
        beatsCompleted: priorBeats.length,
        beatsRemaining: remainingBeats,
        positionDescription: `Beat ${beatSequence} of ${totalBeats} in chapter`,
        isOpening: beatSequence === 1,
        isClosing: beatSequence === totalBeats || remainingBeats === 0,
        pagesUsed: priorBeats.reduce((sum, b) => sum + (b.estimatedPages || 4), 0),
        pagesRemaining: (chapter?.estimatedPages || 22) - priorBeats.reduce((sum, b) => sum + (b.estimatedPages || 4), 0)
      },
      
      currentBeat: currentBeat ? {
        sequence: currentBeat.sequence,
        title: currentBeat.title,
        summary: currentBeat.summary,
        beatType: currentBeat.beatType,
        purpose: currentBeat.purpose,
        characters: currentBeat.characters || [],
        location: currentBeat.location,
        estimatedPages: currentBeat.estimatedPages
      } : { sequence: beatSequence },
      
      // Full details of prior beats
      priorBeats: priorBeats.map(b => ({
        sequence: b.sequence,
        title: b.title,
        beatType: b.beatType,
        summary: b.summary,
        purpose: b.purpose,
        characters: b.characters || [],
        location: b.location,
        estimatedPages: b.estimatedPages,
        // Include any dialogue or action notes if present
        dialogueNotes: b.dialogueNotes,
        visualDirection: b.visualDirection
      })),
      
      // What's planned next (if defined)
      futureBeats: futureBeats.slice(0, 2).map(b => ({
        sequence: b.sequence,
        title: b.title,
        beatType: b.beatType,
        summary: b.summary
      }))
    };
  },

  // Build page-level context for panel generation (ATOMIC LEVEL)
  // This is the most critical context builder - it must have COMPLETE awareness
  buildPageContext: (beatContext, beat, pageNumber, project, entities, narrative) => {
    const pages = beat?.pages || [];
    const totalPages = pages.length || beat?.estimatedPages || 4;
    const currentPage = pages.find(p => p.pageNumber === pageNumber);
    const priorPages = pages.filter(p => p.pageNumber < pageNumber);
    const futurePages = pages.filter(p => p.pageNumber > pageNumber);

    // Get book and chapter numbers for deep context
    const bookNumber = beatContext.structure?.currentBookNumber || beatContext.currentBook?.number || 1;
    const chapterNumber = beatContext.chapterStructure?.currentChapterNumber || beatContext.currentChapter?.number || 1;
    const beatSequence = beat?.sequence || 1;

    // Build DEEP CONTEXT for maximum consistency
    const deepContext = deepContextTracker.buildDeepContext(
      project, entities, narrative, 
      bookNumber, chapterNumber, beatSequence
    );

    // Get full character details for characters in this beat WITH current state
    const sceneCharacters = (beat?.characters || []).map(charName => {
      const charState = deepContext.characterStates[charName];
      const baseChar = (beatContext.characters || []).find(c => c.name === charName);
      
      if (charState) {
        return {
          name: charName,
          // Visual consistency (CRITICAL)
          physicalDescription: charState.identity.physicalDescription,
          distinguishingFeatures: charState.identity.distinguishingFeatures,
          visualDetails: charState.visualDetails,
          
          // Voice and speech (CRITICAL for dialogue)
          voiceCharacteristics: charState.identity.voiceCharacteristics,
          speechPatterns: charState.identity.speechPatterns,
          verbalTics: charState.identity.verbalTics,
          vocabulary: charState.identity.vocabulary,
          accent: charState.identity.accentOrDialect,
          
          // Personality (for reaction consistency)
          personality: charState.personality.core,
          traits: charState.personality.traits,
          mannerisms: charState.personality.mannerisms,
          habits: charState.personality.habits,
          
          // CURRENT STATE (changes through story)
          currentEmotionalState: charState.currentState.emotionalState,
          currentPhysicalCondition: charState.currentState.physicalCondition,
          currentClothing: charState.currentState.currentClothing,
          injuries: charState.currentState.injuries,
          itemsCarrying: charState.currentState.itemsCarrying,
          knowledgeGained: charState.currentState.knowledgeGained,
          
          // Relationships with other characters in scene
          relationshipsInScene: (beat?.characters || [])
            .filter(c => c !== charName)
            .map(otherChar => ({
              with: otherChar,
              relationship: charState.relationships[otherChar] || 
                           deepContext.relationshipStates[charName]?.[otherChar] ||
                           { type: 'unknown', description: '' }
            })),
          
          // Arc position
          arcProgress: charState.arcProgress
        };
      }
      
      // Fallback if no deep tracking
      return {
        ...baseChar,
        name: charName,
        currentEmotionalState: 'neutral',
        speechPatterns: [],
        verbalTics: []
      };
    });

    // Get location details with established visuals
    const locationName = beat?.location || '';
    const baseLocation = (beatContext.locations || []).find(l => l.name === locationName) || { name: locationName };
    const locationVisuals = deepContext.visualContinuity.locations[locationName] || { details: [], atmosphere: [] };
    const locationDetails = deepContext.locationDetails[locationName] || {};
    
    const currentLocation = {
      name: locationName,
      description: locationDetails.description || baseLocation.description || '',
      atmosphere: locationDetails.atmosphere || baseLocation.atmosphere || '',
      keyFeatures: locationDetails.keyFeatures || [],
      visualElements: locationDetails.visualElements || [],
      // ESTABLISHED VISUALS from prior panels (must be consistent!)
      establishedVisuals: locationVisuals.details.slice(-5), // Last 5 visual descriptions
      establishedAtmosphere: locationVisuals.atmosphere.slice(-3),
      connectedTo: locationDetails.connectedTo || []
    };

    // Get active world rules for this scene
    const { activeRules, ruleApplications } = deepContextTracker.buildActiveWorldRules(
      deepContext.worldRules,
      locationName,
      beat?.characters || [],
      beat?.summary || ''
    );

    // Get items in scene
    const itemsInScene = Object.entries(deepContext.itemStates)
      .filter(([name, state]) => 
        state.currentState.location === locationName ||
        (beat?.characters || []).includes(state.currentState.currentHolder)
      )
      .map(([name, state]) => ({
        name,
        description: state.identity.visualDescription,
        currentHolder: state.currentState.currentHolder,
        condition: state.currentState.condition,
        powers: state.identity.powers
      }));

    // Get recent events affecting this scene
    const { timeline, activeConsequences } = deepContext.eventTimeline;
    const recentEvents = timeline
      .filter(e => !e.isBackstory)
      .slice(-5)
      .map(e => ({ name: e.name, description: e.description }));

    // Extract established visual continuity from prior pages
    const visualContinuityFromPriorPages = priorPages.flatMap(p => 
      (p.panels || []).map(pnl => ({
        page: p.pageNumber,
        panel: pnl.panelNumber,
        lighting: extractLighting(pnl.visualDescription),
        weather: extractWeather(pnl.visualDescription),
        keyVisual: pnl.visualDescription?.substring(0, 100)
      }))
    ).filter(v => v.lighting || v.weather);

    // Build dialogue history for voice consistency
    const dialogueHistory = priorPages.flatMap(p =>
      (p.panels || []).flatMap(pnl =>
        (pnl.dialogue || []).map(d => ({
          speaker: d.speaker,
          text: d.text,
          type: d.type,
          page: p.pageNumber,
          panel: pnl.panelNumber
        }))
      )
    );

    return {
      ...beatContext,
      
      // ===== DEEP CONTEXT FOR CONSISTENCY =====
      deepContext: {
        characterStates: deepContext.characterStates,
        itemStates: deepContext.itemStates,
        relationshipStates: deepContext.relationshipStates,
        visualContinuity: deepContext.visualContinuity
      },
      
      // Page structure awareness
      pageStructure: {
        totalPages: totalPages,
        currentPageNumber: pageNumber,
        pagesCompleted: priorPages.length,
        pagesRemaining: totalPages - pageNumber,
        positionDescription: `Page ${pageNumber} of ${totalPages} in beat`,
        isFirstPage: pageNumber === 1,
        isLastPage: pageNumber === totalPages || (totalPages - pageNumber) === 0
      },
      
      currentPage: currentPage ? {
        pageNumber: currentPage.pageNumber,
        visualFocus: currentPage.visualFocus,
        panelCount: currentPage.panelCount,
        dialogueNotes: currentPage.dialogueNotes,
        visualDirection: currentPage.visualDirection,
        pacing: currentPage.pacing,
        // All atomic page elements
        emotionalBeat: currentPage.emotionalBeat || '',
        charactersOnPage: currentPage.charactersOnPage || [],
        layoutNotes: currentPage.layoutNotes || '',
        panels: currentPage.panels || []
      } : { 
        pageNumber: pageNumber,
        panelCount: 5,
        pacing: 'medium'
      },
      
      // Prior pages with FULL panel details for continuity
      priorPages: priorPages.map(p => ({
        pageNumber: p.pageNumber,
        visualFocus: p.visualFocus,
        panelCount: p.panelCount,
        dialogueNotes: p.dialogueNotes,
        pacing: p.pacing,
        actionSummary: p.panels?.map(pnl => pnl.action).join(' → ') || '',
        panels: (p.panels || []).map(pnl => ({
          panelNumber: pnl.panelNumber,
          visualDescription: pnl.visualDescription,
          action: pnl.action,
          dialogue: pnl.dialogue,
          characters: pnl.characters,
          sfx: pnl.sfx
        }))
      })),
      
      // Future pages (for continuity)
      futurePages: futurePages.slice(0, 2).map(p => ({
        pageNumber: p.pageNumber,
        visualFocus: p.visualFocus,
        pacing: p.pacing
      })),
      
      // ===== SCENE-SPECIFIC CONTEXT =====
      
      // Characters with FULL state (CRITICAL)
      sceneCharacters: sceneCharacters,
      
      // Location with established visuals
      currentLocation: currentLocation,
      
      // Items in scene
      itemsInScene: itemsInScene,
      
      // Active world rules
      activeWorldRules: activeRules,
      ruleApplications: ruleApplications,
      
      // Recent story events
      recentEvents: recentEvents,
      activeConsequences: activeConsequences,
      
      // Visual continuity tracking
      visualContinuity: visualContinuityFromPriorPages,
      
      // Dialogue history for voice consistency
      dialogueHistory: dialogueHistory,
      
      // ===== CONSISTENCY CHECKLIST =====
      consistencyChecklist: {
        // Physical appearances that MUST be consistent
        characterAppearances: sceneCharacters.map(c => ({
          name: c.name,
          mustMatch: {
            hair: c.visualDetails?.hairColor,
            eyes: c.visualDetails?.eyeColor,
            distinguishing: c.distinguishingFeatures,
            currentClothing: c.currentClothing,
            injuries: c.injuries
          }
        })),
        // Items that characters should have
        characterItems: sceneCharacters.map(c => ({
          name: c.name,
          carrying: c.itemsCarrying
        })),
        // Lighting/weather established
        establishedLighting: visualContinuityFromPriorPages.find(v => v.lighting)?.lighting,
        establishedWeather: visualContinuityFromPriorPages.find(v => v.weather)?.weather,
        // Location details already shown
        establishedLocationDetails: currentLocation.establishedVisuals
      }
    };
  }
};

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const prompts = {
  // Generate book outlines for a series
  generateBooks: (context, count, guidance = '') => `
You are a master story architect helping develop a ${context.genre} ${context.format} series.

## Series Overview
**Title:** ${context.title}
**Description:** ${context.description}
**Tone:** ${context.tone}
**Target Audience:** ${context.targetAudience}
**Series Logline:** ${context.seriesArc || 'Not yet defined'}
**Planned Length:** ${count} books

## World Foundation
### World Rules
${context.worldRules.map(r => `- **${r.name}**: ${r.statement}${r.implications ? ` (Implications: ${r.implications})` : ''}`).join('\n') || 'None defined yet'}

### Key Locations
${context.locations.slice(0, 10).map(l => `- **${l.name}** (${l.type || 'location'}): ${l.atmosphere || l.description || ''}`).join('\n') || 'None defined yet'}

## Characters
${context.characters.slice(0, 12).map(c => `### ${c.name} (${c.role})
- **Personality:** ${c.personality || 'Not defined'}
- **Motivation:** ${c.motivations || 'Not defined'}
- **Flaws:** ${c.flaws || 'Not defined'}
- **Arc:** ${c.arc?.seriesArc || c.arc?.description || 'Not defined'}`).join('\n\n') || 'None defined yet'}

## Factions & Powers
${context.factions.map(f => `- **${f.name}**: ${f.goals}`).join('\n') || 'None defined'}

## Story Threads (Mysteries to Unfold)
${context.threads.map(t => `- **${t.question}** (${t.type || 'mystery'})${t.hints?.length ? ` - Hints: ${t.hints.join(', ')}` : ''}`).join('\n') || 'None defined yet'}

## Motifs & Symbols
${context.motifs.map(m => `- **${m.symbol}**: ${m.meaning}`).join('\n') || 'None defined'}

## Themes to Explore
${context.seriesThemes?.join(', ') || 'Not yet defined'}

${guidance ? `## Additional Guidance\n${guidance}\n` : ''}

## Task
Generate ${count} book outlines for this series. Consider:
1. **Series Arc**: Each book should advance the overarching story while being satisfying on its own
2. **Character Arcs**: Major characters should evolve across books
3. **Thread Progression**: Mysteries should deepen early, reveal mid-series, resolve by end
4. **Pacing**: Balance action/character/worldbuilding across the series
5. **Escalation**: Stakes should generally increase toward the series climax

For each book provide:
- Compelling title
- Logline (1-2 sentences)
- Themes explored
- Which characters are focal
- How story threads progress
- Estimated page count (150-220 typical for graphic novels)

Respond ONLY with valid JSON in this exact format:
{
  "books": [
    {
      "number": 1,
      "title": "Book Title",
      "logline": "One to two sentence hook for this book",
      "themes": ["theme1", "theme2"],
      "characterFocus": ["Character Name"],
      "threadProgress": "What mysteries advance or are revealed",
      "estimatedPages": 180,
      "status": "planned"
    }
  ]
}`,

  // Generate chapters for a book
  generateChapters: (context, count, guidance = '') => `
You are a master story architect developing chapters for a ${context.genre} ${context.format}.

## STRUCTURAL POSITION
**${context.structure?.positionDescription || `Book ${context.currentBook?.number}`}**
${context.structure?.isOpening ? '📖 This is an OPENING book - establish world, characters, initial conflicts' : ''}
${context.structure?.isMidpoint ? '⚡ This is a MIDPOINT book - major revelations, escalating stakes' : ''}
${context.structure?.isClimax ? '🔥 This is a CLIMAX book - convergence, confrontation, resolution' : ''}

## Series Context
**Title:** ${context.title}
**Series Arc:** ${context.seriesArc || 'Not defined'}
**Series Themes:** ${context.seriesThemes?.join(', ') || 'Not defined'}
**Tone:** ${context.tone}

## What Has Happened Before
${context.priorBooks?.length > 0 ? context.priorBooks.map(b => `
### Book ${b.number}: ${b.title}
**Logline:** ${b.logline}
${b.chapterSummaries?.length > 0 ? `**Key Events:**\n${b.chapterSummaries.map(c => `- Ch ${c.number} (${c.title}): ${c.summary}${c.keyBeats?.length ? ` [Key: ${c.keyBeats.join('; ')}]` : ''}`).join('\n')}` : ''}`).join('\n') : 'This is the first book'}

## Current Book: Book ${context.currentBook?.number || '?'}
**Title:** ${context.currentBook?.title || 'Untitled'}
**Logline:** ${context.currentBook?.logline || 'Not defined'}
**Themes:** ${context.currentBook?.themes?.join(', ') || 'Not defined'}
**Target Pages:** ${context.currentBook?.estimatedPages || 180}
**Chapters to Generate:** ${count}

## What Comes After (if known)
${context.futureBooks?.length > 0 ? context.futureBooks.map(b => `- Book ${b.number}: ${b.title} - ${b.logline}`).join('\n') : 'Not yet planned'}

## Characters Available
${context.characters.slice(0, 8).map(c => `- **${c.name}** (${c.role}): ${c.personality?.substring(0, 100) || 'No personality defined'}${c.arc?.seriesArc ? ` | Arc: ${c.arc.seriesArc.substring(0, 80)}` : ''}`).join('\n')}

## Key Locations
${context.locations.slice(0, 6).map(l => `- **${l.name}**: ${l.atmosphere || l.description || l.type}`).join('\n')}

${guidance ? `## Additional Guidance\n${guidance}\n` : ''}

## Task
Generate ${count} chapters for Book ${context.currentBook?.number || 1}. Consider:
1. **Book Arc**: Chapters should form a complete story arc within this book
2. **Series Position**: ${context.structure?.isOpening ? 'Establish foundations, hook readers' : context.structure?.isMidpoint ? 'Deepen complexity, major revelations' : context.structure?.isClimax ? 'Build to series climax' : 'Advance overall story'}
3. **Pacing**: Vary tension - not every chapter should be high action
4. **POV Variety**: Use different POV characters strategically
5. **Chapter Length**: 15-30 pages typical, aim for ~${Math.round((context.currentBook?.estimatedPages || 180) / count)} pages average

Respond ONLY with valid JSON in this exact format:
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title",
      "summary": "Two to three sentence summary of what happens",
      "pov": "Character Name or null",
      "emotionalArc": "What emotional journey this chapter takes",
      "estimatedPages": 22,
      "keyEvents": ["Major plot point", "Character moment"],
      "status": "draft"
    }
  ]
}`,

  // Generate beats for a chapter
  generateBeats: (context, count, guidance = '') => `
You are a master story architect developing scene beats for a ${context.genre} ${context.format}.
You must maintain PERFECT CONSISTENCY with all established characters, events, and world elements.

## ═══════════════════════════════════════════════════════════════════════════
## STRUCTURAL POSITION
## ═══════════════════════════════════════════════════════════════════════════
**${context.structure?.positionDescription || 'Unknown position in series'}**
**${context.chapterStructure?.positionDescription || 'Unknown position in book'}**

${context.chapterStructure?.isOpening ? '📖 OPENING chapter - establish book premise, hook reader' : ''}
${context.chapterStructure?.isRisingAction ? '📈 RISING ACTION - build tension, deepen conflicts' : ''}
${context.chapterStructure?.isMidpoint ? '⚡ MIDPOINT - major revelation or reversal' : ''}
${context.chapterStructure?.isFallingAction ? '📉 FALLING ACTION - consequences, building to climax' : ''}
${context.chapterStructure?.isClimax ? '🔥 CLIMAX region - peak tension, major confrontations' : ''}

## ═══════════════════════════════════════════════════════════════════════════
## SERIES & BOOK CONTEXT
## ═══════════════════════════════════════════════════════════════════════════
**Series:** ${context.title}
**Genre/Tone:** ${context.genre} / ${context.tone}
**Book ${context.currentBook?.number}:** ${context.bookTitle}
**Book Logline:** ${context.bookLogline || 'Not defined'}
**Book Themes:** ${context.bookThemes?.join(', ') || 'Not defined'}

## ═══════════════════════════════════════════════════════════════════════════
## WHAT HAS HAPPENED IN THIS BOOK SO FAR
## ═══════════════════════════════════════════════════════════════════════════
${context.priorChapters?.length > 0 ? context.priorChapters.map(c => `
### Chapter ${c.number}: ${c.title}
**POV:** ${c.pov || 'Not specified'} | **Emotional Arc:** ${c.emotionalArc || 'Not specified'}
**Summary:** ${c.summary}
${c.beats?.length > 0 ? `**Beats:**
${c.beats.map(b => `  ${b.sequence}. ${b.title} (${b.beatType}): ${b.summary}
     [Characters: ${(b.characters || []).join(', ')} | Location: ${b.location || 'unspecified'}]`).join('\n')}` : ''}`).join('\n\n') : '**This is the first chapter of this book**'}

## ═══════════════════════════════════════════════════════════════════════════
## CURRENT CHAPTER
## ═══════════════════════════════════════════════════════════════════════════
**Chapter ${context.currentChapter?.number || '?'} of ${context.chapterStructure?.totalChapters || '?'}**
**Title:** ${context.currentChapter?.title || 'Untitled'}
**Summary:** ${context.currentChapter?.summary || 'Not defined'}
**POV Character:** ${context.currentChapter?.pov || 'Not specified'}
**Emotional Arc:** ${context.currentChapter?.emotionalArc || 'Not specified'}
**Target Pages:** ${context.currentChapter?.estimatedPages || 22}
**Beats to Generate:** ${count}

## ═══════════════════════════════════════════════════════════════════════════
## CHARACTER STATUS & TRACKING
## ═══════════════════════════════════════════════════════════════════════════

### Characters Who Have Appeared in This Book:
${Object.keys(context.characterAppearances || {}).length > 0 ? 
  Object.entries(context.characterAppearances).map(([name, appearances]) => 
    `- **${name}**: ${appearances.length} appearances (last: Ch ${appearances[appearances.length-1]?.chapter}, Beat: ${appearances[appearances.length-1]?.beat})`
  ).join('\n') : 'No characters have appeared yet in this book'}

### Full Character Reference (for consistency):
${context.characters.slice(0, 10).map(c => `
**${c.name}** (${c.role})
- Personality: ${c.personality?.substring(0, 100) || 'Not defined'}
- Motivations: ${c.motivations?.substring(0, 80) || 'Not defined'}
- Flaws: ${c.flaws || 'Not defined'}
- Current Arc: ${c.arc?.seriesArc?.substring(0, 80) || c.arc?.description?.substring(0, 80) || 'Not defined'}
- Key Relationships: ${c.relationships?.slice(0, 3).map(r => `${r.target} (${r.type})`).join(', ') || 'None defined'}`).join('\n')}

## ═══════════════════════════════════════════════════════════════════════════
## WORLD ELEMENTS TO INCORPORATE
## ═══════════════════════════════════════════════════════════════════════════

### Active World Rules:
${context.worldRules?.slice(0, 5).map(r => `- **${r.name}**: ${r.statement}`).join('\n') || 'None defined'}

### Key Locations:
${context.locations.slice(0, 8).map(l => `- **${l.name}** (${l.type || 'location'}): ${l.atmosphere || l.description?.substring(0, 60) || 'No description'}`).join('\n')}

### Active Story Threads:
${context.threads?.slice(0, 5).map(t => `- **${t.question}** (${t.type || 'mystery'}): ${t.hints?.length ? `Hints planted: ${t.hints.join(', ')}` : 'No hints yet'}`).join('\n') || 'None defined'}

### Key Artifacts/Items:
${context.artifacts?.slice(0, 5).map(a => `- **${a.name}**: ${a.description?.substring(0, 60) || 'No description'} ${a.location ? `(Currently: ${a.location})` : ''}`).join('\n') || 'None defined'}

### Important Events (backstory and recent):
${context.events?.slice(0, 5).map(e => `- **${e.name}**: ${e.description?.substring(0, 80) || 'No description'}`).join('\n') || 'None defined'}

## ═══════════════════════════════════════════════════════════════════════════
## CHAPTERS COMING AFTER (if known)
## ═══════════════════════════════════════════════════════════════════════════
${context.futureChapters?.length > 0 ? context.futureChapters.map(c => `- Ch ${c.number}: ${c.title} - ${c.summary || 'No summary'}`).join('\n') : `${context.chapterStructure?.chaptersRemaining || 0} more chapters in this book (not yet detailed)`}

${guidance ? `
## ═══════════════════════════════════════════════════════════════════════════
## ADDITIONAL GUIDANCE
## ═══════════════════════════════════════════════════════════════════════════
${guidance}` : ''}

## ═══════════════════════════════════════════════════════════════════════════
## YOUR TASK
## ═══════════════════════════════════════════════════════════════════════════

Generate ${count} scene beats for Chapter ${context.currentChapter?.number}.

**CRITICAL CONSISTENCY REQUIREMENTS:**
1. Use ONLY characters defined in the character reference above
2. Use ONLY locations defined in the locations list
3. Reference prior events naturally - characters should remember what happened
4. Respect all world rules
5. Continue active story threads appropriately
6. Character behavior must match their defined personality and motivations
7. Relationships should be reflected in character interactions

**STRUCTURAL REQUIREMENTS:**
- Chapter Position: ${context.chapterStructure?.isOpening ? 'Open strong, establish chapter premise' : context.chapterStructure?.isClimax ? 'Build to peak tension' : 'Advance toward chapter goal'}
- Continuity: Reference events/characters from prior chapters naturally
- Pacing: Vary beat types - action, character, worldbuilding, tension
- Page Budget: ~${context.currentChapter?.estimatedPages || 22} pages total, averaging ${Math.round((context.currentChapter?.estimatedPages || 22) / count)} per beat
- Flow: First beat should connect from previous chapter, last beat should hook next

Beat types: opening, action, character, worldbuilding, tension, revelation, emotional, transition, resolution, hook

Respond ONLY with valid JSON:
{
  "beats": [
    {
      "sequence": 1,
      "title": "Beat Title",
      "beatType": "opening|action|character|worldbuilding|tension|revelation|emotional|transition|resolution|hook",
      "purpose": "What this beat accomplishes for the story",
      "summary": "Two to three sentences of what happens",
      "characters": ["Character names exactly as defined"],
      "location": "Location name exactly as defined",
      "emotionalNote": "How this beat should feel",
      "threadsAdvanced": ["Thread names if any are advanced"],
      "itemsInvolved": ["Artifact/item names if any"],
      "estimatedPages": 4
    }
  ]
}`,

  // Generate page breakdown for a beat
  generatePages: (context, guidance = '') => `
You are a graphic novel script writer breaking down a scene into pages.
You must maintain PERFECT CONSISTENCY with all established characters, events, and world elements.

## ═══════════════════════════════════════════════════════════════════════════
## STRUCTURAL POSITION
## ═══════════════════════════════════════════════════════════════════════════
**${context.structure?.positionDescription || 'Unknown'}**
**${context.chapterStructure?.positionDescription || 'Unknown'}**
**${context.beatStructure?.positionDescription || 'Unknown'}**

${context.beatStructure?.isOpening ? '📖 OPENING beat of chapter - establish scene, draw reader in' : ''}
${context.beatStructure?.isClosing ? '🎬 CLOSING beat of chapter - end strong, hook for next chapter' : ''}

## ═══════════════════════════════════════════════════════════════════════════
## SCENE CONTEXT
## ═══════════════════════════════════════════════════════════════════════════
**Series:** ${context.title}
**Genre/Tone:** ${context.genre} / ${context.tone}
**Book ${context.currentBook?.number}:** ${context.bookTitle}
**Chapter ${context.currentChapter?.number}:** ${context.chapterTitle}
**POV Character:** ${context.chapterPov || 'Not specified'}
**Chapter Emotional Arc:** ${context.chapterEmotionalArc || 'Not specified'}

## ═══════════════════════════════════════════════════════════════════════════
## WHAT HAS HAPPENED IN THIS CHAPTER
## ═══════════════════════════════════════════════════════════════════════════
${context.priorBeats?.length > 0 ? context.priorBeats.map(b => 
  `### Beat ${b.sequence}: ${b.title} (${b.beatType})
**Summary:** ${b.summary}
**Characters:** ${(b.characters || []).join(', ')}
**Location:** ${b.location || 'Not specified'}
${b.pages?.length ? `**Pages:** ${b.pages.length} pages generated` : ''}
${b.dialogueNotes ? `**Key Dialogue:** ${b.dialogueNotes}` : ''}`
).join('\n\n') : '**This is the first beat of the chapter**'}

## ═══════════════════════════════════════════════════════════════════════════
## CURRENT BEAT
## ═══════════════════════════════════════════════════════════════════════════
**Beat ${context.currentBeat?.sequence || '?'} of ${context.beatStructure?.totalBeats || '?'}**
**Title:** ${context.currentBeat?.title}
**Type:** ${context.currentBeat?.beatType}
**Purpose:** ${context.currentBeat?.purpose}
**Summary:** ${context.currentBeat?.summary}
**Target Pages:** ${context.currentBeat?.estimatedPages || 4}

## ═══════════════════════════════════════════════════════════════════════════
## PAGE BUDGET
## ═══════════════════════════════════════════════════════════════════════════
- Pages used so far in chapter: ${context.beatStructure?.pagesUsed || 0}
- Pages remaining in chapter: ${context.beatStructure?.pagesRemaining || 22}
- This beat target: ${context.currentBeat?.estimatedPages || 4} pages

## ═══════════════════════════════════════════════════════════════════════════
## WHAT COMES NEXT (if known)
## ═══════════════════════════════════════════════════════════════════════════
${context.futureBeats?.length > 0 ? context.futureBeats.map(b => `- Beat ${b.sequence}: ${b.title} (${b.beatType}) - ${b.summary || 'No summary'}`).join('\n') : '**Last beat of this chapter**'}

## ═══════════════════════════════════════════════════════════════════════════
## CHARACTERS IN THIS SCENE (Full Details)
## ═══════════════════════════════════════════════════════════════════════════
${context.characters.filter(c => context.currentBeat?.characters?.includes(c.name)).map(c => `
### ${c.name} (${c.role})
**Visual Appearance:**
- Physical: ${c.physicalDescription?.substring(0, 200) || 'Not described'}
- Distinguishing Features: ${extractDistinguishingFeatures ? 'Extracted from description' : 'See physical description'}

**Personality & Voice:**
- Personality: ${c.personality?.substring(0, 150) || 'Not defined'}
- Motivations: ${c.motivations?.substring(0, 100) || 'Not defined'}
- Flaws: ${c.flaws || 'Not defined'}

**Relationships with Others in Scene:**
${(c.relationships || []).filter(r => context.currentBeat?.characters?.includes(r.target)).map(r => 
  `- ${r.target}: ${r.type} - ${r.description || ''}`
).join('\n') || '- No defined relationships with other characters in scene'}

**Arc Position:** ${c.arc?.seriesArc?.substring(0, 80) || c.arc?.description || 'Not defined'}`).join('\n\n') || 'Characters not specified'}

## ═══════════════════════════════════════════════════════════════════════════
## LOCATION DETAILS
## ═══════════════════════════════════════════════════════════════════════════
${(() => {
  const loc = context.locations.find(l => l.name === context.currentBeat?.location);
  return loc ? `
**${loc.name}** (${loc.type || 'location'})
**Description:** ${loc.description || 'Not described'}
**Atmosphere:** ${loc.atmosphere || 'Not defined'}
**Key Features:** ${loc.keyFeatures?.join(', ') || 'None specified'}
**Significance:** ${loc.significance || 'Not specified'}` : `**${context.currentBeat?.location || 'Location not specified'}**`;
})()}

## ═══════════════════════════════════════════════════════════════════════════
## ACTIVE WORLD RULES
## ═══════════════════════════════════════════════════════════════════════════
${context.worldRules?.slice(0, 5).map(r => `- **${r.name}**: ${r.statement}`).join('\n') || 'No special rules defined'}

## ═══════════════════════════════════════════════════════════════════════════
## ITEMS/ARTIFACTS IN SCENE
## ═══════════════════════════════════════════════════════════════════════════
${context.artifacts?.filter(a => 
  context.currentBeat?.characters?.some(char => a.currentHolder === char) ||
  a.location === context.currentBeat?.location
).map(a => `- **${a.name}**: ${a.description?.substring(0, 80) || 'No description'} ${a.currentHolder ? `(Held by: ${a.currentHolder})` : ''}`).join('\n') || 'No notable items in scene'}

${guidance ? `
## ═══════════════════════════════════════════════════════════════════════════
## ADDITIONAL GUIDANCE
## ═══════════════════════════════════════════════════════════════════════════
${guidance}` : ''}

## ═══════════════════════════════════════════════════════════════════════════
## YOUR TASK
## ═══════════════════════════════════════════════════════════════════════════

Break this beat into **${context.currentBeat?.estimatedPages || 4} pages**.

**CRITICAL REQUIREMENTS:**
- Use ONLY the characters listed above
- Reflect character personalities in how they act and speak
- Respect relationship dynamics between characters
- Location details should match the description
- World rules must be followed

For each page provide:
1. **Visual Focus**: The key image/moment - what should the reader's eye be drawn to?
2. **Panel Count**: 4-6 typical, fewer for emotional impact, more for action sequences
3. **Dialogue Notes**: Key exchanges, internal monologue, or captions - reflecting character voices
4. **Visual Direction**: Camera angles, lighting, mood notes for artist
5. **Pacing**: slow (emotional beats), medium (dialogue/character), fast (action)

Respond ONLY with valid JSON:
{
  "pages": [
    {
      "pageNumber": 1,
      "visualFocus": "Key image or moment for this page",
      "panelCount": 5,
      "dialogueNotes": "Key dialogue exchanges or captions (reflecting character voices)",
      "visualDirection": "Art direction notes - angles, lighting, mood",
      "pacing": "slow|medium|fast",
      "charactersOnPage": ["Character names who appear on this page"],
      "emotionalBeat": "What emotional beat this page hits"
    }
  ]
}`,

  // Generate panel scripts for a page (ATOMIC LEVEL)
  generatePanels: (context, guidance = '') => `
You are a professional comic book script writer creating panel-by-panel scripts for an artist and letterer.
Your scripts must maintain PERFECT CONSISTENCY with all established story elements.

## ═══════════════════════════════════════════════════════════════════════════
## STRUCTURAL POSITION IN NARRATIVE
## ═══════════════════════════════════════════════════════════════════════════
**Series Position:** ${context.structure?.positionDescription || 'Unknown'}
**Book Position:** ${context.chapterStructure?.positionDescription || 'Unknown'}
**Chapter Position:** ${context.beatStructure?.positionDescription || 'Unknown'}
**Page Position:** Page ${context.currentPage?.pageNumber || '?'} of ${context.pageStructure?.totalPages || '?'} in this beat

## ═══════════════════════════════════════════════════════════════════════════
## STORY CONTEXT
## ═══════════════════════════════════════════════════════════════════════════
**Series:** ${context.title}
**Genre/Tone:** ${context.genre} / ${context.tone}
**Target Audience:** ${context.targetAudience}

**Book ${context.currentBook?.number}:** ${context.bookTitle}
- Logline: ${context.bookLogline || 'Not specified'}
- Themes: ${context.bookThemes?.join(', ') || 'Not specified'}

**Chapter ${context.currentChapter?.number}:** ${context.chapterTitle}
- POV Character: ${context.chapterPov || 'Not specified'}
- Emotional Arc: ${context.chapterEmotionalArc || 'Not specified'}

**Current Beat:** ${context.currentBeat?.title} (${context.currentBeat?.beatType})
- Purpose: ${context.currentBeat?.purpose || 'Not specified'}
- Summary: ${context.currentBeat?.summary || 'Not defined'}

## ═══════════════════════════════════════════════════════════════════════════
## ⚠️ MANDATORY CONSISTENCY REQUIREMENTS ⚠️
## ═══════════════════════════════════════════════════════════════════════════
These details have been ESTABLISHED and MUST remain consistent:

### Character Appearances (MUST MATCH EXACTLY)
${context.consistencyChecklist?.characterAppearances?.map(c => `
**${c.name}:**
- Hair: ${c.mustMatch?.hair || 'Not specified'}
- Eyes: ${c.mustMatch?.eyes || 'Not specified'}
- Distinguishing Features: ${c.mustMatch?.distinguishing?.join(', ') || 'None specified'}
- Current Clothing: ${c.mustMatch?.currentClothing || 'Not specified'}
- Visible Injuries: ${c.mustMatch?.injuries?.map(i => i.description).join(', ') || 'None'}`).join('\n') || 'No characters specified'}

### Items Characters Are Carrying
${context.consistencyChecklist?.characterItems?.map(c => 
  `**${c.name}:** ${c.carrying?.length > 0 ? c.carrying.join(', ') : 'Nothing notable'}`
).join('\n') || 'Not tracked'}

### Established Visual Elements
- **Lighting:** ${context.consistencyChecklist?.establishedLighting || 'Not yet established'}
- **Weather:** ${context.consistencyChecklist?.establishedWeather || 'Not yet established'}
- **Location Details Already Shown:** ${context.consistencyChecklist?.establishedLocationDetails?.slice(-3).join('; ') || 'None yet'}

## ═══════════════════════════════════════════════════════════════════════════
## CHARACTERS IN THIS SCENE (Full Profiles)
## ═══════════════════════════════════════════════════════════════════════════
${context.sceneCharacters?.map(c => `
### ${c.name}
**VISUAL (for artist reference):**
- Full Description: ${c.physicalDescription || 'Not described'}
- Hair: ${c.visualDetails?.hairColor || 'Not specified'}
- Eyes: ${c.visualDetails?.eyeColor || 'Not specified'}
- Build: ${c.visualDetails?.build || 'Not specified'}
- Height: ${c.visualDetails?.height || 'Not specified'}
- Distinguishing Marks: ${c.distinguishingFeatures?.join(', ') || 'None'}
- Current Clothing: ${c.currentClothing || 'Default attire'}
- Currently Carrying: ${c.itemsCarrying?.join(', ') || 'Nothing notable'}
- Current Injuries: ${c.injuries?.map(i => i.description).join(', ') || 'None'}

**EMOTIONAL STATE:**
- Current Emotion: ${c.currentEmotionalState || 'Neutral'}
- Physical Condition: ${c.currentPhysicalCondition || 'Normal'}

**VOICE & DIALOGUE (for letterer/writer):**
- Speech Patterns: ${c.speechPatterns?.join(', ') || 'Standard speech'}
- Verbal Tics: ${c.verbalTics?.join(', ') || 'None'}
- Vocabulary Level: ${c.vocabulary || 'Standard'}
- Accent/Dialect: ${c.accent || 'None'}
- Voice Quality: ${c.voiceCharacteristics?.join(', ') || 'Normal'}

**PERSONALITY:**
- Core Traits: ${c.traits?.join(', ') || c.personality || 'Not defined'}
- Mannerisms: ${c.mannerisms?.join(', ') || 'None noted'}
- Habits: ${c.habits?.join(', ') || 'None noted'}

**RELATIONSHIPS IN THIS SCENE:**
${c.relationshipsInScene?.map(r => 
  `- With ${r.with}: ${r.relationship?.type || 'Unknown'} - ${r.relationship?.description || ''}`
).join('\n') || '- No relationships specified'}

**KNOWLEDGE/SECRETS:**
- What they know: ${c.knowledgeGained?.join(', ') || 'Nothing special'}
`).join('\n---\n') || 'Characters not specified'}

## ═══════════════════════════════════════════════════════════════════════════
## LOCATION DETAILS
## ═══════════════════════════════════════════════════════════════════════════
**Location:** ${context.currentLocation?.name || context.currentBeat?.location || 'Unknown Location'}
**Description:** ${context.currentLocation?.description || 'Not described'}
**Atmosphere:** ${context.currentLocation?.atmosphere || 'Not defined'}
**Key Features:** ${context.currentLocation?.keyFeatures?.join(', ') || 'None specified'}
**Visual Elements:** ${context.currentLocation?.visualElements?.join(', ') || 'Not specified'}

**Established Visuals from Prior Panels:**
${context.currentLocation?.establishedVisuals?.slice(-5).join('\n') || 'None yet - you are establishing the location'}

## ═══════════════════════════════════════════════════════════════════════════
## ITEMS IN THIS SCENE
## ═══════════════════════════════════════════════════════════════════════════
${context.itemsInScene?.map(item => 
  `**${item.name}:** ${item.description || 'No description'}
  - Held by: ${item.currentHolder || 'Not held'}
  - Condition: ${item.condition || 'Normal'}
  ${item.powers?.length ? `- Powers/Abilities: ${item.powers.join(', ')}` : ''}`
).join('\n') || 'No notable items in scene'}

## ═══════════════════════════════════════════════════════════════════════════
## ACTIVE WORLD RULES
## ═══════════════════════════════════════════════════════════════════════════
These rules apply to this scene and MUST be respected:
${context.activeWorldRules?.map(r => 
  `**${r.name}:** ${r.statement}
  - Visual Manifestation: ${r.visualManifestation || 'Not specified'}
  - In this scene: ${r.implications || 'Standard application'}`
).join('\n\n') || 'No special rules active'}

## ═══════════════════════════════════════════════════════════════════════════
## WHAT HAS HAPPENED (Prior Pages This Beat)
## ═══════════════════════════════════════════════════════════════════════════
${context.priorPages?.length > 0 ? context.priorPages.map(p => 
  `### Page ${p.pageNumber}
**Visual Focus:** ${p.visualFocus}
**Key Action:** ${p.actionSummary || p.dialogueNotes || 'Not specified'}
${p.panels?.length ? `
**Panel-by-Panel:**
${p.panels.map(pnl => `- Panel ${pnl.panelNumber}: ${pnl.action || pnl.visualDescription?.substring(0, 80) || 'Action not recorded'}
  ${pnl.dialogue?.length ? `Dialogue: ${pnl.dialogue.map(d => `${d.speaker}: "${d.text?.substring(0, 50)}..."`).join('; ')}` : ''}`).join('\n')}` : ''}`
).join('\n\n') : '**This is the FIRST PAGE of this beat** - establish scene, location, and characters clearly'}

## ═══════════════════════════════════════════════════════════════════════════
## DIALOGUE HISTORY (Voice Consistency Reference)
## ═══════════════════════════════════════════════════════════════════════════
${context.dialogueHistory?.length > 0 ? 
  `Recent dialogue for voice consistency:
${context.dialogueHistory.slice(-10).map(d => 
  `${d.speaker} (P${d.page}.${d.panel}): "${d.text}"`
).join('\n')}` : 'No prior dialogue in this beat yet'}

## ═══════════════════════════════════════════════════════════════════════════
## CURRENT PAGE: PAGE ${context.currentPage?.pageNumber || '?'}
## ═══════════════════════════════════════════════════════════════════════════
**Visual Focus:** ${context.currentPage?.visualFocus || 'Not defined'}
**Target Panels:** ${context.currentPage?.panelCount || 5}
**Pacing:** ${context.currentPage?.pacing || 'medium'}
**Emotional Beat:** ${context.currentPage?.emotionalBeat || 'Not specified'}
**Characters on Page:** ${context.currentPage?.charactersOnPage?.join(', ') || 'Not specified'}
**Dialogue Notes:** ${context.currentPage?.dialogueNotes || 'Not specified'}
**Visual Direction:** ${context.currentPage?.visualDirection || 'Not specified'}

${context.pageStructure?.isFirstPage ? '📖 **FIRST PAGE OF BEAT** - Must clearly establish scene, show location, introduce all characters present' : ''}
${context.pageStructure?.isLastPage ? '🎬 **LAST PAGE OF BEAT** - Must conclude the beat\'s action, provide transition or hook to next beat' : ''}

## ═══════════════════════════════════════════════════════════════════════════
## WHAT COMES NEXT
## ═══════════════════════════════════════════════════════════════════════════
${context.futurePages?.length > 0 ? 
  `**Next Page:** ${context.futurePages[0].visualFocus}
**Pacing:** ${context.futurePages[0].pacing || 'medium'}` : 
  context.beatStructure?.isClosing ? '**End of beat** - this page should provide closure or cliffhanger' : '**Next beat begins after this**'}

${context.futureBeats?.length > 0 ? 
  `**Upcoming Beat:** ${context.futureBeats[0].title} (${context.futureBeats[0].beatType})` : ''}

## ═══════════════════════════════════════════════════════════════════════════
## RECENT STORY EVENTS (For Context)
## ═══════════════════════════════════════════════════════════════════════════
${context.recentEvents?.map(e => `- ${e.name}: ${e.description}`).join('\n') || 'No major recent events'}

${context.activeConsequences?.length > 0 ? `
**Active Consequences Still Affecting Story:**
${context.activeConsequences.map(c => `- From "${c.source}": ${c.consequence}`).join('\n')}` : ''}

${guidance ? `
## ═══════════════════════════════════════════════════════════════════════════
## ADDITIONAL GUIDANCE
## ═══════════════════════════════════════════════════════════════════════════
${guidance}` : ''}

## ═══════════════════════════════════════════════════════════════════════════
## YOUR TASK
## ═══════════════════════════════════════════════════════════════════════════

Create a detailed panel-by-panel script for **Page ${context.currentPage?.pageNumber}**.

**CRITICAL CONSISTENCY RULES:**
1. Character appearances MUST match the descriptions above EXACTLY
2. Characters must have the items listed as "Currently Carrying"
3. Any injuries must be visible if the body part is shown
4. Dialogue must match each character's established speech patterns and verbal tics
5. Lighting/weather must match what was established on prior pages
6. World rules must be respected (magic works the way described, etc.)
7. Character emotional states should be reflected in their expressions/body language

For each panel provide:
1. **Panel size**: splash (full page), large (1/2 page), medium (1/3-1/4), small (1/6 or less), inset
2. **Shot type**: establishing, wide, medium, close-up, extreme-close-up, over-shoulder, POV
3. **Visual description**: DETAILED description for artist - include character positions, expressions, lighting
4. **Characters**: Who appears (must match established appearances)
5. **Action**: Physical action happening in this frozen moment
6. **Dialogue**: Each speech/thought balloon or caption
7. **SFX**: Sound effects
8. **Art notes**: Lighting, mood, camera angle, special instructions

Panel layout should flow naturally for **${context.currentPage?.pacing || 'medium'}** pacing.
Target panel count: **${context.currentPage?.panelCount || 5}** panels

Respond ONLY with valid JSON:
{
  "pageNumber": ${context.currentPage?.pageNumber || 1},
  "layoutNotes": "Overall page composition notes for artist",
  "panels": [
    {
      "panelNumber": 1,
      "size": "large|medium|small|splash|inset",
      "shot": "establishing|wide|medium|close-up|extreme-close-up|over-shoulder|POV",
      "visualDescription": "Detailed description including character appearances, positions, expressions, environment details, lighting",
      "characters": ["Character names exactly as defined above"],
      "action": "Physical action in this moment",
      "dialogue": [
        {
          "speaker": "Character name exactly as defined",
          "text": "Dialogue matching character's speech patterns",
          "type": "speech|thought|caption|narration",
          "direction": "whisper|shout|trembling|etc (optional)"
        }
      ],
      "sfx": "Sound effect or empty string",
      "artNotes": "Lighting, mood, angle, any special instructions"
    }
  ]
}`,

  // Generate final script format (export-ready)
  generateScriptFormat: (context, format = 'full') => `
You are formatting comic script pages into industry-standard script format.

## Source Material
${JSON.stringify(context.pages, null, 2)}

## Characters Reference
${context.characters?.map(c => `- ${c.name}: ${c.physicalDescription?.substring(0, 100) || 'No description'}`).join('\n')}

## Task
Convert the panel data into a clean, professional comic script format that could be sent directly to an artist.

Format style: ${format === 'full' ? 'Full Script (writer controls panel layout)' : 'Plot-First/Marvel Method (artist determines layout)'}

Output the script as plain text in this format:

PAGE [number]

PANEL [number] ([size], [shot type])
[Visual description for artist]

    [CHARACTER]: [Dialogue]
    CAPTION: [Narrator text]
    SFX: [Sound effect]

---

Respond with the formatted script text only, no JSON wrapper.`,

  // Polish dialogue pass
  polishDialogue: (context, guidance = '') => `
You are a dialogue editor polishing comic book dialogue for natural flow, character voice, and impact.

## Characters and Their Voices
${context.characters?.map(c => `### ${c.name}
- **Background:** ${c.background?.substring(0, 100) || 'Unknown'}
- **Personality:** ${c.personality?.substring(0, 100) || 'Unknown'}
- **Speech pattern:** ${c.speechPattern || 'Standard'}
- **Education/Class:** ${c.education || 'Unknown'}
- **Verbal tics or catchphrases:** ${c.verbalTics || 'None'}`).join('\n\n')}

## Tone
${context.tone || 'Not specified'}

## Current Scene Emotion
${context.sceneEmotion || 'Neutral'}

## Raw Dialogue to Polish
${JSON.stringify(context.rawDialogue, null, 2)}

${guidance ? `## Additional Guidance\n${guidance}\n` : ''}

## Task
Polish this dialogue to:
1. Sound natural and distinct for each character's voice
2. Fit in comic speech balloons (shorter is better - aim for 25 words max per balloon)
3. Convey subtext and emotion
4. Advance character relationships
5. Sound good when read aloud

Break long speeches into multiple balloons if needed.
Add delivery directions (whisper), (shout), (sarcastic) where helpful.

Respond with the polished dialogue in the same JSON structure.`,

  // Regenerate with specific guidance
  regenerate: (originalPrompt, existingContent, feedback) => `
${originalPrompt}

## Previous Generation
${JSON.stringify(existingContent, null, 2)}

## Feedback for Revision
${feedback}

Generate an improved version based on the feedback. Maintain the same JSON format.`
};

// ============================================================================
// API CALLERS
// ============================================================================

const apiCallers = {
  // Call Claude API
  claude: async (prompt, apiKey, model = 'claude-sonnet-4-5-20250929') => {
    console.log('Calling Claude API with model:', model);
    console.log('Prompt length:', prompt.length, 'characters');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 8192, // Increased for larger generations
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
      console.error('Claude API error response:', errorData);
      // Anthropic error format: { type: "error", error: { type: "...", message: "..." } }
      const errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
      throw new Error(`Claude API: ${errorMessage}`);
    }

    const data = await response.json();
    console.log('Claude API success, response length:', data.content?.[0]?.text?.length);
    return data.content[0].text;
  },

  // Call OpenAI API
  openai: async (prompt, apiKey, model = 'gpt-4o') => {
    console.log('Calling OpenAI API with model:', model);
    console.log('Prompt length:', prompt.length, 'characters');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8192 // Increased for larger generations
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  },

  // Call custom endpoint (OpenAI-compatible)
  custom: async (prompt, apiKey, endpoint, model) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.content?.[0]?.text || JSON.stringify(data);
  }
};

// ============================================================================
// MAIN GENERATION SERVICE
// ============================================================================

export const generationService = {
  // Check if generation is available
  isAvailable: () => apiConfig.isConfigured(),

  // Get current configuration status
  getStatus: () => {
    const config = apiConfig.getFullConfig();
    return {
      configured: config.isConfigured,
      provider: config.provider,
      providerName: AI_PROVIDERS[config.provider.toUpperCase()]?.name || config.provider
    };
  },

  // Test connection without requiring JSON response
  testConnection: async () => {
    const provider = apiConfig.getProvider();
    const apiKey = apiConfig.getApiKey();
    
    console.log('Testing connection - Provider:', provider);
    console.log('Testing connection - API Key length:', apiKey?.length || 0);
    console.log('Testing connection - API Key prefix:', apiKey?.substring(0, 10) + '...');
    
    if (!apiConfig.isConfigured()) {
      throw new Error('AI not configured. Please add your API key in Settings.');
    }

    const testPrompt = 'Say "hello" and nothing else.';
    
    let response;
    try {
      switch (provider) {
        case 'claude':
          response = await apiCallers.claude(testPrompt, apiKey);
          break;
        case 'openai':
          response = await apiCallers.openai(testPrompt, apiKey);
          break;
        case 'custom':
          const { endpoint, model } = apiConfig.getCustomConfig();
          response = await apiCallers.custom(testPrompt, apiKey, endpoint, model);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (err) {
      console.error('Test connection error:', err);
      throw err;
    }
    
    console.log('Test connection response:', response?.substring(0, 100));
    
    // If we got any response, connection is working
    if (response && response.length > 0) {
      return { success: true, message: 'Connection successful!' };
    }
    throw new Error('Empty response from API');
  },

  // Generic generation call
  generate: async (prompt) => {
    const provider = apiConfig.getProvider();
    const apiKey = apiConfig.getApiKey();
    
    if (!apiConfig.isConfigured()) {
      throw new Error('AI not configured. Please add your API key in Settings.');
    }

    let response;
    switch (provider) {
      case 'claude':
        response = await apiCallers.claude(prompt, apiKey);
        break;
      case 'openai':
        response = await apiCallers.openai(prompt, apiKey);
        break;
      case 'custom':
        const { endpoint, model } = apiConfig.getCustomConfig();
        response = await apiCallers.custom(prompt, apiKey, endpoint, model);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Extract JSON from response
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (e) {
      console.error('Failed to parse response:', response);
      throw new Error('Failed to parse AI response as JSON');
    }
  },

  // Generate book outlines
  generateBooks: async (project, entities, narrative, count = 12, guidance = '') => {
    const context = contextBuilders.buildSeriesContext(project, entities);
    context.seriesThemes = narrative?.themes || [];
    context.seriesArc = narrative?.logline || '';
    // Pass target book count for structural awareness
    context.structure = {
      totalBooks: count,
      currentBookNumber: 1,
      booksCompleted: 0,
      booksRemaining: count - 1,
      positionDescription: `Generating ${count} books for the series`
    };
    
    const prompt = prompts.generateBooks(context, count, guidance);
    const result = await generationService.generate(prompt);
    return result.books || [];
  },

  // Generate chapters for a book
  generateChapters: async (project, entities, narrative, bookNumber, count = 10, guidance = '') => {
    const seriesContext = contextBuilders.buildSeriesContext(project, entities);
    const context = contextBuilders.buildBookContext(seriesContext, narrative, bookNumber);
    // Add target chapter count for structural awareness
    context.chapterStructure = {
      totalChapters: count,
      currentChapterNumber: 1,
      chaptersCompleted: 0,
      chaptersRemaining: count - 1,
      positionDescription: `Generating ${count} chapters for Book ${bookNumber}`
    };
    
    const prompt = prompts.generateChapters(context, count, guidance);
    const result = await generationService.generate(prompt);
    return result.chapters || [];
  },

  // Generate beats for a chapter
  generateBeats: async (project, entities, narrative, bookNumber, chapterNumber, count = 5, guidance = '') => {
    const seriesContext = contextBuilders.buildSeriesContext(project, entities);
    const bookContext = contextBuilders.buildBookContext(seriesContext, narrative, bookNumber);
    const book = narrative?.books?.find(b => b.number === bookNumber);
    // Pass target chapter count to chapter context
    const totalChapters = book?.chapters?.length || 10;
    const context = contextBuilders.buildChapterContext(bookContext, book, chapterNumber, totalChapters);
    // Add target beat count for structural awareness
    context.beatStructure = {
      totalBeats: count,
      currentBeatNumber: 1,
      beatsCompleted: 0,
      beatsRemaining: count - 1,
      positionDescription: `Generating ${count} beats for Chapter ${chapterNumber} of ${totalChapters}`
    };
    
    const prompt = prompts.generateBeats(context, count, guidance);
    const result = await generationService.generate(prompt);
    return result.beats || [];
  },

  // Generate page breakdown for a beat
  generatePages: async (project, entities, narrative, bookNumber, chapterNumber, beatSequence, guidance = '') => {
    const seriesContext = contextBuilders.buildSeriesContext(project, entities);
    const bookContext = contextBuilders.buildBookContext(seriesContext, narrative, bookNumber);
    const book = narrative?.books?.find(b => b.number === bookNumber);
    const totalChapters = book?.chapters?.length || 10;
    const chapterContext = contextBuilders.buildChapterContext(bookContext, book, chapterNumber, totalChapters);
    const chapter = book?.chapters?.find(c => c.number === chapterNumber);
    const totalBeats = chapter?.beats?.length || 6;
    const context = contextBuilders.buildBeatContext(chapterContext, chapter, beatSequence, totalBeats);
    
    const prompt = prompts.generatePages(context, guidance);
    const result = await generationService.generate(prompt);
    return result.pages || [];
  },

  // Generate panel scripts for a single page (ATOMIC LEVEL - Publishing Ready)
  generatePanels: async (project, entities, narrative, bookNumber, chapterNumber, beatSequence, pageNumber, guidance = '') => {
    // Build full context chain with DEEP CONTEXT for consistency
    const seriesContext = contextBuilders.buildSeriesContext(project, entities);
    const bookContext = contextBuilders.buildBookContext(seriesContext, narrative, bookNumber);
    const book = narrative?.books?.find(b => b.number === bookNumber);
    const totalChapters = book?.chapters?.length || 10;
    const chapterContext = contextBuilders.buildChapterContext(bookContext, book, chapterNumber, totalChapters);
    const chapter = book?.chapters?.find(c => c.number === chapterNumber);
    const totalBeats = chapter?.beats?.length || 6;
    const beatContext = contextBuilders.buildBeatContext(chapterContext, chapter, beatSequence, totalBeats);
    const beat = chapter?.beats?.find(b => b.sequence === beatSequence);
    
    // ENHANCED: Pass project and entities for deep context tracking
    const context = contextBuilders.buildPageContext(beatContext, beat, pageNumber, project, entities, narrative);
    
    const prompt = prompts.generatePanels(context, guidance);
    const result = await generationService.generate(prompt);
    return result;
  },

  // Generate panels for ALL pages in a beat (batch generation)
  generateAllPanelsForBeat: async (project, entities, narrative, bookNumber, chapterNumber, beatSequence, guidance = '') => {
    // First ensure pages exist
    const book = narrative?.books?.find(b => b.number === bookNumber);
    const chapter = book?.chapters?.find(c => c.number === chapterNumber);
    const beat = chapter?.beats?.find(b => b.sequence === beatSequence);
    
    if (!beat?.pages?.length) {
      throw new Error('No pages found for this beat. Generate pages first.');
    }

    const results = [];
    for (const page of beat.pages) {
      console.log(`Generating panels for page ${page.pageNumber}...`);
      const panelScript = await generationService.generatePanels(
        project, entities, narrative, 
        bookNumber, chapterNumber, beatSequence, 
        page.pageNumber, guidance
      );
      results.push(panelScript);
    }
    
    return results;
  },

  // Export script in industry-standard format
  // Export script in multiple formats with all atomic elements
  exportScript: async (narrative, bookNumber, chapterNumber = null, format = 'full', includeContext = false) => {
    const book = narrative?.books?.find(b => b.number === bookNumber);
    if (!book) throw new Error('Book not found');

    const chapters = chapterNumber 
      ? [book.chapters?.find(c => c.number === chapterNumber)]
      : book.chapters || [];

    // JSON format returns structured data
    if (format === 'json') {
      return JSON.stringify({
        exportDate: new Date().toISOString(),
        series: {
          title: narrative.title,
          logline: narrative.logline,
          themes: narrative.themes,
          targetLength: narrative.targetLength
        },
        book: {
          number: book.number,
          title: book.title,
          logline: book.logline,
          themes: book.themes,
          estimatedPages: book.estimatedPages
        },
        chapters: chapters.filter(Boolean).map(chapter => ({
          number: chapter.number,
          title: chapter.title,
          summary: chapter.summary,
          pov: chapter.pov,
          emotionalArc: chapter.emotionalArc,
          estimatedPages: chapter.estimatedPages,
          beats: (chapter.beats || []).map(beat => ({
            sequence: beat.sequence,
            title: beat.title,
            beatType: beat.beatType,
            purpose: beat.purpose,
            summary: beat.summary,
            characters: beat.characters,
            location: beat.location,
            estimatedPages: beat.estimatedPages,
            pages: (beat.pages || []).map(page => ({
              pageNumber: page.pageNumber,
              visualFocus: page.visualFocus,
              panelCount: page.panelCount,
              pacing: page.pacing,
              dialogueNotes: page.dialogueNotes,
              visualDirection: page.visualDirection,
              charactersOnPage: page.charactersOnPage,
              emotionalBeat: page.emotionalBeat,
              layoutNotes: page.layoutNotes,
              panels: (page.panels || []).map(panel => ({
                panelNumber: panel.panelNumber,
                size: panel.size,
                shot: panel.shot,
                visualDescription: panel.visualDescription,
                characters: panel.characters,
                action: panel.action,
                dialogue: panel.dialogue,
                sfx: panel.sfx,
                artNotes: panel.artNotes
              }))
            }))
          }))
        }))
      }, null, 2);
    }

    // Full script format (industry standard)
    let scriptText = '';
    
    // Header with series/book context
    scriptText += `${'═'.repeat(70)}\n`;
    scriptText += `${book.title.toUpperCase()}\n`;
    scriptText += `${'═'.repeat(70)}\n\n`;
    
    if (includeContext) {
      scriptText += `Series: ${narrative.title}\n`;
      scriptText += `Logline: ${book.logline || narrative.logline || 'Not specified'}\n`;
      scriptText += `Themes: ${(book.themes || narrative.themes || []).join(', ')}\n\n`;
    }
    
    for (const chapter of chapters) {
      if (!chapter) continue;
      
      // Chapter header
      scriptText += `${'─'.repeat(70)}\n`;
      scriptText += `CHAPTER ${chapter.number}: ${chapter.title}\n`;
      scriptText += `${'─'.repeat(70)}\n`;
      scriptText += `POV: ${chapter.pov || 'Not specified'}\n`;
      if (chapter.emotionalArc) scriptText += `Emotional Arc: ${chapter.emotionalArc}\n`;
      if (chapter.summary) scriptText += `Summary: ${chapter.summary}\n`;
      scriptText += `\n`;
      
      for (const beat of (chapter.beats || [])) {
        // Beat header
        scriptText += `\n### BEAT ${beat.sequence}: ${beat.title} [${beat.beatType.toUpperCase()}]\n`;
        scriptText += `Location: ${beat.location || 'Not specified'}\n`;
        if (beat.characters?.length) scriptText += `Characters: ${beat.characters.join(', ')}\n`;
        if (beat.purpose) scriptText += `Purpose: ${beat.purpose}\n`;
        if (beat.summary) scriptText += `Summary: ${beat.summary}\n`;
        scriptText += `\n`;
        
        for (const page of (beat.pages || [])) {
          scriptText += `${'─'.repeat(40)}\n`;
          scriptText += `PAGE ${page.pageNumber}`;
          if (page.pacing) scriptText += ` [${page.pacing.toUpperCase()} PACING]`;
          scriptText += `\n`;
          scriptText += `${'─'.repeat(40)}\n`;
          
          // Page metadata
          if (page.visualFocus) scriptText += `Visual Focus: ${page.visualFocus}\n`;
          if (page.emotionalBeat) scriptText += `Emotional Beat: ${page.emotionalBeat}\n`;
          if (page.charactersOnPage?.length) scriptText += `Characters: ${page.charactersOnPage.join(', ')}\n`;
          if (page.layoutNotes) scriptText += `Layout: ${page.layoutNotes}\n`;
          scriptText += `\n`;
          
          if (page.panels?.length) {
            for (const panel of page.panels) {
              // Panel header with size and shot
              scriptText += `PANEL ${panel.panelNumber}`;
              const panelMeta = [panel.size, panel.shot].filter(Boolean);
              if (panelMeta.length) {
                scriptText += ` (${panelMeta.join(', ')})`;
              }
              scriptText += `\n`;
              
              // Visual description (for artist)
              if (panel.visualDescription) {
                scriptText += `${panel.visualDescription}\n`;
              }
              
              // Action (distinct from visual)
              if (panel.action && panel.action !== panel.visualDescription) {
                scriptText += `ACTION: ${panel.action}\n`;
              }
              
              // Characters in panel
              if (panel.characters?.length) {
                scriptText += `[Characters: ${panel.characters.join(', ')}]\n`;
              }
              
              // Dialogue block
              if (panel.dialogue?.length) {
                scriptText += `\n`;
                for (const d of panel.dialogue) {
                  if (d.type === 'caption') {
                    scriptText += `    CAPTION: ${d.text}\n`;
                  } else if (d.type === 'narration') {
                    scriptText += `    NARRATION: ${d.text}\n`;
                  } else if (d.type === 'thought') {
                    scriptText += `    ${d.speaker.toUpperCase()} (thought): ${d.text}\n`;
                  } else {
                    const direction = d.direction ? ` (${d.direction})` : '';
                    scriptText += `    ${d.speaker.toUpperCase()}${direction}: ${d.text}\n`;
                  }
                }
              }
              
              // Sound effects
              if (panel.sfx) {
                scriptText += `    SFX: ${panel.sfx}\n`;
              }
              
              // Art notes
              if (panel.artNotes) {
                scriptText += `    [ART NOTES: ${panel.artNotes}]\n`;
              }
              
              scriptText += `\n`;
            }
          } else {
            // No panels yet - show page planning notes
            scriptText += `[PAGE NOT YET SCRIPTED]\n`;
            scriptText += `Target Panels: ${page.panelCount || 5}\n`;
            if (page.dialogueNotes) scriptText += `Dialogue Notes: ${page.dialogueNotes}\n`;
            if (page.visualDirection) scriptText += `Visual Direction: ${page.visualDirection}\n`;
            scriptText += `\n`;
          }
        }
      }
      
      scriptText += `\n`;
    }
    
    // Footer
    scriptText += `${'═'.repeat(70)}\n`;
    scriptText += `END OF ${chapterNumber ? `CHAPTER ${chapterNumber}` : 'BOOK'}\n`;
    scriptText += `${'═'.repeat(70)}\n`;
    
    return scriptText;
  },

  // Export full project data (for backup/import)
  exportProjectData: async (project, entities, relationships, narrative) => {
    return JSON.stringify({
      exportVersion: '3.7.5',
      exportDate: new Date().toISOString(),
      project: {
        name: project.name,
        description: project.description,
        settings: project.settings
      },
      entities: entities.map(e => ({
        type: e.type,
        name: e.name,
        ...e
      })),
      relationships: relationships.map(r => ({
        sourceId: r.sourceId,
        targetId: r.targetId,
        type: r.type,
        description: r.description
      })),
      narrative: narrative
    }, null, 2);
  },

  // Polish dialogue for a page
  polishDialogue: async (project, entities, narrative, bookNumber, chapterNumber, beatSequence, pageNumber, guidance = '') => {
    const seriesContext = contextBuilders.buildSeriesContext(project, entities);
    const book = narrative?.books?.find(b => b.number === bookNumber);
    const chapter = book?.chapters?.find(c => c.number === chapterNumber);
    const beat = chapter?.beats?.find(b => b.sequence === beatSequence);
    const page = beat?.pages?.find(p => p.pageNumber === pageNumber);
    
    if (!page?.panels) {
      throw new Error('No panels found for this page. Generate panels first.');
    }

    // Extract all dialogue from the page
    const rawDialogue = page.panels.map(p => ({
      panelNumber: p.panelNumber,
      dialogue: p.dialogue || []
    }));

    const context = {
      ...seriesContext,
      tone: seriesContext.tone,
      sceneEmotion: beat?.emotionalNote || chapter?.emotionalArc || 'neutral',
      rawDialogue
    };

    const prompt = prompts.polishDialogue(context, guidance);
    const result = await generationService.generate(prompt);
    return result;
  },

  // Regenerate with feedback
  regenerateWithFeedback: async (type, context, existingContent, feedback) => {
    let originalPrompt;
    switch (type) {
      case 'books': originalPrompt = prompts.generateBooks(context, existingContent.length); break;
      case 'chapters': originalPrompt = prompts.generateChapters(context, existingContent.length); break;
      case 'beats': originalPrompt = prompts.generateBeats(context, existingContent.length); break;
      case 'pages': originalPrompt = prompts.generatePages(context); break;
      case 'panels': originalPrompt = prompts.generatePanels(context); break;
      default: throw new Error(`Unknown regeneration type: ${type}`);
    }
    
    const prompt = prompts.regenerate(originalPrompt, existingContent, feedback);
    return await generationService.generate(prompt);
  }
};

export default generationService;
