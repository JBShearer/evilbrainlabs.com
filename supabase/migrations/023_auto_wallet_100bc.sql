-- ============================================================
-- Migration 023: Auto-create wallet for new users with 100 BC
-- ============================================================

-- Function to create wallet on user signup
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_wallet_for_new_user();

-- Backfill: create wallets for existing users who don't have one
INSERT INTO wallets (user_id, balance)
SELECT id, 100 FROM auth.users
WHERE id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT (user_id) DO NOTHING;

-- Also update profiles table default if it has braincoin_balance
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'braincoin_balance'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN braincoin_balance SET DEFAULT 100;
    -- Backfill existing profiles with 0 balance
    UPDATE profiles SET braincoin_balance = 100 WHERE braincoin_balance < 100;
  END IF;
END $$;
