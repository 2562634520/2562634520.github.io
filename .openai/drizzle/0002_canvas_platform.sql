PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_identities (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_subject),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS canvases (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '未命名画布',
  current_revision INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'private',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS canvas_members (
  canvas_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner','editor','viewer')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(canvas_id,user_id),
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS canvas_versions (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  label TEXT,
  snapshot_json TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(canvas_id, revision),
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS canvas_shares (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer',
  expires_at TEXT,
  revoked_at TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  canvas_id TEXT,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  thumbnail_key TEXT,
  source TEXT NOT NULL DEFAULT 'upload',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS node_definitions (
  type TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_mode TEXT NOT NULL DEFAULT 'standard',
  endpoint TEXT,
  workflow_id TEXT,
  input_schema TEXT NOT NULL DEFAULT '{}',
  output_schema TEXT NOT NULL DEFAULT '{}',
  parameter_mapping TEXT NOT NULL DEFAULT '{}',
  credit_cost INTEGER NOT NULL DEFAULT 0,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS canvas_tasks (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  definition_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  provider_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  credit_cost INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (canvas_id) REFERENCES canvases(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_order_id TEXT,
  amount_cents INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_canvases_owner ON canvases(owner_id,updated_at);
CREATE INDEX IF NOT EXISTS idx_assets_owner ON assets(owner_id,created_at);
CREATE INDEX IF NOT EXISTS idx_canvas_tasks_canvas ON canvas_tasks(canvas_id,created_at);
INSERT OR IGNORE INTO node_definitions (type,name,provider_mode,endpoint,credit_cost) VALUES
('image','图片生成','standard','rhart-image-n-pro/text-to-image',20),
('video','视频生成','standard','kling-v2-1/image-to-video',60),
('app','AI 应用','workflow','',30),
('tool','图片工具','standard','rhart-image-n-pro/image-to-image',25),
('movie','智能成片','workflow','',80),
('outfit','动作穿搭','workflow','',50),
('video-process','视频处理','workflow','',40),
('supervisor','AI 监工','workflow','',10);
