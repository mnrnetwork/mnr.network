# Safer Than Picking a Random monero.fail Node: One Address, Multi-Node Checks

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

For thousands of Monero users, setting up a wallet follows an identical ritual:
1. Download Feather, Cake Wallet, or Monero GUI.
2. Realize local blockchain synchronization requires ~180 GB of disk space and hours or days of bandwidth.
3. Open [monero.fail](https://monero.fail) in a browser.
4. Filter by low latency, pick a random green IP or `.onion` address, paste it into the wallet's node settings, and hope it stays online.

This habit is known as **node roulette**.

A few days or weeks later, the node goes offline, sync freezes, or transactions stall. The user returns to the directory, copies another IP, and repeats the cycle.

Directories like `monero.fail` perform an invaluable service for the ecosystem by indexing public infrastructure. But a directory is a scanner, not a correctness layer. It tells you that a port responded to a ping; it does not tell you whether the daemon's answers are cryptographically valid.

mnr provides an alternative approach: **one stable endpoint** (`rpc.mnr.network:443`) backed by an automated verification layer that checks answers against multiple independent nodes before delivering them to your wallet.

---

## Why people open monero.fail in the first place

The popularity of public node directories is driven by practical constraints:

- **Storage Limitations**: A pruned Monero blockchain requires roughly 180 GB of fast NVMe or SSD storage; a full node requires over 300 GB. Laptops, mobile devices, and virtual machines often cannot spare this capacity.
- **Initial Sync Overhead**: Syncing a local `monerod` from the genesis block requires validating millions of RandomX hashes and cryptographic bulletproofs, consuming days of CPU time and heavy electricity.
- **Mobile Usability**: Running a local node on iOS or Android is impractical due to battery limits and aggressive OS background process termination.

For users in these situations, remote nodes are a necessity. Public node lists provide an instant gateway to get a wallet running.

---

## What a node directory guarantees (and what it does not)

Node directories like `monero.fail` periodically crawl registered endpoints and record basic reachability metrics:

```
┌────────────────────────────────────────────────────────────┐
│ What monero.fail Scans:                                    │
│   ✓ TCP connectivity and TLS handshake                     │
│   ✓ Response latency (ping in milliseconds)                │
│   ✓ Self-reported height from /get_info                    │
│   ✓ Open restricted RPC port (18081 / 18089)               │
└────────────────────────────────────────────────────────────┘
```

These checks confirm that a server is online and running Monero daemon software. However, **reachability does not equal trustworthiness**:

- **A green node can lag behind**: If a node gets stuck on a side chain or loses peer connectivity, its reported height might lag behind mainnet while still responding with low latency.
- **A green node can drop transactions**: If the node operator has broken P2P routing, calling `send_raw_transaction` will return HTTP 200 OK, but your transaction will never confirm.
- **A green node can serve biased decoys**: On `get_outs`, a rogue node can serve specific historical outputs to weaken your ring signatures.
- **A green node can log your metadata**: Anyone can list a node on a public directory, including data brokers, surveillance firms, or hostile entities running nodes specifically to record user IP addresses and transaction timestamps.

Because spend keys remain on your device, a malicious public node cannot directly steal your funds. But it can compromise your transaction privacy, mislead you about payment confirmations, or leave your wallet stuck mid-sync.

---

## One address vs. node roulette

Cycling through random public nodes exacerbates privacy and operational problems:

```
Random Node Roulette:
  Day 1: Connect to Node A (Logs IP, restore height)
  Day 4: Node A dies → Switch to Node B (Logs IP, balance scan)
  Day 9: Node B drops txs → Switch to Node C (Logs IP, decoy queries)
  Result: Your wallet metadata is scattered across multiple unknown operators.

Verified RPC (mnr):
  Permanent Address: rpc.mnr.network:443 (or Tor onion)
  Relay Layer: Queries independent operators in parallel.
  Verification: Hashes recomputed, quorum established.
  Result: One stable address; data verified against consensus.
```

Instead of manually rotating endpoints, mnr gives you a single, permanent daemon address. Behind that address, the relay manages connection pooling, failover, and verification automatically.

---

## What mnr checks before it answers

When your wallet sends an RPC request to `rpc.mnr.network`, the relay does not blindly pass it through to a single server. It executes strict verification rules depending on the data type:

### 1. Recomputing Block & Transaction Hashes
For immutable blockchain data (`get_block`, `get_block_header_by_height`, `/get_transactions`), mnr recalculates the cryptographic hashes directly from raw binary blobs:
- **Block Blobs**: The relay recomputes the block hash from the raw blob and verifies that it links correctly to the known header chain.
- **Transaction Blobs**: Transaction blobs fetched via `/get_transactions` are hashed to ensure they match the requested txids. If a node serves an altered blob, the hash check fails immediately.

### 2. Multi-Node Quorum Consensus
For transient network state (`get_info`, `get_height`, fee estimates), mnr queries multiple independent upstreams and requires **at least three distinct nodes** to agree on the exact block height and top block hash.
- If upstreams disagree or a node reports a lagging height, the outlier is rejected.
- If widespread network partitions prevent three nodes from agreeing, mnr enters **degraded mode**, serving consensus exclusively from its own verified fallback node and suspending cache updates.

### 3. Independent Upstreams, Not a Private Server Farm
mnr does not route your queries through a centralized cluster of private nodes. It routes across a curated pool of respected third-party community node operators:
- [Cake Wallet](https://cakewallet.com)
- [Seth For Privacy](https://sethforprivacy.com)
- [HashVault](https://hashvault.pro)
- [BoldSuck](https://boldsuck.de)
- [StormyCloud](https://stormycloud.org)
- [Stack Wallet](https://stackwallet.com)

The pool holds 15 upstreams. Fourteen are run by independent operators, and one, `own-1` (`node.kyc.rip`), is ours and is disclosed as such on [/upstreams/](/upstreams/). Because the rest are independent of us and of each other, agreement cannot be forged without compromising a majority of community infrastructure.

---

## Honest limits (read before you switch)

No remote RPC proxy can match the privacy of running your own node. Before switching to mnr, understand the architectural boundaries:

1. **No Uptime SLA on Free or Pro**: mnr relies heavily on community nodes. If community nodes experience global routing failures or DDoS attacks, mnr cannot compel them to recover. We provide verified answers, not an enterprise SLA.
2. **Clearnet Exposes Your IP to the Relay**: On clearnet (`https://rpc.mnr.network`), the mnr relay sees your IP address (though mnr keeps no request logs and strips client IP before forwarding to upstreams). If you require complete network anonymity, **connect via the mnr Tor onion address** or use I2P.
3. **Bulk Sync (`get_blocks.bin`) Is Unverified**: In Stage 0, high-bandwidth bulk block streams are routed preferentially to mnr's owned node and marked `Mnr-Verify: none`. Full stream-level cryptographic verification is scheduled for future stages.

---

## How to try it in under five minutes

Connecting to mnr requires no registration, email address, or personal information:

1. **Obtain an Anonymous Token**: Visit [mnr.network/get-token/](https://mnr.network/get-token/) to generate a free access token (500,000 work units/month).
2. **Open Your Wallet Node Settings**:
   - **Feather Wallet**: Settings → Node → Add Node → `<token>:x@rpc.mnr.network:443`.
   - **Cake Wallet**: Settings → Connection & Sync → Nodes → Add Node. Host: `rpc.mnr.network`, Port: `443`, Use SSL: `On`, Login: `<token>`, Password: `x`.
   - **Monero GUI**: Settings → Node → Remote Node. Address: `rpc.mnr.network`, Port: `443`, Check "Use SSL", Username: `<token>`, Password: `x`.
3. **Leave Trusted Daemon UNCHECKED**: Always keep the Trusted checkbox disabled on any remote node.
4. **Tor Onion (Optional)**: For IP privacy, use `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80` with a local Tor SOCKS5 proxy.

Detailed walkthroughs are available in the [Wallet Connection Guides](/docs/connect-wallets/).

---

## When you should still run your own node

mnr is designed as an honest middle option between the operational burden of a local node and the unpredictability of random directory nodes.

However, you should **still run your own node** if:
- You manage substantial Monero holdings where any degree of third-party metadata leakage is unacceptable.
- You operate an automated exchange, payment gateway, or privacy service requiring 100% sovereign consensus.
- You have dedicated server hardware and unmetered broadband capable of sustaining `monerod` 24/7.

For everyone else—users on laptops, mobile phones, or traveling setups—mnr replaces node roulette with cryptographic verification and one permanent endpoint.

---

## Answer-ready summary

### Is mnr just another public node listed on monero.fail?
**No.** mnr is a verified RPC relay. Your wallet communicates with one address (`rpc.mnr.network`), and the relay verifies responses against multiple independent community upstreams (recomputing block/tx hashes and establishing quorum consensus) before replying.

### Does using mnr hide my IP address from everyone?
On clearnet, the mnr relay sees your IP address, although mnr does not log request paths or client IPs and strips all headers before calling upstream nodes. To hide your IP from the relay itself, use mnr's **Tor onion** or **I2P** endpoints, or run a local node.

### Can mnr replace running a local full node?
No remote service replaces the sovereignty of running your own `monerod`. mnr is an intermediary solution for users who cannot run a local node but refuse to rely on the unverified output of random public nodes.

---

## Next steps

- Learn how verification works under the hood: [What Is a Verified Monero RPC?](/learn/what-is-verified-monero-rpc/)
- Why remote nodes must always remain untrusted: [Never Tick Trusted](/learn/never-tick-trusted-third-party-node/)
- Generate a token and connect: [Get a Token](/get-token/)
