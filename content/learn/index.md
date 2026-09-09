# Monero RPC Concepts, Explainers & Architecture

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

Welcome to the **mnr Learn Hub**. These explainers explore how Monero wallets interact with remote daemons, the architectural vulnerabilities of unverified public nodes, and how cryptographic verification and multi-node consensus provide a trust-minimized middle ground between self-hosting and blind trust.

While the [Documentation Hub](/docs/) provides operational references and wallet configuration guides for active users, the articles here provide conceptual foundations for engineers, wallet developers, and privacy-conscious users evaluating Monero infrastructure.

---

## Published Explainers

### Category Foundations & Trust Architecture

#### 1. [What Is a Verified Monero RPC? Why One Public Node Is Not Enough](/learn/what-is-verified-monero-rpc/)
**The Category Pillar.** Defines verified daemon RPC: direct block and transaction hash recomputation from raw blobs, multi-node quorum consensus on tip height, and explicit `Mnr-Verify` header tagging. Covers the failure modes of single public nodes, what can and cannot be verified at the proxy layer, and how mnr implements consensus without making empty uptime promises or privacy claims.
- **Badge**: `Explainer`
- **Topics**: Block hash recomputation, quorum consensus, public node risks, method policy, degraded mode.

#### 2. [Never Tick Trusted on a Third-Party Monero Node—What the Flag Actually Does](/learn/never-tick-trusted-third-party-node/)
**Wallet Security & UX.** Deconstructs the common confusion between social trust in an operator and the `--trusted-daemon` flag in Monero wallet software. Explains how enabling the Trusted flag weakens client-side decoy obfuscation and disables critical safety checks, why localhost is the only place Trusted belongs, and why mnr explicitly requires users to leave Trusted turned **off**.
- **Badge**: `Explainer`
- **Topics**: `--trusted-daemon`, `--untrusted-daemon`, decoy obfuscation, client-side safety, wallet configuration.

#### 3. [Own Monero Node vs Verified RPC Proxy: The Honest Middle Option](/learn/own-node-vs-verified-proxy/)
**Decision & Threat Modeling.** An honest, non-judgmental comparison between running a sovereign local `monerod` instance, pointing to a random public node, and using mnr as a verified relay. Details the disk, sync time, and bandwidth realities of full vs. pruned nodes, when to graduate to your own hardware, and why mnr is an interim middle path rather than a replacement for self-hosting.
- **Badge**: `Comparison`
- **Topics**: Sovereign own node, pruned node, storage requirements, metadata exposure, migration path.

---

### Node Comparison & Ecosystem Literacy

#### 4. [Safer Than Picking a Random monero.fail Node: One Address, Multi-Node Checks](/learn/safer-than-random-monero-fail-node/)
**Habit-Path Breakdown.** Compares the widespread habit of "node roulette" on public node directories with a verified RPC relay. Explains what node scanners actually measure (reachability and latency) versus what they cannot guarantee (block correctness, decoy integrity, or honest mempools). Shows how pointing to one stable endpoint backed by multi-node checks eliminates manual rotation while remaining honest about clearnet IP tradeoffs.
- **Badge**: `Explainer`
- **Topics**: `monero.fail`, node roulette, stable RPC endpoints, multi-upstream verification, Tor/I2P routing.

#### 5. [mnr vs Seth for Privacy, HashVault, or Cake Onion Alone](/learn/mnr-vs-seth-hashvault-cake-onion/)
**Late-Funnel Comparison.** A respectful comparison between well-known, high-reputation community nodes (Seth for Privacy, Cake Wallet, HashVault) and a multi-node verified relay. Explains why single operators remain single administrative domains, how mnr frequently queries those exact nodes as upstreams, and how metadata exposure differs over clearnet vs. Tor onion.
- **Badge**: `Comparison`
- **Topics**: Seth for Privacy, Cake Wallet, HashVault, single public node, multi-node quorum, mnr upstreams.

#### 6. [Remote Monero Daemon vs MyMonero / LWS: Keys Local vs Sharing a View Key](/learn/remote-daemon-vs-mymonero-lws/)
**Architectural Deep Dive.** Demystifies the crucial difference between Daemon RPC (where keys stay strictly on your device and scanning is local) and Light Wallet Servers (LWS / MyMonero, where private view keys are uploaded to a cloud server). Details what each model learns about your finances and confirms that mnr never requests or accepts private keys.
- **Badge**: `Deep Dive`
- **Topics**: Daemon RPC, `monero-lws`, private view key, client-side scanning, incoming transaction privacy.

---

### Operations, Privacy & Builder Guides

#### 7. [Failover Is Not Verification: monerod-proxy / HAProxy vs Hash + Quorum](/learn/failover-proxy-vs-hash-quorum/)
**Ops & Systems Engineering.** Addresses systems engineers using HAProxy, NGINX, or `monerod-proxy` for high availability. Proves why transport-level failover solves reachability but passes through stale tips, corrupted blocks, and poisoned decoys. Explains how edge hash recomputation and tip quorum solve the correctness gap that availability tools leave wide open.
- **Badge**: `Architecture`
- **Topics**: `monerod-proxy`, HAProxy, high availability, quorum verification, hash recomputation, load balancing.

#### 8. [How to Read mnr /upstreams and the /verified Transparency Log](/learn/read-upstreams-verified-transparency-log/)
**Telemetry & Field Guide.** A practical guide for auditing mnr using its own public interfaces. Walks through every column on `/upstreams/` (latency, request caps, verified counts, faults), explains how fault penalties trigger automated ejections, and details how the weekly `/verified/` archive documents upstream provenance and operator opt-outs (`/.well-known/mnr-optout`).
- **Badge**: `Field Guide`
- **Topics**: `mnr upstreams`, transparency log, quorum tip, fault ejection, operator ethics, `mnr-optout`.

#### 9. [Connect to mnr over Tor or I2P (Onion and b32 Endpoints)](/learn/connect-mnr-over-tor-i2p/)
**Privacy & Network Hardening.** A comprehensive walkthrough for hiding your client IP from the mnr edge relay using Tor v3 onion and I2P endpoints. Covers exact CLI flags, proxy configurations for Feather, Cake, Monero GUI, and Monerujo, realistic sync performance over onion networks, and the current Ripley Terminal clearnet requirement.
- **Badge**: `How-To`
- **Topics**: Tor remote node, `.onion:80`, I2P `.b32.i2p`, SOCKS5 proxy, Feather, Cake, Monero GUI.

#### 10. [Point monero-wallet-rpc or an Agent at a Verified Monero RPC](/learn/monero-wallet-rpc-agent-verified-rpc/)
**Builders, Merchants & AI Agents.** Technical integration guide for connecting `monero-wallet-rpc` or custom autonomous bots to mnr. Covers minimal working flags, raw HTTPS path-form JSON-RPC endpoints (`/v1/<token>/json_rpc`), rate limits (Free 5 rps / Pro 25 rps), machine-readable `Mnr-Verify` response headers, and production retry/backoff patterns.
- **Badge**: `Builders`
- **Topics**: `monero-wallet-rpc`, daemon-login, bearer token auth, `Mnr-Verify` header, agent Monero RPC.

---

## Architectural Principles

Every explainer in this series adheres to mnr's core operational rules:

1. **Evidence Over Adjectives**: We never use marketing fluff like "untraceable," "bulletproof," or "military-grade." We describe mathematical properties, hash recomputations, and measured upstream numbers.
2. **Honesty About Limits**: A verified proxy is not a magic shield. It cannot verify subjective states like the mempool without running a local node, and on clearnet, the proxy sees the client's IP address. We document what cannot be verified just as thoroughly as what is checked.
3. **No Uptime Theater**: Neither the Free tier nor the Pro tier carries an uptime SLA. Because mnr routes across independent community-operated nodes, we promise verified answers and transparency—not guaranteed 100% availability.
4. **Full Disclosure**: mnr operates an owned full node (`node.kyc.rip`, restricted RPC on port 443), listed publicly on monero.fail. We disclose this node everywhere our pool is described.

---

## Next Steps & Operational Resources

- **[Documentation Hub](/docs/)**: Complete technical reference, wallet guides, and architecture specifications.
- **[Live Upstreams](/upstreams/)**: Real-time telemetry, latency, request caps, verified answer counts, and fault ejections for every node in the pool.
- **[Weekly Transparency Log](/verified/)**: Immutable weekly records of caught discrepancies and upstream node ejections.
- **[Method Policy](/docs/method-policy/)**: Complete table of verification rules, timeouts, and cache bounds for every supported Monero daemon RPC method.
- **[Get a Token](/get-token/)**: Generate a Zero-KYC access token to start querying `rpc.mnr.network`.
