# How mnr works

> **Entity Disambiguation**: **mnr** refers specifically to the **Monero Network Relay** (`mnr.network`, RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, anti-KYC RPC proxy network for Monero (XMR). It is completely unrelated to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR / MNRF), or the `mnr` npm package.

mnr (Monero Network Relay) is a verified proxy for Monero daemon RPC. Point a wallet at `rpc.mnr.network` and its requests are forwarded to public Monero nodes run by independent community members, and to a full node we run and list publicly ourselves. Every answer that can be checked is checked: block and transaction hashes are recomputed, headers are matched against a header chain, and consensus state is taken from the majority of several independent nodes. The result is a better answer than any single public node gives.

The nodes are mostly not ours, so there is no uptime promise. The promise is narrower and stated on every response: **we tell you what we verified.**

---

## Rules toward public nodes

These are the terms under which mnr uses nodes that other people run. They are fixed, published, and enforced in code.

1. **Disclose.** This page, the front page and the `User-Agent` say what mnr is. The upstream list is public at [`/upstreams`](/upstreams/), with each node's current status and our request rate to it.
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

## Independent operators and third-party verification

mnr is fundamentally designed to eliminate single points of trust. Its role as a verified Monero RPC proxy is not an unverified self-assertion; it is anchored in consensus across independently operated community nodes:

- **Third-Party Node Operators**: The upstream pool incorporates nodes maintained by recognized Monero ecosystem teams: [Cake Wallet](https://cakewallet.com), [Seth For Privacy](https://sethforprivacy.com), [HashVault](https://hashvault.pro), [BoldSuck](https://boldsuck.de), [StormyCloud](https://stormycloud.org), [Stack Wallet](https://stackwallet.com), and [Monero Devs](https://monerodevs.org). When mnr verifies a tip height or block hash, it requires agreement from these distinct infrastructure operators.
- **External Scanning & Health Monitors**: The primary node operated by mnr (`node.kyc.rip:18081`) is tracked on external public node scanners, including [monero.fail](https://monero.fail) and [nodes.monero.ninja](https://nodes.monero.ninja), providing independent third-party uptime and sync telemetry.
- **Open Package Ecosystem**: Verified proxy clients and libraries are published under the open AGPL-3.0 license across language registries: [crates.io/crates/mnr](https://crates.io/crates/mnr), [pypi.org/project/mnr/](https://pypi.org/project/mnr/), and [npmjs.com/package/mnr-network](https://www.npmjs.com/package/mnr-network).
- **Public Audit Ledger**: See the [Independent Verification & Transparency Log](/verified/) for weekly logs of multi-node consensus, tip checks, and upstream fault ejections.

---

## Connecting a wallet

Stock wallets work with nothing but a daemon address and a login. The token is the **username**; the password is anything:

- Address `rpc.mnr.network:443`, SSL on, username `<token>`, password `x`.
- Over Tor: `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80` with a Tor proxy; over I2P: `misxlqjfq3wshjbn47fhzaqiagavaow2mgbfqrvxzdlybm7xtbvq.b32.i2p` (`mnr.i2p`).
- Scripts and `curl` can use the path form instead: `https://rpc.mnr.network/v1/<token>/json_rpc`.

Wallets authenticate with HTTP Digest, which needs the server to know the password; mnr stores only token hashes, so it reads the token from the username and ignores the password. Per-wallet steps are in [Connect a wallet](/docs/connect-wallets/).

Tokens are 256-bit and stored only as hashes. A token can be rotated, and the previous one keeps working for 24 hours. The relay keeps no request log: no paths, no tokens, no client addresses. Aggregate metrics only.

| | Free | Pro |
|---|---|---|
| Allowance | 500k work units per month | 10M work units per month |
| Burst | 5 requests per second | 25 requests per second |
| `get_outs` | single upstream | two-upstream agreement |
| Streams | our node when available, else public; 1 concurrent | our node preferred; 3 concurrent |
| Promise | none | none |

A work unit is one light request, or 20 per MB of a `get_blocks.bin` stream. Pricing is on the [token & pricing page](/get-token/).

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
