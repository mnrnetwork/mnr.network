# mnr vs Seth for Privacy, HashVault, or Cake Onion Alone

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

If you have spent any time in the Monero community, you have encountered the names of its most trusted public node operators:
- **Seth for Privacy** (`node.sethforprivacy.com`)
- **Cake Wallet** (official clearnet and `.onion` nodes)
- **HashVault** (`nodes.hashvault.pro`)

These operators run high-performance, well-maintained Monero daemons as a public good. They invest their own capital in fast NVMe storage, unmetered bandwidth, and round-the-clock server maintenance. For hundreds of thousands of users who cannot sync a local 200+ GB blockchain, these nodes are the backbone of day-to-day Monero usability.

So when people discover mnr (Monero Network Relay), the natural question arises:

*“If Seth, Cake, and HashVault already run fantastic nodes, why would I point my wallet at mnr?”*

The answer is not competition or replacement. In fact, **mnr frequently uses those exact community daemons as its upstream nodes**.

The difference lies in **how** your wallet interacts with them: do you place blind social trust in a single administrative server, or do you query a verified relay that mathematically cross-checks answers across multiple independent operators before returning data to your wallet?

This article compares using a single reputable community node versus a verified multi-node relay, without disparaging the operators whose infrastructure powers the ecosystem.

---

## Respect the single-operator option: why people choose known nodes

To understand the difference, you must first understand why known community nodes are vastly superior to picking a random IP off an unvetted directory.

When users select a node from Seth for Privacy, Cake Wallet, or HashVault, they benefit from:
1. **Professional Systems Administration**: These are not underpowered Raspberry Pis running on residential DSL. They are hosted on high-availability dedicated servers or enterprise cloud infrastructure.
2. **Community Reputation**: Known operators have a public track record of supporting the Monero project. They do not inject random ad banners, sell fraudulent token claims, or intentionally poison mempools.
3. **Dedicated Onion Endpoints**: Most reputable operators offer dedicated Tor `.onion` addresses, allowing users to conceal their clearnet IP addresses without third-party VPNs.

For a basic lightweight setup, choosing a known community operator is miles ahead of playing directory roulette on [monero.fail](https://monero.fail).

---

## What a single node still is: one view of truth

Despite the integrity and skill of these operators, a fundamental architectural reality remains: **a single node is a single administrative domain**.

No matter how respected an operator is, pointing your wallet at one remote server forces you to accept single-party vulnerabilities:

### 1. The single-node oracle problem
If Cake Wallet's server, Seth's server, or HashVault's server experiences a silent database lock, a peer partition, or a lagging sync state, your wallet has no independent reference point. It accepts whatever block height that single server reports. If that server is 50 blocks behind mainnet, your wallet believes the entire network is 50 blocks behind.

### 2. Concentration of metadata
When thousands of mobile wallets point exclusively at a single operator's URL, that operator's server becomes a massive repository of connection metadata. Even if the operator has a strict no-logging policy, the server's physical hosting provider or datacenter upstream can monitor incoming IP connections, connection timing, and output query frequencies.

### 3. Downtime is a complete dead-end
If a single operator reboots for a kernel upgrade or experiences a DDoS attack, your wallet simply stops syncing. It does not automatically fail over to an alternative provider unless you manually open your wallet settings, find a new address, and reconfigure your connection.

---

## What mnr adds: upstream cooperation and verification

mnr does not replace community nodes. It **verifies** them.

Instead of your wallet talking directly to one server, you configure your wallet to use `rpc.mnr.network:443` (or mnr's Tor/I2P address). Behind that single permanent endpoint, mnr coordinates an active consensus engine across an independent pool of community upstreams:

```
                      ┌──────────────────────┐
                      │ Monero Wallet Client │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  mnr Verified Relay  │
                      │                      │
                      │ • Quorum Tip (>=3)   │
                      │ • Hash Recomputation │
                      │ • Automatic Failover │
                      └──────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
  │ Cake Wallet  │        │ SethForPriv  │        │  HashVault   │
  │ Upstream Node│        │ Upstream Node│        │ Upstream Node│
  └──────────────┘        └──────────────┘        └──────────────┘
```

### 1. Multi-node quorum consensus
When your wallet calls `get_info` or `/get_height`, mnr does not return what Seth says, what Cake says, or what HashVault says. It returns what **at least three independent upstreams agree upon**. If one upstream lags behind due to a stuck peer, mnr rejects its stale height and serves the consensus tip agreed upon by the majority.

### 2. Cryptographic hash recomputation
When your wallet downloads raw blocks (`/get_blocks.bin`) or checks transaction proofs, mnr recomputes block and transaction hashes directly from raw binary blobs before forwarding them to your wallet. If an upstream server returns corrupted or altered data, the recomputed hash fails, the response is discarded, and mnr fetches the data from an alternate node.

### 3. Seamless failover
If Seth's node reboots, Cake's node is undergoing maintenance, or HashVault experiences high latency, mnr automatically shifts traffic to other healthy upstreams in its pool. Your wallet keeps syncing without manual reconfiguration, though neither tier promises uptime and a bad enough outage still surfaces as an error.

### 4. Upstream, not rival: public transparency and rate caps
mnr lists every active upstream openly on [/upstreams/](/upstreams/). Community nodes are treated with respect:
- **Identified Traffic**: mnr identifies itself via `User-Agent: mnr-relay/<version> (+https://mnr.network/upstreams)`.
- **Strict Request Caps**: mnr caps queries to each community upstream (typically 5–10 req/s), ensuring mnr never overwhelms community infrastructure.
- **Automated Opt-Out**: Any operator can opt out by serving any HTTP 200 at `/.well-known/mnr-optout`, or by emailing dev@mnr.network; mnr removes opted-out nodes within 24 hours and publishes the opt-out list.

---

## Comparing the onion paths: who sees your metadata?

Many privacy-conscious users connect to Cake or Seth via Tor onion addresses. How does that compare to connecting to mnr over Tor?

| Connection Path | Who Sees Your IP? | Who Sees Your RPC Queries? | Are Answers Checked Against Quorum? |
|---|---|---|---|
| **Cake / Seth Clearnet** | The operator (and their hosting provider) sees your public IP. | The operator sees requested block heights and decoys. | **No**. Single-operator answer. |
| **Cake / Seth Onion** | **Nobody**. Tor hides your IP from the operator. | The operator still sees all requested block heights and decoys. | **No**. Single-operator answer. |
| **mnr Clearnet** | The mnr edge relay sees your IP (no logs kept). Upstreams see only mnr's IP. | mnr sees queries; individual upstreams see partial, distributed queries. | **Yes**. Hashes recomputed; >=3 node quorum. |
| **mnr Onion (`.onion:80`)** | **Nobody**. Tor hides your IP from mnr. | mnr sees queries; individual upstreams see only mnr's IP. | **Yes**. Hashes recomputed; >=3 node quorum. |

Connecting to a single operator's onion address successfully hides your physical IP from that operator. However, that single operator still sees 100% of your wallet's query metadata, and your wallet still blindly trusts that operator's blockchain height.

Connecting to **mnr's onion address** (`mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80`) hides your IP from mnr, while retaining the multi-node consensus checks and cryptographic verification that a single node cannot provide.

---

## When to stay put vs when to try mnr

Switching to mnr is an engineering choice, not a moral obligation. Use this guide to decide:

### Stick with your favorite single operator if:
- You have a personal or social relationship with the operator and trust their operational ethics implicitly.
- You only use Monero casually for infrequent personal transfers and do not mind occasional downtime during server maintenance.
- Your wallet setup is already stable and you have no desire to configure bearer token authentication.

### Consider switching to mnr if:
- You run automated services, bots, or merchant checkouts that require continuous failover without manual intervention.
- You refuse to accept a single third party as an unverified oracle for blockchain consensus.
- You want an auditable, transparent record of upstream health, latency, and fault ejections ([/upstreams/](/upstreams/) and [/verified/](/verified/)).
- You want a single stable address that stays online even when individual community nodes reboot or change IPs.

---

## Frequently Asked Questions

### Is mnr trying to replace or compete with Seth, Cake, or HashVault?
**No.** mnr is an aggregation and verification layer, not a replacement. In fact, mnr depends on the continued health of independent community nodes to form its verification quorum. We encourage users who have the financial means to donate directly to community node operators.

### If mnr uses community nodes as upstreams, isn't it freeloading?
mnr caps every upstream at 5 light requests per second, 2 concurrent `get_blocks.bin` streams and 10 MB/s. Heavy binary sync streams go to our own node first, which carried 97.6% of the stream bytes during a measured from-scratch sync. Writes are the exception in the other direction: `send_raw_transaction` fans out to every healthy upstream so a transaction propagates widely, and the response reports how many accepted it. Operators can opt out at any time by serving any HTTP 200 at `/.well-known/mnr-optout`, or by emailing dev@mnr.network; removal is within 24 hours and the opt-out list is public.

### Can mnr guarantee 100% uptime if community nodes go down?
**No.** Neither mnr Free nor mnr Pro includes an uptime SLA. While mnr's multi-node pool provides resilient failover compared to any single node, large-scale network partitions or upstream outages can cause temporary degradation.

---

## Next Steps

- **Inspect Upstream Pool**: See which nodes are currently in rotation on [/upstreams/](/upstreams/).
- **Review Weekly Audits**: Read historical verification totals and ejections on [/verified/](/verified/).
- **Connect Your Wallet**: Follow our configuration guides for Feather, Cake, GUI, or CLI at [/docs/connect-wallets/](/docs/connect-wallets/).
- **Get an Access Token**: Acquire a Free or Pro bearer token at [/get-token/](/get-token/).
