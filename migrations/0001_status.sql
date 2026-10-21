-- Uptime monitor for rpc.mnr.network (src/status.ts). One row per measured minute.
CREATE TABLE probes (
  ts INTEGER PRIMARY KEY,          -- unix minute (scheduledTime / 60000)
  state TEXT NOT NULL,             -- up | degraded | stale | down | auth
  latency_ms INTEGER,
  height INTEGER,
  colo TEXT,
  reason TEXT                      -- fixed code, never a response body
);
CREATE TABLE daily (
  day TEXT PRIMARY KEY,            -- YYYY-MM-DD, UTC
  up INTEGER NOT NULL DEFAULT 0,
  degraded INTEGER NOT NULL DEFAULT 0,
  stale INTEGER NOT NULL DEFAULT 0,
  down INTEGER NOT NULL DEFAULT 0,
  auth INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE incidents (
  start INTEGER PRIMARY KEY,
  end INTEGER NOT NULL,
  state TEXT NOT NULL,
  reason TEXT,
  minutes INTEGER NOT NULL,
  open INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX incidents_open ON incidents (open);
CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
