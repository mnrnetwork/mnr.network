# How mnr works

mnr is a verified proxy for Monero daemon RPC. Point a wallet at `rpc.mnr.network` and its requests are forwarded to public Monero nodes run by community members, and to a full node we run and list publicly ourselves. Every answer that can be checked is checked: block and transaction hashes are recomputed, headers are matched against a header chain, and consensus state is taken from the majority of several nodes. The result is a better answer than any single public node gives.

The nodes are mostly not ours, so there is no uptime promise. The promise is narrower and stated on every response: **we tell you what we verified.**

---

## Rules toward public nodes

These are the terms under which mnr uses nodes that other people run. They are fixed, published, and enforced in code.

1. **Disclose.** This page, the front page and the `User-Agent` say what mnr is. The upstream list is public at [`/upstreams`](/#upstreams), with each node's current status and our request rate to it.
2. **Contribute.** Our own node is a full node, listed on the public node lists and open to everyone with the same restricted RPC every public node offers. It carries the heaviest traffic class, wallet-sync streams, by preference, so public nodes see light calls from us rather than floods.
3. **Cap ourselves.** Per upstream: 5 light requests per second, 2 concurrent `get_blocks.bin` streams, 10 MB/s. Above that, requests queue or go to our own node. These caps are configuration, published, and stricter than most public nodes would tolerate.
4. **Identify.** Every request to an upstream carries `User-Agent: mnr-relay/0.x (+https://mnr.network/upstreams)`, so an operator can see who we are and how to reach us.
5. **Honour opt-out.** Any operator who asks is removed within 24 hours, and the opt-out list is public. We also check `/.well-known/mnr-optout` on each upstream host daily, so operators can remove themselves without contacting us.
6. **Never pass client identity.** No client IP, no `X-Forwarded-For`, no token. Nothing but the RPC body reaches an upstream.
7. **Restricted RPC only.** The method allow-list below is enforced before dispatch. We never call admin methods on anyone's node.

---

## The upstream pool

| Aspect | Rule |
|---|---|
| Sources | Public nodes from the well-known community lists, clearnet and `.onion`, mainnet. Nodes run by wallet teams or known community members are preferred. Every operator we can identify is told before their node is used, with the opt-out link. |
| Our node | A full node with restricted RPC, listed publicly and open to everyone. The relay reaches it over a private link and prefers it for streams and tie-breaks. |
| Probing | Every 15 seconds, with a 2 second timeout on clearnet and 8 seconds over Tor. We record latency, height, top block hash and whether the node reports itself synchronized. |
| Quorum tip | The highest height that at least three upstreams agree on, hash included. Without such agreement the relay enters degraded mode: it serves from our own node only and suspends cache writes. |
| Ranking | Healthy nodes on the quorum tip, ordered by latency, with a small preference for our own node. Onion nodes serve light calls only. |
| Ejection | An upstream that fails verification three times in an hour is removed from rotation for 24 hours, and the event is logged on the public upstreams page. |

---

## What is verified

| Data | Check |
|---|---|
| `get_block`, `get_block_header_*` | The block hash is recomputed from the blob and matched against the requested hash or our header chain. |
| `/get_transactions` | Each transaction blob is hashed and matched against its txid. |
| Header chain | Built by majority from upstreams, extended at the tip by agreement. A reorg bumps the cache epoch, so nothing from the old branch is served. |
| `get_info`, `get_height`, fee estimate | Majority of at least three upstreams. Node-specific fields are normalised. Cached for a few seconds with stale-while-revalidate. |
| `/get_outs.bin` | Two-upstream agreement for Pro; single upstream, our own node preferred, for Free. |
| `/get_blocks.bin` | Not verified yet. Routed to our own node first, public nodes second, and marked `Mnr-Verify: none`. |
| Mempool | Not verifiable. Marked with `Mnr-Upstream`, an opaque number rather than the node's address. |
| `send_raw_transaction` | Fanned out to every healthy upstream in parallel. Success if any accepts, reported as `Mnr-Relayed: k/n`. |

Nothing unverifiable is silently trusted. Every response carries `Mnr-Verify` saying what was checked, and the per-upstream verified and fault counts are the numbers on the public upstreams page. The full per-method rules, cache bounds and timeouts are in the [method policy](/docs/method-policy/), which is generated from the relay's source code.

Blocks, headers and transactions within 10 blocks of the tip are never cached, because they may still be reorganised away.

---

## Connecting a wallet

Stock wallets work with nothing but a daemon address. Two forms carry the same token:

- **Path token**: `https://rpc.mnr.network/v1/<token>` as the daemon address.
- **Daemon login**: `rpc.mnr.network:443` as the daemon address, with the token as the password of `--daemon-login`, for wallets that do not accept a path.

Tokens are 256-bit and stored only as hashes. A token can be rotated, and the previous one keeps working for 24 hours. The relay keeps no request log: no paths, no tokens, no client addresses. Aggregate metrics only.

| | Free | Pro |
|---|---|---|
| Allowance | 500k work units per month | 10M work units per month |
| Burst | 5 requests per second | 25 requests per second |
| `get_outs` | single upstream | two-upstream agreement |
| Streams | our node when available, else public; 1 concurrent | our node preferred; 3 concurrent |
| Promise | none | none |

A work unit is one light request, or 20 per MB of a `get_blocks.bin` stream. Pricing is on the [front page](/#pricing).

---

## Architecture

One Rust binary on one box, open source under AGPL-3.0 at [github.com/mnrnetwork/mnr](https://github.com/mnrnetwork/mnr).

```
clients ──▶ rpc.mnr.network (TLS)      ──┐
clients ──▶ <onion>.onion (local Tor)  ───┤
                                          ▼
                     mnr-relay ──── auth ── limits ── policy ── cache ── verify
                                          │
                       ┌──────────────────┼───────────────────────┐
                       ▼                  ▼                       ▼
              our node (private link)  public clearnet nodes   public .onion nodes
              full, public RPC         capped, identified      light calls only
```

`mnr-core` holds the method policy, hashing, verification rules and header chain as pure functions with no I/O, fuzzed and tested against real mainnet blocks. `mnr-relay` is everything else: ingress, tokens, limits, the upstream pool, the cache and the metrics endpoint.
