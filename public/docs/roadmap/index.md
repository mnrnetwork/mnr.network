# Roadmap

mnr is built in three stages. Each stage is a working product on its own, and nothing built in one is thrown away in the next. The stage that is live is always the one described on [How mnr works](/docs/how-it-works/).

---

## Stage 0 — Verified proxy (now)

One relay, on one box, in front of public community nodes and one full node we run ourselves. It verifies what can be verified, caps and identifies itself to every public node it uses, publishes its upstream list, and makes no uptime promise. Free, with a Pro tier for higher limits.

What it proves: that wallets and backends want verification and convenience over nodes they could use for free, and that public node operators are comfortable with a proxy that plays by [published rules](/docs/how-it-works/#rules-toward-public-nodes).

## Stage 1 — Owned mesh with an SLA

A paid, authenticated endpoint backed by nodes we run on separate providers. The edge validates height agreement across them, caches what is safe, broadcasts transactions to every healthy node and fails over automatically. Customers point a stock wallet, a swap backend or an agent at one URL and stop running `monerod`.

This is the first stage with a number attached: an availability commitment, priced accordingly. Public community nodes stay in the picture as the free tier's pool, under the same rules as today.

Out of scope, permanently: `monero-wallet-rpc`. It holds keys and cannot be multiplexed at an edge.

## Stage 2 — Operator network

A permissionless network in which independent operators run `monerod` behind a small agent, relayers aggregate many operators into one verified, cached, metered endpoint, and clients pay in XMR. The protocol, the operator agent, the relayer and the client library are open source. We participate as the first operators and the reference relayer; we do not own the network.

Design principles, in order:

1. **Verify, don't trust.** Self-authenticating data is checked. Where verification is impossible, agreement across independent operators replaces trust.
2. **No token, no stake, no slashing.** Operators are paid in XMR for verified work. Bad work goes into a public, cryptographically verifiable fault log that anyone can weigh. Nothing is locked, nothing is confiscated.
3. **Stock wallets must work** with nothing more than a daemon address.
4. **Hobbyist operators join in ten minutes**, with a one-line install, no view key, and no public IP if they use Tor.
5. **The reference relayer is replaceable.** The operator directory, the fault log and the settlement statements are published in a form another relayer can consume.
6. **Both sides of the market are paid from day one**: operators through the pool, with a probation lane for newcomers, and distributors such as wallets and interfaces through an affiliate share.

---

## The full plans

The engineering plans behind each stage are public in the code repository. They are working documents written for the people building mnr, with schedules, cost models and open decisions, and they change as the work does.

- [Stage 0 plan](https://github.com/mnrnetwork/mnr/blob/main/docs/stage0-mvp-plan.md)
- [Stage 1 plan](https://github.com/mnrnetwork/mnr/blob/main/docs/stage1-gateway-development-plan.md)
- [Stage 2 architecture](https://github.com/mnrnetwork/mnr/blob/main/docs/stage2-network-protocol-architecture.md)
