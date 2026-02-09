-- Core schema for NPO-TrustOS (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE project (
  id UUID PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('Public', 'Profit')),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE budget (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES project(id),
  fiscal_year INT NOT NULL,
  total_budget NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_spent NUMERIC(18,2) NOT NULL DEFAULT 0,
  UNIQUE (project_id, fiscal_year)
);

CREATE TABLE account_code (
  id UUID PRIMARY KEY,
  level1 VARCHAR(100) NOT NULL,
  level2 VARCHAR(100) NOT NULL,
  level3 VARCHAR(100) NOT NULL,
  code VARCHAR(30) UNIQUE NOT NULL,
  is_common_expense BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE transaction_head (
  id UUID PRIMARY KEY,
  tx_date DATE NOT NULL,
  description VARCHAR(500),
  status VARCHAR(20) NOT NULL CHECK (status IN ('DRAFT', 'APPROVED', 'REJECTED')),
  created_by UUID NOT NULL,
  approved_by UUID
);

CREATE TABLE transaction_line (
  id UUID PRIMARY KEY,
  head_id UUID NOT NULL REFERENCES transaction_head(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES project(id),
  account_code_id UUID NOT NULL REFERENCES account_code(id),
  debit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  evidence_url TEXT,
  CHECK (
    (debit_amount > 0 AND credit_amount = 0)
    OR (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE TABLE allocation_rule (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  basis_type VARCHAR(50) NOT NULL CHECK (basis_type IN ('HEADCOUNT', 'AREA', 'REVENUE', 'CUSTOM')),
  basis_value NUMERIC(18,4) NOT NULL,
  project_id UUID NOT NULL REFERENCES project(id),
  effective_from DATE NOT NULL,
  effective_to DATE
);

CREATE TABLE allocation_rule_item (
  id UUID PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES allocation_rule(id) ON DELETE CASCADE,
  target_project_id UUID NOT NULL REFERENCES project(id),
  ratio NUMERIC(6,4) NOT NULL CHECK (ratio > 0 AND ratio <= 1),
  UNIQUE (rule_id, target_project_id)
);

CREATE TABLE donor (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50)
);

CREATE TABLE donor_sensitive (
  donor_id UUID PRIMARY KEY REFERENCES donor(id) ON DELETE CASCADE,
  rrn_encrypted BYTEA NOT NULL,
  encryption_key_id VARCHAR(100) NOT NULL
);

CREATE TABLE donation (
  id UUID PRIMARY KEY,
  donor_id UUID NOT NULL REFERENCES donor(id),
  project_id UUID NOT NULL REFERENCES project(id),
  donated_at DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  purpose VARCHAR(300),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('BANK', 'CARD', 'CASH', 'ONLINE', 'OTHER')),
  receipt_issued BOOLEAN NOT NULL DEFAULT FALSE
);

-- Balance check trigger (head debit == credit)
CREATE OR REPLACE FUNCTION check_transaction_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_head_id UUID;
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_head_id := OLD.head_id;
  ELSE
    v_head_id := NEW.head_id;
  END IF;

  SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
  INTO v_debit, v_credit
  FROM transaction_line
  WHERE head_id = v_head_id;

  IF v_debit <> v_credit THEN
    RAISE EXCEPTION 'Transaction not balanced. head_id=%, debit=%, credit=%',
      v_head_id, v_debit, v_credit;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_transaction_balance
AFTER INSERT OR UPDATE OR DELETE ON transaction_line
FOR EACH STATEMENT
EXECUTE FUNCTION check_transaction_balance();
