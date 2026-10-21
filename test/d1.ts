// In-memory stand-in for D1 (bun:sqlite) with the real migrations applied.
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";

export function d1() {
  const db = new Database(":memory:");
  for (const m of ["0001_status.sql", "0002_nodes.sql"]) db.exec(readFileSync(new URL(`../migrations/${m}`, import.meta.url), "utf8"));
  const stmt = (sql: string, args: unknown[] = []): any => ({
    sql,
    bind: (...v: unknown[]) => stmt(sql, v),
    first: async () => db.query(sql).get(...(args as any[])) ?? null,
    all: async () => ({ results: db.query(sql).all(...(args as any[])), meta: { changes: 0 } }),
    run: async () => { const r = db.query(sql).run(...(args as any[])); return { results: [], meta: { changes: r.changes } }; },
  });
  return {
    raw: db,
    prepare: (s: string) => stmt(s),
    batch: async (ss: any[]) => {
      db.exec("BEGIN");
      try {
        const out = [];
        for (const s of ss) out.push(/^\s*SELECT/i.test(s.sql) ? await s.all() : await s.run());
        db.exec("COMMIT");
        return out;
      } catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
}
