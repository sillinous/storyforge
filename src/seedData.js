// ============================================================================
// STORY FORGE - SEED DATA & CONTEXT EXTRACTION
// ============================================================================

// Demo Template: Chronicles of the Shattered Realms
export const TEMPLATE_DATA = {
  project: {
    name: "Chronicles of the Shattered Realms",
    description: "An epic fantasy saga exploring themes of power, redemption, and the cost of immortality across a world fractured by ancient magic. This self-documenting example demonstrates Story Forge's full capabilities.",
    settings: {
      genre: "Epic Fantasy",
      targetAudience: "Adult",
      format: "graphic_novel"
    }
  },
  
  entities: [
    // WORLD RULES (Foundation)
    { type: 'world_rule', name: 'The Shattering', status: 'approved', tags: ['cosmology', 'history'], category: 'cosmology', statement: 'A thousand years ago, the god-emperor Valdris attempted to achieve true immortality, fracturing reality itself.', explanation: 'The Shattering split the world into five realms connected by unstable rift-gates. Magic became tied to emotional resonance, and the Shattered—immortal beings cursed with memory loss—now walk the lands.' },
    { type: 'world_rule', name: 'Resonance Magic', status: 'approved', tags: ['magic', 'core'], category: 'magic', statement: 'Magic flows from emotional truth—the deeper the feeling, the stronger the power.', explanation: 'Practitioners must genuinely feel to cast. False emotions produce no magic. This makes deception through magic nearly impossible but emotional manipulation devastatingly effective.' },
    { type: 'world_rule', name: 'The Memory Tax', status: 'approved', tags: ['magic', 'cost'], category: 'magic', statement: 'All immortality extracts memories as payment—the longer you live, the less you remember.', explanation: 'The Shattered can live forever but gradually lose all sense of self. Many keep journals, create art, or establish rituals to preserve identity fragments.' },
    { type: 'world_rule', name: 'Rift-Gate Travel', status: 'approved', tags: ['travel', 'realms'], category: 'physics', statement: 'The five realms connect through unstable rift-gates that respond to collective belief.', explanation: 'Gates stabilize when many people believe in their permanence. Abandoned gates drift or collapse. This makes trade routes dependent on cultural connection.' },
    
    // CHARACTERS (8 main)
    { type: 'character', name: 'Kael Thornwood', status: 'approved', tags: ['protagonist', 'shattered'], role: 'protagonist', physicalDescription: 'Tall and lean with silver-streaked dark hair and eyes that shift color with emotion. Bears ritual scars on his forearms.', personality: 'Thoughtful, haunted by fragments of memories he cannot place. Deeply empathetic but struggles to form lasting connections.', backstory: 'Once a general who committed atrocities he can no longer remember. Seeks redemption for sins he must rediscover.', arc: { seriesArc: 'From self-imposed isolation to accepting that identity is built from choices, not memories.' } },
    { type: 'character', name: 'Lyria Vex', status: 'approved', tags: ['deuteragonist', 'morally-complex'], role: 'deuteragonist', physicalDescription: 'Compact and athletic with copper skin and close-cropped black hair. Missing her left ring finger—a debt paid.', personality: 'Pragmatic, sharp-tongued, fiercely loyal to her chosen few. Hides vulnerability behind competence.', backstory: 'Former guild assassin who discovered her targets were innocent. Now runs an underground network protecting the hunted.', arc: { seriesArc: 'Learning that protection sometimes requires trusting others to protect themselves.' } },
    { type: 'character', name: 'Emperor Valdris', status: 'approved', tags: ['antagonist', 'tragic'], role: 'antagonist', physicalDescription: 'Regal bearing despite obvious decay. Skin like cracked porcelain revealing golden light beneath. Eyes completely white.', personality: 'Once idealistic, now desperate. Genuinely believes reunification justifies any cost.', backstory: 'The god-emperor who caused the Shattering. Has forgotten why he wanted immortality but cannot forget that he wanted it.', arc: { seriesArc: 'The tragedy of achieving your goal and losing the reason you wanted it.' } },
    { type: 'character', name: 'Mira Songweaver', status: 'in_progress', tags: ['supporting', 'mentor'], role: 'supporting', physicalDescription: 'Elderly woman with knowing eyes and fingers stained with ink. Moves with unexpected grace.', personality: 'Patient teacher with a core of steel. Speaks in stories that always prove relevant.', backstory: 'Last of the Memory Keepers, she maintains the archives that preserve Shattered identities.', arc: { seriesArc: 'Passing on her knowledge before her own memories fade completely.' } },
    { type: 'character', name: 'Theron Black', status: 'in_progress', tags: ['rival', 'complex'], role: 'supporting', physicalDescription: 'Handsome in a dangerous way, with a scar bisecting one eyebrow. Always impeccably dressed.', personality: 'Charming, manipulative, but genuinely believes in his cause. Sees himself as the hero of his own story.', backstory: 'Noble-born, lost everything in the realm-wars. Seeks to restore the old order through any means.', arc: { seriesArc: 'Discovering that restoring the past means erasing the present.' } },
    { type: 'character', name: 'The Hollow King', status: 'draft', tags: ['mysterious', 'ancient'], role: 'supporting', physicalDescription: 'Never seen clearly. Appears as a silhouette with a crown of thorns, speaking through possessed bodies.', personality: 'Ancient, alien, operating on logic incomprehensible to mortals.', backstory: 'Predates the Shattering. May be the original source of Resonance magic.', arc: { seriesArc: 'Revealing what the world was before the gods arrived.' } },
    { type: 'character', name: 'Sera Dawnbright', status: 'approved', tags: ['supporting', 'faith'], role: 'supporting', physicalDescription: 'Young woman with sun-bright hair and burns scars on her palms from channeling too much power.', personality: 'Devout, idealistic, struggling to reconcile faith with reality.', backstory: 'Temple-raised, discovered her order has been manipulating Resonance through manufactured faith.', arc: { seriesArc: 'Finding authentic belief after institutional betrayal.' } },
    { type: 'character', name: 'Grimjaw', status: 'in_progress', tags: ['comic-relief', 'heart'], role: 'supporting', physicalDescription: 'Massive, scarred, missing most of one ear. Surprisingly gentle hands.', personality: 'Appears brutish, actually philosophical. Collects pressed flowers.', backstory: 'Former pit fighter who found purpose protecting children in the war-torn realm of Ash.', arc: { seriesArc: 'Proving that past violence does not dictate future gentleness.' } },
    
    // LOCATIONS (6 key places)
    { type: 'location', name: 'The Crystalline Citadel', status: 'approved', tags: ['major', 'valdris'], locationType: 'landmark', description: 'Emperor Valdris\'s seat of power, a palace grown from living crystal that resonates with collective emotion.', atmosphere: 'Hauntingly beautiful, constantly shifting colors. The architecture seems to breathe.' },
    { type: 'location', name: 'Veiled Markets', status: 'approved', tags: ['hub', 'trade'], locationType: 'settlement', description: 'A massive bazaar existing in the spaces between realms, accessible through any mirror at the right time.', atmosphere: 'Chaotic, colorful, dangerous. Everything is for sale, including memories and futures.' },
    { type: 'location', name: 'The Realm of Ash', status: 'approved', tags: ['realm', 'war-torn'], locationType: 'region', description: 'Once a verdant land, now perpetually burning from resonance-fire that cannot be extinguished.', atmosphere: 'Beautiful in its desolation. Embers dance like fireflies. Survivors are hardened but not hopeless.' },
    { type: 'location', name: 'Memory Archives', status: 'approved', tags: ['important', 'sanctuary'], locationType: 'landmark', description: 'Underground vaults where the Shattered store their fading memories in crystallized form.', atmosphere: 'Reverent silence, soft blue glow from memory-crystals, echoes of forgotten laughter.' },
    { type: 'location', name: 'The Whispering Peaks', status: 'in_progress', tags: ['realm', 'mysterious'], locationType: 'region', description: 'Mountains that speak with the voices of those who died there. Crossing requires answering their questions truthfully.', atmosphere: 'Eerie, sacred, transformative. Those who cross emerge changed.' },
    { type: 'location', name: 'Thornwood Village', status: 'draft', tags: ['origin', 'destroyed'], locationType: 'settlement', description: 'Kael\'s birthplace, now abandoned. Flowers grow from the ruins in the shape of screaming faces.', atmosphere: 'Melancholic, haunted by what might have been.' },
    
    // FACTIONS (5 groups)
    { type: 'faction', name: 'The Reclaimed', status: 'approved', tags: ['protagonist-aligned'], factionType: 'organization', description: 'Shattered who have chosen to build new identities rather than chase old ones.', goals: ['Establish rights for the Shattered', 'Create new meaning from fragments'], methods: ['Community building', 'Political advocacy', 'Memory sharing rituals'] },
    { type: 'faction', name: 'Valdris Loyalists', status: 'approved', tags: ['antagonist'], factionType: 'political', description: 'Those who believe reunification under Valdris will restore what was lost.', goals: ['Reunify the realms', 'Restore the god-emperor\'s power'], methods: ['Military force', 'Propaganda', 'Gate manipulation'] },
    { type: 'faction', name: 'The Silent Order', status: 'approved', tags: ['neutral', 'mysterious'], factionType: 'religious', description: 'Monks who have voluntarily given up speech to strengthen their Resonance connection.', goals: ['Preserve pure Resonance', 'Prevent another Shattering'], methods: ['Meditation', 'Strategic silence', 'Emotional amplification'] },
    { type: 'faction', name: 'Memory Merchants', status: 'in_progress', tags: ['morally-gray'], factionType: 'organization', description: 'Traders who buy and sell crystallized memories. Operate in legal gray areas.', goals: ['Profit', 'Preserve rare memories', 'Control information'], methods: ['Trade', 'Espionage', 'Preservation'] },
    { type: 'faction', name: 'The Hollow Court', status: 'draft', tags: ['ancient', 'mysterious'], factionType: 'unknown', description: 'Servants of the Hollow King. Their true nature and goals remain unclear.', goals: ['Unknown—possibly preparing for something ancient'], methods: ['Possession', 'Dream manipulation', 'Rift instability'] },
    
    // ARTIFACTS (4 items)
    { type: 'artifact', name: 'The Shattered Crown', status: 'approved', tags: ['macguffin', 'dangerous'], artifactType: 'object', description: 'Valdris\'s crown, broken into five pieces scattered across the realms.', origin: 'Created from crystallized divine essence during Valdris\'s ascension.', powers: ['Reunification could heal the realms—or complete the Shattering'], limitations: ['Each piece corrupts its bearer with Valdris\'s fragmented desires'] },
    { type: 'artifact', name: 'Kael\'s Journal', status: 'approved', tags: ['personal', 'identity'], artifactType: 'object', description: 'A worn leather journal containing fragments of Kael\'s lost memories, written in his own hand.', origin: 'Started when Kael first realized he was forgetting.', powers: ['Helps Kael reconstruct his identity', 'Contains clues to his past sins'], limitations: ['Some pages are deliberately torn out—by Kael himself'] },
    { type: 'artifact', name: 'Resonance Bells', status: 'in_progress', tags: ['cultural', 'widespread'], artifactType: 'tool', description: 'Bells tuned to specific emotions, used to stabilize Resonance magic.', origin: 'Developed by the Silent Order after the Shattering.', powers: ['Amplify specific emotional frequencies', 'Create zones of emotional stability'], limitations: ['Can be weaponized to force emotions on others'] },
    { type: 'artifact', name: 'The First Mirror', status: 'draft', tags: ['ancient', 'dangerous'], artifactType: 'object', description: 'Said to show not reflection but truth. Currently lost.', origin: 'Predates the Shattering, possibly predates the gods.', powers: ['Reveals true nature of anything reflected', 'May be a rift-gate to somewhere else entirely'], limitations: ['Those who see their truth may be destroyed by it'] },
    
    // CREATURES (3 beings)
    { type: 'creature', name: 'Resonance Wraiths', status: 'approved', tags: ['common', 'dangerous'], classification: { class: 'spirit', threatLevel: 'moderate' }, physiology: { appearance: 'Humanoid shapes made of solidified emotion, flickering between forms.' }, description: 'Created when strong emotions are left unresolved at death. Drawn to matching emotions in the living.' },
    { type: 'creature', name: 'Memory Eaters', status: 'approved', tags: ['predator', 'feared'], classification: { class: 'aberration', threatLevel: 'high' }, physiology: { appearance: 'Appearing as holes in reality shaped like hungry mouths.' }, description: 'Entities that consume crystallized memories. Particularly dangerous to the Shattered.' },
    { type: 'creature', name: 'The Bridgekeeper', status: 'in_progress', tags: ['unique', 'ancient'], classification: { class: 'unknown', threatLevel: 'unknown' }, physiology: { appearance: 'A massive serpentine creature made of interlocking rift-gates.' }, description: 'Guards the most stable passage between realms. May be intelligent, may be a natural phenomenon.' },
    
    // EVENTS (4 historical moments)
    { type: 'event', name: 'The Shattering', status: 'approved', tags: ['history', 'catastrophe'], eventType: 'historical', description: 'The moment Valdris\'s ascension tore reality into five realms.', date: '1000 years before present', participants: ['Valdris', 'The old gods', 'Everyone'] },
    { type: 'event', name: 'The Thornwood Massacre', status: 'in_progress', tags: ['backstory', 'mystery'], eventType: 'historical', description: 'The event that earned Kael his worst forgotten sin. Details unclear even in historical records.', date: '200 years before present', participants: ['Kael', 'Unknown'] },
    { type: 'event', name: 'The Silent Pact', status: 'approved', tags: ['political', 'secret'], eventType: 'historical', description: 'Secret agreement between the five realms to never reunify, fearing what Valdris would become.', date: '800 years before present', participants: ['Realm leaders', 'The Silent Order'] },
    { type: 'event', name: 'The Crimson Festival', status: 'draft', tags: ['cultural', 'annual'], eventType: 'cultural', description: 'Annual celebration where the Shattered share memories with the mortal-lived. A time of connection and mourning.', date: 'Every autumn', participants: ['The Shattered', 'Anyone who has lost someone'] }
  ],
  
  relationships: [
    // Kael's relationships
    { sourceIdx: 4, targetIdx: 5, type: 'ally', description: 'Reluctant partnership built on mutual need that became genuine friendship.' },
    { sourceIdx: 4, targetIdx: 7, type: 'mentor', description: 'Mira helps Kael reconstruct his identity through her archives.' },
    { sourceIdx: 4, targetIdx: 6, type: 'enemy', description: 'Kael opposes Valdris but may have once served him.' },
    { sourceIdx: 4, targetIdx: 8, type: 'rival', description: 'Theron and Kael want the same things for different reasons.' },
    
    // Lyria's relationships
    { sourceIdx: 5, targetIdx: 11, type: 'ally', description: 'Lyria uses Grimjaw as protection for her network\'s charges.' },
    { sourceIdx: 5, targetIdx: 15, type: 'inhabits', description: 'The Veiled Markets serve as Lyria\'s base of operations.' },
    
    // Valdris's relationships
    { sourceIdx: 6, targetIdx: 14, type: 'owns', description: 'The Crystalline Citadel is Valdris\'s seat of power.' },
    { sourceIdx: 6, targetIdx: 21, type: 'created', description: 'Valdris\'s ascension attempt caused the Shattering.' },
    { sourceIdx: 6, targetIdx: 23, type: 'owns', description: 'The crown pieces call to Valdris across the realms.' },
    
    // Faction relationships
    { sourceIdx: 18, targetIdx: 19, type: 'enemy', description: 'The Reclaimed directly oppose Loyalist reunification efforts.' },
    { sourceIdx: 20, targetIdx: 6, type: 'fears', description: 'The Silent Order fears Valdris will cause another Shattering.' },
    
    // Location relationships
    { sourceIdx: 17, targetIdx: 7, type: 'inhabits', description: 'Mira maintains the Memory Archives.' },
    { sourceIdx: 11, targetIdx: 16, type: 'inhabits', description: 'Grimjaw protects orphans in the Realm of Ash.' }
  ],
  
  narrative: {
    title: 'Chronicles of the Shattered Realms',
    logline: 'An immortal seeking redemption for sins he cannot remember must stop a god-emperor from reunifying a broken world—even as he discovers he may have helped break it.',
    themes: ['Identity vs Memory', 'Redemption without remembrance', 'The cost of immortality', 'Building meaning from fragments'],
    targetLength: 12,
    status: 'in_progress',
    books: [
      {
        number: 1,
        title: 'The Reclaimed',
        logline: 'Kael discovers fragments of his past that suggest he was a monster, forcing him to choose between learning the truth and maintaining the person he has become.',
        estimatedPages: 180,
        status: 'in_progress',
        chapters: [
          { number: 1, title: 'Fragments', summary: 'Kael prevents a Memory Merchant from selling stolen identities, but a fragment he recovers shows his own face committing violence.', estimatedPages: 22, status: 'approved' },
          { number: 2, title: 'The Veiled Markets', summary: 'Seeking answers, Kael enters the between-realm bazaar and encounters Lyria, who recognizes him—and fears him.', estimatedPages: 20, status: 'approved' },
          { number: 3, title: 'Old Debts', summary: 'Lyria reveals she once worked for someone matching Kael\'s description. They form an uneasy alliance to find the truth.', estimatedPages: 18, status: 'in_progress' },
          { number: 4, title: 'The Memory Archives', summary: 'Mira Songweaver offers access to Kael\'s stored memories—but warns that some truths destroy those who learn them.', estimatedPages: 24, status: 'draft' }
        ]
      },
      {
        number: 2,
        title: 'The Hollow Crown',
        logline: 'As Valdris moves to reunify the realms, Kael must gather unlikely allies while confronting the full horror of his past.',
        estimatedPages: 200,
        status: 'planned',
        chapters: [
          { number: 1, title: 'The First Piece', summary: 'A crown fragment surfaces, driving Valdris Loyalists into action.', estimatedPages: 22, status: 'draft' },
          { number: 2, title: 'Realm of Ash', summary: 'The team travels through the burning realm, where Grimjaw\'s past catches up with them.', estimatedPages: 24, status: 'draft' }
        ]
      },
      {
        number: 3,
        title: 'What Was Shattered',
        logline: 'The truth of the Shattering reveals that saving the world may require letting it end.',
        estimatedPages: 220,
        status: 'planned',
        chapters: []
      }
    ]
  }
};

// ============================================================================
// CONTEXT EXTRACTION - Parse user's story notes into entities
// ============================================================================

// Basic extraction patterns for common entity types
const EXTRACTION_PATTERNS = {
  character: {
    namePatterns: [
      /(?:protagonist|hero|heroine|main character)\s+(?:named?\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:is|was)\s+(?:a|an|the)\s+(?:warrior|wizard|mage|knight|princess|prince|king|queen|thief|assassin|hunter|healer)/gi,
      /(?:character|person)\s+(?:named?\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?/gi,
    ],
    keywords: ['protagonist', 'antagonist', 'hero', 'villain', 'character', 'person', 'warrior', 'mage', 'knight']
  },
  location: {
    namePatterns: [
      /(?:city|town|village|kingdom|realm|land|forest|mountain|castle|fortress|temple)\s+(?:of\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?/gi,
      /["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?\s+(?:is|was)\s+(?:a|an|the)\s+(?:city|town|village|kingdom|realm)/gi,
      /(?:in|at|to)\s+(?:the\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?(?:\s+(?:city|town|village|kingdom|realm|forest|mountain))?/gi,
    ],
    keywords: ['city', 'town', 'village', 'kingdom', 'realm', 'forest', 'mountain', 'castle', 'temple', 'world']
  },
  faction: {
    namePatterns: [
      /(?:guild|order|clan|tribe|house|faction|organization|group)\s+(?:of\s+)?(?:the\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?/gi,
      /(?:the\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?\s+(?:guild|order|clan|tribe|faction)/gi,
    ],
    keywords: ['guild', 'order', 'clan', 'tribe', 'faction', 'organization', 'army', 'rebellion']
  },
  artifact: {
    namePatterns: [
      /(?:sword|blade|staff|wand|ring|amulet|crown|artifact|relic|weapon)\s+(?:of\s+)?(?:the\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?/gi,
      /(?:the\s+)?["']?([A-Z][a-z]+(?:'s)?\s+(?:Sword|Blade|Staff|Ring|Amulet|Crown))["']?/gi,
    ],
    keywords: ['sword', 'blade', 'staff', 'wand', 'ring', 'amulet', 'crown', 'artifact', 'relic', 'weapon', 'magical item']
  },
  creature: {
    namePatterns: [
      /(?:dragon|beast|monster|creature|demon|spirit)\s+(?:named?\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?/gi,
      /(?:a|an|the)\s+["']?([A-Z][a-z]+)["']?\s+(?:dragon|beast|monster|creature)/gi,
    ],
    keywords: ['dragon', 'beast', 'monster', 'creature', 'demon', 'spirit', 'wolf', 'serpent']
  },
  world_rule: {
    namePatterns: [],
    keywords: ['magic works', 'magic system', 'the rules', 'in this world', 'magic is', 'power comes from', 'law of']
  },
  event: {
    namePatterns: [
      /(?:the\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:War|Battle|Revolution|Rebellion|Cataclysm|Disaster)["']?/gi,
      /(?:battle|war|event)\s+(?:of\s+)?["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']?/gi,
    ],
    keywords: ['war', 'battle', 'event', 'cataclysm', 'disaster', 'revolution', 'years ago', 'in the past']
  }
};

// Extract potential entities from text
export function extractEntitiesFromContext(text) {
  const extracted = {
    character: [],
    location: [],
    faction: [],
    artifact: [],
    creature: [],
    world_rule: [],
    event: []
  };
  
  const seen = new Set();
  
  // Extract named entities using patterns
  Object.entries(EXTRACTION_PATTERNS).forEach(([type, config]) => {
    config.namePatterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        const name = match[1]?.trim();
        if (name && name.length > 2 && name.length < 50 && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          
          // Find surrounding context (sentence containing the match)
          const sentenceStart = Math.max(0, text.lastIndexOf('.', match.index) + 1);
          const sentenceEnd = text.indexOf('.', match.index + match[0].length);
          const context = text.slice(sentenceStart, sentenceEnd > 0 ? sentenceEnd + 1 : match.index + 200).trim();
          
          extracted[type].push({
            name,
            context,
            confidence: 'high'
          });
        }
      }
    });
  });
  
  // Extract paragraphs that might describe world rules
  const paragraphs = text.split(/\n\n+/);
  paragraphs.forEach(para => {
    const lower = para.toLowerCase();
    if (EXTRACTION_PATTERNS.world_rule.keywords.some(kw => lower.includes(kw))) {
      if (!seen.has(para.slice(0, 50).toLowerCase())) {
        seen.add(para.slice(0, 50).toLowerCase());
        const firstSentence = para.split('.')[0];
        if (firstSentence.length > 10 && firstSentence.length < 100) {
          extracted.world_rule.push({
            name: firstSentence.slice(0, 50) + (firstSentence.length > 50 ? '...' : ''),
            context: para.slice(0, 300),
            confidence: 'medium'
          });
        }
      }
    }
  });
  
  return extracted;
}

// Analyze text for themes and tone
export function analyzeNarrativeContext(text) {
  const lower = text.toLowerCase();
  
  const themes = [];
  const themeKeywords = {
    'Good vs Evil': ['good', 'evil', 'light', 'darkness', 'righteous', 'wicked'],
    'Redemption': ['redemption', 'forgiveness', 'atone', 'second chance', 'past sins'],
    'Power & Corruption': ['power', 'corrupt', 'temptation', 'absolute power', 'throne'],
    'Identity': ['identity', 'who am i', 'true self', 'memory', 'forget', 'remember'],
    'Love & Loss': ['love', 'loss', 'grief', 'heart', 'beloved', 'mourning'],
    'Coming of Age': ['grow', 'learn', 'young', 'destiny', 'chosen', 'journey'],
    'Survival': ['survive', 'apocalypse', 'last', 'end of the world', 'extinction'],
    'Revolution': ['rebellion', 'revolution', 'overthrow', 'freedom', 'tyranny', 'resist']
  };
  
  Object.entries(themeKeywords).forEach(([theme, keywords]) => {
    const matches = keywords.filter(kw => lower.includes(kw)).length;
    if (matches >= 2) themes.push(theme);
  });
  
  // Detect genre hints
  const genreHints = [];
  const genreKeywords = {
    'Fantasy': ['magic', 'wizard', 'dragon', 'kingdom', 'sword', 'quest', 'elf', 'dwarf'],
    'Sci-Fi': ['space', 'ship', 'planet', 'technology', 'future', 'robot', 'ai', 'alien'],
    'Horror': ['horror', 'terror', 'monster', 'nightmare', 'fear', 'blood', 'dark'],
    'Romance': ['love', 'heart', 'romance', 'passion', 'kiss', 'marriage'],
    'Mystery': ['mystery', 'detective', 'crime', 'murder', 'clue', 'investigate'],
    'Thriller': ['danger', 'chase', 'escape', 'conspiracy', 'secret', 'spy']
  };
  
  Object.entries(genreKeywords).forEach(([genre, keywords]) => {
    const matches = keywords.filter(kw => lower.includes(kw)).length;
    if (matches >= 2) genreHints.push(genre);
  });
  
  return { themes, genres: genreHints };
}

// Generate relationship suggestions based on context
export function suggestRelationships(entities, text) {
  const suggestions = [];
  const lower = text.toLowerCase();
  
  // Look for relationship indicators
  const relationshipPatterns = [
    { pattern: /(\w+)\s+(?:loves?|is in love with)\s+(\w+)/gi, type: 'romantic' },
    { pattern: /(\w+)\s+(?:hates?|despises?|is enemies? with)\s+(\w+)/gi, type: 'enemy' },
    { pattern: /(\w+)\s+(?:and|&)\s+(\w+)\s+(?:are|were)\s+(?:friends|allies)/gi, type: 'ally' },
    { pattern: /(\w+)\s+(?:mentors?|teaches?|trains?)\s+(\w+)/gi, type: 'mentor' },
    { pattern: /(\w+)\s+(?:serves?|works for|is loyal to)\s+(\w+)/gi, type: 'serves' },
    { pattern: /(\w+)\s+(?:rules?|governs?|controls?)\s+(\w+)/gi, type: 'owns' },
    { pattern: /(\w+)\s+(?:lives? in|resides? in|calls? .+ home)\s+(\w+)/gi, type: 'inhabits' },
    { pattern: /(\w+)\s+(?:created|made|forged|built)\s+(\w+)/gi, type: 'created' },
  ];
  
  const allEntityNames = [
    ...entities.character,
    ...entities.location,
    ...entities.faction,
    ...entities.artifact
  ].map(e => e.name.toLowerCase());
  
  relationshipPatterns.forEach(({ pattern, type }) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const source = match[1];
      const target = match[2];
      
      // Check if both entities were extracted
      if (allEntityNames.includes(source.toLowerCase()) || allEntityNames.includes(target.toLowerCase())) {
        suggestions.push({
          source,
          target,
          type,
          context: text.slice(Math.max(0, match.index - 50), match.index + match[0].length + 50)
        });
      }
    }
  });
  
  return suggestions;
}

// Create project data from extracted information
export function buildProjectFromExtraction(projectName, extracted, analysis, userContext) {
  return {
    project: {
      name: projectName,
      description: `Created from context seeding. Original notes: ${userContext.slice(0, 200)}...`,
      settings: {
        genre: analysis.genres[0] || 'Fantasy',
        targetAudience: 'Adult',
        format: 'novel'
      }
    },
    entities: [
      ...extracted.character.map(e => ({
        type: 'character',
        name: e.name,
        status: 'draft',
        tags: ['extracted'],
        role: 'supporting',
        backstory: e.context,
        ...e.additionalData
      })),
      ...extracted.location.map(e => ({
        type: 'location',
        name: e.name,
        status: 'draft',
        tags: ['extracted'],
        locationType: 'region',
        description: e.context,
        ...e.additionalData
      })),
      ...extracted.faction.map(e => ({
        type: 'faction',
        name: e.name,
        status: 'draft',
        tags: ['extracted'],
        factionType: 'organization',
        description: e.context,
        ...e.additionalData
      })),
      ...extracted.artifact.map(e => ({
        type: 'artifact',
        name: e.name,
        status: 'draft',
        tags: ['extracted'],
        artifactType: 'object',
        description: e.context,
        ...e.additionalData
      })),
      ...extracted.creature.map(e => ({
        type: 'creature',
        name: e.name,
        status: 'draft',
        tags: ['extracted'],
        classification: { class: 'unknown', threatLevel: 'unknown' },
        description: e.context,
        ...e.additionalData
      })),
      ...extracted.world_rule.map(e => ({
        type: 'world_rule',
        name: e.name,
        status: 'draft',
        tags: ['extracted'],
        category: 'general',
        statement: e.name,
        explanation: e.context,
        ...e.additionalData
      })),
      ...extracted.event.map(e => ({
        type: 'event',
        name: e.name,
        status: 'draft',
        tags: ['extracted'],
        eventType: 'historical',
        description: e.context,
        ...e.additionalData
      }))
    ],
    relationships: [],
    narrative: {
      title: projectName,
      logline: '',
      themes: analysis.themes,
      targetLength: 12,
      status: 'planned',
      books: []
    }
  };
}
