# How to Read mnr /upstreams and the /verified Transparency Log

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

In the cryptocurrency space, marketing slogans about "privacy" and "decentralization" are cheap. Anyone can stand up an NGINX proxy, put an orange logo on a static landing page, and claim their service is "trustless."

The only way to verify whether a proxy behaves honestly is through **verifiable public telemetry**.

mnr does not ask you to trust marketing copy. Instead, the network exposes its internal consensus engine through two public, real-time audit interfaces:
1. **Live Upstream Telemetry** ([`mnr.network/upstreams/`](https://mnr.network/upstreams/)): A live dashboard displaying every single upstream node currently queried by the relay, its synchronization height, its round-trip latency, its assigned request cap, its verified answer count, and its recorded faults.
2. **Weekly Transparency Log** ([`mnr.network/verified/`](https://mnr.network/verified/)): An unalterable, chronological log documenting network-wide verification totals, divergence events, node ejections, and third-party upstream provenance.

If you are a security researcher, an independent node operator, or a skeptical wallet user, this guide teaches you how to read these metrics, interpret failure signals, and verify the network's behavior yourself.

---

## Why public telemetry exists: trust-minimizing the relay

When you use a standard public remote node found on a web directory, the node's internal state is completely opaque. You cannot see whether the node is currently connected to 8 peers or 80 peers, whether its database is corrupted, or how many other clients are currently sharing the connection.

When you connect to mnr, you are using an aggregation relay. If mnr operated as a closed black box, you would merely replace blind trust in a single node with blind trust in mnr.

Public telemetry eliminates this opacity by enforcing three invariants:
1. **Upstream Visibility**: Every upstream Monero node used by mnr is identified by hostname and port. You know exactly which physical servers are answering consensus queries.
2. **Auditable Consensus**: The agreed **Quorum Tip** (height and top block hash) is rendered live. You can compare mnr's tip against block explorers or your own local node in real time.
3. **Accountability for Failures**: When an upstream node falls out of sync, serves a corrupt block, or times out, mnr does not hide the error. It increments the node's public fault counter and publishes the ejection event.

---

## Walking /upstreams: the live dashboard

When you visit [`mnr.network/upstreams/`](https://mnr.network/upstreams/), you are presented with the live operational state of the relay's routing pool.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Pool: 15 nodes •  Quorum Tip: 3,300,142  •  Hash: 8a4b...2c1f  •  OK  │
└────────────────────────────────────────────────────────────────────────┘
```

### The summary header:
- **Pool Status**: Shows total active upstreams meeting health checks. A status of `OK` indicates normal multi-node consensus. If network partitions prevent at least three nodes from agreeing on the tip, this badge shifts to `DEGRADED`, indicating the relay is operating in fallback mode.
- **Quorum Tip Height & Hash**: The current block height and 64-character hex block hash agreed upon by a majority of the responding upstreams, and no fewer than three.

---

### The node table columns explained

Below the header, every node in the active rotation is rendered in a live table:

| Column | What It Represents | Why It Matters |
|---|---|---|
| **Node / Host** | The network address (IP or hostname and port) of the upstream `monerod` daemon. | Discloses provenance. Identifies whether a node is an independent community daemon or mnr's owned fallback node. |
| **Status** | Operational health: `active`, `degraded`, or `unreachable`. | Indicates whether the node is actively receiving client traffic or temporarily suspended due to faults. |
| **Height** | The latest blockchain height reported by this specific node. | Allows you to immediately detect if a node is lagging behind the Quorum Tip. |
| **Latency** | Round-trip HTTP/TCP ping time from mnr's edge proxy to the upstream daemon. | Demonstrates geographic distribution and routing responsiveness. |
| **Rate / Cap** | Current queries per second (req/s) versus the permitted cap (e.g. `2.4 / 5 req/s`). | Proves mnr respects upstream operator capacity and does not overwhelm community nodes. |
| **Verified** | Cumulative count of cryptographic responses successfully validated from this node. | Measures proven historical correctness. |
| **Faults** | Total consensus mismatches, invalid hashes, or timeout errors recorded against this node. | Highlights instability or divergence from network consensus. |

---

### Understanding the `own-1` row vs. public upstreams

In the upstreams table, you will notice one entry with a distinct `OWNED` badge:
- **Hostname**: `node.kyc.rip` (restricted RPC on port 443; Internal ID: `own-1`)
- **Role**: Bare-metal fallback and state-sensitive routing anchor.

Because public community nodes can disappear or rate-limit without notice, mnr maintains `own-1` as a self-hosted, unpruned, dedicated Monero daemon. 

Crucially, **`own-1` has higher capacity caps**, and state-sensitive or non-verifiable RPC methods (such as `send_raw_transaction` or non-quorum block retrieval) route preferentially through `own-1`. This guarantees that transactions are injected directly into the P2P network through bare-metal infrastructure mnr controls, rather than relying on an arbitrary third party.

---

## Faults and ejections: how mnr handles misbehaving nodes

What happens when an upstream node behaves badly?

In mnr's architecture, a **fault** is not merely a dropped TCP connection. A fault represents an objective failure of blockchain consensus:
1. **Tip Desynchronization**: The node reports a block height lower than the current Quorum Tip by more than 3 blocks, or reports a conflicting block hash for the same height.
2. **Cryptographic Hash Failure**: The node returns a block blob or transaction whose computed hash fails to match the header or txid.
3. **Invalid Output Data**: The node returns malformed responses or empty arrays on supported RPC methods.
4. **Timeout / 5xx HTTP Errors**: The node fails to respond within the strict deadlines defined in the [Method Policy](/docs/method-policy/).

### The ejection lifecycle
- **Transient Penalty**: When a fault occurs, the node's public fault counter increments immediately on `/upstreams/`, and the node is temporarily placed in a penalty box, shedding traffic.
- **Quorum Disqualification**: A penalized node cannot participate in voting for the Quorum Tip.
- **Automated Ejection**: If a node accumulates persistent faults or remains desynchronized across multiple health cycles, it is completely ejected from the active pool.
- **Permanent Record**: Ejection events are committed to the weekly `/verified/` audit log, documenting the exact reason for removal.

---

## Reading /verified: the weekly audit trail

While `/upstreams/` provides live real-time telemetry, [`mnr.network/verified/`](https://mnr.network/verified/) is the permanent, historical transparency archive.

Published at the start of each week, each `/verified/` report documents:
- **Total Cryptographic Verifications**: The exact number of block hashes and transaction IDs recomputed across the relay during the 7-day period.
- **Consensus Divergences**: Any instance where upstream nodes presented split tips or minor chain forks.
- **Node Rotations & Ejections**: A detailed change-log of new community nodes added to the pool, nodes decommissioned, and nodes ejected for consensus violations.
- **Third-Party Provenance**: Full disclosure of third-party monitoring endpoints, open-source package hashes, and community audit submissions.

By reviewing historical `/verified/` entries, researchers can evaluate long-term upstream stability without relying on transient marketing snapshots.

---

## The operator lens: User-Agent and opt-out policy

Running a public Monero node is a community service. Many operators pay out-of-pocket for VPS hosting and unmetered bandwidth to strengthen the Monero network.

mnr enforces an explicit ethical framework to ensure it remains a cooperative participant in the Monero ecosystem, rather than a parasitic consumer of community resources:

### 1. Transparent User-Agent identification
Every HTTP request initiated by mnr's routing engine carries an unambiguous, identifiable User-Agent string:
```http
User-Agent: mnr-relay/<version> (+https://mnr.network/upstreams)
```
Node operators inspecting their NGINX, HAProxy, or `monerod` access logs can immediately identify traffic originating from mnr, complete with a URL pointing directly to our upstream documentation.

### 2. Strict per-node rate limiting
mnr never floods upstream community nodes. Every upstream is capped at 5 light requests per second, 2 concurrent `get_blocks.bin` streams, and 10 MB/s. Traffic exceeding this cap is queued or shed at mnr's edge proxy, protecting the operator's server from CPU spikes or memory exhaustion.

### 3. The automated opt-out standard
If a node operator does not wish to have their daemon queried by mnr, they can opt out without opening a ticket: serve any HTTP 200 at `/.well-known/mnr-optout`, or email dev@mnr.network. Removal is within 24 hours and the opt-out list is public.

Operators can simply serve a standard text file at their web root:
```
GET /.well-known/mnr-optout
```
mnr's health monitors poll for this file. When detected, mnr automatically removes the node from the active rotation within 24 hours and records the voluntary removal on `/upstreams/`. Alternatively, operators can email or message mnr to request immediate manual removal.

---

## How to cite telemetry without deceiving yourself

When citing mnr metrics in technical reviews, forum posts, or research papers, follow these rules:

1. **Telemetry is Volatile**: Live metrics on `/upstreams/` change with every block. Never cite a specific latency number or verified query count as an immutable fact—always provide a timestamped link or screenshot.
2. **Transparency Does Not Equal an Uptime SLA**: The presence of public telemetry does not mean mnr promises 100% uptime. As stated across our documentation, neither the Free nor Pro tier includes an uptime SLA.
3. **Telemetry Proves Routing, Not Anonymity**: Seeing green indicators on `/upstreams/` proves that mnr is cross-checking answers against independent nodes. It does not erase the fact that over clearnet, mnr sees your IP address. For network anonymity, use mnr's published Tor or I2P endpoints.

---

## Frequently Asked Questions

### Where does the data on /upstreams come from?
The `/upstreams/` dashboard is rendered directly from live telemetry polled by mnr's edge relays. The data reflects real-time connection state, height synchronization, and latency across active upstreams.

### What is the difference between /upstreams and /verified?
`/upstreams/` is live, real-time telemetry showing the current state of the active node pool. `/verified/` is a permanent, historical archive published weekly that documents aggregate verification counts, node ejections, and consensus divergence events.

### How do I know mnr isn't faking the upstream telemetry?
You can verify consensus yourself. Compare the **Quorum Tip Height and Hash** displayed on mnr with independent block explorers (like [xmrchain.net](https://xmrchain.net)) or your own local `monerod` instance. Furthermore, upstream hostnames are public; you can ping or query them directly to verify their reported heights match.

### Can an upstream node operator block mnr?
**Yes.** Operators can publish `/.well-known/mnr-optout` or block the `mnr-relay` User-Agent string. mnr respects operator autonomy and removes any node upon request within 24 hours.

---

## Next Steps

- **Inspect the Live Pool**: Visit [/upstreams/](/upstreams/) to review active nodes, heights, and fault counts.
- **Read the Historical Log**: Browse the weekly audit reports on [/verified/](/verified/).
- **Review Validation Rules**: Understand how mnr validates RPC calls at [/docs/method-policy/](/docs/method-policy/).
- **Connect a Wallet**: Set up your wallet with a verified relay token at [/docs/connect-wallets/](/docs/connect-wallets/).
