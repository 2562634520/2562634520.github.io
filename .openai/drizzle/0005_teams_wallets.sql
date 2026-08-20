CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(team_id,user_id)
);

CREATE TABLE IF NOT EXISTS team_credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id,team_id);
CREATE INDEX IF NOT EXISTS idx_team_credit_ledger_team ON team_credit_ledger(team_id,created_at);

ALTER TABLE users ADD COLUMN active_credit_scope TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE users ADD COLUMN active_team_id TEXT;
ALTER TABLE canvases ADD COLUMN team_id TEXT;
ALTER TABLE canvas_tasks ADD COLUMN billing_scope TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE canvas_tasks ADD COLUMN billing_team_id TEXT;
ALTER TABLE media_tasks ADD COLUMN billing_scope TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE media_tasks ADD COLUMN billing_team_id TEXT;
ALTER TABLE payment_orders ADD COLUMN credit_scope TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE payment_orders ADD COLUMN team_id TEXT;
