# Own Monero Node vs Verified RPC Proxy: The Honest Middle Option

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero affiliation with MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the npm package `mnr`.

The standard, uncompromising advice across the Monero community is simple: **run your own node**.

If you run a local `monerod` daemon on your own hardware, you achieve absolute sovereign validation. Your computer recomputes every proof, validates every consensus rule from genesis, stores the entire blockchain locally, and answers your wallet over localhost (`127.0.0.1:18081`). No remote server ever sees your IP address, your connection schedule, or the output indices your wallet inspects.

That advice is technically correct. If you have the hardware, the storage, the unmetered broadband, and the time, you should run your own node.

The problem is reality.

A full Monero blockchain requires hundreds of gigabytes of solid-state storage. Initial sync can take days on residential connections or underpowered hardware. If you are traveling with a laptop, using a mobile phone on metered 5G, or booting a transient virtual machine, downloading the entire history of Monero just to send a transaction is impractical or impossible.

Faced with this bottleneck, most users make a radical compromise: they abandon verification entirely and point their wallet at a single random public remote node discovered on an internet directory.

There is a middle option. A **verified RPC relay** like mnr sits squarely between the operational burden of running a local daemon and the blind trust of a random public node.

This guide breaks down all three paths honestly: what you gain, what you sacrifice, and how to choose the right model for your operational threat profile.

---

## The three paths, in one table

Before digging into technical details, compare the fundamental properties of each approach:

| Property | Sovereign Own Node (`monerod`) | Verified RPC Relay (mnr) | Single Public Node (Directory Roulette) |
|---|---|---|---|
| **Consensus Verification** | **Full Local Validation** (all ring signatures, bulletproofs, range proofs re-verified) | **Edge Cryptographic Verification** (block/tx hashes recomputed, tip quorum across multiple upstreams) | **Zero Verification** (you see whatever the operator returns) |
| **Trust Model** | Trust mathematics and your own hardware | Trust multi-operator quorum; trust-minimized relay logic | Blind social trust in a single server administrator |
| **Storage Requirement** | ~200+ GB (Full) / ~75+ GB (Pruned) | **0 GB** (client holds only wallet cache) | **0 GB** |
| **Initial Sync Time** | Hours to days (CPU and disk bound) | Minutes from a recent restore height; a measured sync from block 0 took 28.7 h and about 770k work units, which exceeds the Free tier | Minutes from a recent restore height |
| **Wallet Metadata Exposure** | **None** (RPC calls never touch the network) | **Relay sees IP (clearnet)** and RPC queries; no request logs stored; Tor/I2P decouples IP | **Operator sees IP**, timestamps, and exact queries |
| **Availability / Failover** | Dependent entirely on your local machine / uptime | Automatic failover across independent upstream pool | Fails completely if server reboots or goes offline |
| **Uptime SLA** | Your own responsibility | **None** (neither Free nor Pro has an SLA) | **None** |
| **Cost** | Hardware + disk + electricity + bandwidth | Free tier / ~$9/mo Pro (paid in XMR, bearer token) | Free (monetized via donations or metadata surveillance) |

---

## Own node: what you gain and what it costs

Running your own `monerod` is the gold standard of financial sovereignty. When you run `monerod`, your node connects directly to the peer-to-peer gossip network on port `18080`, downloads blocks from dozens of random peers, and executes consensus validation locally.

### What you uniquely gain

1. **Zero Metadata Leakage**: Your wallet queries a daemon listening on loopback (`127.0.0.1:18081`). No packet containing your RPC requests ever enters an ISP cable, router, or third-party server.
2. **True Decoy Verification**: When your wallet selects ring decoys via `get_outs`, the candidate outputs are pulled directly from your local LMDB database (`data.mdb`). No external entity can influence which decoys are presented to your wallet or analyze which outputs you queried together.
3. **Mempool Sovereignty**: When you push `send_raw_transaction`, your node broadcasts the signed blob directly to multiple P2P peers simultaneously. A hostile third party cannot quietly drop your transaction while falsely reporting HTTP 200 OK.
4. **Strengthening the Network**: By hosting an open P2P port, you relay blocks and transactions to other peers, increasing Monero's resistance to censorship and partition attacks.

### What it actually costs

- **Disk Space**: The unpruned Monero blockchain grows continuously. An unpruned node requires a fast SSD (NVMe or SATA SSD; HDDs are far too slow for Monero sync due to random read/write I/O during ring verification).
- **Time & Bandwidth**: Initial block download (IBD) requires transferring hundreds of gigabytes across the internet and verifying millions of cryptographic proofs. On modest hardware, this takes anywhere from 12 hours to several days.
- **Maintenance**: Operating systems reboot, database locks can become corrupted if power is lost abruptly, and network daemons require regular version upgrades when hard forks or security patches occur.

### The variants: pruned nodes and private VPS daemons

If local disk space is tight, you can run a **pruned node** (`--prune-blockchain`). Pruning discards roughly two-thirds of historical transaction signatures and non-critical data while keeping all block headers and outputs necessary to validate new blocks and scan wallets. A pruned node reduces storage requirements to roughly one-third of a full node while retaining complete sovereignty for wallet operations.

Alternatively, some users deploy a private `monerod` instance on a cloud VPS (Virtual Private Server). While this solves local laptop storage and bandwidth constraints, remember:
- The VPS hosting provider controls the physical hypervisor, RAM, and disk storage.
- If you connect to your VPS over clearnet, your home IP is permanently tied to that VPS IP.
- You must pay recurring monthly hosting fees (typically $10–$25/month for adequate SSD storage) and maintain Linux server security yourself.

---

## Single public node: convenience and concentration risk

When users cannot run a full node, the easiest path is opening wallet settings and entering a remote node address found on [monero.fail](https://monero.fail) or social media.

This approach is zero-friction, but it introduces severe structural vulnerabilities:

### 1. The blind trust problem
A single remote node is an unauthenticated oracle. As detailed in our guide on [verified Monero RPC](/learn/what-is-verified-monero-rpc/), TLS only encrypts the transport channel—it proves you are talking to `node.example.com`, but it does not prove `node.example.com` is telling the truth. The remote operator can feed your wallet stale blocks, hide incoming payments, or serve biased decoy outputs.

### 2. Operator concentration
A small handful of well-known public nodes service a disproportionate share of mobile and lightweight wallet traffic. If one of these operators suffers a datacenter outage, thousands of users are instantly knocked offline. If an operator's server is compromised or subpoenaed, months of client IP logs and output access patterns can be seized in a single raid.

### 3. The "Trusted Daemon" trap
In many wallets (such as Monero GUI and CLI), connecting to a remote node prompts users with a `--trusted-daemon` flag or checkbox. Ticking this box disables local transaction verification, allowing the remote node to calculate balance totals and key images on your behalf. As explained in [Never Tick 'Trusted Third-Party Node'](/learn/never-tick-trusted-third-party-node/), enabling this setting on any remote server destroys your cryptographic guarantees.

---

## Verified relay (mnr): what changes

mnr is designed as the pragmatic middle ground for users who refuse blind trust but cannot run a local daemon.

Instead of pointing your wallet at an unverified server, you configure your wallet to use `rpc.mnr.network:443` (or an onion/I2P address). Behind that single stable endpoint, mnr operates an active verification engine:

```
┌──────────────────────────────┐
│    Monero Wallet Client      │
│ (Feather, Cake, GUI, CLI)    │
└──────────────┬───────────────┘
               │ TLS or Onion / I2P
               ▼
┌──────────────────────────────┐
│   mnr (Verified RPC Relay)   │
│                              │
│ • Quorum Tip (>=3 nodes)     │
│ • Recompute Block Hashes     │
│ • Fallback to node.kyc.rip   │
│ • Zero-KYC Bearer Auth       │
└──────┬───────────────┬───────┘
       │               │
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│  node.kyc.rip│ │ Independent  │
│ (Owned Node) │ │ Public Pool  │
└──────────────┘ └──────────────┘
```

### 1. Multi-node consensus, not one operator's word
When your wallet requests the current blockchain height or top block via `get_info`, mnr does not answer from a single database. It continuously probes an independent pool of upstream nodes. A height and block hash are only accepted as the **Quorum Tip** if at least **three independent upstreams** agree on the exact same block.

### 2. Raw cryptographic recomputation
When your wallet downloads blocks via `/get_blocks.bin` or checks transactions via `get_transactions`, mnr recomputes the cryptographic hashes of raw blobs directly. If an upstream node serves an altered transaction or modified block, the computed hash mismatches the header, and mnr rejects the response before it ever reaches your wallet.

### 3. Sensitive requests favor the owned node
Writes are not routed to one node. `send_raw_transaction` fans out in parallel to every healthy upstream in the pool, including our own node `own-1` (`node.kyc.rip`, port 443, listed on [/upstreams/](/upstreams/)), and succeeds if any of them accepts it. The `Mnr-Relayed: k/n` response header tells you how many took it, so a single node refusing or lagging cannot strand your transaction.

### 4. Public transparency log
Every upstream node used by the relay is listed publicly on [/upstreams/](/upstreams/) alongside live latency, error rates, and request caps. Any node that serves invalid data or falls out of consensus is ejected and recorded in the permanent [/verified/](/verified/) transparency audit trail.

---

## Honest limits of the middle option

A verified relay is an engineering compromise. It dramatically reduces trust compared to an arbitrary public node, but it is **not** equivalent to running your own node.

Anyone considering mnr must understand its operational limits:

### 1. The relay sees your IP on clearnet
If you connect to `rpc.mnr.network:443` over standard internet (clearnet), the mnr edge proxy necessarily sees your IP address to route TCP packets. While mnr enforces an anti-surveillance architecture and claims zero request logging (see [/docs/privacy/](/docs/privacy/)), a claim of no logging requires trust. 
*If you need to decouple your network identity from the relay, you must connect via Tor (`.onion`) or I2P (`.b32.i2p`).*

### 2. No uptime SLA on Free or Pro
Neither mnr Free nor mnr Pro ($9/mo in XMR) includes an uptime SLA. Because mnr aggregates independent community upstreams that it does not own, an upstream network partition or datacenter outage can impact relay latency or cause transient failovers. Paid tokens grant higher rate limits and dual-check guarantees on `get_outs`—they do not buy an enterprise availability contract.

### 3. Decoys cannot be 100% verified without full validation
While mnr verifies block hashes and quorum tips, it cannot mathematically prove that a set of outputs returned by `get_outs` reflects the true global distribution without maintaining a full local validation engine for every single client query. On the Pro tier, mnr cross-checks outputs against two independent upstreams to detect poisoning, but complete decoy sovereignty remains exclusive to running your own local node.

### 4. mnr is not a light-wallet view-key server
mnr is strictly a daemon RPC proxy. It never asks for, accepts, or stores your private view key or mnemonic seed. Your wallet continues to scan blocks client-side.

---

## Migration path: how to start and when to graduate

Choosing an RPC architecture does not have to be permanent. You can adopt a practical migration path that matches your current hardware and privacy requirements:

```
Phase 1: Immediate Need
  └─ Point wallet at rpc.mnr.network (Free or Pro token)
  └─ Leave "Trusted Daemon" UNCHECKED
  └─ Verify connection via /docs/connect-wallets/
       │
Phase 2: Network Hardening
  └─ Route mnr connection through Tor (.onion) or I2P
  └─ Decouple IP address from the relay proxy
       │
Phase 3: Ultimate Sovereignty
  └─ Acquire dedicated hardware / fast SSD
  └─ Sync local monerod (Full or Pruned)
  └─ Switch wallet daemon address to 127.0.0.1:18081
```

### When should you graduate to your own node?
You should transition from mnr to a sovereign local node when:
1. **You manage significant treasury or merchant volume**: Businesses processing frequent customer payments should never rely on shared public infrastructure.
2. **You operate a fixed desktop or home server**: If you have a machine running 24/7 with spare SSD capacity, setting up `monerod` requires minimal ongoing effort after initial sync.
3. **Your threat model demands zero IP or timing exposure**: If an adversary has legal or technical leverage over network infrastructure, keeping all RPC calls strictly within `127.0.0.1` is the only provable defense.

Until you reach that stage, mnr provides a mathematically verified, trust-minimized alternative to random directory nodes—without the operational overhead of managing local gigabytes.

---

## Frequently Asked Questions

### Is mnr as private as running my own node?
**No.** With your own local node, wallet RPC metadata stays exclusively on machines you physically control. With mnr on clearnet, the relay sees your IP address and RPC queries (even though mnr stores no request logs). To hide your IP from the relay, use mnr's Tor onion or I2P endpoints—or run your own node for the strongest possible posture.

### Why use a verified relay instead of any public node from monero.fail?
A random public node gives you zero consensus guarantees; you see whatever the operator’s server returns, with no protection against stale forks, omitted transactions, or silent logging. mnr provides a single stable endpoint where block hashes are cryptographically recomputed, tip height requires a majority of the responding upstreams and no fewer than three to agree, and upstream failures are logged publicly on [/verified/](/verified/).

### What does mnr Pro (~$9/mo in XMR) buy if there is no SLA?
Pro tier provides dedicated capacity (up to 25 requests per second vs. 5 rps on Free) and an automated second-node cross-check on sensitive `get_outs` queries. It does not provide an uptime SLA, because mnr relies on community upstreams that it does not own.

### If I switch to mnr now, will I lose my wallet balance or transaction history?
**No.** Your balance and transaction history are derived entirely from your private keys and the Monero blockchain. Switching daemon addresses between your own node, mnr, or any other RPC provider does not affect your funds.

---

## Next Steps

- **Compare Tiers**: Review rate limits and features on [/docs/tokens/](/docs/tokens/) and generate a token at [/get-token/](/get-token/).
- **Connect Your Wallet**: Follow our configuration walkthroughs for Feather, Cake, Monero GUI, or CLI at [/docs/connect-wallets/](/docs/connect-wallets/).
- **Audit Upstreams**: Check current quorum height, active upstream nodes, and response latency on [/upstreams/](/upstreams/).
- **Learn the Rules**: Read our exact cryptographic validation criteria at [/docs/method-policy/](/docs/method-policy/).
