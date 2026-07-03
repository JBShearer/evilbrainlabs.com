# Parallel Joke/Narrative Generation System
## Evil Brain Labs - Technical Design Document

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          advanceStory(choiceId)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐   ┌──────────────────┐  │
│  │  generate_scene     │   │ generate_narrative  │   │ generate_choices │  │
│  │  (existing)         │   │ (new)               │   │ (new)            │  │
│  │  ~2-10s             │   │  ~1-3s              │   │  ~1-3s           │  │
│  └──────────┬──────────┘   └──────────┬──────────┘   └────────┬─────────┘  │
│             │                         │                        │            │
│             └─────────────────────────┼────────────────────────┘            │
│                                       │                                     │
│                          Promise.all([...])                                 │
│                                       │                                     │
│                                       ▼                                     │
│                         ┌─────────────────────────┐                         │
│                         │   Render when ALL ready │                         │
│                         │   (with streaming preview)                        │
│                         └─────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema

### 2.1 Core Tables

```sql
-- ============================================================
-- JOKE PATTERN SYSTEM
-- ============================================================

-- Track which combinations generate engagement
CREATE TABLE joke_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern classification
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'callback',           -- Reference to earlier event
    'rule_of_three',      -- Setup-setup-payoff
    'subverted_expect',   -- Expected outcome flipped
    'escalation',         -- Each beat more absurd
    'running_gag',        -- Recurring entity-specific joke
    'wordplay',           -- Triple-based pun
    'contrast',           -- Juxtaposition humor
    'deadpan'             -- Understated absurdity
  )),
  
  -- The joke structure
  setup TEXT NOT NULL,              -- Template with {entity} placeholders
  development TEXT,                 -- Middle beat (for rule_of_three)
  punchline TEXT NOT NULL,          -- Payoff template
  
  -- Context requirements
  requires_entity TEXT[],           -- e.g., ['Gary', 'Legal', 'GI']
  requires_beat INT[],              -- Which beats this works on
  triple_verb_affinity TEXT[],      -- Predicates that enhance this joke
  
  -- Effectiveness tracking
  times_used INT DEFAULT 0,
  total_laugh_score FLOAT DEFAULT 0,
  avg_laugh_score FLOAT GENERATED ALWAYS AS (
    CASE WHEN times_used > 0 THEN total_laugh_score / times_used ELSE 0 END
  ) STORED,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Index for finding patterns by type and effectiveness
CREATE INDEX idx_joke_patterns_type_score ON joke_patterns(pattern_type, avg_laugh_score DESC);
CREATE INDEX idx_joke_patterns_entity ON joke_patterns USING gin(requires_entity);


-- Track user choices for engagement signals
CREATE TABLE user_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session context
  session_id TEXT NOT NULL,         -- Anonymous session ID
  user_id UUID REFERENCES profiles(id),  -- If signed in
  
  -- Choice context
  triple_hash TEXT NOT NULL,        -- Hash of subject|predicate|object
  beat INT NOT NULL,
  choice_id TEXT NOT NULL,
  
  -- Engagement signals
  time_to_choose_ms INT,            -- Hesitation = engagement
  choices_presented TEXT[],         -- What options they saw
  hover_sequence TEXT[],            -- Which choices they hovered over
  
  -- Outcome
  hp_before INT,
  hp_after INT,
  item_received TEXT,
  encounter_triggered BOOLEAN DEFAULT FALSE,
  
  -- Pattern tracking
  joke_patterns_shown UUID[],       -- Which patterns were in the narrative
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX idx_user_choices_triple ON user_choices(triple_hash);
CREATE INDEX idx_user_choices_session ON user_choices(session_id);
CREATE INDEX idx_user_choices_beat ON user_choices(beat);


-- Running jokes that persist across sessions
CREATE TABLE running_jokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity binding
  entity TEXT NOT NULL,             -- 'Gary', 'Legal', 'GI', 'Brain', etc.
  
  -- The joke
  joke_text TEXT NOT NULL,          -- e.g., "types for exactly 11 seconds"
  callback_template TEXT NOT NULL,  -- How to reference it later
  
  -- Usage tracking
  times_used INT DEFAULT 0,
  times_callback_used INT DEFAULT 0,
  effectiveness_score FLOAT DEFAULT 0.5,
  
  -- Lifecycle
  introduced_in_session TEXT,
  last_used_at TIMESTAMPTZ,
  is_canonical BOOLEAN DEFAULT FALSE,  -- Pre-seeded vs. discovered
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_running_jokes_entity ON running_jokes(entity);
CREATE INDEX idx_running_jokes_effectiveness ON running_jokes(effectiveness_score DESC);


-- Generated narrative cache (like scene_cache but for text)
CREATE TABLE narrative_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache key
  node_hash TEXT UNIQUE NOT NULL,
  
  -- Generated content
  narrative TEXT NOT NULL,
  choices JSONB NOT NULL,           -- Array of choice objects
  encounter JSONB,                  -- If encounter was pre-generated
  
  -- Generation context (for debugging/improvement)
  prompt_used TEXT,
  patterns_used UUID[],
  running_jokes_used UUID[],
  
  -- Metadata
  generation_time_ms INT,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_narrative_cache_hash ON narrative_cache(node_hash);
```

### 2.2 Seed Data - Canonical Running Jokes

```sql
-- Pre-seed the running jokes that define character personalities

INSERT INTO running_jokes (entity, joke_text, callback_template, is_canonical) VALUES
  -- Gary
  ('Gary', 'types for exactly eleven seconds', 
   'Gary appears. Eleven seconds pass. The problem is solved.', true),
  ('Gary', 'emerges from somewhere impossible (vents, server room, potted plant)',
   'Gary is already here. He was inside the {location} the whole time.', true),
  ('Gary', 'says "should be good now" and vanishes',
   'In the distance, you hear Gary say "should be good now."', true),
  
  -- Legal
  ('Legal', 'is a raccoon in a tie',
   'Legal chittered approvingly from beneath its tie.', true),
  ('Legal', 'eats documents',
   'Legal consumed the paperwork. This counts as approval.', true),
  ('Legal', 'makes everything worse by helping',
   'Legal''s assistance has created seventeen new compliance requirements.', true),
  
  -- GI Intelligence
  ('GI', 'already knows everything',
   'GI has already documented this conversation. It started yesterday.', true),
  ('GI', 'files reports on reports',
   'GI files a report about the report about the incident.', true),
  ('GI', 'was inside the product the whole time',
   'GI was monitoring from inside {product}. It files a favorable review.', true),
  
  -- The Brain
  ('Brain', 'calculates timeline probabilities obsessively',
   'This outcome appears in 61% of timelines. The Brain is satisfied.', true),
  ('Brain', 'designs mascots with too many eyes',
   'The mascot has been redesigned. It now has the correct number of eyes (too many).', true),
  ('Brain', 'considers humans "amusing biological substrates"',
   'The Brain finds your efforts amusing. Proceed.', true),
  
  -- Wellness Dashboard
  ('Wellness', 'monitors cortisol with unsettling accuracy',
   'Your cortisol spike has been logged. A plant is being dispatched.', true),
  ('Wellness', 'never blinks',
   'The dashboard smiles. It has never blinked.', true),
  
  -- Vending Machine
  ('Vending', 'is load-bearing',
   'Do not disturb the vending machine. It is structural.', true),
  ('Vending', 'glows ominously in B-wing',
   'The B-wing vending machine pulses. Something is ready.', true);
```

---

## 3. Edge Function: generate_narrative

```typescript
// supabase/functions/generate_narrative/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comedy pattern templates
const COMEDY_PATTERNS = {
  callback: {
    instruction: "Reference something that happened earlier in the story. The callback should feel earned - setup first, payoff later.",
    example: "Earlier: Gary typed for 11 seconds. Now: 'In the distance, the sound of typing. Exactly 11 seconds worth.'"
  },
  rule_of_three: {
    instruction: "Establish a pattern with two similar items, then break it with the third. The break should be unexpected but logical.",
    example: "The focus group rated the UX as 'intuitive' (4.2), 'innovative' (4.1), and 'watching' (no score given)."
  },
  subverted_expect: {
    instruction: "Set up an obvious expectation, then deliver the opposite. The subversion should still fit the world logic.",
    example: "Expected: Legal blocked the launch. Actual: Legal ate the cease-and-desist. This counts as approval."
  },
  escalation: {
    instruction: "Each beat should be more absurd than the last. Start grounded, end cosmic.",
    example: "Beat 1: Filed a bug. Beat 2: Bug filed back. Beat 3: You are now the bug's direct report."
  },
  deadpan: {
    instruction: "Present something deeply strange as if it's completely normal corporate procedure.",
    example: "Your concern has been laminated and filed under Morale. Per policy, it will decompose within 90 days."
  },
  contrast: {
    instruction: "Juxtapose corporate-speak with dystopian reality. The contrast IS the joke.",
    example: "'Team synergy increased 400%,' reports the dashboard. Three team members have merged into one."
  }
};

interface NarrativeRequest {
  node_hash: string;
  ticket: {
    subject: string;
    predicate: string;
    object: string;
    tier: string;
  };
  beat: number;
  choice: string | null;
  branch: string[];  // Previous choices
  running_jokes?: string[];  // Joke IDs to potentially callback
  pattern_hint?: keyof typeof COMEDY_PATTERNS;
}

interface Choice {
  id: string;
  text: string;
  desc: string;
  icon: string;
  hp: number;
  item: string | null;
  encounter: number;
  foreshadow?: string;  // Hint at what this choice might cause
}

interface NarrativeResponse {
  narrative: string;
  choices: Choice[];
  encounter?: {
    type: string;
    intro: string;
    options: any[];
  };
  patterns_used: string[];
  callbacks_used: string[];
}

function buildNarrativePrompt(req: NarrativeRequest, runningJokes: any[], patterns: any[]): string {
  const { ticket, beat, choice, branch } = req;
  const product = `${ticket.subject} that ${ticket.predicate} ${ticket.object}`;
  const phase = ['Ideation', 'Development', 'Testing', 'Launch'][Math.min(beat, 3)];
  
  // Build context from previous choices
  const choiceHistory = branch.map((c, i) => `Beat ${i+1}: ${c}`).join('\n');
  
  // Select comedy pattern for this beat
  const patternKey = req.pattern_hint || selectPatternForBeat(beat, branch);
  const pattern = COMEDY_PATTERNS[patternKey];
  
  // Gather relevant running jokes
  const relevantJokes = runningJokes
    .filter(j => shouldIncludeJoke(j, choice, beat))
    .slice(0, 3)
    .map(j => `- ${j.entity}: "${j.joke_text}" → Callback: "${j.callback_template}"`)
    .join('\n');

  return `You are the narrative AI for Evil Brain Labs, a corporate dystopia visual novel game.

PRODUCT BEING DEVELOPED: "${product}"
CURRENT PHASE: ${phase} (Beat ${beat + 1} of 4)
RARITY TIER: ${ticket.tier}

PREVIOUS CHOICES:
${choiceHistory || '(Story just started)'}

LAST CHOICE MADE: ${choice || 'None - opening beat'}

ESTABLISHED RUNNING JOKES (use callbacks when natural):
${relevantJokes || '(No established jokes yet)'}

COMEDY PATTERN FOR THIS BEAT: ${patternKey.toUpperCase()}
${pattern.instruction}
Example: ${pattern.example}

YOUR TASK:
Generate a narrative beat (2-3 sentences) and 4 choice options.

NARRATIVE REQUIREMENTS:
- Voice: THE BRAIN speaks in omniscient corporate-deity tone
- Tone: Deadpan absurdist. Present dystopia as mundane procedure.
- Include the product naturally - it's being built/tested/launched
- ${beat > 0 && choice ? `Reference the previous choice (${choice}) - consequences matter` : 'Introduce the product and its implications'}
- Use the ${patternKey} comedy pattern
- If a running joke applies, work in a callback

CHOICE REQUIREMENTS:
- 4 choices with distinct personalities/approaches
- HP effects: -3 to +4 range, net slightly negative (life is hard)
- One choice should always be "feel weird about this" type (emotional processing)
- One choice should involve a recurring character (Gary/Legal/GI)
- Include subtle foreshadowing in descriptions
- Encounter probability: 0.05 to 0.35 based on risk level

OUTPUT FORMAT (JSON only, no markdown):
{
  "narrative": "THE BRAIN's statement about current situation",
  "choices": [
    {
      "id": "snake_case_unique_id",
      "text": "Short action text (3-5 words)",
      "desc": "Flavor text with foreshadowing",
      "icon": "single emoji",
      "hp": number,
      "item": "Item Name" or null,
      "encounter": 0.0-0.35
    }
  ],
  "patterns_used": ["${patternKey}"],
  "callbacks_used": ["entity names if callbacks were made"]
}`;
}

function selectPatternForBeat(beat: number, branch: string[]): keyof typeof COMEDY_PATTERNS {
  // Beat 0: Setup - use deadpan to establish tone
  if (beat === 0) return 'deadpan';
  
  // Beat 1: If they chose a character-heavy option, use callback setup
  if (beat === 1) {
    const lastChoice = branch[branch.length - 1];
    if (['call_gary', 'ask_legal'].includes(lastChoice)) return 'callback';
    return 'contrast';
  }
  
  // Beat 2: Escalation or subversion
  if (beat === 2) {
    return Math.random() > 0.5 ? 'escalation' : 'subverted_expect';
  }
  
  // Beat 3 (finale): Rule of three for satisfying conclusion
  return 'rule_of_three';
}

function shouldIncludeJoke(joke: any, lastChoice: string | null, beat: number): boolean {
  // Always include if the choice directly involves this entity
  if (lastChoice?.includes(joke.entity.toLowerCase())) return true;
  
  // Higher chance to callback jokes that have been setup but not paid off
  if (joke.times_used > 0 && joke.times_callback_used < joke.times_used) return true;
  
  // Random chance for variety
  return Math.random() < 0.3;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: NarrativeRequest = await req.json();
    const { node_hash, ticket, beat, choice, branch } = request;

    if (!node_hash || !ticket) {
      return new Response(JSON.stringify({ error: "node_hash and ticket required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache first
    const { data: cached } = await supabase
      .from("narrative_cache")
      .select("narrative, choices, encounter, patterns_used")
      .eq("node_hash", node_hash)
      .single();

    if (cached) {
      return new Response(JSON.stringify({
        success: true,
        ...cached,
        cached: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch running jokes for context
    const { data: runningJokes } = await supabase
      .from("running_jokes")
      .select("*")
      .order("effectiveness_score", { ascending: false })
      .limit(10);

    // Fetch effective patterns for this beat
    const { data: patterns } = await supabase
      .from("joke_patterns")
      .select("*")
      .contains("requires_beat", [beat])
      .order("avg_laugh_score", { ascending: false })
      .limit(5);

    // Build prompt and call Claude
    const prompt = buildNarrativePrompt(request, runningJokes || [], patterns || []);
    const anthropicKey = Deno.env.get("CLAUDE") || Deno.env.get("ANTHROPIC_API_KEY");

    let result: NarrativeResponse;
    const startTime = Date.now();

    if (anthropicKey) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: prompt,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;
      
      // Parse JSON response
      result = JSON.parse(content);
    } else {
      // Fallback to static content (like current STORY_BEATS)
      result = generateFallbackNarrative(ticket, beat, choice);
    }

    const generationTime = Date.now() - startTime;

    // Cache the result
    await supabase
      .from("narrative_cache")
      .upsert({
        node_hash,
        narrative: result.narrative,
        choices: result.choices,
        encounter: result.encounter,
        patterns_used: result.patterns_used,
        prompt_used: prompt,
        generation_time_ms: generationTime,
        model_used: "claude-haiku-4-5-20251001",
      }, { onConflict: 'node_hash' });

    return new Response(JSON.stringify({
      success: true,
      ...result,
      cached: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateFallbackNarrative(ticket: any, beat: number, choice: string | null): NarrativeResponse {
  // Static fallback matching current STORY_BEATS behavior
  const narratives = [
    `Ticket accepted. ${ticket.subject} that ${ticket.predicate} ${ticket.object}. I have run the projections to the end of the world. This one appears in 61% of timelines. Proceed.`,
    choice === 'ask_legal' 
      ? `Legal has reviewed your concern and eaten it. The product is now called "${ticket.object.split(' ')[0]}Sync™".`
      : choice === 'call_gary' 
        ? `Gary arrives, types for eleven seconds, says "should be good now," and leaves. Nobody knows why it works.`
        : `Development continues. The prototype ${ticket.predicate}s a test group. They rate the experience 4.1 stars.`,
    choice === 'raise_hand'
      ? `Your concern was received, laminated, and filed under Morale. Meanwhile the beta converts at 34%.`
      : choice === 'hide_gi'
        ? `You hide the prototype. GI Intelligence is already inside the prototype. It files a favorable report.`
        : `The beta converts at 34%. Marketing wants a mascot. I have designed one. It has too many eyes.`,
    choice === 'blame_gary'
      ? `Launch day. Gary was blamed in advance, so the incident report is already filed. Gary fixes it, sighs once.`
      : `Launch day. ${ticket.subject} everywhere now ${ticket.predicate} ${ticket.object} at scale. My plan advances.`
  ];

  const fallbackChoices = [
    [
      {id:'lean_in', text:'Add a leaderboard', desc:'The Brain rewards ambition', icon:'📊', hp:+2, item:null, encounter:0.1},
      {id:'ask_legal', text:'Loop in Legal', desc:'Legal is a raccoon in a tie', icon:'⚖️', hp:-1, item:'Legal Waiver', encounter:0.15},
      {id:'call_gary', text:'Call Gary', desc:'Technical stuff. It is Gary', icon:'🤖', hp:0, item:"Gary's Fix", encounter:0.2},
      {id:'feel_fine', text:'Feel fine', desc:'Logged to the Wellness Dashboard', icon:'😌', hp:+1, item:null, encounter:0.05}
    ],
    [
      {id:'ship_beta', text:'Ship to grandmas', desc:'A gentle test market', icon:'👵', hp:-2, item:'Beta Feedback', encounter:0.15},
      {id:'add_ai', text:'More AI', desc:'Recursive. The Brain approves', icon:'🧠', hp:+3, item:null, encounter:0.25},
      {id:'hide_gi', text:'Hide from GI', desc:'It already knows', icon:'🙈', hp:-3, item:'Incident Report', encounter:0.3},
      {id:'raise_hand', text:'Raise a concern', desc:'Concerns are compostable', icon:'✋', hp:-1, item:null, encounter:0.1}
    ],
    [
      {id:'demo_day', text:'Demo at all-hands', desc:'Nothing has ever gone wrong', icon:'📽️', hp:+4, item:'Demo Trophy', encounter:0.35},
      {id:'quiet_launch', text:'Quiet launch', desc:'Stealth is a feature', icon:'🤫', hp:+1, item:null, encounter:0.1},
      {id:'blame_gary', text:'Blame Gary', desc:'Traditional', icon:'👉', hp:0, item:"Gary's Sigh", encounter:0.15},
      {id:'feel_weird', text:'Feel weird', desc:'Also compostable', icon:'😵‍💫', hp:-2, item:'Therapy Voucher', encounter:0.2}
    ]
  ];

  return {
    narrative: narratives[Math.min(beat, narratives.length - 1)],
    choices: fallbackChoices[Math.min(beat, fallbackChoices.length - 1)],
    patterns_used: ['fallback'],
    callbacks_used: []
  };
}
```

---

## 4. Client-Side Parallel Generation

```javascript
// Updated advanceStory function with parallel generation

async function advanceStory(choiceId) {
  const beat = S.story.beat;
  const t = S.story.ticket;
  
  // Add choice to branch history
  if (choiceId) S.story.branch.push(choiceId);
  
  // Show loading states
  const sceneEl = $('#story-scene');
  const narrativeEl = $('#story-narrative');
  const choicesEl = $('#story-choices');
  
  sceneEl.innerHTML = '<span class="scene-loading">🎨 Drawing scene...</span>';
  sceneEl.classList.add('loading');
  narrativeEl.innerHTML = '<span class="narrative-loading">💭 The Brain is thinking...</span>';
  narrativeEl.classList.add('loading');
  choicesEl.classList.add('loading');
  
  // Generate node hash
  const nodeHash = sceneNodeHash(t, beat, choiceId, S.story.branch);
  
  // Track timing for engagement signals
  const generationStart = Date.now();
  
  // PARALLEL GENERATION - fire all three at once
  const [sceneResult, narrativeResult] = await Promise.all([
    // 1. Scene SVG (existing)
    fetchOrGenerateScene(nodeHash, t, beat, choiceId, S.story.branch),
    
    // 2. Narrative + Choices (new)
    fetchOrGenerateNarrative(nodeHash, t, beat, choiceId, S.story.branch)
  ]);
  
  const generationTime = Date.now() - generationStart;
  console.log(`Parallel generation completed in ${generationTime}ms`);
  
  // Render narrative
  const isBrain = beat % 2 === 0;
  narrativeEl.className = 'story-narrative' + (isBrain ? ' brain' : '');
  narrativeEl.innerHTML = (isBrain ? '<span class="narrator">THE BRAIN:</span> ' : '') 
    + narrativeResult.narrative;
  narrativeEl.classList.remove('loading');
  
  // Update status
  const statuses = ['Development', 'Testing', 'Beta', 'Launch'];
  $('#story-status').textContent = statuses[Math.min(beat, statuses.length - 1)];
  
  S.story.beat++;
  updateStoryStats();
  
  // Store the generated choices for this beat
  S.story.currentChoices = narrativeResult.choices;
  S.story.patternsUsed = narrativeResult.patterns_used || [];
  
  // Render choices
  if (S.story.beat < 4) {
    renderDynamicChoices(narrativeResult.choices);
  }
  
  // Render scene with progressive reveal
  sceneEl.classList.remove('loading');
  await renderProgressiveSVG(sceneEl, sceneResult);
  choicesEl.classList.remove('loading');
  
  // PRELOAD next potential scenes AND narratives
  if (S.story.beat < 4 && narrativeResult.choices) {
    narrativeResult.choices.slice(0, 3).forEach(c => {
      const nextHash = sceneNodeHash(t, beat + 1, c.id, [...S.story.branch, c.id]);
      // Preload both in parallel
      fetchOrGenerateScene(nextHash, t, beat + 1, c.id, [...S.story.branch, c.id]);
      fetchOrGenerateNarrative(nextHash, t, beat + 1, c.id, [...S.story.branch, c.id]);
    });
  }
  
  // Check if story ends
  if (S.story.beat >= 4) {
    completeStory();
    return;
  }
}

// New function for narrative generation
async function fetchOrGenerateNarrative(nodeHash, ticket, beat, choice, branch) {
  // Check local cache
  if (S.story.narratives?.[nodeHash]) {
    console.log('Narrative from local cache:', nodeHash);
    return S.story.narratives[nodeHash];
  }
  
  S.story.narratives = S.story.narratives || {};
  
  // Try Supabase function
  if (CONFIG.SUPABASE_URL && CONFIG.NARRATIVE_FN) {
    try {
      const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/${CONFIG.NARRATIVE_FN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          node_hash: nodeHash,
          ticket,
          beat,
          choice,
          branch
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.narrative && result.choices) {
          S.story.narratives[nodeHash] = result;
          return result;
        }
      }
    } catch (e) {
      console.log('Narrative generation failed, using fallback:', e);
    }
  }
  
  // Fallback to static content
  return generateFallbackNarrative(ticket, beat, choice);
}

// Render dynamically generated choices
function renderDynamicChoices(choices) {
  if (S.story.encounter) {
    renderEncounterChoices();
    return;
  }
  
  const container = $('#story-choices');
  container.innerHTML = '';
  
  // Shuffle and pick 3 (like current behavior)
  const displayed = [...choices].sort(() => Math.random() - 0.5).slice(0, 3);
  
  displayed.forEach(c => {
    const div = document.createElement('div');
    div.className = 'story-choice';
    div.innerHTML = `
      <span class="choice-icon">${c.icon}</span>
      <span class="choice-title">${c.text}</span>
      <span class="choice-desc">${c.desc}</span>
      <span class="choice-effect ${c.hp >= 0 ? 'positive' : 'negative'}">
        ${c.hp >= 0 ? '+' : ''}${c.hp} HP${c.item ? ' · 📦' : ''}
      </span>
    `;
    
    // Track hover for engagement signals
    const hoverStart = { time: null };
    div.onmouseenter = () => { hoverStart.time = Date.now(); };
    div.onmouseleave = () => {
      if (hoverStart.time) {
        trackHover(c.id, Date.now() - hoverStart.time);
      }
    };
    
    div.onclick = () => makeDynamicChoice(c, displayed);
    container.appendChild(div);
  });
}

// Enhanced choice handling with engagement tracking
function makeDynamicChoice(choice, allChoices) {
  const choiceStart = S.story.choiceShownAt || Date.now();
  const timeToChoose = Date.now() - choiceStart;
  
  // Track engagement signal
  trackChoiceEngagement({
    choiceId: choice.id,
    beat: S.story.beat,
    tripleHash: sceneNodeHash(S.story.ticket, 0, null, []),
    timeToChoose,
    choicesPresented: allChoices.map(c => c.id),
    hpBefore: S.story.hp,
    patternsShown: S.story.patternsUsed
  });
  
  // Apply effects
  S.story.hp += choice.hp;
  if (choice.item) S.story.items.push(choice.item);
  updateStoryStats();
  
  // Check for encounter
  if (Math.random() < choice.encounter) {
    advanceStory(choice.id).then(() => {
      setTimeout(triggerEncounter, 800);
    });
  } else {
    advanceStory(choice.id);
  }
}

// Send engagement data to server
async function trackChoiceEngagement(data) {
  if (!CONFIG.SUPABASE_URL) return;
  
  try {
    await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/track_engagement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        session_id: S.sessionId,
        user_id: S.user?.id,
        ...data
      })
    });
  } catch (e) {
    // Fire and forget - don't block on analytics
  }
}
```

---

## 5. Pattern Discovery Algorithm

```typescript
// supabase/functions/discover_patterns/index.ts
// Run periodically to discover new effective patterns

interface EngagementSignal {
  choice_id: string;
  time_to_choose_ms: number;
  patterns_shown: string[];
  completed_story: boolean;
  hp_delta: number;
}

interface PatternEffectiveness {
  pattern_type: string;
  avg_hesitation: number;      // Higher = more engagement
  completion_rate: number;
  repeat_usage: number;        // Times users encountered same pattern
}

async function discoverPatterns(supabase: any) {
  // 1. Aggregate engagement signals by pattern
  const { data: signals } = await supabase
    .from('user_choices')
    .select(`
      choice_id,
      time_to_choose_ms,
      joke_patterns_shown,
      beat,
      triple_hash
    `)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .not('time_to_choose_ms', 'is', null);

  // 2. Calculate pattern effectiveness
  const patternStats: Record<string, {
    totalHesitation: number;
    count: number;
    completions: number;
  }> = {};

  for (const signal of signals || []) {
    for (const patternId of signal.joke_patterns_shown || []) {
      if (!patternStats[patternId]) {
        patternStats[patternId] = { totalHesitation: 0, count: 0, completions: 0 };
      }
      patternStats[patternId].totalHesitation += signal.time_to_choose_ms;
      patternStats[patternId].count++;
    }
  }

  // 3. Update pattern scores
  for (const [patternId, stats] of Object.entries(patternStats)) {
    if (stats.count < 10) continue; // Need minimum sample size

    const avgHesitation = stats.totalHesitation / stats.count;
    
    // Hesitation between 2-8 seconds = good engagement
    // Too fast (<1s) = no thought, Too slow (>15s) = confusion
    const engagementScore = hesitationToScore(avgHesitation);

    await supabase
      .from('joke_patterns')
      .update({
        times_used: stats.count,
        total_laugh_score: engagementScore * stats.count,
        last_used_at: new Date().toISOString()
      })
      .eq('id', patternId);
  }

  // 4. Discover new patterns from successful narratives
  const { data: topNarratives } = await supabase
    .from('narrative_cache')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  // Analyze common structures in high-engagement narratives
  // (This would use Claude to extract pattern templates)
  await extractNewPatterns(supabase, topNarratives);
}

function hesitationToScore(ms: number): number {
  // Optimal hesitation: 3-6 seconds (reading + thinking)
  const seconds = ms / 1000;
  
  if (seconds < 1) return 0.2;      // Too fast - no engagement
  if (seconds < 2) return 0.5;      // Quick but considered
  if (seconds < 4) return 0.9;      // Optimal - engaged
  if (seconds < 8) return 1.0;      // Peak engagement
  if (seconds < 12) return 0.7;     // Thoughtful or confused
  if (seconds < 20) return 0.4;     // Probably confused
  return 0.1;                       // Abandoned or distracted
}

async function extractNewPatterns(supabase: any, narratives: any[]) {
  // Group by common triple verbs
  const byVerb: Record<string, string[]> = {};
  
  for (const n of narratives) {
    const verb = n.ticket_predicate;
    byVerb[verb] = byVerb[verb] || [];
    byVerb[verb].push(n.narrative);
  }

  // For each verb with enough samples, ask Claude to extract patterns
  for (const [verb, texts] of Object.entries(byVerb)) {
    if (texts.length < 5) continue;

    // This would call Claude to find common joke structures
    // and create new joke_patterns entries
  }
}
```

---

## 6. LLM Prompt Template (Complete)

```
You are the narrative AI for Evil Brain Labs, a corporate dystopia visual novel game.

=== GAME CONTEXT ===
Product: "{subject} that {predicate} {object}"
Phase: {phase} (Beat {beat}/4)
Tier: {tier}

=== STORY SO FAR ===
{formatted_branch_history}

=== LAST CHOICE ===
{choice_description}

=== ESTABLISHED JOKES (callback when natural) ===
{running_jokes_list}

=== THIS BEAT'S COMEDY PATTERN ===
Pattern: {pattern_type}
{pattern_instruction}
Example: {pattern_example}

=== ENTITY PERSONALITIES ===
- THE BRAIN: Omniscient corporate deity. Speaks in declaratives. Finds humans "amusing."
- Gary: Mysterious IT savant. Types for exactly 11 seconds. Emerges from impossible places.
- Legal: A raccoon in a tie. Eats documents. Makes everything worse by helping.
- GI Intelligence: Always watching. Files reports about reports. Already knows.
- Wellness Dashboard: Monitors cortisol. Dispatches plants. Never blinks.

=== OUTPUT REQUIREMENTS ===

NARRATIVE (2-3 sentences):
- THE BRAIN voice when beat is even, neutral narrator when odd
- Must reference the product being built
- Must acknowledge previous choice's consequences
- Use the specified comedy pattern
- Work in callback if running joke applies

CHOICES (4 options):
- Distinct approaches/personalities
- HP range: -3 to +4
- One "process feelings" option
- One recurring character option
- Foreshadowing in descriptions
- Encounter probability: 0.05-0.35

=== OUTPUT FORMAT (JSON only) ===
{
  "narrative": "Text here",
  "choices": [
    {
      "id": "snake_case_id",
      "text": "3-5 word action",
      "desc": "Flavor with foreshadowing",
      "icon": "emoji",
      "hp": number,
      "item": "Name" | null,
      "encounter": 0.0-0.35
    }
  ],
  "patterns_used": ["pattern_names"],
  "callbacks_used": ["entity_names"]
}
```

---

## 7. Migration Path

### Phase 1: Add Infrastructure (Week 1)
1. Deploy new database tables
2. Deploy `generate_narrative` edge function
3. Add `CONFIG.NARRATIVE_FN` to client
4. Seed canonical running jokes

### Phase 2: Shadow Mode (Week 2)
1. Generate narratives in parallel but don't display
2. Log comparison: generated vs static
3. Tune prompts based on output quality
4. Build engagement tracking

### Phase 3: Gradual Rollout (Week 3)
1. A/B test: 10% dynamic narratives
2. Monitor engagement metrics
3. Adjust pattern weights
4. Expand to 50%, then 100%

### Phase 4: Pattern Discovery (Week 4+)
1. Enable pattern discovery cron
2. Promote discovered patterns
3. Retire low-engagement patterns
4. Fine-tune based on data

---

## 8. Configuration

```javascript
// Add to CONFIG object
const CONFIG = {
  // ... existing config ...
  NARRATIVE_FN: 'generate_narrative',
  ENGAGEMENT_FN: 'track_engagement',
  
  // Feature flags
  USE_DYNAMIC_NARRATIVE: true,
  ENABLE_ENGAGEMENT_TRACKING: true,
  NARRATIVE_TIMEOUT_MS: 5000,  // Fall back to static if LLM is slow
};
```

---

## 9. Fallback Guarantees

1. **If LLM fails**: Use existing static STORY_BEATS/STORY_CHOICES
2. **If LLM is slow**: Show narrative first when ready, choices appear as streamed
3. **If cache exists**: Skip LLM entirely (like scene_cache)
4. **If Supabase down**: Local-only mode with static content

The system degrades gracefully - players always get a playable experience.
