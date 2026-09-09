# Never Tick Trusted on a Third-Party Monero Node—What the Flag Actually Does

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

When setting up a remote node in Monero GUI, Feather, Cake Wallet, or `monero-wallet-cli`, users often encounter a setting labeled **"Trusted Daemon"** or `--trusted-daemon`.

Many users assume "trusted" means: *"I know this operator,"* or *"I want a reliable connection."* They tick the checkbox or pass the flag, believing it enables optimal performance or unlocks features.

**Never tick Trusted on a third-party node.**

The Trusted daemon flag does not mean you trust the operator's good intentions. In the Monero wallet protocol, it is an explicit security directive telling your wallet to disable safety checks and privacy guards that protect you against a malicious node. Ticking that box on any remote node—whether a random host from [monero.fail](https://monero.fail), a famous community node, or even mnr—weakens your wallet's defense model.

This guide explains what the Trusted flag actually changes in the wallet codebase, what risks remain even with the flag disabled, and why a verified RPC relay like mnr requires you to leave Trusted firmly **off**.

---

## Two different trusts (do not mix them)

The confusion around the Trusted daemon flag stems from an unfortunate collision between social trust and cryptographic trust:

1. **Social Trust (Operator Reputation)**: You might respect a community member who runs a public node. You might believe they will not willingly log your IP or tamper with responses. This is subjective human reputation.
2. **Protocol Trust (`--trusted-daemon`)**: This is a binary programmatic setting in the Monero wallet client. When enabled, it informs the wallet software: *"The daemon running at this address is physically controlled by me on my local machine or private network. You may execute unrestricted administrative RPCs and skip client-side privacy mitigations."*

Social reputation does not change protocol behavior. Even the most benevolent node operator can suffer a silent server breach, run buggy pre-release daemon binaries, or be legally compelled to log incoming connections. The Monero wallet architecture assumes all remote endpoints are potentially adversarial.

---

## What the Trusted daemon flag actually changes

In the official Monero codebase (`monero/src/wallet/wallet2.cpp`), the wallet checks `m_is_trusted_daemon` when deciding how to handle RPC requests and responses. Enabling the flag alters several critical wallet behaviors:

### 1. Decoy Obfuscation & Dummy Queries
When creating a transaction in untrusted mode, your wallet fetches decoys using `/get_outs.bin`. To prevent the node from guessing which output belongs to you based on your exact query patterns, the wallet obfuscates its request pattern, batching queries and requesting extra dummy outputs.
- **In Untrusted Mode (Default)**: The wallet fetches batches of outputs with timing noise to prevent the daemon from correlating the exact outputs being queried with an immediate spend.
- **In Trusted Mode (`--trusted-daemon`)**: The wallet assumes the node is local and will never spy on you. It may bypass decoy fetching jitter and request outputs directly, reducing latency at the direct expense of privacy.

### 2. Client-Side Hash Verification
In untrusted mode, the wallet performs rigorous client-side checks on block headers received from the daemon. It verifies proof-of-work hashes and ensures the chain matches known checkpoint hashes. When marked trusted, certain verification loops are relaxed or skipped under the assumption that the local node has already fully validated the blockchain.

### 3. Execution of Restricted and Sensitive Commands
Several sensitive wallet commands are blocked entirely unless connected to a trusted daemon:
- `rescan_spent`: Forces the wallet to re-check all key images against the daemon.
- `start_mining`: Directs the daemon to begin proof-of-work mining on a specific thread count.
- In `monero-wallet-rpc`, calling certain administrative methods will throw an explicit error (`-32601` or "Daemon is untrusted") unless the `--trusted-daemon` flag was passed at startup.

### Defaults: local Trusted, remote Untrusted

The Monero software enforces safe defaults:
- If your daemon address is `127.0.0.1`, `localhost`, or a Unix domain socket, the wallet defaults to **Trusted**.
- If your daemon address is an external IP, a public hostname, or a `.onion` address, the wallet defaults to **Untrusted** (`--untrusted-daemon`).

You should never manually override this default for any remote server.

---

## What a third-party node can still learn with Trusted off

Leaving Trusted off is essential, but it is not a silver bullet. An untrusted remote node still learns significant metadata about your wallet simply by answering standard queries:

| Data Visible to Node | How the Node Learns It | Impact on Privacy |
|---|---|---|
| **Your IP Address** | TCP connection handshake | Geolocation and ISP tracking (unless using Tor/I2P). |
| **Restore / Sync Height** | Starting block height of your sync request | Reveals roughly when your wallet was created. |
| **Active Scan Windows** | When your wallet connects to fetch blocks | Reveals active hours and transaction frequency. |
| **Queried Output Sets** | `/get_outs.bin` and `/get_output_distribution` | The node knows your ring members are contained within the queried output candidate pool. |
| **Broadcast Timing** | Exact timestamp of `send_raw_transaction` | The node sees the transaction before it is relayed to the wider P2P network. |

Routing your remote connection over Tor (`.onion`) or I2P eliminates IP logging, but the node still sees the RPC queries themselves. This is why running your own local node (`monerod`) remains the only way to achieve complete metadata sovereignty.

---

## Why you still never tick Trusted for mnr

mnr (`rpc.mnr.network`) is a **verified Monero RPC relay**. It recomputes block and transaction hashes, verifies tip consensus across multiple independent nodes, and logs faults publicly.

Despite these protections, **you must never tick Trusted when connecting to mnr**:

1. **Verification Belongs on the Relay, Not in the Wallet**: mnr provides verification at the proxy level. The wallet client must continue to treat the connection as an external, untrusted channel. Leaving untrusted mode active preserves client-side decoy noise and header validation.
2. **mnr Does Not Support Restricted Admin RPCs**: mnr actively blocks administrative calls like `/start_mining`, `/save_bc`, and `/stop_daemon` at the edge with HTTP 403 Forbidden. Ticking Trusted will not unlock these methods; mnr enforces restricted RPC for security.
3. **Honesty About Remote Risks**: mnr does not claim to replace a local node. Treating mnr as untrusted aligns with the fundamental cypherpunk tenet: *don't trust, verify*.

In Feather Wallet, Cake Wallet, and Monero GUI, leave the "Trusted Daemon" box **unchecked**. In `monero-wallet-cli`, omit `--trusted-daemon` (or explicitly pass `--untrusted-daemon`).

---

## What mnr verifies instead

If your wallet keeps the daemon untrusted, what does mnr actually do for you?

Standard untrusted mode protects the wallet from certain types of daemon surveillance, but it cannot prevent a single remote node from serving a stale blockchain height, withholding transaction confirmations, or feeding corrupted block headers.

mnr verifies what a single remote node can manipulate:

- **Block Hash Recomputation**: Every block blob fetched via `get_block` is re-hashed by the relay to ensure the cryptographic proof matches the requested block hash.
- **Transaction Hash Matching**: Transaction blobs fetched via `/get_transactions` are hashed and compared to their declared txid.
- **Tip Quorum Consensus**: The network height and top block hash returned on `get_info` and `/get_height` must be confirmed by at least three independent, unaffiliated upstreams (e.g., Cake Wallet, Seth For Privacy, HashVault).
- **Cryptographic Transparency**: Every response carries an `Mnr-Verify` header declaring exactly how the response was validated (`chain`, `hash`, `majority`, `agreement`, `partial`, `none`, or `failed`).
- **Public Accountability**: Any upstream node that fails verification three times in one hour is ejected for 24 hours and recorded on the public [Upstreams](/upstreams/) and [Weekly Verification](/verified/) ledgers.

You get multi-node correctness guarantees while keeping your wallet's client-side defenses fully engaged.

---

## Remote daemon setup checklist

Whenever you connect a Monero wallet to any remote node (including mnr), use this checklist to ensure proper security posture:

```
[ ] 1. TLS Encryption: Ensure SSL is enabled (Port 443 on clearnet).
[ ] 2. Trusted Daemon: UNCHECKED (always leave untrusted).
[ ] 3. Authentication: Enter your access token in the Username field; set Password to 'x'.
[ ] 4. Transport Privacy: If IP privacy is critical, route through the mnr Tor onion address:
       mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80
[ ] 5. View Keys: Verify the wallet is NOT prompting you for your private view key (mnr is pure daemon RPC; never enter your view key into a website or server).
```

---

## Answer-ready summary

### Should I enable the Trusted Daemon checkbox when using mnr.network?
**No.** Treat mnr like any remote daemon: leave Trusted unchecked. mnr's value is relay-side cryptographic verification and multi-node consensus—not asking your wallet to lower its defenses.

### What does the Trusted checkbox actually mean in Monero?
It informs your wallet that the connected node is under your physical control (typically running on `localhost`). It allows the wallet to skip client-side decoy obfuscation and enables administrative commands. It was never intended for third-party public nodes.

### If I leave Trusted off, am I safe from a malicious node?
Untrusted mode preserves essential wallet precautions, but a single remote node can still serve stale blockchain heights, delay transactions, or log metadata. That is why a verified relay checks data against multiple independent nodes before returning it to your wallet.

---

## Next steps

- Read the architectural definition: [What Is a Verified Monero RPC?](/learn/what-is-verified-monero-rpc/)
- Inspect per-method verification rules: [Method Policy](/docs/method-policy/)
- Connect your wallet with Trusted off: [Connect a Wallet](/docs/connect-wallets/)
