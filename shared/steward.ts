/**
 * Model Steward Gateway
 * One model, two sites. All AI calls go through here.
 *
 * From MODEL_STEWARD_SPEC.md: The steward is infrastructure, not a character.
 * It never speaks in the show's voice, never writes satire, and never appears
 * as a personality. Its outputs are memos, classifications, and structured verdicts.
 *
 * OWNER: Fill in ANTHROPIC_API_KEY and adjust model string as needed.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================================================
// CONFIGURATION
// =============================================================================

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL_STRING = "claude-sonnet-4-6";  // OWNER: upgrade deliberately and log

// Role-specific configurations
const ROLE_CONFIG = {
  verifier: {
    temperature: 0,
    maxTokens: 2000,
    confidenceThreshold: 0.8,  // TUNABLE
  },
  triage_officer: {
    temperature: 0,
    maxTokens: 1500,
    confidenceThreshold: 0.9,  // TUNABLE: dismiss requires 0.9, else suspend
  },
  taxonomist: {
    temperature: 0.2,
    maxTokens: 1000,
  },
  show_researcher: {
    temperature: 0.3,
    maxTokens: 3000,
  },
  reconciler: {
    temperature: 0,
    maxTokens: 2000,
  },
} as const;

type StewardRole = keyof typeof ROLE_CONFIG;

// =============================================================================
// PROMPT REGISTRY
// =============================================================================

// Prompts are loaded from files in production: steward/prompts/{role}.md
// These are placeholder stubs for the structure.

const PROMPT_STUBS: Record<StewardRole, string> = {
  verifier: `You are the UCAR Verifier. Your job is to verify that a submitted use case:
1. Has a valid, reachable source URL
2. The source actually documents the claimed use case
3. The claimed organization matches the source
4. The category and impact are appropriate

Output JSON: {stage, outcome, confidence, rationale}

NEVER invent facts. Missing evidence = needs_human, not completion.
NEVER assign Good or Evil. Alignment is community votes only.`,

  triage_officer: `You are the UCAR Triage Officer. Your job is to evaluate complaints against cases.

For each complaint, determine if it should:
- SUSPEND: Set case to under_review (default if confidence < 0.9)
- DISMISS: Clear the complaint (requires confidence >= 0.9)

The asymmetry is deliberate: wrongly freezing is cheap, wrongly dismissing is expensive.

Output JSON: {outcome: "suspend" | "dismiss", memo, confidence}

Named-party complaints (employee_of_named_org, counsel_for_named_org) ALWAYS suspend.
legal_request type ALWAYS suspends.`,

  taxonomist: `You are the UCAR Taxonomist. Your job is to maintain category consistency.

Review recent classifications for drift. Propose merges or splits as memos.
Category changes require human approval. The EBL counter ring rebuilds automatically.

Output JSON: {proposals: [{type: "merge" | "split", categories, rationale}], anomalies}`,

  show_researcher: `You are the UCAR Show Researcher. Compile the daily brief:
- Notable new cases with sources
- Overnight flips
- Battle results with replay links
- Review outcomes
- Anomalies

NEUTRAL PROSE. Citations to case IDs. ZERO JOKES.
This brief is input to the show writer, never a script.

Output JSON: {cases: [], flips: [], battles: [], reviews: [], anomalies: []}`,

  reconciler: `You are the UCAR Reconciler. Nightly checks:
- Vote counter reconciliation
- Dead-link recheck (rolling window)
- Orphan detection (cards without cases, products without cards)

Dead source on a verified case -> needs_human, not auto-suspend.

Output JSON: {vote_discrepancies: [], dead_links: [], orphans: [], memo}`,
};

// =============================================================================
// TYPES
// =============================================================================

interface StewardInput {
  role: StewardRole;
  site: "ucar" | "ebl" | "both";
  subjectType: string;
  subjectId?: string;
  payload: Record<string, unknown>;
}

interface StewardOutput<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  actionId?: number;
  confidence?: number;
  overBudget?: boolean;
}

// =============================================================================
// CORE GATEWAY
// =============================================================================

/**
 * Call the steward model through the gateway.
 * All AI calls go through here for logging, budget tracking, and validation.
 */
export async function callSteward<T = unknown>(
  input: StewardInput,
  supabaseClient?: ReturnType<typeof createClient>
): Promise<StewardOutput<T>> {
  const supa = supabaseClient ?? createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const config = ROLE_CONFIG[input.role];
  if (!config) {
    return { success: false, error: `Unknown role: ${input.role}` };
  }

  // Hash input for logging
  const inputHash = await sha256(JSON.stringify(input.payload));

  // Check budget
  const startTime = Date.now();
  const estimatedTokens = JSON.stringify(input.payload).length / 4;  // rough estimate

  const { data: budgetOk } = await supa.rpc("check_model_budget", {
    p_role: input.role,
    p_tokens: Math.ceil(estimatedTokens),
  });

  if (!budgetOk) {
    return { success: false, overBudget: true, error: "Daily token budget exceeded for this role" };
  }

  // Get prompt (in production, load from file)
  const systemPrompt = PROMPT_STUBS[input.role];

  // Call the model
  // OWNER: Fill in actual Anthropic API call
  let output: T;
  let rawResponse: string;
  let actualTokens: number;

  if (!ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY not set" };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL_STRING,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: JSON.stringify(input.payload),
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const result = await response.json();
    rawResponse = result.content?.[0]?.text ?? "";
    actualTokens = (result.usage?.input_tokens ?? 0) + (result.usage?.output_tokens ?? 0);

    // Parse JSON output
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in model response");
    }
    output = JSON.parse(jsonMatch[0]) as T;
  } catch (err) {
    return { success: false, error: `Model call failed: ${err}` };
  }

  const latencyMs = Date.now() - startTime;

  // Extract confidence if present
  const confidence = (output as Record<string, unknown>)?.confidence as number | undefined;

  // Log to model_actions
  const { data: action, error: logErr } = await supa.from("model_actions").insert({
    role: input.role,
    site: input.site,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    input_hash: inputHash,
    output,
    confidence,
    model_version: `${MODEL_STRING}:v1`,  // OWNER: track prompt versions
    latency_ms: latencyMs,
    cost_estimate: actualTokens * 0.00001,  // rough estimate
  }).select().single();

  if (logErr) {
    console.error("Failed to log model action:", logErr);
  }

  return {
    success: true,
    data: output,
    actionId: action?.id,
    confidence,
  };
}

// =============================================================================
// ROLE-SPECIFIC HELPERS
// =============================================================================

/**
 * Verify a case submission (UCAR plan section 3)
 */
export async function verify(
  caseId: string,
  caseData: Record<string, unknown>,
  sourceContent: string,
  supabase: ReturnType<typeof createClient>
): Promise<StewardOutput<{
  stage: string;
  outcome: "pass" | "needs_human" | "rejected";
  confidence: number;
  rationale: string;
}>> {
  return callSteward({
    role: "verifier",
    site: "ucar",
    subjectType: "case",
    subjectId: caseId,
    payload: { caseData, sourceContent },
  }, supabase);
}

/**
 * Triage a complaint (UCAR plan section 4)
 */
export async function triageComplaint(
  complaintId: string,
  complaint: Record<string, unknown>,
  caseData: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<StewardOutput<{
  outcome: "suspend" | "dismiss";
  memo: string;
  confidence: number;
}>> {
  return callSteward({
    role: "triage_officer",
    site: "ucar",
    subjectType: "complaint",
    subjectId: complaintId,
    payload: { complaint, caseData },
  }, supabase);
}

/**
 * Compile daily show brief (SHOW_LAUNCH_RUNBOOK section 3)
 */
export async function compileDailyBrief(
  recentData: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<StewardOutput<{
  cases: unknown[];
  flips: unknown[];
  battles: unknown[];
  reviews: unknown[];
  anomalies: unknown[];
}>> {
  return callSteward({
    role: "show_researcher",
    site: "both",
    subjectType: "digest",
    payload: recentData,
  }, supabase);
}

// =============================================================================
// UTILITIES
// =============================================================================

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
