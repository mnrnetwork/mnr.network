import { expect, test } from "bun:test";
import { NODES, RELAY, runNodeRound } from "../src/nodes.ts";
import { statusJson } from "../src/status.ts";
import { d1 } from "./d1.ts";

globalThis.setTimeout = ((f: () => void) => { f(); return 0; }) as any;

type Reply = number | "timeout" | { height: number; synchronized?: boolean } | ((n: number) => Reply);
const NAMES = Object.keys(NODES);

function world(opts: { feed?: "down" | any[]; replies?: Record<string, Reply> } = {}) {
  const calls: Record<string, number> = {};
  let subrequests = 0;
  const host = (url: string) =>
    url.startsWith("https://rpc.mnr.network") ? RELAY : NAMES.find((n) => url.startsWith(NODES[n]))!;
  const f = (async (url: string, init: any) => {
    subrequests++;
    if (url.endsWith("/upstreams.json")) {
      if (opts.feed === "down") throw new Error("down");
      const ups = opts.feed ?? NAMES.map((name) => ({ name, kind: "public", transport: "http", opted_out: false }));
      return Response.json({ upstreams: [{ name: "own-1", kind: "owned", transport: "http", opted_out: false }, ...ups] });
    }
    const name = host(url);
    calls[name] = (calls[name] ?? 0) + 1;
    expect(init.headers["user-agent"]).toContain("mnr-relay/0.x");
    if (name === RELAY) expect(init.headers.authorization).toBe("Basic " + btoa("sub_t:x"));
    else expect(init.headers.authorization).toBeUndefined();
    let r: Reply = opts.replies?.[name] ?? { height: 1000 };
    if (typeof r === "function") r = r(calls[name]);
    if (r === "timeout") { const e = new Error("t"); e.name = "TimeoutError"; throw e; }
    if (typeof r === "number") return new Response("no", { status: r });
    return Response.json({ status: "OK", height: r.height, synchronized: r.synchronized ?? true }, { headers: { "cf-ray": "9f-AMS" } });
  }) as any;
  return { f, calls, sub: () => subrequests };
}

const T0 = 29203200; // multiple of 15 (and of 1440)
const at = (m: number) => (T0 + m) * 60000;
const rows = (DB: any, m: number) =>
  Object.fromEntries((DB.raw.query("SELECT node, state, reason FROM node_probes WHERE ts = ?").all(T0 + m) as any[]).map((r) => [r.node, [r.state, r.reason]]));

test("one predicate for all targets, median reference, blocked, retry, guard", async () => {
  const DB = d1();
  const env = { DB, MONITOR_TOKEN: "sub_t" } as any;
  const w = world({
    replies: {
      cakewallet: { height: 999 },            // 1 behind the median: still up
      sethforprivacy: { height: 997 },        // behind
      hashvault: { height: 99999 },           // outlier: must not mark others behind
      stormycloud: { height: 1000, synchronized: false },
      cryptostorm: "timeout",
      privacyx: 429,
      monerujo: (n) => (n === 1 ? 502 : { height: 1000 }), // recovers on the retry
    },
  });
  await runNodeRound(env, at(0), w.f);
  const r = rows(DB, 0);
  expect(Object.keys(r).length).toBe(15);
  expect(r[RELAY]).toEqual(["up", null]);
  expect(r.cakewallet[0]).toBe("up");
  expect(r.hashvault[0]).toBe("up");
  expect(r["boldsuck-de"][0]).toBe("up");
  expect(r.sethforprivacy).toEqual(["down", "behind"]);
  expect(r.stormycloud).toEqual(["down", "unsynced"]);
  expect(r.cryptostorm).toEqual(["down", "timeout"]);
  expect(r.privacyx).toEqual(["blocked", "http_429"]);
  expect(r.monerujo[0]).toBe("up");
  expect(w.calls.cryptostorm).toBe(2);
  expect(w.calls.privacyx).toBe(1); // blocked is not retried
  expect(w.sub() + 4).toBeLessThanOrEqual(50); // fetches + 4 D1 requests

  // re-running the same round changes nothing
  await runNodeRound(env, at(0), w.f);
  const n = DB.raw.query("SELECT SUM(up + down + blocked) n FROM node_daily").get() as any;
  expect(n.n).toBe(15);
});

test("opt-out fails closed, feed filter, coverage and summary", async () => {
  const DB = d1();
  const env = { DB, MONITOR_TOKEN: "sub_t" } as any;
  const feed = NAMES.filter((n) => n !== "monerujo").map((name) => ({ name, kind: "public", transport: "http", opted_out: name === "hashvault" }));
  feed.push({ name: "brand-new", kind: "public", transport: "http", opted_out: false });
  const ok = world({ feed });
  await runNodeRound(env, at(0), ok.f);
  const r0 = rows(DB, 0);
  expect(r0.hashvault).toBeUndefined();   // opted out
  expect(r0.monerujo).toBeUndefined();    // not in the pool
  expect(r0["brand-new"]).toBeUndefined(); // no URL known
  expect(Object.keys(r0).length).toBe(13);

  // feed down: the stored set is used for up to an hour, then rounds are skipped
  const down = world({ feed: "down" });
  await runNodeRound(env, at(5), down.f);
  expect(Object.keys(rows(DB, 5)).length).toBe(13);
  await runNodeRound(env, at(65), down.f);
  expect(Object.keys(rows(DB, 65)).length).toBe(0);
  expect(down.calls.hashvault).toBeUndefined();

  // a node blocked half the time: availability on answers, coverage shows the gap
  for (let m = 10; m <= 60; m += 5) {
    await runNodeRound(env, at(m), world({ feed, replies: { privacyx: m % 10 ? 403 : { height: 1000 } } }).f);
  }
  const j = (await (await statusJson(env)).json()) as any;
  // before the per-minute summary exists, the comparison is still served
  expect(j.error).toBe("no measurements yet");
  expect(j.comparison.nodes.length).toBe(13); // 12 eligible nodes + the relay
  DB.raw.exec(`INSERT INTO meta (k, v) VALUES ('summary', '{"windows":{}}')`);
  const j2 = (await (await statusJson(env)).json()) as any;
  const c = j2.comparison;
  expect(c.nodes[0].name).toBe(RELAY);
  expect(c.nodes.slice(1).map((x: any) => x.name)).toEqual([...c.nodes.slice(1).map((x: any) => x.name)].sort());
  const p = c.nodes.find((x: any) => x.name === "privacyx").windows["24h"];
  // summary written at minute 60 (multiple of 15): rounds 0..60 except 65 = 13 rounds
  expect(p.expected_rounds).toBe(13);
  expect(p.blocked).toBe(5);
  expect(p.availability).toBe(1);
  expect(p.coverage).toBeCloseTo(8 / 13, 6);
  expect(c.nodes.find((x: any) => x.name === RELAY).latency_p50_ms).not.toBeNull();
});

test("a round where every public node fails is dropped: coverage drops, availability doesn't", async () => {
  const DB = d1();
  const env = { DB, MONITOR_TOKEN: "sub_t" } as any;
  const pubFail = Object.fromEntries(NAMES.map((n) => [n, "timeout" as Reply]));
  await runNodeRound(env, at(0), world().f);
  // all fail, relay included; then all public fail with the relay answering
  await runNodeRound(env, at(5), world({ replies: { ...pubFail, [RELAY]: "timeout" } }).f);
  await runNodeRound(env, at(10), world({ replies: pubFail }).f);
  expect(Object.keys(rows(DB, 5)).length).toBe(0);
  expect(Object.keys(rows(DB, 10)).length).toBe(0);
  expect((DB.raw.query("SELECT SUM(down) n FROM node_daily").get() as any).n).toBe(0);

  // one public survivor keeps the round, and the rest count as down
  await runNodeRound(env, at(15), world({ replies: { ...pubFail, cakewallet: { height: 1000 } } }).f);
  const r = rows(DB, 15);
  expect(Object.keys(r).length).toBe(15);
  expect(r.cakewallet[0]).toBe("up");
  expect(r.hashvault).toEqual(["down", "timeout"]);

  DB.raw.exec(`INSERT INTO meta (k, v) VALUES ('summary', '{"windows":{}}')`);
  const c = ((await (await statusJson(env)).json()) as any).comparison;
  const relay = c.nodes.find((x: any) => x.name === RELAY).windows["24h"];
  expect(relay.expected_rounds).toBe(4);
  expect(relay.availability).toBe(1);
  expect(relay.coverage).toBeCloseTo(2 / 4, 6);
  const cake = c.nodes.find((x: any) => x.name === "cakewallet").windows["24h"];
  expect(cake.availability).toBe(1);
  const hv = c.nodes.find((x: any) => x.name === "hashvault").windows["24h"];
  expect(hv.availability).toBeCloseTo(1 / 2, 6);
});

test("dropped round still stores a fresh eligible set; relay-only rounds are never dropped", async () => {
  const DB = d1();
  const env = { DB, MONITOR_TOKEN: "sub_t" } as any;
  const pubFail = Object.fromEntries(NAMES.map((n) => [n, "timeout" as Reply]));
  await runNodeRound(env, at(0), world({ replies: pubFail }).f);
  expect(Object.keys(rows(DB, 0)).length).toBe(0);
  const m = DB.raw.query("SELECT v FROM meta WHERE k = 'node_eligible'").get() as any;
  expect(JSON.parse(m.v).names.length).toBe(NAMES.length);

  await runNodeRound(env, at(5), world({ feed: [], replies: { [RELAY]: "timeout" } }).f);
  expect(rows(DB, 5)[RELAY]).toEqual(["down", "timeout"]);
});

test("onion and reserved names filtered; deadline cut records timeout without fetching", async () => {
  const DB = d1();
  const env = { DB, MONITOR_TOKEN: "sub_t" } as any;
  const feed = NAMES.map((name) => ({ name, kind: "public", transport: name === "xmr-tw-1" ? "onion" : "http", opted_out: false }));
  feed.push({ name: RELAY, kind: "public", transport: "http", opted_out: false });
  const realNow = Date.now;
  let clock = realNow();
  Date.now = () => clock;
  const w = world({ feed });
  const f = (async (url: string, init: any) => {
    if (!url.endsWith("/upstreams.json")) clock += 7000; // each node answer takes 7 s
    return w.f(url, init);
  }) as any;
  try {
    await runNodeRound(env, at(0), f);
  } finally {
    Date.now = realNow;
  }
  const r = rows(DB, 0);
  expect(r["xmr-tw-1"]).toBeUndefined();
  expect(Object.keys(r).length).toBe(14); // 13 nodes + the relay, no duplicate relay row
  const answered = Object.values(r).filter((x: any) => x[0] === "up").length;
  const cut = Object.values(r).filter((x: any) => x[0] === "down" && x[1] === "timeout").length;
  expect(answered).toBeGreaterThan(0);
  expect(cut).toBeGreaterThan(0);
  expect(answered + cut).toBe(14);
  expect(Object.values(w.calls).reduce((a, b) => a + b, 0)).toBe(answered); // cut targets never fetched
});
