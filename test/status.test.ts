import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { expect, test } from "bun:test";
import { runProbe, statusJson } from "../src/status.ts";

function d1() {
  const db = new Database(":memory:");
  db.exec(readFileSync(new URL("../migrations/0001_status.sql", import.meta.url), "utf8"));
  const stmt = (sql: string, args: unknown[] = []): any => ({
    bind: (...v: unknown[]) => stmt(sql, v),
    first: async () => db.query(sql).get(...(args as any[])) ?? null,
    all: async () => ({ results: db.query(sql).all(...(args as any[])), meta: { changes: 0 } }),
    run: async () => { const r = db.query(sql).run(...(args as any[])); return { results: [], meta: { changes: r.changes } }; },
  });
  return { raw: db, prepare: (s: string) => stmt(s), batch: async (ss: any[]) => { db.exec("BEGIN"); const out = []; for (const s of ss) out.push(await s.run()); db.exec("COMMIT"); return out; } };
}

let world = { rpc: 200 as number | "timeout", height: 100, healthz: 200 as number | "throw", seenAuth: "", calls: 0 };
globalThis.fetch = (async (url: string, init: any) => {
  if (url.endsWith("/healthz")) {
    if (world.healthz === "throw") throw new Error("t");
    return new Response("x", { status: world.healthz });
  }
  world.calls++;
  world.seenAuth = init.headers.authorization;
  if (world.rpc === "timeout") { const e = new Error("t"); e.name = "TimeoutError"; throw e; }
  return new Response(JSON.stringify({ height: world.height, status: "OK", untrusted: false }), { status: world.rpc, headers: { "cf-ray": "8abc-FRA" } });
}) as any;
globalThis.setTimeout = ((f: () => void) => { f(); return 0; }) as any;

test("states, incidents, idempotency, gaps, stale, auth", async () => {
  const DB = d1();
  const env = { DB, MONITOR_TOKEN: "sub_test" } as any;
  const T0 = 29000000; // minute index, multiple of 10
  const at = (m: number) => (T0 + m) * 60000 + 1234;
  await runProbe(env, at(0));
  expect(world.seenAuth).toBe("Basic " + btoa("sub_test:x"));
  await runProbe(env, at(0)); // same minute again: no new row, no double count
  world.height = 101; await runProbe(env, at(1));
  world.rpc = 502; await runProbe(env, at(2)); await runProbe(env, at(3));
  // gap: minutes 4-5 not measured, still down at 6 -> same incident
  world.rpc = "timeout"; await runProbe(env, at(6));
  world.rpc = 200; world.height = 102; world.healthz = 503; await runProbe(env, at(7));
  world.healthz = 200; await runProbe(env, at(8));
  world.rpc = 401; await runProbe(env, at(9));
  world.rpc = 200; world.height = 103;
  await runProbe(env, at(10));
  for (let m = 11; m <= 80; m++) await runProbe(env, at(m)); // height frozen at 103 since minute 10
  const st = (m: number) => (DB.raw.query("SELECT state, reason FROM probes WHERE ts = ?").get(T0 + m) as any);
  expect(DB.raw.query("SELECT COUNT(*) n FROM probes WHERE ts = ?").get(T0) as any).toEqual({ n: 1 });
  expect(st(2)).toEqual({ state: "down", reason: "http_502" });
  expect(st(6)).toEqual({ state: "down", reason: "timeout" });
  expect(st(7).state).toBe("degraded");
  expect(st(9).state).toBe("auth");
  expect(st(69).state).toBe("up");
  expect(st(70).state).toBe("stale");
  const inc = DB.raw.query("SELECT start-? s, end-? e, state, minutes, open FROM incidents ORDER BY start").all(T0, T0) as any[];
  expect(inc).toEqual([
    { s: 2, e: 6, state: "down", minutes: 3, open: 0 },
    { s: 7, e: 7, state: "degraded", minutes: 1, open: 0 },
    { s: 70, e: 80, state: "stale", minutes: 11, open: 1 },
  ]);
  const j = await (await statusJson(env)).json() as any;
  const k = Date.parse(j.generated_at) / 60000 - T0; // minute of the last summary
  expect(k).toBeGreaterThanOrEqual(71);
  const w = j.windows["24h"];
  expect(w.down).toBe(3); expect(w.auth).toBe(1); expect(w.measured_minutes).toBe(k + 1 - 2);
  expect(w.expected_minutes).toBe(k + 1);
  expect(w.availability).toBeCloseTo((k - 2 - 3) / (k - 2), 6);
  expect(j.windows["7d"].measured_minutes).toBe(k - 1);
  expect(j.incidents.map((i: any) => i.state)).toEqual(["stale", "down"]);
  expect(j.incidents[0].ongoing).toBe(true);
  expect(j.last_probe.state).toBe("stale");
  expect(JSON.stringify(j)).not.toContain("sub_test");
});

test("healthz failure is degraded, flapping is rate-limited, failed batch leaves no row", async () => {
  world = { rpc: 200, height: 500, healthz: 200, seenAuth: "", calls: 0 };
  const DB = d1();
  const env = { DB, MONITOR_TOKEN: "sub_test" } as any;
  const T0 = 29100000;
  const at = (m: number) => (T0 + m) * 60000;
  await runProbe(env, at(0));
  world.healthz = "throw"; world.calls = 0; world.height++;
  await runProbe(env, at(1));
  expect(world.calls).toBe(2); // retried
  expect(DB.raw.query("SELECT state, reason FROM probes WHERE ts = ?").get(T0 + 1)).toEqual({ state: "degraded", reason: "healthz_timeout" });
  world.healthz = 502; world.height++;
  await runProbe(env, at(2));
  expect((DB.raw.query("SELECT reason FROM probes WHERE ts = ?").get(T0 + 2) as any).reason).toBe("healthz_502");

  // up/degraded every minute for an hour: summaries at most every 5 minutes
  let summaries = 0;
  const orig = DB.batch;
  DB.batch = async (ss: any[]) => { summaries += ss.length === 2 ? 1 : 0; return orig(ss); };
  for (let m = 3; m < 63; m++) { world.healthz = m % 2 ? 503 : 200; world.height++; await runProbe(env, at(m)); }
  expect(summaries).toBeLessThanOrEqual(12);
  expect(summaries).toBeGreaterThanOrEqual(6);

  // a batch that fails records nothing, and the same minute can be re-run
  DB.batch = async () => { throw new Error("d1 down"); };
  await expect(runProbe(env, at(63))).rejects.toThrow();
  expect(DB.raw.query("SELECT COUNT(*) n FROM probes WHERE ts = ?").get(T0 + 63)).toEqual({ n: 0 });
  DB.batch = orig;
  await runProbe(env, at(63));
  expect(DB.raw.query("SELECT COUNT(*) n FROM probes WHERE ts = ?").get(T0 + 63)).toEqual({ n: 1 });
  const day = DB.raw.query("SELECT up + degraded + stale + down + auth n FROM daily").get() as any;
  expect(day.n).toBe(64);
});
