PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS batches (
  batch_id TEXT PRIMARY KEY,
  batch_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expire_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS prompt_groups (
  group_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  title TEXT NOT NULL,
  positive_prompt TEXT,
  negative_prompt TEXT,
  params_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS images (
  image_id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  group_id TEXT,
  r2_key TEXT NOT NULL,
  preview_r2_key TEXT,
  txt_key TEXT,
  prompt_preview TEXT,
  seed TEXT,
  metadata_json TEXT,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
  FOREIGN KEY (group_id) REFERENCES prompt_groups(group_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_batch_unlocks (
  discord_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (discord_id, batch_id),
  FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorites (
  discord_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  PRIMARY KEY (discord_id, batch_id, image_id),
  FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE,
  FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  batch_id TEXT,
  image_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('unlock', 'unlock_refresh', 'download', 'favorite', 'unfavorite')),
  timestamp TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS downloads_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  asset TEXT NOT NULL CHECK (asset IN ('image', 'txt')),
  timestamp TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_images_batch_id ON images(batch_id);
CREATE INDEX IF NOT EXISTS idx_images_group_id ON images(group_id);
CREATE INDEX IF NOT EXISTS idx_prompt_groups_batch_id ON prompt_groups(batch_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_discord_batch_action_time
  ON access_logs(discord_id, batch_id, action, timestamp);
CREATE INDEX IF NOT EXISTS idx_access_logs_batch_image ON access_logs(batch_id, image_id);
CREATE INDEX IF NOT EXISTS idx_downloads_log_discord_batch_time
  ON downloads_log(discord_id, batch_id, timestamp);
