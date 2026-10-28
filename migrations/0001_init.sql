-- Cloudflare D1 Migration for PUBG & Free Fire Tournament Seat Booking System
-- File: migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  game_type TEXT NOT NULL DEFAULT 'PUBG', -- 'PUBG' or 'FREE_FIRE'
  map_name TEXT NOT NULL DEFAULT 'Erangel',
  match_type TEXT NOT NULL DEFAULT 'Squad', -- 'Squad' or 'Duo' or 'Solo'
  server_region TEXT NOT NULL DEFAULT 'Asia',
  total_teams INTEGER NOT NULL DEFAULT 6, -- standard 6 teams in visual preview, or up to 25 teams
  seats_per_team INTEGER NOT NULL DEFAULT 4,
  entry_fee_solo INTEGER NOT NULL DEFAULT 150,
  entry_fee_duo INTEGER NOT NULL DEFAULT 300,
  entry_fee_squad INTEGER NOT NULL DEFAULT 600,
  prize_pool_total INTEGER NOT NULL DEFAULT 3600,
  room_open_time INTEGER NOT NULL, -- Unix epoch ms when 15-min credential window opens
  match_start_time INTEGER NOT NULL, -- Unix epoch ms when match officially starts
  match_end_time INTEGER NOT NULL, -- Unix epoch ms (usually match_start_time + 60 min)
  room_id TEXT, -- Locked until approved + room_open_time reached
  room_password TEXT, -- Locked until approved + room_open_time reached
  status TEXT NOT NULL DEFAULT 'REGISTRATION_OPEN', -- 'REGISTRATION_OPEN', 'ROOM_OPEN', 'MATCH_LIVE', 'WAIT_FOR_RESULT', 'COMPLETED'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  team_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  team_number INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  player_uid TEXT NOT NULL, -- PUBG Mobile Global UID (8-11 digits)
  contact_number TEXT NOT NULL,
  package_type TEXT NOT NULL, -- 'SOLO', 'DUO', 'SQUAD'
  seat_count INTEGER NOT NULL,
  seat_numbers TEXT NOT NULL, -- JSON array string e.g. "[1]" or "[1,2]"
  amount_pkr INTEGER NOT NULL,
  payment_method TEXT NOT NULL, -- 'EASYPAISA', 'JAZZCASH', 'BANK_TRANSFER'
  transaction_ref TEXT NOT NULL UNIQUE, -- STRICT UNIQUE CONSTRAINT preventing duplicate TRX submissions
  screenshot_r2_key TEXT NOT NULL, -- Private key in Cloudflare R2 bucket (never publicly readable)
  screenshot_mime TEXT NOT NULL DEFAULT 'image/jpeg',
  screenshot_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  admin_notes TEXT,
  access_token TEXT NOT NULL, -- Private token issued to booking creator to read their credentials securely
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  reviewed_at INTEGER,
  reviewed_by TEXT,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS seats (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  team_number INTEGER NOT NULL,
  seat_number INTEGER NOT NULL, -- 1, 2, 3, 4
  booking_id TEXT,
  player_name TEXT,
  player_uid TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'RESERVED_PENDING', 'APPROVED'
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  UNIQUE(tournament_id, team_id, seat_number),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS match_results (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  team_number INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  kills INTEGER NOT NULL DEFAULT 0,
  placement_points INTEGER NOT NULL DEFAULT 0,
  kill_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  prize_pkr INTEGER NOT NULL DEFAULT 0,
  published_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_settings (
  method_key TEXT PRIMARY KEY, -- 'EASYPAISA', 'JAZZCASH', 'BANK'
  title TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  iban TEXT,
  instructions TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1,
  reset_time INTEGER NOT NULL
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_seats_tournament ON seats(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_trx ON bookings(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_bookings_tournament ON bookings(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_match_results_tournament ON match_results(tournament_id, rank);
