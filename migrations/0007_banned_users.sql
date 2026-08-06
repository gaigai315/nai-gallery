 CREATE TABLE IF NOT EXISTS banned_users (
   discord_id TEXT PRIMARY KEY,
   banned_at TEXT NOT NULL,
   banned_by TEXT NOT NULL,
   reason TEXT DEFAULT ''
 );
