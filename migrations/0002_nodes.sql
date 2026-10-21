-- Public upstream nodes and the relay, one identical get_info probe every 5 minutes (src/nodes.ts).
CREATE TABLE node_probes (
  ts INTEGER NOT NULL,             -- unix minute, multiple of 5
  node TEXT NOT NULL,              -- relay feed name, or mnr-relay
  state TEXT NOT NULL,             -- up | down | blocked
  latency_ms INTEGER,
  height INTEGER,                  -- get_info height (block count)
  colo TEXT,
  reason TEXT,                     -- fixed code, never a response body
  PRIMARY KEY (ts, node)
);
CREATE TABLE node_daily (
  day TEXT NOT NULL,
  node TEXT NOT NULL,
  up INTEGER NOT NULL DEFAULT 0,
  down INTEGER NOT NULL DEFAULT 0,
  blocked INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, node)
);
CREATE TABLE node_first (node TEXT PRIMARY KEY, first_ts INTEGER NOT NULL);
