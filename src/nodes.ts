// The public upstream nodes measured from Cloudflare every 5 minutes, next to
// the relay, with one identical probe, for /status/'s comparison table.
//
// Every target (the 14 nodes direct, plus the relay) gets `POST /get_info`.
// Up: HTTP 200, status OK, synchronized, height >= median of the round - 1
// (all heights are get_info block counts, so the units match). 401/403/429 is
// `blocked`: not counted as down, but it lowers coverage, so a node refusing
// most probes cannot show 100% on the few that answered.
// Only nodes the relay's feed currently lists as eligible are probed: in the
// pool, not opted out (the relay checks /.well-known/mnr-optout daily), not
// ours, not onion. If the feed is unreachable, the last eligible set is used
// for at most an hour; after that the round is skipped.

import { RPC, day, setMeta, type D1, type D1Stmt, type StatusEnv } from "./status";

// Base URLs from /etc/mnr/relay.toml (the feed gives names, not URLs).
// own-1 is left out: it is only reachable over our WireGuard link.
export const NODES: Record<string, string> = {
  "boldsuck-berlin": "http://xmr-in-berlin-2.boldsuck.org:18081",
  "boldsuck-de": "http://xmr-de.boldsuck.org:18081",
  cakewallet: "https://xmr-node.cakewallet.com:18081",
  cryptostorm: "https://xmr.cryptostorm.is:443",
  hashvault: "http://nodes.hashvault.pro:18081",
  "monerodevs-2": "http://node2.monerodevs.org:18089",
  "monerodevs-3": "http://node3.monerodevs.org:18089",
  monerujo: "http://nodex.monerujo.io:18081",
  privacyx: "https://node.privacyx.co:443",
  sethforprivacy: "http://node.sethforprivacy.com:18089",
  stackwallet: "http://monero.stackwallet.com:18081",
  stormycloud: "http://xmr.stormycloud.org:18089",
  "xmr-support": "http://xmr.support:18081",
  "xmr-tw-1": "http://node1.xmr-tw.org:18081",
};
export const RELAY = "mnr-relay";

// The identifying User-Agent from the public-node rules, plus what this caller is.
const UA = "mnr-relay/0.x (+https://mnr.network/upstreams; uptime monitor, https://mnr.network/status/)";
const CONCURRENCY = 6; // Workers allow 6 connections waiting for headers
const TIMEOUT_MS = 4000;
const RETRY_DELAY_MS = 3000;
const DEADLINE_MS = 20000;
const ELIGIBLE_GRACE_MIN = 60;
const STEP = 5; // minutes between rounds
const RETAIN_DAYS = 90;

type Fetch = typeof fetch;

interface Answer {
  kind: "ok" | "blocked" | "fail";
  reason: string | null;
  height: number | null;
  synced: boolean;
  latency: number | null;
  colo: string | null;
}

async function ask(f: Fetch, url: string, auth: string | null, budgetMs: number): Promise<Answer> {
  const out: Answer = { kind: "fail", reason: "timeout", height: null, synced: false, latency: null, colo: null };
  const ms = Math.min(TIMEOUT_MS, budgetMs);
  if (ms <= 0) return out;
  const headers: Record<string, string> = { "content-type": "application/json", "user-agent": UA };
  if (auth) headers.authorization = auth;
  const t0 = Date.now();
  let r: Response;
  try {
    r = await f(`${url}/get_info`, {
      method: "POST",
      headers,
      body: "{}",
      signal: AbortSignal.timeout(ms),
      cache: "no-store",
    } as RequestInit);
  } catch (e) {
    out.reason = (e as Error)?.name === "TimeoutError" ? "timeout" : "network";
    return out;
  }
  const body = await r.text().catch(() => "");
  const ray = r.headers.get("cf-ray");
  out.colo = ray && ray.includes("-") ? ray.split("-").pop()!.slice(0, 8) : null;
  if (r.status === 401 || r.status === 403 || r.status === 429) {
    out.kind = "blocked";
    out.reason = `http_${r.status}`;
    return out;
  }
  if (r.status !== 200) {
    out.reason = `http_${r.status}`;
    return out;
  }
  try {
    const j = JSON.parse(body) as { status?: unknown; height?: unknown; synchronized?: unknown };
    if (j.status === "OK" && typeof j.height === "number" && Number.isSafeInteger(j.height) && j.height > 0) {
      out.kind = "ok";
      out.reason = null;
      out.height = j.height;
      out.synced = j.synchronized === true;
      out.latency = Date.now() - t0;
      return out;
    }
  } catch {}
  out.reason = "bad_json";
  return out;
}

async function pool<T, R>(items: T[], fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next++;
      out[k] = await fn(items[k]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return out;
}

interface Feed {
  upstreams?: { name?: string; kind?: string; transport?: string; opted_out?: boolean }[];
}

async function eligibleNodes(f: Fetch, ts: number, stored: string | null): Promise<{ names: string[]; fresh: boolean } | null> {
  try {
    const r = await f(`${RPC}/upstreams.json`, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" } as RequestInit);
    if (r.ok) {
      const feed = (await r.json()) as Feed;
      // Hourly at most: a node the relay uses but this list lacks goes unmeasured.
      const listed = (feed.upstreams ?? []).filter(
        (u) => u.name && u.name !== RELAY && u.kind !== "owned" && u.transport !== "onion" && u.opted_out === false,
      );
      const unknown = listed.filter((u) => !(u.name! in NODES)).map((u) => u.name);
      if (unknown.length && ts % 60 === 0) console.log(`nodes: feed lists nodes missing from NODES: ${unknown.join(", ")}`);
      return { names: listed.map((u) => u.name!).filter((n) => n in NODES).sort(), fresh: true };
    }
  } catch {}
  if (!stored) return null;
  const s = JSON.parse(stored) as { ts: number; names: string[] };
  return ts - s.ts <= ELIGIBLE_GRACE_MIN ? { names: s.names.filter((n) => n in NODES), fresh: false } : null;
}

export async function runNodeRound(env: StatusEnv, scheduledTime: number, f: Fetch = fetch): Promise<void> {
  const db = env.DB;
  const ts = Math.floor(scheduledTime / 60000);
  const started = Date.now();

  // Guard first: a round already recorded is never counted twice.
  const [done, stored, hasSummary] = await db.batch([
    db.prepare("SELECT 1 AS x FROM node_probes WHERE ts = ? LIMIT 1").bind(ts),
    db.prepare("SELECT v FROM meta WHERE k = 'node_eligible'"),
    db.prepare("SELECT 1 AS x FROM meta WHERE k = 'node_summary'"),
  ]);
  if (done.results.length) return;
  const storedV = (stored.results[0] as { v?: string } | undefined)?.v ?? null;

  const eligible = await eligibleNodes(f, ts, storedV);
  if (!eligible) return; // stale or unknown pool: don't probe

  const auth = "Basic " + btoa(`${env.MONITOR_TOKEN}:x`);
  const targets = [
    { name: RELAY, url: RPC, auth },
    ...eligible.names.map((n) => ({ name: n, url: NODES[n], auth: null as string | null })),
  ];
  const left = () => DEADLINE_MS - (Date.now() - started);

  const answers = await pool(targets, (t) => ask(f, t.url, t.auth, left()));
  const retry = targets.map((_, i) => i).filter((i) => answers[i].kind === "fail");
  if (retry.length && left() > RETRY_DELAY_MS) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    const again = await pool(retry, (i) => ask(f, targets[i].url, targets[i].auth, left()));
    retry.forEach((i, k) => {
      if (again[k].kind !== "fail") answers[i] = again[k];
    });
  }

  const heights = answers.filter((a) => a.kind === "ok").map((a) => a.height!).sort((a, b) => a - b);
  const ref = heights.length ? heights[Math.floor((heights.length - 1) / 2)] : 0;

  const writes: D1Stmt[] = [];
  const d = day(ts);
  targets.forEach((t, i) => {
    const a = answers[i];
    let state: "up" | "down" | "blocked";
    let reason = a.reason;
    if (a.kind === "blocked") state = "blocked";
    else if (a.kind === "fail") state = "down";
    else if (!a.synced) (state = "down"), (reason = "unsynced");
    else if (a.height! < ref - 1) (state = "down"), (reason = "behind");
    else state = "up";
    writes.push(
      db
        .prepare("INSERT INTO node_probes (ts, node, state, latency_ms, height, colo, reason) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(ts, t.name, state, state === "up" ? a.latency : null, a.height, a.colo, reason),
      db
        .prepare(
          `INSERT INTO node_daily (day, node, ${state}) VALUES (?, ?, 1) ON CONFLICT(day, node) DO UPDATE SET ${state} = ${state} + 1`,
        )
        .bind(d, t.name),
      db.prepare("INSERT OR IGNORE INTO node_first (node, first_ts) VALUES (?, ?)").bind(t.name, ts),
    );
  });
  if (eligible.fresh) writes.push(setMeta(db, "node_eligible", JSON.stringify({ ts, names: eligible.names })));
  if (ts % 1440 === 0) writes.push(db.prepare("DELETE FROM node_probes WHERE ts < ?").bind(ts - RETAIN_DAYS * 1440));
  // All rows of a round commit together; a concurrent duplicate fails on the primary key.
  await db.batch(writes);

  if (ts % 15 === 0 || !hasSummary.results.length) {
    await writeNodeSummary(db, ts, [RELAY, ...eligible.names]);
  }
}

interface Row {
  node: string;
  up: number;
  down: number;
  blocked: number;
}

async function writeNodeSummary(db: D1, ts: number, names: string[]): Promise<void> {
  const from = (n: number) => day(ts - (n - 1) * 1440);
  const [r24, rMed, r7, r30, rFirst] = await db.batch([
    db
      .prepare(
        "SELECT node, SUM(state = 'up') AS up, SUM(state = 'down') AS down, SUM(state = 'blocked') AS blocked FROM node_probes WHERE ts > ? GROUP BY node",
      )
      .bind(ts - 1440),
    db
      .prepare(
        `SELECT node, latency_ms AS p50 FROM (
           SELECT node, latency_ms,
                  ROW_NUMBER() OVER (PARTITION BY node ORDER BY latency_ms) AS rn,
                  COUNT(*) OVER (PARTITION BY node) AS c
           FROM node_probes WHERE ts > ? AND state = 'up' AND latency_ms IS NOT NULL)
         WHERE rn = (c + 1) / 2`,
      )
      .bind(ts - 1440),
    db
      .prepare("SELECT node, SUM(up) AS up, SUM(down) AS down, SUM(blocked) AS blocked FROM node_daily WHERE day >= ? GROUP BY node")
      .bind(from(7)),
    db
      .prepare("SELECT node, SUM(up) AS up, SUM(down) AS down, SUM(blocked) AS blocked FROM node_daily WHERE day >= ? GROUP BY node")
      .bind(from(30)),
    db.prepare("SELECT node, first_ts FROM node_first"),
  ]);
  const by = <T extends { node: string }>(r: { results: unknown[] }) =>
    Object.fromEntries((r.results as T[]).map((x) => [x.node, x]));
  const w24 = by<Row>(r24), w7 = by<Row>(r7), w30 = by<Row>(r30);
  const med = by<{ node: string; p50: number }>(rMed);
  const first = by<{ node: string; first_ts: number }>(rFirst);

  // Expected rounds: every 5-minute mark in the window since measuring began, so a
  // node added later shows the days it was not measured as missing coverage.
  const began = Math.min(...Object.values(first).map((x) => x.first_ts));
  const expected = (node: string, startMinute: number) => {
    if (!first[node]) return 0;
    const f = began;
    const s = Math.max(f, Math.ceil(startMinute / STEP) * STEP);
    return s > ts ? 0 : Math.floor((ts - s) / STEP) + 1;
  };
  const win = (r: Row | undefined, exp: number) => {
    const up = r?.up ?? 0, down = r?.down ?? 0, blocked = r?.blocked ?? 0;
    return {
      up,
      down,
      blocked,
      availability: up + down ? up / (up + down) : null,
      // blocked answers are not counted as down, but they are not measurements either
      coverage: exp ? Math.min(1, (up + down) / exp) : null,
      expected_rounds: exp,
    };
  };
  const dayStart = (n: number) => Math.floor(Date.parse(from(n)) / 60000);
  const nodes = names.map((name) => ({
    name,
    relay: name === RELAY,
    windows: {
      "24h": win(w24[name], expected(name, ts - 1440 + 1)),
      "7d": win(w7[name], expected(name, dayStart(7))),
      "30d": win(w30[name], expected(name, dayStart(30))),
    },
    since: first[name] ? new Date(first[name].first_ts * 60000).toISOString() : null,
    latency_p50_ms: med[name]?.p50 ?? null,
  }));
  await setMeta(
    db,
    "node_summary",
    JSON.stringify({ generated_at: new Date(ts * 60000).toISOString(), step_minutes: STEP, nodes }),
  ).run();
}
