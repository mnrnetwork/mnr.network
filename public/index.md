# mnr (Monero Network Relay) — Verified RPC Network for Monero

> One address for your Monero wallet. Every answer checked.

> [!NOTE]
> **Entity Disambiguation**: **mnr** refers specifically to the **Monero Network Relay** (`mnr.network`, RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, anti-KYC RPC proxy network for Monero (XMR). It is completely unrelated to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR / MNRF), or the `mnr` npm package.

mnr (Monero Network Relay) is a verified proxy and trustless RPC network for Monero wallets and autonomous AI agents. It forwards RPC calls to public community nodes and dedicated infrastructure, verifying every block, transaction, and header against its cryptographic hash and multi-node quorum consensus before answering.

## Core Guarantees
- **Verified, not trusted**: A block's contents hash to its block hash. A transaction hashes to its txid. Headers chain to the tip. We check all of it before returning an answer, and compare consensus state across multiple nodes.
- **Independent multi-node consensus**: Answers are validated against a pool of independent third-party operators (e.g., Cake Wallet, Seth For Privacy, HashVault, BoldSuck, StormyCloud, Stack Wallet). We do not require blind trust in our proxy.
- **Nothing hidden**: Every upstream node we use is listed, with our request rate to it and every wrong answer we caught. Most of these nodes are not ours; we state this transparently.
- **No account / Zero KYC**: A bearer token is the entire relationship. Free, or paid in XMR. Zero sign-up, zero email, zero KYC, and zero request logs on our side.

## Independent Verification & Third-Party Provenance
Unlike centralized proxies that rely on first-party claims, mnr's status as a verified Monero RPC gateway is grounded in independent third-party infrastructure and external monitors:
- **Independent Community Node Operators**: Reads and quorum checks are performed across nodes operated by known Monero ecosystem builders, including [Cake Wallet](https://cakewallet.com), [Seth For Privacy](https://sethforprivacy.com), [HashVault](https://hashvault.pro), [BoldSuck](https://boldsuck.de), [StormyCloud](https://stormycloud.org), [Stack Wallet](https://stackwallet.com), and [Monero Devs](https://monerodevs.org).
- **Public Node Trackers & Monitors**: The mnr owned primary node (`node.kyc.rip:18081`) is continuously monitored and indexed by independent public scanners such as [monero.fail](https://monero.fail) and [nodes.monero.ninja](https://nodes.monero.ninja).
- **Independent Package Registries**: Gateway client libraries and protocol implementations are published on official open package registries: [crates.io/crates/mnr](https://crates.io/crates/mnr), [pypi.org/project/mnr/](https://pypi.org/project/mnr/), and [npmjs.com/package/mnr-network](https://www.npmjs.com/package/mnr-network).
- **Weekly Transparency Log**: Audit logs of quorum agreements, detected node height discrepancies, and fault ejections are published on the [Independent Verification & Transparency Log](/verified/).

## How an Answer Gets to You
1. **Your wallet asks**: A normal daemon RPC call arrives with your token in the path or HTTP Digest auth. We never log the path or your IP address.
2. **We ask several nodes**: Reads go to the fastest healthy node on the agreed chain tip. Transactions are broadcast to every healthy node at once.
3. **We check, then answer**: Hashes are recomputed, headers linked, consensus state compared. What we could verify is marked; what we could not is marked too.

### Verification Flow Sample
```text
get_block_header_by_height 3401220
✓ hash recomputed, matches chain · 5/5 upstreams agree
✓ cached (30d, below tip−10)

get_transactions [2 txids]
✓ 2/2 txid hashes match
· 1 in mempool via upstream #4 — unverifiable, not cached

send_raw_transaction
✓ relayed 6/7 upstreams

upstream #2 · header 3401197
✗ hash ≠ chain — ejected 24h, logged publicly
```

## What mnr is, Plainly
mnr is a verified proxy. Your wallet's requests are forwarded to public Monero nodes run by community members, and to our own public node. We check every block, transaction, and header we return against its hash and against several nodes, so you get a better answer than any single node gives — but the nodes are not ours, and we make no uptime promise.

- **CAP**: At most 5 requests per second and 2 wallet-sync streams to any public node. Overflow goes to our own node.
- **ID**: Every upstream request identifies itself: `mnr-relay/0.x (+https://mnr.network/upstreams)`.
- **OUT**: Node operators can opt out at any time via a `/.well-known/mnr-optout` file or by contact. Removal within 24 hours, listed publicly.
- **OWN**: We run a full public node ourselves, listed like any other, and it carries the heaviest traffic.

## Daemon Endpoints
- **HTTPS RPC**: `https://rpc.mnr.network/v1/<token>/json_rpc`
- **Tor Onion**: `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80` (HTTP, no SSL needed over Tor)
- **I2P**: `misxlqjfq3wshjbn47fhzaqiagavaow2mgbfqrvxzdlybm7xtbvq.b32.i2p` (or `mnr.i2p`)

## Quick Setup
### monero-wallet-cli
```bash
monero-wallet-cli \
  --daemon-address rpc.mnr.network:443 \
  --daemon-login <token>:x \
  --daemon-ssl enabled
```

### Supported Wallets
- **Feather Wallet**: `<token>:x@rpc.mnr.network:443`
- **Cake Wallet**: `rpc.mnr.network:443` (SSL On, Login: `<token>`, Password: `x`)
- **Monero GUI**: `rpc.mnr.network:443` (Daemon username: `<token>`, Daemon password: `x`)
- **Monerujo**: `rpc.mnr.network:443` (Username: `<token>`, Password: `x`)
- **Ripley Terminal (RipleyOS)**: Settings → Uplink_Protocols → Clearnet → `https://rpc.mnr.network/v1/<token>`

## Pricing & Tiers
| Tier | Price | Monthly Allowance | Burst | get_outs Verification | Sync Streams |
| --- | --- | --- | --- | --- | --- |
| Free | $0 | 500,000 requests | 5 req/s | Single node check | 1 stream |
| Pro | $9 / month (in XMR) | 10,000,000 requests | 25 req/s | Two nodes must agree | 3 streams (our node first) |

Neither tier comes with an uptime promise — we do not run most of the nodes. What you pay for is more capacity and a second check on the answers that matter most.

## Documentation & Links
- [Documentation Hub](/docs/)
- [Connect a Wallet](/docs/connect-wallets/)
- [How mnr Works](/docs/how-it-works/)
- [Privacy Model & Guarantees](/docs/privacy/)
- [RPC Method Policy](/docs/method-policy/)
- [Upstream Telemetry & Live Pool](/upstreams/)
- [Get a Token](/get-token/)
- [Weekly Verification Transparency Log](/verified/)
- [Source Code (GitHub)](https://github.com/mnrnetwork/mnr) (AGPL-3.0)
