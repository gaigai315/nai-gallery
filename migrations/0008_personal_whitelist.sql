CREATE TABLE IF NOT EXISTS whitelist (
  discord_id TEXT PRIMARY KEY,
  note TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
