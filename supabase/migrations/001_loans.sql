-- ============================================================
-- Migration: 001_loans.sql
-- Adds persons, loans, and repayments tables for
-- Lent / Borrowed money tracking.
--
-- Backward-compatible: does NOT alter the existing transactions
-- table or any of its existing columns.
-- Idempotent: can be run safely multiple times in Supabase SQL editor.
-- ============================================================

-- -------------------------
-- 1. Persons
-- -------------------------
CREATE TABLE IF NOT EXISTS persons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_persons_user_id ON persons(user_id);

-- Row Level Security
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "persons_select_own" ON persons;
CREATE POLICY "persons_select_own" ON persons
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "persons_insert_own" ON persons;
CREATE POLICY "persons_insert_own" ON persons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "persons_update_own" ON persons;
CREATE POLICY "persons_update_own" ON persons
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "persons_delete_own" ON persons;
CREATE POLICY "persons_delete_own" ON persons
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------------
-- 2. Loans
-- -------------------------
CREATE TABLE IF NOT EXISTS loans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id               UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
  direction               TEXT NOT NULL CHECK (direction IN ('lent', 'borrowed')),
  amount                  NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  date                    TIMESTAMPTZ NOT NULL,
  note                    TEXT,
  payment_method          TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open', 'partial', 'settled', 'written_off')),
  written_off_expense_id  TEXT,            -- links to transactions.id when written off
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loans_user_id    ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_person_id  ON loans(person_id);
CREATE INDEX IF NOT EXISTS idx_loans_status     ON loans(status);

-- Row Level Security
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loans_select_own" ON loans;
CREATE POLICY "loans_select_own" ON loans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "loans_insert_own" ON loans;
CREATE POLICY "loans_insert_own" ON loans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "loans_update_own" ON loans;
CREATE POLICY "loans_update_own" ON loans
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "loans_delete_own" ON loans;
CREATE POLICY "loans_delete_own" ON loans
  FOR DELETE USING (auth.uid() = user_id);

-- -------------------------
-- 3. Repayments
-- -------------------------
CREATE TABLE IF NOT EXISTS repayments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id           UUID NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
  amount            NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  date              TIMESTAMPTZ NOT NULL,
  payment_method    TEXT NOT NULL,
  note              TEXT,
  idempotency_key   TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique idempotency key per loan to prevent duplicate repayments
CREATE UNIQUE INDEX IF NOT EXISTS idx_repayments_idempotency
  ON repayments(loan_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_repayments_loan_id ON repayments(loan_id);

-- Row Level Security (via loan ownership)
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "repayments_select_own" ON repayments;
CREATE POLICY "repayments_select_own" ON repayments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = repayments.loan_id
        AND loans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "repayments_insert_own" ON repayments;
CREATE POLICY "repayments_insert_own" ON repayments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = repayments.loan_id
        AND loans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "repayments_delete_own" ON repayments;
CREATE POLICY "repayments_delete_own" ON repayments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = repayments.loan_id
        AND loans.user_id = auth.uid()
    )
  );

-- -------------------------
-- 4. Updated-at trigger helper
-- -------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_persons_updated_at ON persons;
CREATE TRIGGER set_persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_loans_updated_at ON loans;
CREATE TRIGGER set_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
