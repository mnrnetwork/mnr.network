# What Is a Verified Monero RPC? Why One Public Node Is Not Enough

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

When you open a lightweight Monero wallet—Feather, Cake Wallet, Monero GUI, or Monerujo—and connect to a remote node, you delegate your view of the Monero blockchain to a third-party server. Most users pick an IP or hostname off a community list like [monero.fail](https://monero.fail), see a green latency badge, and assume everything returned across the wire is valid Monero consensus.

That assumption is wrong.

A standard public remote node is a black box. It can report a stale tip height, omit unconfirmed transactions, serve synthetic decoy distributions, or quietly log your IP address alongside the exact outputs your wallet queries. Adding TLS (`https://` or `--daemon-ssl`) encrypts the connection between your computer and the server, but it does not stop the server operator from lying to you.

A **verified Monero RPC** does not ask you to trust the operator. Instead, it places a cryptographic verification layer between your wallet and the network. It recomputes block and transaction hashes directly from raw binary blobs, validates header chains against mathematical consensus rules, establishes tip agreement across independent, unaffiliated node operators, and explicitly tags every response header with proof of what was verified—and an honest admission of what could not be checked.

This article defines what a verified Monero RPC actually is, examines the failure modes of single public nodes, and details how mnr implements trust-minimized consensus without making empty uptime promises or privacy claims.

---

## The job of daemon RPC in a Monero wallet

Before analyzing how a remote node can fail, it helps to understand what a Monero daemon RPC actually does.

Unlike Bitcoin or Ethereum, Monero uses ring signatures (currently CLSAG), stealth addresses, and confidential transactions (RingCT) to obscure senders, amounts, and recipients. Because Monero does not publish public balances or transaction graphs on an open ledger, a wallet cannot simply ask an indexer: *"What is the balance of address `888tX...`?"*

Instead, your wallet must download blockchain data and scan every single output locally using your private view key. During this lifecycle, the wallet interacts with the daemon RPC (`monerod`) for three distinct jobs:

1. **Chain Synchronization**: The wallet fetches block headers and raw block blobs (`/get_blocks.bin`, `get_block_header_by_height`) to advance its local scanning state from your wallet's restore height to the current network tip.
2. **Decoy Selection (`get_outs` / `get_output_distribution`)**: When creating a spend transaction, your wallet needs 15 decoy outputs from historical blocks to form a 16-member ring signature alongside your real output. It queries the daemon for the global output distribution and fetches specific public keys and commitment masks.
3. **Transaction Broadcast (`send_raw_transaction`)**: Once the transaction is signed locally using your private spend key, the wallet submits the raw transaction blob to the daemon to be relayed into the peer-to-peer mempool.

Crucially, **your private spend key never leaves your device**. Even the most malicious remote node cannot steal your Monero simply by answering daemon RPC queries. But a compromised or misconfigured node can compromise your transaction privacy, blind you to incoming payments, or trick you into accepting an invalid chain state.

---

## What one public node can get wrong

When you point your wallet at a single remote node, you accept a single point of failure and a single point of surveillance. Even reputable node operators run into hardware faults, network partitions, or silent database corruptions. In the worst case, hostile operators run public nodes specifically to harvest user metadata.

The table below breaks down the structural risks of trusting a single public node:

| Failure Mode | Mechanism | What Happens to Your Wallet | Can TLS Prevent It? |
|---|---|---|---|
| **Stale Tip / False Fork** | Node is stuck 50 blocks behind or running on an invalid chain split. | Wallet displays "Synchronized" but fails to see incoming payments, or constructs transactions on a dead branch. | **No**. TLS only authenticates the server's certificate, not its blockchain height. |
| **Transaction Omission** | Malicious node filters out specific transactions from block results. | You believe a payment was never sent or received; funds appear missing. | **No**. |
| **Decoy Bias & Ring Poisoning** | Node returns manipulated output keys or skewed distribution tables on `get_outs`. | The ring signature constructed by your wallet includes known or clustered decoys, degrading your transaction anonymity. | **No**. |
| **Mempool Blackholing** | Node accepts `send_raw_transaction` with HTTP 200 OK, but never broadcasts it to P2P peers. | Your wallet marks the transaction as sent, but it never enters the mempool or confirms on-chain. | **No**. |
| **Metadata & IP Clustering** | Node logs your IP address, connection timestamps, and the specific output indices requested during sync. | The node operator can correlate your IP with the approximate age of your wallet and transaction broadcast times. | **No**. TLS terminates at the operator's reverse proxy. |

Relying on a single well-known public node simply concentrates this risk into a single operator's hands.

---

## Definition: verified Monero RPC

A **verified Monero RPC** is an intermediary proxy architecture that enforces four strict invariants before returning any blockchain answer to a client:

1. **Direct Hash Recomputation**: Answers that contain raw data blobs (such as block blobs or transaction blobs) are mathematically re-hashed by the relay before being passed to the wallet. If a node modifies a transaction or serves an altered block, the computed hash mismatches the header or txid, and the response is rejected.
2. **Independent Multi-Node Quorum**: Transient consensus states (tip height, current top block hash, fee estimates) are not accepted from any individual node. The relay queries multiple independent upstream nodes operated by distinct organizations and requires a majority of them, and no fewer than three, to agree before accepting a tip.
3. **Deterministic Method Policy**: Every RPC method has a declared verification rule, timeout, and cache bound enforced in code (see the [Method Policy](/docs/method-policy/)). Unverifiable methods are never silently passed off as verified.
4. **Cryptographic Transparency**: Every response returned to the wallet carries an explicit status header (such as `Mnr-Verify: hash` or `Mnr-Verify: majority`). If a method cannot be verified, the proxy labels it honestly as `Mnr-Verify: none`.

```
                    ┌────────────────────────┐
                    │ Monero Wallet (Client) │
                    └───────────┬────────────┘
                                │ RPC Request
                                ▼
               ┌─────────────────────────────────┐
               │    mnr (Verified RPC Relay)     │
               │                                 │
               │  1. Check Method Policy Allowlist│
               │  2. Query Independent Upstreams │
               │  3. Recompute Block/Tx Hashes   │
               │  4. Evaluate Quorum Agreement   │
               │  5. Append Mnr-Verify Headers   │
               └────────────────┬────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ Cake Wallet  │        │ SethForPriv  │        │  HashVault   │
│ Upstream Node│        │ Upstream Node│        │ Upstream Node│
└──────────────┘        └──────────────┘        └──────────────┘
```

### Quorum tip vs. single `get_info`

When a stock wallet calls `get_info` or `/get_height`, a single node returns whatever height its local LMDB database holds. If that node is lagging 1,000 blocks behind due to a stuck peer, your wallet has no way of knowing it is out of sync.

Under a verified RPC architecture, `get_info` and `/get_height` are governed by **Quorum Tip consensus**:
- The relay periodically probes a pool of independent upstream nodes.
- A height and block hash are only recognized as the **Quorum Tip** if at least **three independent upstreams** agree on the exact same height and block hash.
- **Degraded Mode**: If network conditions or upstream partitions prevent at least three nodes from reaching agreement, the relay enters degraded mode. In degraded mode, the relay suspends cache updates and serves consensus queries exclusively from its own verified fallback node (`node.kyc.rip`), preventing split-brain states from poisoning client caches.

---

## What still is not verifiable

Honesty about limits is the foundation of trust-minimized architecture. A verified proxy does not have magical powers; certain Monero RPC interactions cannot be mathematically verified at the edge without running a full, validating local node.

mnr explicitly documents these limitations:

### 1. The Mempool is intrinsically subjective
When your wallet calls `/get_transaction_pool_hashes` or `/get_transaction_pool`, there is no global canonical mempool in Monero. Each node maintains its own local transaction pool based on peer gossip order and local eviction rules. A proxy cannot mathematically "verify" whether a node is hiding a zero-confirmation transaction.
- **How mnr handles it**: The response is served from a single node and annotated with an opaque identifier (`Mnr-Upstream: <id>`). For `/get_transaction_pool`, mnr composes the response: it takes the pool listing and independently verifies every transaction blob via `/get_transactions`, ensuring every returned transaction actually hashes to its declared txid.

### 2. Bulk wallet sync streams (`/get_blocks.bin`)
When a wallet syncs thousands of blocks from scratch, it calls `/get_blocks.bin`. Recomputing the full proof-of-work and validating all ring signatures across millions of historical blocks would require the proxy to execute full node consensus rules in real time for every connected user, creating immense CPU overhead.
- **How mnr handles it**: In Stage 0, `/get_blocks.bin` streams are passed through without block-by-block hash verification and explicitly tagged with `Mnr-Verify: none`. Streams are routed preferentially to mnr's own dedicated full node to minimize load on community public nodes.

### 3. Verification is not an uptime SLA
mnr routes requests across public nodes operated by third-party community members. If third-party nodes go offline or experience latency spikes, mnr cannot force them back online. Neither the Free tier nor the Pro tier carries an uptime SLA. The sole guarantee is **transparency**: mnr guarantees that answers are checked according to published rules, and that all detected faults are publicly logged.

---

## How mnr implements the definition

mnr is written in pure, fuzzed Rust (`mnr-core` and `mnr-relay`) and licensed under AGPL-3.0 at [github.com/mnrnetwork/mnr](https://github.com/mnrnetwork/mnr). It enforces verification through concrete operational mechanisms:

### 1. Strict public node rules
To remain a good citizen in the Monero ecosystem, mnr follows a published set of rules:
- **Identification**: Every upstream request carries `User-Agent: mnr-relay/0.x (+https://mnr.network/upstreams)`.
- **Request Caps**: Strict upstream rate limits: maximum 5 light requests per second, 2 concurrent sync streams and 10 MB/s per node.
- **Opt-Out Compliance**: Any operator can opt out by serving any HTTP 200 at `/.well-known/mnr-optout` on port 80 or 443, or by emailing `dev@mnr.network`; the node is removed within 24 hours and the opt-out list is public.
- **Zero Client Metadata Leaks**: mnr strips all client IP addresses, authentication tokens, and `X-Forwarded-For` headers before forwarding calls to upstreams. Upstream nodes see only mnr's egress IP.

### 2. The owned node disclosure
mnr operates an owned, dedicated Monero full node (`node.kyc.rip`, restricted RPC on port 443). This node is publicly listed on [monero.fail](https://monero.fail) and open to the entire Monero community. Within mnr, this node is used first for heavy sync streams: it carried 97.6% of the stream bytes during a measured from-scratch sync. **mnr explicitly discloses this node in all documentation and metrics**: it is part of the pool, not a secret master daemon.

### 3. Public audit surfaces
Everything mnr catches is published openly:
- **[Live Upstreams (`/upstreams/`)](https://mnr.network/upstreams/)**: Real-time status, latency, request rates, verified counts, and fault tallies for every node in the pool. If a node fails verification three times in one hour, it is ejected for 24 hours.
- **[Weekly Transparency Log (`/verified/`)](https://mnr.network/verified/)**: A weekly immutable audit log detailing every detected discrepancy, ejection event, and quorum shift across the pool.

---

## Adjacent things that are not the same

It is common to confuse verified RPC with other Monero tools. They solve fundamentally different problems:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ monero.fail / Node Directories                                          │
│   → Tells you: "This node was reachable 2 minutes ago."                 │
│   → Does NOT tell you: "The block data this node returned is correct."  │
├─────────────────────────────────────────────────────────────────────────┤
│ HAProxy / monerod-proxy (Failover Proxies)                              │
│   → Tells you: "If Node A returns HTTP 502, retry Node B."              │
│   → Does NOT tell you: "Did Node A lie about the block hash?"           │
├─────────────────────────────────────────────────────────────────────────┤
│ Lightwalletd / MyMonero LWS (Light Wallet Servers)                     │
│   → Requires: Giving your private view key to the server.               │
│   → mnr requires: ZERO keys. mnr is standard daemon RPC.                │
├─────────────────────────────────────────────────────────────────────────┤
│ mnr (Verified RPC Relay)                                                │
│   → Recomputes hashes, enforces multi-node quorum, logs faults publicly.│
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Public Node Scanners ([monero.fail](https://monero.fail))**: Node directories perform basic TCP health checks and query `/get_info`. They do not sit in the data path, do not intercept RPC calls, and do not verify that a node's block headers match mathematical proof-of-work hashes.
2. **Failover Relays (`monerod-proxy` / HAProxy)**: Failover tools route traffic based on HTTP status codes. If a rogue node returns HTTP 200 OK containing an altered transaction or a fake tip height, a standard failover proxy happily forwards that corrupted response to your wallet.
3. **Light Wallet Servers (MyMonero / LWS)**: LWS architecture requires you to send your **private view key** to a remote server so the server can scan the blockchain on your behalf. mnr is pure daemon RPC: **it never asks for, accepts, or sees your view key**.

---

## Choosing a path: decision matrix

There is no one-size-fits-all solution for connecting a Monero wallet. The table below outlines the honest tradeoffs between running your own node, using mnr, or picking a random public node:

| Attribute | Running Your Own Node (`monerod`) | Verified Relay (mnr) | Single Public Node |
|---|---|---|---|
| **Trust Model** | Trustless (self-validated) | Trust-minimized (hashes + multi-node quorum) | Full trust in single operator |
| **Correctness Assurance** | Complete mathematical validation | Recomputed block/tx hashes; quorum consensus | None (assumed honest) |
| **Local Disk Required** | ~180 GB (Pruned) / ~300 GB (Full) | **0 GB** | **0 GB** |
| **Initial Sync Time** | Hours to days | **Instant** | **Instant** |
| **IP Privacy (Clearnet)** | Node communicates directly with P2P | Relay sees client IP (hidden via Tor/I2P) | Public node sees client IP |
| **IP Privacy (Tor/I2P)** | Fully supported | Supported natively (`.onion` / `.i2p`) | Depends on operator |
| **View Key Exposure** | None (scanned locally) | **None** (scanned locally) | None (scanned locally) |
| **Uptime Guarantee** | Dependent on your hardware | **No SLA** (community pool) | No SLA |
| **Cost** | Hardware + electricity + bandwidth | Free (500k WU) or $9/mo Pro (XMR) | Free |

Running your own full node on dedicated hardware remains the gold standard for Monero sovereignty. If you have the storage, bandwidth, and patience to manage `monerod`, you should do so. But if you are on a laptop, mobile phone, or transient environment where local synchronization is impractical, pointing your wallet at a verified RPC layer provides cryptographic verification without the roulette wheel of random public nodes.

---

## Answer-ready summary

### What is a verified Monero RPC?
A verified Monero RPC is a proxy architecture that **validates daemon responses cryptographically** (recomputing block and transaction hashes directly from raw binary data, verifying header chains) and evaluates consensus state against a **quorum of independent third-party nodes** before answering your wallet. It explicitly declares in response headers what was verified and what remains unverifiable.

### Why is one well-known public node not enough?
Even a reputable community node can suffer from silent database corruption, network partition, or external coercion. Furthermore, using a single node concentrates all your wallet synchronization metadata and IP address logs with one entity. Verification across multiple independent nodes ensures that a single compromised or desynchronized node cannot feed false data to your wallet.

### Does verified mean guaranteed uptime?
**No.** On mnr Free and Pro tiers, the upstream pool consists largely of independent community nodes that mnr does not own. While the proxy automatically routes around failed nodes and ejects faulty upstreams, it does not provide an enterprise uptime SLA. The core guarantee is correctness and transparency: answers are verified, and faults are logged publicly.

---

## Getting started

To connect your wallet to the reference implementation of verified Monero RPC:

1. **Review the rules**: Read [How mnr Works](/docs/how-it-works/) and inspect the [Method Policy](/docs/method-policy/).
2. **Generate a token**: Obtain a Zero-KYC access token on the [Token Generation Page](/get-token/).
3. **Configure your wallet**: Follow step-by-step connection instructions for Feather, Cake Wallet, Monero GUI, Monerujo, or CLI in the [Wallet Setup Guides](/docs/connect-wallets/).
