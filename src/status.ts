// External uptime monitor for rpc.mnr.network, run by this worker's cron every
// minute, and the /status.json feed behind mnr.network/status/.
//
// States, one per measured minute:
//   up        get_height answered, healthz 200
//   degraded  get_height answered, healthz not 200 (503 = pool degraded, still serving)
//   stale     get_height answered, but the height has not moved for 60 minutes
//   down      get_height failed twice (timeout, 5xx, bad JSON)
//   auth      the monitor token was refused (401/403): our fault, not counted
// Availability = (up + degraded + stale) / (up + degraded + stale + down).
// Minutes with no row were not measured and are left out, with coverage shown.

export interface D1Result<T> {
  results: T[];
  meta: { changes: number };
}
export interface D1Stmt {
  bind(...v: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<never>>;
}
export interface D1 {
  prepare(sql: string): D1Stmt;
  batch(s: D1Stmt[]): Promise<D1Result<unknown>[]>;
}

export interface StatusEnv {
  DB: D1;
  MONITOR_TOKEN: string;
}

type State = "up" | "degraded" | "stale" | "down" | "auth";

export const RPC = "https://rpc.mnr.network";
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 5000;
const STALE_MIN = 60;
const RETAIN_DAYS = 90;
// Summaries scan ~4.4k rows; a minute-by-minute flap must not recompute every
// minute, or D1's free 5M reads/day run out and the monitor goes dark.
const SUMMARY_FLOOR_MIN = 5;

interface Attempt {
  rpc: "ok" | "auth" | "fail";
  reason: string | null;
  height: number | null;
  latency: number | null;
  colo: string | null;
  healthz: number | null;
}

async function attempt(token: string): Promise<Attempt> {
  const auth = "Basic " + btoa(`${token}:x`);
  const t0 = Date.now();
  const rpcP = fetch(`${RPC}/get_height`, {
    method: "POST",
    headers: { authorization: auth, "content-type": "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  } as RequestInit).then(
    async (r) => ({ r, body: await r.text().catch(() => ""), ms: Date.now() - t0 }),
    (e: unknown) => ({ err: (e as Error)?.name === "TimeoutError" ? "timeout" : "network" }),
  );
  const hzP = fetch(`${RPC}/healthz`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  } as RequestInit).then(
    (r) => r.status,
    () => null,
  );
  const [res, healthz] = await Promise.all([rpcP, hzP]);
  const out: Attempt = { rpc: "fail", reason: null, height: null, latency: null, colo: null, healthz };
  if ("err" in res) {
    out.reason = res.err;
    return out;
  }
  const ray = res.r.headers.get("cf-ray");
  out.colo = ray && ray.includes("-") ? ray.split("-").pop()!.slice(0, 8) : null;
  if (res.r.status === 401 || res.r.status === 403) {
    out.rpc = "auth";
    out.reason = `http_${res.r.status}`;
    return out;
  }
  if (res.r.status !== 200) {
    out.reason = `http_${res.r.status}`;
    return out;
  }
  // Legacy path: top-level { height, status, untrusted }, not nested in result.
  let h: unknown;
  try {
    const j = JSON.parse(res.body) as { height?: unknown; status?: unknown };
    h = j.status === "OK" ? j.height : undefined;
  } catch {
    h = undefined;
  }
  if (typeof h !== "number" || !Number.isSafeInteger(h) || h <= 0) {
    out.reason = "bad_json";
    return out;
  }
  out.rpc = "ok";
  out.height = h;
  out.latency = res.ms;
  return out;
}

export async function meta(db: D1, k: string): Promise<string | null> {
  const r = await db.prepare("SELECT v FROM meta WHERE k = ?").bind(k).first<{ v: string }>();
  return r ? r.v : null;
}

export function setMeta(db: D1, k: string, v: string): D1Stmt {
  return db
    .prepare("INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v")
    .bind(k, v);
}

export const day = (minute: number) => new Date(minute * 60000).toISOString().slice(0, 10);

export async function runProbe(env: StatusEnv, scheduledTime: number): Promise<void> {
  const db = env.DB;
  const ts = Math.floor(scheduledTime / 60000);

  // A re-run of a minute already recorded changes nothing.
  if (await db.prepare("SELECT 1 FROM probes WHERE ts = ?").bind(ts).first()) return;

  let a = await attempt(env.MONITOR_TOKEN);
  if (a.rpc === "fail" || (a.rpc === "ok" && a.healthz !== 200 && a.healthz !== 503)) {
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    a = await attempt(env.MONITOR_TOKEN);
  }

  const lastHeight = Number((await meta(db, "last_height")) ?? 0);
  const changedAt = Number((await meta(db, "height_changed_at")) ?? ts);
  const writes: D1Stmt[] = [];
  let state: State;
  if (a.rpc === "auth") state = "auth";
  else if (a.rpc === "fail") state = "down";
  else {
    let since = changedAt;
    if (a.height! > lastHeight) {
      since = ts;
      writes.push(setMeta(db, "last_height", String(a.height)), setMeta(db, "height_changed_at", String(ts)));
    }
    if (ts - since >= STALE_MIN) state = "stale";
    else if (a.healthz !== 200) state = "degraded";
    else state = "up";
  }
  const reason =
    state === "stale" ? "stale"
    : state === "degraded" ? (a.healthz === 503 ? "degraded" : a.healthz === null ? "healthz_timeout" : `healthz_${a.healthz}`)
    : a.reason;

  // The probe row and everything derived from it commit together: if the batch
  // fails, nothing is recorded, and no half-counted minute is left behind.
  writes.unshift(
    db
      .prepare("INSERT INTO probes (ts, state, latency_ms, height, colo, reason) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(ts, state, a.latency, a.height, a.colo, reason),
  );
  writes.push(
    db
      .prepare(
        `INSERT INTO daily (day, ${state}) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET ${state} = ${state} + 1`,
      )
      .bind(day(ts)),
  );

  // Incidents: runs of non-up minutes of one state. A gap in measurement does
  // not close a run; only an up minute or a different state does.
  const prev = await meta(db, "last_state");
  const open = await db.prepare("SELECT start, state FROM incidents WHERE open = 1").first<{ start: number; state: string }>();
  if (state === "up" || state === "auth") {
    if (open && state === "up") writes.push(db.prepare("UPDATE incidents SET open = 0 WHERE open = 1"));
  } else if (open && open.state === state) {
    writes.push(db.prepare("UPDATE incidents SET end = ?, minutes = minutes + 1, reason = ? WHERE start = ?").bind(ts, reason, open.start));
  } else {
    if (open) writes.push(db.prepare("UPDATE incidents SET open = 0 WHERE open = 1"));
    writes.push(
      db
        .prepare("INSERT INTO incidents (start, end, state, reason, minutes, open) VALUES (?, ?, ?, ?, 1, 1)")
        .bind(ts, ts, state, reason),
    );
  }
  writes.push(
    setMeta(db, "last_state", state),
    setMeta(db, "last_probe", JSON.stringify({ ts, state, latency_ms: a.latency, height: a.height, colo: a.colo })),
  );
  if ((await meta(db, "first_ts")) === null) writes.push(setMeta(db, "first_ts", String(ts)));
  if (ts % 1440 === 0) {
    writes.push(db.prepare("DELETE FROM probes WHERE ts < ?").bind(ts - RETAIN_DAYS * 1440));
  }
  await db.batch(writes);

  const lastSummary = Number((await meta(db, "summary_ts")) ?? -Infinity);
  if (ts - lastSummary >= 10 || (prev !== state && ts - lastSummary >= SUMMARY_FLOOR_MIN)) {
    await writeSummary(db, ts);
  }
}

interface Counts {
  up: number;
  degraded: number;
  stale: number;
  down: number;
  auth: number;
}

function windowStats(c: Counts, expected: number) {
  const counted = c.up + c.degraded + c.stale + c.down;
  const measured = counted + c.auth;
  return {
    ...c,
    availability: counted ? (c.up + c.degraded + c.stale) / counted : null,
    coverage: expected > 0 ? Math.min(1, measured / expected) : null,
    measured_minutes: measured,
    expected_minutes: expected,
  };
}

async function writeSummary(db: D1, ts: number): Promise<void> {
  const first = Number((await meta(db, "first_ts")) ?? ts);
  const expected = (mins: number) => Math.min(mins, ts - first + 1);

  const zero = (): Counts => ({ up: 0, degraded: 0, stale: 0, down: 0, auth: 0 });
  const last24 = zero();
  const g = await db
    .prepare("SELECT state, COUNT(*) AS n FROM probes WHERE ts > ? GROUP BY state")
    .bind(ts - 1440)
    .all<{ state: State; n: number }>();
  for (const r of g.results) last24[r.state] = r.n;

  const days = await db
    .prepare("SELECT day, up, degraded, stale, down, auth FROM daily ORDER BY day DESC LIMIT ?")
    .bind(RETAIN_DAYS)
    .all<Counts & { day: string }>();
  const sumSince = (n: number) => {
    const from = day(ts - (n - 1) * 1440);
    const c = zero();
    for (const d of days.results) {
      if (d.day < from) continue;
      c.up += d.up; c.degraded += d.degraded; c.stale += d.stale; c.down += d.down; c.auth += d.auth;
    }
    // Days start at 00:00 UTC, so the window is whole days back to `from`.
    return windowStats(c, Math.min(ts - first + 1, ts - Math.floor(Date.parse(from) / 60000) + 1));
  };

  const n24 = last24.up + last24.degraded + last24.stale;
  const pct = async (p: number) =>
    n24
      ? (
          await db
            .prepare(
              "SELECT latency_ms AS v FROM probes WHERE ts > ? AND latency_ms IS NOT NULL ORDER BY latency_ms LIMIT 1 OFFSET ?",
            )
            .bind(ts - 1440, Math.min(n24 - 1, Math.floor(p * n24)))
            .first<{ v: number }>()
        )?.v ?? null
      : null;

  const incidents = await db
    .prepare("SELECT start, end, state, reason, minutes, open FROM incidents WHERE minutes >= 2 OR open = 1 ORDER BY start DESC LIMIT 10")
    .all<{ start: number; end: number; state: State; reason: string | null; minutes: number; open: number }>();

  const summary = {
    generated_at: new Date(ts * 60000).toISOString(),
    measuring_since: new Date(first * 60000).toISOString(),
    windows: {
      "24h": windowStats(last24, expected(1440)),
      "7d": sumSince(7),
      "30d": sumSince(30),
      "90d": sumSince(90),
    },
    latency_24h_ms: { p50: await pct(0.5), p95: await pct(0.95) },
    days: days.results.map((d) => ({ ...d })),
    incidents: incidents.results.map((i) => ({
      start: new Date(i.start * 60000).toISOString(),
      end: new Date((i.end + 1) * 60000).toISOString(),
      state: i.state,
      reason: i.reason,
      minutes: i.minutes,
      ongoing: i.open === 1,
    })),
  };
  await db.batch([setMeta(db, "summary", JSON.stringify(summary)), setMeta(db, "summary_ts", String(ts))]);
}

export async function statusJson(env: StatusEnv, head = false): Promise<Response> {
  const [s, last, cmp] = await Promise.all([
    meta(env.DB, "summary"),
    meta(env.DB, "last_probe"),
    meta(env.DB, "node_summary"),
  ]);
  const comparison = cmp ? JSON.parse(cmp) : null;
  const body = s
    ? { ...JSON.parse(s), last_probe: last ? JSON.parse(last) : null, comparison }
    : { error: "no measurements yet", comparison };
  if (body.last_probe) body.last_probe.at = new Date(body.last_probe.ts * 60000).toISOString();
  return new Response(head ? null : JSON.stringify(body), {
    status: s ? 200 : 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
    },
  });
}
