# USE CASE ARMS RACE: REGISTRY, FEED, AND VERIFICATION PIPELINE
## Build Plan and Guidelines, UCAR Side

Version 1.0. Owner: Jason Shearer. Companion to EBL_BATTLER_BUILD_PLAN.md and
MODEL_STEWARD_SPEC.md. Written for an AI coding agent with no design
authority. OWNER, TUNABLE, and [COPY: *] conventions carry over. No em dashes
anywhere, including generated copy placeholders.

---

## 1. INVARIANTS (ADDITIVE TO THE EBL PLAN'S TEN)

1. **UCAR is the instrument of record.** Neutral voice. The registry never
   editorializes. Satire lives on the EBL side only.
2. **Verification verifies documentation, never virtue.** The pipeline
   confirms a use case is real, sourced, and correctly described. It NEVER
   assigns Good or Evil. Alignment is community votes only.
3. **The model proposes, humans and the community dispose.** Every model
   decision (verification, triage, classification) is logged, reversible,
   and attributed to the model in the public record. See MODEL_STEWARD_SPEC.
4. **A complaint suspends use, not visibility.** Cases under review remain
   readable with an UNDER REVIEW banner. They are blocked from EBL claiming
   and battling. Hiding contested content would break the record; freezing
   its game utility removes the incentive to weaponize it.
5. **Every status change is public.** The case page shows its full status
   history including dismissed complaints and the stated reason. This is the
   corrections log and the legal posture in one table.
6. **One case, one canonical record.** Duplicates merge, never fork. The
   minted EBL card follows the surviving record.

Statuses (single enum, one direction of truth):
`submitted -> machine_verified | needs_human | rejected`
`machine_verified -> under_review -> (reinstated = machine_verified) | retracted`
`needs_human -> machine_verified | rejected` (human decision, logged)
Retracted is terminal. Retracted cards become non-playable collector items on
the EBL side (source of truth: this status).

---

## 2. FEED SPEC: THE TIMELINE (Twitter-parity UX)

The registry front page becomes a timeline. A use case card is the post unit.

### 2.1 Card-as-post anatomy
Rendered like a post: org name and category as the header line, the case
title as the body, impact pips, current Good/Evil vote bar, status badge
(MACHINE VERIFIED / UNDER REVIEW / RETRACTED), source link, timestamp,
and the action row. Card art (the minted PNG from the EBL pipeline) renders
as the media attachment.

### 2.2 Action row (in order)
- **Vote Good / Vote Evil**: the primary action, replaces the like. One vote
  per user per case, changeable. Anonymous visitors see totals, must auth to
  vote. Votes feed card faction on the EBL side (existing sync-alignment).
- **Share**: X/Twitter intent link plus copy-link. Every case page ships
  OpenGraph and Twitter Card meta with the minted card PNG as the image, the
  case title, and the vote ratio in the description. A shared case unfurls
  as the card itself. This is the growth loop: the card IS the tweet.
- **Complain**: opens the complaint flow (section 4).
- **Watch**: subscribe to status changes and flips on this case (notification
  row, email optional).

### 2.3 Tabs (TUNABLE ordering)
- **Latest**: reverse chronological, machine_verified and under_review only.
- **Top**: rolling 7-day score = `votes_total * ln(1 + votes_total) *
  recency_decay(half_life = 72h)`. TUNABLE.
- **Under Fire**: cases currently under_review plus cases with active EBL
  battles (read from EBL battles table, read-only join). The drama tab.
- **Flips**: cards whose faction flipped in the last 30 days, newest first.

### 2.4 Mechanics
- Infinite scroll, cursor pagination on (created_at, id).
- Realtime: new cases and vote-bar movement stream via Supabase Realtime on
  the visible window only (subscribe to a `feed` broadcast channel that the
  vote and submission functions publish deltas to; do not subscribe per-row).
- First paint is server-rendered or statically snapshotted: top 20 cards
  inlined in the HTML. Fixes the current "Loading cases..." empty shell.
  This is mandatory, not a nice-to-have.
- Follows (people following people) are OUT of scope v1. Watch (case-level)
  covers the need. OWNER may add follows later.
- X API cross-posting or ingestion from X: OWNER decision, out of scope
  until decided (API cost and ToS exposure). Share intents cover launch.

### 2.5 Schema additions
```sql
create table votes (
  user_id uuid not null,
  case_id uuid not null,
  side text not null check (side in ('good','evil')),
  updated_at timestamptz not null default now(),
  primary key (user_id, case_id)
);
create table watches (
  user_id uuid not null,
  case_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, case_id)
);
create table case_status_log (
  id bigint generated always as identity primary key,
  case_id uuid not null,
  from_status text,
  to_status text not null,
  actor text not null,            -- 'steward' | 'human:{admin_id}' | 'system'
  reason text not null,           -- public, plain language
  created_at timestamptz not null default now()
);
```
Vote writes go through an edge function (auth, rate limit, one changeable
vote), which updates the case's cached good_votes/evil_votes counters and
publishes the feed delta. Counters are cache; votes table is truth; a nightly
reconciliation job asserts they match and repairs from truth.

---

## 3. AUTOVERIFY PIPELINE (FIRST PASS)

Runs on every submission before anything is publicly listed. Target: under
2 minutes p95. Executed by the steward model (MODEL_STEWARD_SPEC role:
Verifier) plus deterministic checks. Deterministic checks run first and can
short-circuit without a model call.

### 3.1 Stage order
1. **Schema gate** (deterministic): required fields present, source_url
   parses, org name non-empty, category in taxonomy, impact 1 to 5.
2. **Source fetch** (deterministic): source_url returns 200 and content.
   Dead link -> needs_human with reason "source unreachable".
3. **Dedupe** (deterministic + embedding): exact URL match -> merge
   immediately. Else embed title + org + category, cosine similarity against
   existing cases; >= 0.92 (TUNABLE) -> needs_human flagged "possible
   duplicate of {case_id}".
4. **Prohibited screen** (model): spam, doxxing, content that is itself a
   harm vector. -> rejected with logged reason. Narrow gate; when in doubt,
   needs_human.
5. **Claim-source consistency** (model): does the fetched source actually
   document the claimed use case by the claimed organization? Output:
   supported / partially_supported / unsupported plus a one-line rationale.
   unsupported -> needs_human, never silent rejection.
6. **Classification** (model): confirm or correct category and impact with
   rationale. A correction is applied but logged; the submitter is notified
   and can appeal (appeal -> needs_human).
7. **Verdict**: all pass -> machine_verified, public, mint-card fires (EBL
   hook already exists). Any soft failure -> needs_human queue. Hard
   failure -> rejected.

### 3.2 Rules
- The model NEVER invents facts to fill gaps. Missing evidence is a
  needs_human outcome, not a model guess.
- Every stage writes to `model_actions` (see steward spec) with inputs
  hash, output, confidence, and model version.
- needs_human SLA surfaced in admin queue, oldest first. TUNABLE target:
  48 hours.
- Verification tier is displayed as MACHINE VERIFIED, deliberately honest
  wording. [COPY: verification badge tooltip] explains what it does and
  does not mean.

### 3.3 Schema
```sql
create table verifications (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  stage text not null,
  outcome text not null,
  rationale text not null,
  model_action_id bigint,          -- FK to model_actions
  created_at timestamptz not null default now()
);
```

---

## 4. COMPLAINTS AND REVIEW

The mechanism that stops a card from being used, exactly as specified, with
anti-weaponization guardrails.

### 4.1 Filing
Any authenticated user files against a case. Fields: complaint type
(factual_error, wrong_attribution, framing, duplicate, dead_source,
legal_request), free-text detail (required, min 100 chars), evidence URL
(optional), and a declared relationship (none, employee_of_named_org,
counsel_for_named_org, submitter). Rate limit: 3 open complaints per user
(TUNABLE). Filing is never anonymous to the system; the public log shows
the complaint type and outcome, not the complainant identity.

### 4.2 Immediate effect
On filing, the case is flagged `contested = true` instantly and the steward
triage job runs within minutes (queue, p95 under 5 min):
- **Triage outcome A, suspend**: status -> under_review. Public banner.
  EBL effects apply (4.4). Human review required to exit.
- **Triage outcome B, dismiss**: contested cleared, complaint closed with a
  public logged reason. The card never stopped being usable. Dismissals are
  appealable once, and an appeal forces outcome A.
- **Named-party fast lane**: declared relationship employee_of_named_org or
  counsel_for_named_org ALWAYS produces outcome A regardless of triage, and
  pages the admin (email). False declarations are a bannable offense stated
  in the flow. [COPY: named party notice]
- **Brigade collapse**: multiple complaints on one case merge into one open
  review. Complaint count is displayed; it does not multiply effect.
- **Legal_request type** always produces outcome A and pages the admin.

### 4.3 Human review
Admin queue shows: the case, all merged complaints, the steward's triage
memo, source snapshots, and one-click outcomes:
- **Reinstate** (status back to machine_verified, public reason required)
- **Correct and reinstate** (edit fields, log the diff publicly, re-mint the
  card art if title/category/impact changed; EBL card stats update via the
  existing derivation, logged as a card_event `corrected`)
- **Retract** (terminal; public reason; EBL card becomes a retired collector
  item, unplayable, unclaimable; existing owners keep instances)
Review SLA published on the standards page: 7 days (TUNABLE). Auto-escalate
reminder to admin at 5 days.

### 4.4 EBL propagation (the "stop the card" requirement)
Single source of truth: case status. The EBL referee and claim function add
one check each (two-line change against the shipped package):
- `claim-product`: reject if case status is not machine_verified.
- `battle-referee` join: reject decks containing instances of cards whose
  case is under_review or retracted. In-flight battles finish; new use stops.
- `settle-mining`: products of under_review cases mine at 0 for the review
  period (neutral freeze, no siphon accrual either). Retracted products are
  dissolved: seat refunded at 50% of current claim cost (TUNABLE), case
  leaves the pool permanently.
- Feed and case page show [COPY: under review banner] and the status log.

### 4.5 Schema
```sql
create table complaints (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  filed_by uuid not null,
  type text not null check (type in
    ('factual_error','wrong_attribution','framing','duplicate',
     'dead_source','legal_request')),
  detail text not null check (char_length(detail) >= 100),
  evidence_url text,
  relationship text not null default 'none' check (relationship in
    ('none','employee_of_named_org','counsel_for_named_org','submitter')),
  status text not null default 'open' check (status in
    ('open','merged','dismissed','upheld','appealed')),
  triage_memo text,
  resolved_by text,               -- 'steward' | 'human:{id}'
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create table review_queue (
  case_id uuid primary key,
  opened_at timestamptz not null default now(),
  escalated_at timestamptz,
  complaint_ids uuid[] not null
);
```

---

## 5. PHASES AND ACCEPTANCE

**Phase U1, feed** (FLAG_FEED): timeline, votes, share meta, server-rendered
first paint, tabs Latest and Top.
- [ ] First paint contains 20 cards with no client fetch (view-source test).
- [ ] One vote per user, changeable, counters reconcile against votes table.
- [ ] Shared case unfurls with card PNG on X card validator.
- [ ] Feed delta arrives via Realtime within 2s of a vote (integration test).

**Phase U2, autoverify** (FLAG_AUTOVERIFY): stages 1 to 7, admin queue.
- [ ] Dead source routes to needs_human, never rejected (test).
- [ ] Duplicate URL merges; 0.92 similarity flags (fixture tests).
- [ ] unsupported claim-source routes to needs_human (test).
- [ ] Every stage produces a verifications row and model_actions row.
- [ ] p95 pipeline latency under 2 minutes on staging fixtures.

**Phase U3, complaints** (FLAG_COMPLAINTS): filing, triage, review, EBL
propagation, Under Fire and Flips tabs.
- [ ] Filing sets contested instantly; triage resolves within 5 min p95.
- [ ] Named-party complaint suspends regardless of triage (test).
- [ ] Suspended card rejected from EBL claim and battle join (integration
      test against the shipped EBL package).
- [ ] Under_review product mines 0; reinstatement resumes; retraction
      dissolves with 50% refund (ledger tests).
- [ ] Ten complaints from one brigade collapse to one review (test).
- [ ] Status log renders publicly on the case page including dismissals.

Build process rules, flags, migration discipline, and the never-do list from
EBL_BATTLER_BUILD_PLAN.md section 10 apply verbatim. Additional never-do:
never hide a case in response to a complaint (freeze use, keep visible), and
never let the model retract; retraction is human-only.

End of plan.
