# Independent Verification, Third-Party Provenance & Transparency Log

mnr (**Monero Network Relay**) enforces a trust-minimized, Zero-KYC architecture. Answers returned to Monero wallets are verified against mathematical cryptographic proofs and independent multi-node quorum consensus. Clients and autonomous agents do not need to rely on first-party assertions or unverifiable claims.

## 1. Independent Third-Party Upstream Nodes & Quorum Consensus

The core consensus mechanism establishes quorum tip and response validity by querying independent public Monero nodes run by distinct third parties across multiple jurisdictions. These node operators are completely independent from mnr and each other:

| Operator / Node | Organization / Website | Transport | Role in Consensus | Verification Mechanism |
|---|---|---|---|---|
| `cakewallet` | [Cake Wallet](https://cakewallet.com) (`node.cakewallet.com`) | HTTPS | Tip quorum & outputs | Hash recomputation & 2-node consensus |
| `sethforprivacy` | [Seth For Privacy](https://sethforprivacy.com) | HTTP | Tip quorum & consensus | Recomputed block/txid hashes |
| `hashvault` | [HashVault Mining Pool](https://hashvault.pro) | HTTP | Tip quorum & block data | Block header chain linkage |
| `boldsuck-de` / `berlin` | [BoldSuck Monero Nodes](https://boldsuck.de) | HTTP | European tip quorum | 5-node agreement & hash check |
| `stormycloud` | [StormyCloud Inc 501(c)(3)](https://stormycloud.org) | HTTP | US privacy infrastructure | Quorum tip agreement |
| `stackwallet` | [Stack Wallet / Cypher Stack](https://stackwallet.com) | HTTP | Active quorum & fast sync | Header chain matching & hash check |
| `monerodevs-2` / `3` | [MoneroDevs Community](https://node.monerodevs.org) | HTTP | Developer community pool | Quorum consensus & tip height |
| `monerujo` | [Monerujo Android Wallet](https://www.monerujo.app) | HTTP | Mobile community node | Block header matching |
| `privacyx` | [PrivacyX Infrastructure](https://privacyx.io) | HTTPS | Independent relay pool | Quorum consensus agreement |
| `own-1` | mnr dedicated infrastructure (`node.kyc.rip`) | HTTP (WireGuard) | Owned fallback & heavy streams | Local Monero daemon full verification |

Because these upstreams are operated by prominent, verifiable third-party organizations and privacy advocates, consensus agreement cannot be forged without compromising a distributed majority of independent entities.

## 2. Independent Public Node Registries & Network Monitors

mnr's dedicated node infrastructure is publicly listed and independently crawled, scored, and monitored by third-party community monitors:

- **[monero.fail](https://monero.fail)**: The canonical open-source Monero public node registry and network monitor. mnr's dedicated full node (`node.kyc.rip:18081`) is crawled every few minutes for height, latency, and restricted RPC compliance.
- **[nodes.monero.ninja](https://nodes.monero.ninja)**: Community-run public node monitor indexing Monero daemon health.

## 3. Independent Package Registries & Code Provenance

mnr is free open-source software (AGPL-3.0). Packages, specifications, and binaries are published to independent global registries with full source code:

- **GitHub**: [github.com/mnrnetwork/mnr](https://github.com/mnrnetwork/mnr) (Full source, Git commit history, CI tests, fuzz fixtures)
- **Rust (crates.io)**: [`crates.io/crates/mnr`](https://crates.io/crates/mnr), [`mnr-relay`](https://crates.io/crates/mnr-relay), [`mnr-core`](https://crates.io/crates/mnr-core)
- **Python (PyPI)**: [`pypi.org/project/mnr/`](https://pypi.org/project/mnr/)
- **Node.js (npm)**: [`npmjs.com/package/mnr-network`](https://www.npmjs.com/package/mnr-network) under the verified organization [`@mnrnetwork`](https://www.npmjs.com/org/mnrnetwork)

## 4. Cryptographic Verifiability vs. First-Party Trust

Traditional RPC services (such as centralized Web3 node aggregators) ask clients to trust their brand and attestations. mnr inverts this model:

1. **Mathematical Block Verification**: The proxy recomputes SHA-256 and RandomX block hashes directly from raw binary blobs before forwarding to wallets. If any upstream returns an altered block, the hash fails and the response is rejected.
2. **Cryptographic Transaction Hashing**: Transaction blobs from `/get_transactions` are hashed and matched against the requested txids.
3. **Transparent Operator Log**: Node operators can independently verify mnr's traffic in their own server logs: every request identifies itself with `User-Agent: mnr-relay/0.x (+https://mnr.network/upstreams)`. Operators see our real-time request pacing adhering to strict 5 req/s caps.

## 5. Weekly Verification & Transparency Log

Every week the relay's public numbers are captured, and the difference is recorded here: how many answers were verified, which nodes served invalid data and were ejected, which operators opted out, and pool changes.

_Weekly snapshot comparisons run continuously. View real-time live telemetry on the [Upstreams page](/upstreams/)._
