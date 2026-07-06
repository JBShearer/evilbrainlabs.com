# Evil Brain Labs - Row Level Security (RLS) Policies

## Core Principle

**Users read public data, write nothing directly. All writes via service role edge functions.**

This ensures:
- Data integrity through validated server-side mutations
- Prevention of client-side tampering
- Centralized business logic in edge functions
- Audit trail through controlled write paths

---

## Policy Format

For each table:
```
### table_name
- SELECT: [who can read and under what conditions]
- INSERT: [typically "Service role only via edge function"]
- UPDATE: [typically "Service role only via edge function"]
- DELETE: [typically "Service role only via edge function" or "Never"]
```

---

## Registry Tables (Read-Only from EBL)

Master data tables synced from Evil Brain Labs. Users have read access only.

### card_registry
- SELECT: Public read (all authenticated users)
- INSERT: Service role only (EBL sync)
- UPDATE: Service role only (EBL sync)
- DELETE: Never (archive instead)

### product_registry
- SELECT: Public read (all authenticated users)
- INSERT: Service role only (EBL sync)
- UPDATE: Service role only (EBL sync)
- DELETE: Never (archive instead)

### quest_registry
- SELECT: Public read (all authenticated users)
- INSERT: Service role only (EBL sync)
- UPDATE: Service role only (EBL sync)
- DELETE: Never (archive instead)

### battle_templates
- SELECT: Public read (all authenticated users)
- INSERT: Service role only (admin)
- UPDATE: Service role only (admin)
- DELETE: Never (archive instead)

---

## Cards and Card Instances

### cards
- SELECT: TBD
- INSERT: TBD
- UPDATE: TBD
- DELETE: TBD

### card_instances
- SELECT: TBD - Owner can read own instances, public can read for battles/trading
- INSERT: Service role only via edge function (pack opening, minting)
- UPDATE: Service role only via edge function (level up, evolution)
- DELETE: Service role only via edge function (burn mechanics)

---

## Products and Mining Ledger

### products
- SELECT: TBD
- INSERT: TBD
- UPDATE: TBD
- DELETE: TBD

### mining_ledger
- SELECT: TBD - Owner can read own entries
- INSERT: Service role only via edge function (mining rewards)
- UPDATE: Never (immutable ledger)
- DELETE: Never (immutable ledger)

---

## Battles and Battle Events

### battles
- SELECT: TBD - Participants can read own battles, public can read completed battles
- INSERT: Service role only via edge function (battle creation)
- UPDATE: Service role only via edge function (battle state changes)
- DELETE: Never (archive instead)

### battle_events
- SELECT: TBD - Follow battle visibility
- INSERT: Service role only via edge function (battle engine)
- UPDATE: Never (immutable event log)
- DELETE: Never (immutable event log)

---

## Wallets

### wallets
- SELECT: TBD - Owner can read own wallet
- INSERT: Service role only via edge function (user registration)
- UPDATE: Service role only via edge function (balance changes)
- DELETE: Never

### wallet_transactions
- SELECT: TBD - Owner can read own transactions
- INSERT: Service role only via edge function (all transactions)
- UPDATE: Never (immutable ledger)
- DELETE: Never (immutable ledger)

---

## Quests and Scratch Tickets

### quests
- SELECT: TBD - Owner can read own quest progress
- INSERT: Service role only via edge function (quest assignment)
- UPDATE: Service role only via edge function (quest progress)
- DELETE: Service role only via edge function (quest completion/expiry)

### scratch_tickets
- SELECT: TBD - Owner can read own tickets
- INSERT: Service role only via edge function (ticket generation)
- UPDATE: Service role only via edge function (ticket reveal)
- DELETE: Never (archive instead)

---

## Existing Tables

### profiles
- SELECT: Public read (all authenticated users can view profiles)
- INSERT: Service role only via trigger on auth.users
- UPDATE: Owner can update own profile (limited fields)
- DELETE: Never (soft delete via status field)

### broadcasts
- SELECT: Public read (all authenticated users)
- INSERT: Service role only (admin)
- UPDATE: Service role only (admin)
- DELETE: Service role only (admin)

### user_roles
- SELECT: Service role only (security sensitive)
- INSERT: Service role only (admin)
- UPDATE: Service role only (admin)
- DELETE: Service role only (admin)

### audit_log
- SELECT: Service role only (admin audit)
- INSERT: Service role only via triggers
- UPDATE: Never (immutable)
- DELETE: Never (immutable)

---

## Implementation Notes

### Service Role Pattern
All write operations should use edge functions with the service role key:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

### Policy SQL Template
```sql
-- Example: Read own data
CREATE POLICY "Users can read own records"
ON table_name FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Example: Service role only writes
CREATE POLICY "Service role can insert"
ON table_name FOR INSERT
TO service_role
WITH CHECK (true);
```

### Verification Checklist
- [ ] All tables have RLS enabled
- [ ] No tables allow direct INSERT from authenticated role
- [ ] No tables allow direct UPDATE from authenticated role
- [ ] All writes tested through edge functions
- [ ] Policies tested with anon, authenticated, and service_role

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| TBD  | Initial policy documentation | - |
