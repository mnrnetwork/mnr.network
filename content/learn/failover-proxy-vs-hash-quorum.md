# Failover Is Not Verification: monerod-proxy / HAProxy vs Hash + Quorum

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the npm package `mnr`.

When systems engineers, backend developers, or node operators deploy Monero infrastructure for a merchant, an exchange hot wallet, or an autonomous payment bot, the first failure they encounter is downtime.

Monero daemons reboot for database compaction. VPS providers schedule kernel updates. RPC connections hang during heavy block ingestion.

To survive these outages, standard devops practice dictates adding a load balancer or failover proxy. Tools like HAProxy, NGINX, or open-source community utilities like [`monerod-proxy`](https://github.com/unyieldinggrace/monerod-proxy) solve this availability problem: they probe upstream backend nodes on an interval, monitor TCP health, route traffic to the server with the lowest connection count, and seamlessly divert queries if an active node stops responding.

For uptime, failover proxies work well.

The fatal mistake is assuming that an availability tool is a **correctness** tool.

A load balancer ensures that *someone* answers your wallet's HTTP request. It does not—and cannot—know whether the answer returned by that backend is cryptographically true, synchronized with network consensus, or silently serving a poisoned decoy distribution.

This guide explains the architectural divide between **transport-layer failover** and **cryptographic verification**, details what HAProxy and `monerod-proxy` solve, and demonstrates why Monero RPC requires hash and quorum verification.

---

## The availability problem: why wallets stall

Every Monero wallet—whether an interactive GUI like Feather or an automated service running `monero-wallet-rpc`—depends on an active connection to `monerod`.

If the remote daemon you configured suddenly locks its LMDB file, drops off the network, or falls behind during a network reorg, your wallet exhibits immediate operational failure:
- Sync progress stops advancing.
- Balance totals fail to register incoming transfers.
- Transaction broadcasts fail with socket timeouts or HTTP 504 gateway errors.
- Automated payment bots hang or crash, halting merchant checkouts.

If you operate your own cluster of private nodes, placing a proxy in front of them is elementary high-availability engineering.

---

## What monerod-proxy and HAProxy do well

Traditional proxy solutions operate at Layer 4 (TCP) or Layer 7 (HTTP reverse proxy). Tools like HAProxy or specialized daemons like `monerod-proxy` are designed specifically to eliminate single points of failure across a fleet of backends.

```
┌─────────────────────────────────┐
│     monero-wallet-rpc Client    │
└────────────────┬────────────────┘
                 │ HTTP :18081
                 ▼
┌─────────────────────────────────┐
│     HAProxy / monerod-proxy     │
│                                 │
│  • Health Checks: curl /get_info│
│  • Algorithm: roundrobin / least│
│  • Failover: Mark down if 500/TO│
└──────┬──────────────────┬───────┘
       │ TCP              │ TCP
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│  monerod A   │   │  monerod B   │
│   (Healthy)  │   │   (Dead/503) │
└──────────────┘   └──────────────┘
```

### Core capabilities of failover proxies:

1. **Active Health Checks**: The proxy periodically requests `/get_info` or opens a raw TCP socket to each backend. If a node fails to respond within a configured threshold (e.g. 3 missed checks over 5 seconds), it is marked `DOWN` and pulled from the active rotation.
2. **Traffic Distribution**: Queries are balanced using algorithms like `leastconn` (routing to the node currently handling the fewest open connections) or `roundrobin`.
3. **Graceful Maintenance**: Operators can drain traffic from a node, update the `monerod` binary or Linux kernel, and bring it back into rotation without dropping client connections.
4. **Digest Authentication Offloading**: Some setups terminate basic or digest authentication at the proxy layer before forwarding clean requests to internal daemons.

For self-hosted infrastructure where you physically control all upstream nodes, this architecture is effective. You trust your own hardware; you merely need fault tolerance.

---

## The correctness problem failover does not solve

The critical breakdown occurs when failover tools are used in front of **untrusted or public third-party nodes**.

A standard proxy evaluates backends strictly on **liveness**, not **veracity**. If an upstream server returns a syntactically valid JSON-RPC payload with an HTTP 200 status code within 50 milliseconds, HAProxy marks that node as 100% healthy.

It has no capability to inspect whether the content inside that payload violates Monero consensus.

### Five attacks a failover proxy passes through blindly:

| Attack / Failure Mode | Upstream Behavior | What HAProxy / monerod-proxy Sees | What Happens to Your Wallet |
|---|---|---|---|
| **Stale Height Poisoning** | Node is partitioned 100 blocks behind mainnet; answers `get_info` with height `3,300,000` instead of `3,300,100`. | HTTP 200 OK in 12ms. Status: `HEALTHY`. | Wallet freezes sync; incoming payments appear nonexistent; out-of-date fee estimates are returned. |
| **Transaction Tampering** | Node alters transaction payload or omits transactions during `/get_blocks.bin`. | Valid binary stream, HTTP 200 OK. Status: `HEALTHY`. | Wallet reads corrupted block data or fails to register legitimate transfers. |
| **Decoy Skewing (`get_outs`)** | Node returns pre-clustered or compromised public keys when wallet requests ring decoys. | Valid JSON array of public keys, HTTP 200 OK. Status: `HEALTHY`. | Wallet signs ring signature with compromised decoys, degrading transaction privacy. |
| **Mempool Blackholing** | Node receives `send_raw_transaction`, returns `{ "status": "OK" }`, but never broadcasts to P2P network. | HTTP 200 OK in 8ms. Status: `HEALTHY`. | Wallet assumes funds were sent; transaction never confirms on-chain. |
| **Corrupted Tip Split** | Node is mining or validating an invalid minority fork. | HTTP 200 OK. Status: `HEALTHY`. | Client submits transactions to a dead fork. |

A failover proxy guarantees **reachability**, not **truth**. In an adversarial network, an available liar is far more dangerous than an offline server.

---

## Hash + quorum verification: the mnr model

mnr (Monero Network Relay) was built because Monero RPC needed a correctness engine, not just a load balancer.

Instead of treating upstream nodes as trusted backends, mnr treats every upstream as potentially compromised, out of sync, or adversarial. It evaluates requests through two distinct cryptographic layers: **Direct Hash Recomputation** and **Multi-Node Quorum Agreement**.

```
┌─────────────────────────────────┐
│     monero-wallet-rpc Client    │
└────────────────┬────────────────┘
                 │ HTTP / HTTPS
                 ▼
┌─────────────────────────────────┐
│    mnr (Verified RPC Relay)     │
│                                 │
│  1. Check Method Policy Allowlist│
│  2. Recompute Hashes on Blobs   │
│  3. Multi-Node Quorum Check     │
│  4. Append Mnr-Verify Headers   │
│  5. Eject Dishonest Nodes       │
└──────┬──────────────────┬───────┘
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ Upstream 1   │   │ Upstream 2   │
│ (Recomputed) │   │ (Quorum Ref) │
└──────────────┘   └──────────────┘
```

### 1. Direct hash recomputation
When a client requests block headers, raw blocks (`/get_blocks.bin`), or transaction details (`get_transactions`), mnr does not simply stream the bytes through. It recomputes the cryptographic hashes of raw transaction blobs and block headers directly against Monero's hashing rules.

If an upstream node modifies a single byte of a transaction or serves an invalid block header, the recomputed hash fails. The payload is instantly discarded, the offending upstream is flagged for a fault, and the query is retried against an alternate node.

### 2. Multi-node quorum tip
A single node cannot be trusted to report current blockchain height. mnr implements a dynamic **Quorum Tip**:
- The relay continuously polls an independent pool of upstream daemons.
- The network tip is only recognized if a **majority of the responding upstreams, and no fewer than three,** agree on the exact same block height and top block hash.
- If network partitions prevent three nodes from reaching agreement, mnr enters degraded mode: it stops writing to the cache, and answers it cannot verify are labelled `Mnr-Verify: partial` or `none` rather than presented as checked.

### 3. Automated fault ejection and public audit
When an upstream node serves an invalid hash, lags behind the quorum tip, or returns inconsistent outputs, mnr does not silently fail over. It logs the infraction. Repeated faults trigger automated ejection from the active routing pool.

Every active upstream, verified query count, latency metric, and fault record is published in real time on [/upstreams/](/upstreams/) and logged weekly on [/verified/](/verified/).

---

## Failover vs. verification: feature comparison

| Feature | monerod-proxy / HAProxy | mnr (Verified Relay) |
|---|---|---|
| **Primary Goal** | High Availability / Uptime | Cryptographic Correctness / Trust Minimization |
| **Health Metric** | TCP Socket / HTTP 200 OK | Hash Validation & Multi-Node Quorum |
| **Detects Stale Tip?** | **No** (unless custom regex parses height) | **Yes** (enforces >=3 node consensus agreement) |
| **Recomputes Block Hashes?** | **No** | **Yes** (binary & hex blob verification) |
| **Recomputes Tx Hashes?** | **No** | **Yes** (txid proof validation) |
| **Decoy Dual-Checking?** | **No** | **Yes** (Pro tier dual-checks `get_outs`) |
| **Upstream Fault Transparency** | Local syslog only | Public real-time dashboard ([/upstreams/](/upstreams/)) |
| **Zero-KYC Bearer Authentication** | Basic Auth / None | Cryptographic bearer tokens ([/docs/tokens/](/docs/tokens/)) |
| **Uptime SLA** | N/A (User configured) | **None** (neither Free nor Pro has an SLA) |

---

## Can you combine them? Architecting for production

High availability and cryptographic verification are not mutually exclusive. In fact, robust enterprise or merchant architectures combine both layers depending on node ownership.

### Scenario A: You own a dedicated node cluster
If your organization runs three or more dedicated, full `monerod` bare-metal servers in distinct datacenters:
- Place HAProxy or `monerod-proxy` in front of your private nodes.
- Because you physically own and audit these nodes, you do not need third-party quorum to protect against malicious adversaries.
- Use HAProxy for local failover, TLS termination, and connection pooling.

### Scenario B: You rely on public or hybrid infrastructure
If you cannot maintain a multi-datacenter cluster of self-hosted nodes, or if your application requires an external validation check against public network consensus:
- Point your application (`monero-wallet-rpc` or backend services) at `rpc.mnr.network:443`.
- Let mnr handle hash recomputation, quorum consensus across independent public upstreams, and automated fault ejection.
- Inspect the returned `Mnr-Verify` HTTP header in your application code (`chain`, `hash`, `majority`, `agreement`, `partial`, `none`, or `failed`) to enforce internal policy before accepting transaction state.

### The roadmap: owned mesh SLA
Today, mnr operates as a verified relay aggregating independent community nodes alongside its owned bare-metal node (`node.kyc.rip`). Because mnr does not own all upstreams, Free and Pro tiers come with **no uptime SLA**.

As outlined in our [Roadmap](/docs/roadmap/), future network stages plan for an owned, geographically distributed mesh of bare-metal Monero nodes. Once that physical mesh is operational, enterprise-grade availability SLAs can be paired directly with cryptographic verification.

---

## Practical chooser: how to decide

Use this decision matrix for your project:

1. **Self-Hosted Fleet Operators**: If you run multiple private `monerod` instances on hardware you control, use HAProxy or `monerod-proxy`. You need local load distribution, not edge consensus verification.
2. **Payment Processors & Merchants**: If you connect to external public nodes to verify incoming customer payments, standard HAProxy is dangerous. Use mnr to ensure block hashes and tip heights cannot be spoofed by a single rogue upstream.
3. **Autonomous Bots & AI Agents**: If your software interacts with Monero programmatically, wire `monero-wallet-rpc` to mnr using bearer token auth. Design your agent to inspect `Mnr-Verify` response headers and handle HTTP 429 rate limits gracefully.

---

## Frequently Asked Questions

### Does HAProxy or monerod-proxy verify Monero blocks?
**No.** They are transport-layer proxies. They monitor whether a server answers HTTP requests with a successful status code. They do not recompute block hashes, validate transaction IDs, or verify that the node is synchronized with broader network consensus.

### What does mnr do differently?
mnr sits at the application layer as a specialized Monero RPC proxy. It recomputes raw cryptographic hashes on blocks and transactions, establishes Quorum Tip agreement across independent upstream nodes, routes sensitive methods to its owned node (`node.kyc.rip`), and appends explicit `Mnr-Verify` proof headers to every response.

### If mnr does verification, does that mean it has 100% uptime?
**No.** mnr explicitly provides **no uptime SLA** on either Free or Pro tiers. Because mnr aggregates independent community upstreams that it does not own, third-party network partitions can cause transient latency or failovers.

### Should I stop using HAProxy if I use mnr?
Not necessarily. If you run your own private nodes, HAProxy remains an excellent tool for local cluster failover. If you query public or external Monero infrastructure, mnr provides the cryptographic verification layer that HAProxy lacks.

---

## Next Steps

- **Inspect Method Verification**: Review which RPC methods are verified vs. unverified in our [Method Policy](/docs/method-policy/).
- **View Live Upstreams**: Inspect active nodes, latency, and fault ejections on [/upstreams/](/upstreams/).
- **Connect monero-wallet-rpc**: Follow our technical daemon setup guide at [/docs/connect-wallets/](/docs/connect-wallets/).
- **Get an Access Token**: Acquire a Free or Pro bearer token at [/get-token/](/get-token/).
