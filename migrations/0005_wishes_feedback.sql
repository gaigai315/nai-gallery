
CREATE TABLE wishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  content TEXT NOT NULL,
  images_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wish_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wish_id INTEGER NOT NULL REFERENCES wishes(id),
  discord_id TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL,
  username TEXT,
  content TEXT NOT NULL,
  images_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);
