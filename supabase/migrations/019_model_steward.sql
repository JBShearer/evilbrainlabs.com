-- ============================================================
-- MODEL STEWARD INFRASTRUCTURE
-- Migration 019 | Model actions logging and audit trail
-- From MODEL_STEWARD_SPEC.md section 3
-- ============================================================

-- ---------- Model Actions Table ----------
-- Every model call logged, reversible, auditable

CREATE TABLE IF NOT EXISTS model_actions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role TEXT NOT NULL,               -- verifier | triage_officer | taxonomist | show_researcher | reconciler
  site TEXT NOT NULL CHECK (site IN ('ucar', 'ebl', 'both')),
  subject_type TEXT NOT NULL,       -- 'case' | 'complaint' | 'digest' | 'card' | ...
  subject_id UUID,
  input_hash TEXT NOT NULL,         -- sha256 of the exact prompt payload
  output JSONB NOT NULL,
  confidence NUMERIC,
  model_version TEXT NOT NULL,      -- model string + prompt version
  latency_ms INT,
  cost_estimate NUMERIC,
  overridden_by TEXT,               -- 'human:{id}' when reversed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_actions_role ON model_actions(role);
CREATE INDEX IF NOT EXISTS idx_model_actions_site ON model_actions(site);
CREATE INDEX IF NOT EXISTS idx_model_actions_subject ON model_actions(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_model_actions_version ON model_actions(model_version);
CREATE INDEX IF NOT EXISTS idx_model_actions_created ON model_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_actions_overridden ON model_actions(overridden_by) WHERE overridden_by IS NOT NULL;

COMMENT ON TABLE model_actions IS 'Every model decision logged. Reversible by human. Weekly audit sampling.';

-- ---------- Token Budget Tracking ----------
-- Daily token budget per role (TUNABLE)

CREATE TABLE IF NOT EXISTS model_budgets (
  role TEXT PRIMARY KEY,
  daily_limit INT NOT NULL,
  tokens_used INT NOT NULL DEFAULT 0,
  reset_at DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Seed default budgets (TUNABLE)
INSERT INTO model_budgets (role, daily_limit) VALUES
  ('verifier', 500000),
  ('triage_officer', 200000),
  ('taxonomist', 100000),
  ('show_researcher', 300000),
  ('reconciler', 100000)
ON CONFLICT (role) DO NOTHING;

COMMENT ON TABLE model_budgets IS 'Daily token limits per role. Exceeding routes to needs_human.';

-- ---------- Prompt Versions ----------
-- Track prompt versions for audit

CREATE TABLE IF NOT EXISTS prompt_versions (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,       -- sha256 of prompt content
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, version)
);

COMMENT ON TABLE prompt_versions IS 'Prompt version registry. Changes are PRs in repo.';

-- ---------- Override Rate Tracking ----------
-- Weekly override rate per role

CREATE OR REPLACE VIEW model_override_rates AS
SELECT
  role,
  COUNT(*) AS total_actions,
  COUNT(*) FILTER (WHERE overridden_by IS NOT NULL) AS overridden_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE overridden_by IS NOT NULL) / NULLIF(COUNT(*), 0), 2) AS override_rate_pct
FROM model_actions
WHERE created_at > now() - INTERVAL '7 days'
GROUP BY role;

COMMENT ON VIEW model_override_rates IS 'Weekly override rate per role. >10% freezes auto-approve.';

-- ---------- RLS ----------

ALTER TABLE model_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- Model actions: service role write, admin read for audit
CREATE POLICY model_actions_service ON model_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY model_budgets_service ON model_budgets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY prompt_versions_service ON prompt_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ---------- FK from verifications to model_actions ----------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'verifications_model_action_fk'
  ) THEN
    ALTER TABLE verifications
      ADD CONSTRAINT verifications_model_action_fk
      FOREIGN KEY (model_action_id) REFERENCES model_actions(id);
  END IF;
END $$;

-- ---------- Budget Check Function ----------

CREATE OR REPLACE FUNCTION check_model_budget(p_role TEXT, p_tokens INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget model_budgets%ROWTYPE;
BEGIN
  SELECT * INTO v_budget FROM model_budgets WHERE role = p_role FOR UPDATE;

  IF v_budget IS NULL THEN
    RETURN false;  -- Unknown role
  END IF;

  -- Reset if new day
  IF v_budget.reset_at < CURRENT_DATE THEN
    UPDATE model_budgets SET tokens_used = 0, reset_at = CURRENT_DATE WHERE role = p_role;
    v_budget.tokens_used := 0;
  END IF;

  -- Check if over budget
  IF v_budget.tokens_used + p_tokens > v_budget.daily_limit THEN
    RETURN false;  -- Over budget, route to needs_human
  END IF;

  -- Deduct tokens
  UPDATE model_budgets SET tokens_used = tokens_used + p_tokens WHERE role = p_role;
  RETURN true;
END;
$$;

COMMENT ON FUNCTION check_model_budget IS 'Check and deduct token budget. Returns false if over limit.';

REVOKE EXECUTE ON FUNCTION check_model_budget FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_model_budget TO service_role;
