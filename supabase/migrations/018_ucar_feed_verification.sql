-- Migration 018: UCAR Feed, Verification Pipeline, and Complaints System
-- Implements schema from UCAR_REGISTRY_BUILD_PLAN.md sections 2.5, 3.3, 4.5
-- Tables: votes, watches, case_status_log, verifications, complaints, review_queue
-- Adds UCAR status enum values and RLS policies

-- ============================================================================
-- PART 1: Status Enum Expansion for UCAR Pipeline
-- ============================================================================
-- Status flow: submitted -> machine_verified | needs_human | rejected
--              machine_verified -> under_review -> (reinstated = machine_verified) | retracted
--              needs_human -> machine_verified | rejected (human decision)
--              retracted is terminal

-- Drop old constraint and add expanded UCAR status values
ALTER TABLE use_cases DROP CONSTRAINT IF EXISTS use_cases_status_check;

ALTER TABLE use_cases ADD CONSTRAINT use_cases_status_check
  CHECK (status IN (
    -- Legacy statuses (kept for backward compatibility)
    'pending_review', 'approved', 'active', 'duplicate', 'retired', 'rejected', 'needs_revision',
    -- UCAR pipeline statuses
    'submitted',          -- Initial submission state
    'machine_verified',   -- Passed autoverify pipeline
    'needs_human',        -- Routed to human review queue
    'under_review',       -- Complaint filed, frozen from EBL use
    'retracted'           -- Terminal state, card becomes collector item
  ));

-- Add contested flag for complaint handling
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS contested BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN use_cases.contested IS 'True when an active complaint exists against this case';
COMMENT ON COLUMN use_cases.status IS 'UCAR status: submitted->machine_verified|needs_human|rejected, machine_verified->under_review->retracted';

-- ============================================================================
-- PART 2: UCAR Votes Table (Section 2.5)
-- ============================================================================
-- One vote per user per case, changeable
-- Named ucar_votes to avoid conflict with legacy votes table

CREATE TABLE IF NOT EXISTS ucar_votes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('good', 'evil')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, case_id)
);

CREATE INDEX IF NOT EXISTS ucar_votes_case_id_idx ON ucar_votes(case_id);
CREATE INDEX IF NOT EXISTS ucar_votes_user_id_idx ON ucar_votes(user_id);
CREATE INDEX IF NOT EXISTS ucar_votes_side_idx ON ucar_votes(case_id, side);

COMMENT ON TABLE ucar_votes IS 'UCAR feed votes. One vote per user per case, changeable. Source of truth for good_votes/evil_votes counters.';
COMMENT ON COLUMN ucar_votes.side IS 'Vote alignment: good or evil';
COMMENT ON COLUMN ucar_votes.updated_at IS 'Last time user changed their vote';

-- ============================================================================
-- PART 3: Watches Table (Section 2.5)
-- ============================================================================
-- Case subscriptions for status change notifications

CREATE TABLE IF NOT EXISTS watches (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, case_id)
);

CREATE INDEX IF NOT EXISTS watches_case_id_idx ON watches(case_id);
CREATE INDEX IF NOT EXISTS watches_user_id_idx ON watches(user_id);

COMMENT ON TABLE watches IS 'Case watch subscriptions. Users receive notifications on status changes and faction flips.';

-- ============================================================================
-- PART 4: Case Status Log (Section 2.5)
-- ============================================================================
-- Public status history for transparency and legal posture

CREATE TABLE IF NOT EXISTS case_status_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,              -- 'steward' | 'human:{admin_id}' | 'system'
  reason TEXT NOT NULL,             -- public, plain language
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS case_status_log_case_id_idx ON case_status_log(case_id);
CREATE INDEX IF NOT EXISTS case_status_log_created_at_idx ON case_status_log(created_at DESC);
CREATE INDEX IF NOT EXISTS case_status_log_to_status_idx ON case_status_log(to_status);

COMMENT ON TABLE case_status_log IS 'Public audit trail of all status changes. Every transition logged with actor and reason.';
COMMENT ON COLUMN case_status_log.actor IS 'Who made the change: steward (model), human:{admin_id}, or system';
COMMENT ON COLUMN case_status_log.reason IS 'Plain language explanation, always public';

-- ============================================================================
-- PART 5: Verifications Table (Section 3.3)
-- ============================================================================
-- Autoverify pipeline stage results

CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN (
    'schema_gate',          -- Stage 1: required fields present
    'source_fetch',         -- Stage 2: source_url returns 200
    'dedupe',               -- Stage 3: duplicate detection
    'prohibited_screen',    -- Stage 4: spam/doxxing/harm check
    'claim_source',         -- Stage 5: claim-source consistency
    'classification',       -- Stage 6: category/impact confirmation
    'verdict'               -- Stage 7: final determination
  )),
  outcome TEXT NOT NULL CHECK (outcome IN (
    'pass',                 -- Stage passed
    'fail',                 -- Stage failed (soft or hard)
    'skip',                 -- Stage skipped (short-circuit)
    'supported',            -- claim_source: evidence supports claim
    'partially_supported',  -- claim_source: partial evidence
    'unsupported',          -- claim_source: no supporting evidence
    'machine_verified',     -- verdict: all pass
    'needs_human',          -- verdict: soft failure
    'rejected'              -- verdict: hard failure
  )),
  rationale TEXT NOT NULL,
  model_action_id BIGINT,           -- FK to model_actions (steward spec)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verifications_case_id_idx ON verifications(case_id);
CREATE INDEX IF NOT EXISTS verifications_stage_idx ON verifications(stage);
CREATE INDEX IF NOT EXISTS verifications_created_at_idx ON verifications(created_at DESC);
CREATE INDEX IF NOT EXISTS verifications_case_stage_idx ON verifications(case_id, stage);

COMMENT ON TABLE verifications IS 'Autoverify pipeline stage results. Each submission runs through stages 1-7.';
COMMENT ON COLUMN verifications.stage IS 'Pipeline stage: schema_gate, source_fetch, dedupe, prohibited_screen, claim_source, classification, verdict';
COMMENT ON COLUMN verifications.outcome IS 'Stage result determining next action';
COMMENT ON COLUMN verifications.model_action_id IS 'FK to model_actions for model-based stages (steward attribution)';

-- ============================================================================
-- PART 6: Complaints Table (Section 4.5)
-- ============================================================================
-- Complaint filing with anti-weaponization guardrails

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  filed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'factual_error',
    'wrong_attribution',
    'framing',
    'duplicate',
    'dead_source',
    'legal_request'
  )),
  detail TEXT NOT NULL CHECK (char_length(detail) >= 100),
  evidence_url TEXT,
  relationship TEXT NOT NULL DEFAULT 'none' CHECK (relationship IN (
    'none',
    'employee_of_named_org',
    'counsel_for_named_org',
    'submitter'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'merged',
    'dismissed',
    'upheld',
    'appealed'
  )),
  triage_memo TEXT,
  resolved_by TEXT,                 -- 'steward' | 'human:{id}'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS complaints_case_id_idx ON complaints(case_id);
CREATE INDEX IF NOT EXISTS complaints_filed_by_idx ON complaints(filed_by);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints(status);
CREATE INDEX IF NOT EXISTS complaints_type_idx ON complaints(type);
CREATE INDEX IF NOT EXISTS complaints_created_at_idx ON complaints(created_at DESC);
-- Index for rate limiting: open complaints per user
CREATE INDEX IF NOT EXISTS complaints_user_open_idx ON complaints(filed_by, status) WHERE status = 'open';

COMMENT ON TABLE complaints IS 'Complaint filings against cases. Triggers review process and potential case suspension.';
COMMENT ON COLUMN complaints.type IS 'Complaint category: factual_error, wrong_attribution, framing, duplicate, dead_source, legal_request';
COMMENT ON COLUMN complaints.detail IS 'Required explanation, minimum 100 characters';
COMMENT ON COLUMN complaints.relationship IS 'Complainant relationship to case subject. Named party triggers immediate suspension.';
COMMENT ON COLUMN complaints.triage_memo IS 'Steward triage assessment for human reviewers';

-- ============================================================================
-- PART 7: Review Queue Table (Section 4.5)
-- ============================================================================
-- Human review queue for suspended cases

CREATE TABLE IF NOT EXISTS review_queue (
  case_id UUID PRIMARY KEY REFERENCES use_cases(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  escalated_at TIMESTAMPTZ,
  complaint_ids UUID[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS review_queue_opened_at_idx ON review_queue(opened_at);
CREATE INDEX IF NOT EXISTS review_queue_escalated_at_idx ON review_queue(escalated_at) WHERE escalated_at IS NOT NULL;

COMMENT ON TABLE review_queue IS 'Cases requiring human review. SLA: 7 days, escalate at 5 days.';
COMMENT ON COLUMN review_queue.escalated_at IS 'Set when SLA warning triggers (5 days)';
COMMENT ON COLUMN review_queue.complaint_ids IS 'All complaints merged into this review';

-- ============================================================================
-- PART 8: Feed Pagination Indexes
-- ============================================================================
-- Cursor pagination on (created_at, id) for infinite scroll

CREATE INDEX IF NOT EXISTS use_cases_feed_pagination_idx
  ON use_cases(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS use_cases_feed_status_idx
  ON use_cases(status, created_at DESC, id DESC)
  WHERE status IN ('machine_verified', 'under_review');

-- Index for Top tab scoring (recent cases)
-- Note: Can't use NOW() in partial index - use a regular index and filter in queries
CREATE INDEX IF NOT EXISTS use_cases_feed_recent_idx
  ON use_cases(created_at DESC);

-- Index for Flips tab (faction changes in last 30 days)
-- Requires tracking last faction flip - add column if needed
ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS last_flip_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS use_cases_flips_idx
  ON use_cases(last_flip_at DESC NULLS LAST)
  WHERE last_flip_at IS NOT NULL;

COMMENT ON COLUMN use_cases.last_flip_at IS 'Timestamp of most recent good/evil faction flip';

-- ============================================================================
-- PART 9: RLS Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE ucar_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE watches ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;

-- Votes: users can read/write their own votes, others can read aggregate only
CREATE POLICY votes_select_own ON ucar_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY votes_insert_own ON ucar_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY votes_update_own ON ucar_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY votes_delete_own ON ucar_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Watches: users can manage their own watches
CREATE POLICY watches_select_own ON watches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY watches_insert_own ON watches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY watches_delete_own ON watches
  FOR DELETE USING (auth.uid() = user_id);

-- Case status log: public read (transparency requirement)
CREATE POLICY case_status_log_select_all ON case_status_log
  FOR SELECT USING (true);

-- Verifications: public read (transparency requirement)
CREATE POLICY verifications_select_all ON verifications
  FOR SELECT USING (true);

-- Complaints: users can read their own filed complaints
-- Public sees only complaint type and outcome on case page (via case_status_log)
CREATE POLICY complaints_select_own ON complaints
  FOR SELECT USING (auth.uid() = filed_by);

CREATE POLICY complaints_insert_own ON complaints
  FOR INSERT WITH CHECK (auth.uid() = filed_by);

-- Review queue: admin only (handled at app layer via service role)
-- No public RLS policy - requires service role key

-- ============================================================================
-- PART 10: Helper Functions
-- ============================================================================

-- Function to count open complaints per user (for rate limiting)
CREATE OR REPLACE FUNCTION get_user_open_complaint_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM complaints
  WHERE filed_by = p_user_id AND status = 'open';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to recalculate vote counters from votes table
CREATE OR REPLACE FUNCTION recalculate_vote_counts(p_case_id UUID)
RETURNS VOID AS $$
  UPDATE use_cases
  SET
    good_votes = (SELECT COUNT(*) FROM ucar_votes WHERE case_id = p_case_id AND side = 'good'),
    evil_votes = (SELECT COUNT(*) FROM ucar_votes WHERE case_id = p_case_id AND side = 'evil')
  WHERE id = p_case_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Trigger to update vote counters on vote change
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_vote_counts(OLD.case_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_vote_counts(NEW.case_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS votes_update_counts ON ucar_votes;
CREATE TRIGGER votes_update_counts
  AFTER INSERT OR UPDATE OR DELETE ON ucar_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_counts();

-- Trigger to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO case_status_log (case_id, from_status, to_status, actor, reason)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(current_setting('app.current_actor', true), 'system'),
      COALESCE(current_setting('app.status_reason', true), 'Status changed')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS use_cases_status_log ON use_cases;
CREATE TRIGGER use_cases_status_log
  AFTER UPDATE ON use_cases
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- Function to detect faction flip and update last_flip_at
CREATE OR REPLACE FUNCTION check_faction_flip()
RETURNS TRIGGER AS $$
DECLARE
  old_faction TEXT;
  new_faction TEXT;
BEGIN
  -- Determine old faction (majority wins, evil on tie)
  IF OLD.good_votes > OLD.evil_votes THEN
    old_faction := 'good';
  ELSE
    old_faction := 'evil';
  END IF;

  -- Determine new faction
  IF NEW.good_votes > NEW.evil_votes THEN
    new_faction := 'good';
  ELSE
    new_faction := 'evil';
  END IF;

  -- If faction changed, update last_flip_at
  IF old_faction != new_faction THEN
    NEW.last_flip_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS use_cases_faction_flip ON use_cases;
CREATE TRIGGER use_cases_faction_flip
  BEFORE UPDATE ON use_cases
  FOR EACH ROW
  WHEN (OLD.good_votes IS DISTINCT FROM NEW.good_votes OR OLD.evil_votes IS DISTINCT FROM NEW.evil_votes)
  EXECUTE FUNCTION check_faction_flip();

-- ============================================================================
-- PART 11: Comments and Documentation
-- ============================================================================

COMMENT ON TABLE ucar_votes IS 'UCAR feed votes per UCAR_REGISTRY_BUILD_PLAN.md section 2.5. One vote per authenticated user per case.';
COMMENT ON TABLE watches IS 'Case watch subscriptions per UCAR_REGISTRY_BUILD_PLAN.md section 2.5. For status change and flip notifications.';
COMMENT ON TABLE case_status_log IS 'Public status history per UCAR_REGISTRY_BUILD_PLAN.md section 2.5. Every status change is public.';
COMMENT ON TABLE verifications IS 'Autoverify pipeline results per UCAR_REGISTRY_BUILD_PLAN.md section 3.3. Stages 1-7 logged here.';
COMMENT ON TABLE complaints IS 'Complaint filings per UCAR_REGISTRY_BUILD_PLAN.md section 4.5. Rate limited to 3 open per user.';
COMMENT ON TABLE review_queue IS 'Human review queue per UCAR_REGISTRY_BUILD_PLAN.md section 4.5. 7-day SLA, escalate at 5 days.';
