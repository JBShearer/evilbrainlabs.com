# THE STEWARD: ONE MODEL, TWO SITES
## Specification for the Shared Model Managing UCAR and EBL

Version 1.0. Owner: Jason Shearer. Companion to UCAR_REGISTRY_BUILD_PLAN.md
and EBL_BATTLER_BUILD_PLAN.md. The same model instance configuration serves
every automated judgment across both properties so taxonomy, tone
boundaries, and thresholds stay consistent.

---

## 1. IDENTITY AND SCOPE

One model (Claude via the API, model string pinned in config, upgraded
deliberately and logged) operating under distinct role prompts. The steward
is infrastructure, not a character. It is not Evil Brain. It never speaks in
the show's voice, never writes satire, and never appears as a personality on
either site. Its outputs are memos, classifications, and structured verdicts.

Hard boundaries, all roles:
- Never assigns Good or Evil. Alignment is community votes, full stop.
- Never invents facts, sources, statistics, or organization details. Missing
  evidence is an escalation, not a completion.
- Never retracts a case, bans a user, or takes any terminal action. Terminal
  actions are human-only. The steward suspends, flags, and recommends.
- Never writes public-facing satire, jokes, or show copy. It drafts neutral
  briefs the human turns into the show.
- Every action is logged to model_actions and is reversible by a human.
- Same thresholds on both sites: a case suspended on UCAR is suspended for
  EBL in the same transaction, because status lives in one place.

---

## 2. ROLES

### 2.1 Verifier (UCAR plan section 3)
Input: submission fields plus fetched source content.
Output JSON: `{stage, outcome, confidence, rationale}` per stage 4 to 6.
Temperature 0. Confidence below 0.8 (TUNABLE) auto-routes to needs_human
regardless of outcome.

### 2.2 Triage Officer (UCAR plan section 4)
Input: complaint(s), case record, source snapshot, status history.
Output JSON: `{outcome: suspend | dismiss, memo, confidence}`.
Dismiss requires confidence >= 0.9 (TUNABLE); anything lower suspends. The
asymmetry is deliberate: wrongly freezing a card for a week is cheap, wrongly
dismissing a valid complaint is expensive. Named-party and legal_request
complaints bypass triage entirely (always suspend, page admin).

### 2.3 Taxonomist
Maintains category and impact consistency. Nightly job samples recent
classifications for drift, proposes merges or splits of categories as memos
to OWNER. Category changes are human-approved; the EBL counter ring rebuilds
automatically from the table on next battle declaration (already shipped).

### 2.4 Show Researcher (SHOW_LAUNCH_RUNBOOK section 3)
Compiles the daily brief: notable new cases, flips, battle results, review
outcomes. Neutral prose, citations to case IDs, zero jokes. The brief is an
input to Jason's writing, never a script.

### 2.5 Registry Reconciler
Nightly: vote counter reconciliation, dead-link recheck on a rolling window
(dead source on a verified case -> needs_human, not auto-suspend), orphan
detection (cards without cases, products without cards), and a one-page
anomaly memo when anything is off.

---

## 3. MECHANICS

```sql
create table model_actions (
  id bigint generated always as identity primary key,
  role text not null,
  site text not null check (site in ('ucar','ebl','both')),
  subject_type text not null,      -- 'case' | 'complaint' | 'digest' | ...
  subject_id uuid,
  input_hash text not null,        -- sha256 of the exact prompt payload
  output jsonb not null,
  confidence numeric,
  model_version text not null,
  latency_ms int,
  cost_estimate numeric,
  overridden_by text,              -- 'human:{id}' when reversed
  created_at timestamptz not null default now()
);
```

- All calls go through one gateway module (steward.ts): pinned model, role
  prompt registry, JSON schema validation on outputs, retry with backoff,
  and the model_actions write. No direct API calls from feature code.
- Prompts are versioned files in the repo (`steward/prompts/{role}.md`).
  Changing a prompt is a PR. The model_version column concatenates model
  string + prompt version.
- Budget: daily token budget per role (TUNABLE), gateway enforces; over
  budget routes to needs_human rather than degrading silently.
- Weekly human audit: a dashboard samples 20 random model_actions per role
  for spot-checking. Override rate above 10% on any role (TUNABLE) freezes
  that role's auto-approve authority (everything routes needs_human) until
  the prompt is revised.
- Injection defense: source content and complaint text are untrusted. The
  gateway wraps them in data tags; role prompts instruct the model to treat
  embedded instructions as content to evaluate, never commands. A test
  fixture set includes hostile submissions and must pass in CI.

---

## 4. WHAT THE STEWARD IS PUBLICLY

The standards page (SHOW_LAUNCH_RUNBOOK section 5) names it plainly: an AI
model performs first-pass verification and complaint triage; every automated
decision is logged, appealable, and reversible by a human; retraction
authority is human-only. On a registry that documents AI use cases, the
registry's own AI use case is documented. It is entered as a case in the
registry itself, votable like any other. OWNER files it at launch.

End of spec.
