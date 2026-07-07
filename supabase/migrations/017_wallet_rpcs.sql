-- ============================================================
-- WALLET RPCs
-- Migration 017 | Atomic wallet operations
-- From ebl-battler Part 2 package (0005_wallet_rpcs.sql)
-- Called ONLY by service-role edge functions.
-- ============================================================

-- ---------- Wallet Debit (Atomic, never goes negative) ----------
CREATE OR REPLACE FUNCTION wallet_debit(p_user UUID, p_amount NUMERIC)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ok BOOLEAN := false;
BEGIN
  -- Ensure wallet exists with starting balance
  INSERT INTO wallets (user_id) VALUES (p_user) ON CONFLICT DO NOTHING;

  -- Atomic debit: only succeeds if balance sufficient
  UPDATE wallets
    SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = p_user AND balance >= p_amount;

  ok := FOUND;
  RETURN ok;
END;
$$;

COMMENT ON FUNCTION wallet_debit IS 'Atomic debit. Returns false if insufficient balance. Never throws.';

-- ---------- Wallet Credit ----------
CREATE OR REPLACE FUNCTION wallet_credit(p_user UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Upsert: create wallet with starting balance + credit, or just add credit
  INSERT INTO wallets (user_id, balance)
    VALUES (p_user, 100 + p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + p_amount, updated_at = now();
END;
$$;

COMMENT ON FUNCTION wallet_credit IS 'Credit user wallet. Creates wallet with starting balance if new.';

-- ---------- Rate Limit Increment ----------
CREATE OR REPLACE FUNCTION increment_rate_limit(p_user UUID, p_fn TEXT, p_minute TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rate_limits
    SET calls = calls + 1
    WHERE user_id = p_user AND fn = p_fn AND minute = p_minute;
END;
$$;

COMMENT ON FUNCTION increment_rate_limit IS 'Increment rate limit counter. Used by battle-referee.';

-- ---------- Security: Revoke public access to wallet functions ----------
REVOKE EXECUTE ON FUNCTION wallet_debit FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION wallet_credit FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION increment_rate_limit FROM public, anon, authenticated;

-- Grant to service_role only
GRANT EXECUTE ON FUNCTION wallet_debit TO service_role;
GRANT EXECUTE ON FUNCTION wallet_credit TO service_role;
GRANT EXECUTE ON FUNCTION increment_rate_limit TO service_role;
