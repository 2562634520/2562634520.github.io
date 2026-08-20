CREATE TABLE IF NOT EXISTS user_music (
  id TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  object_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_music_owner ON user_music(owner_id, created_at);
