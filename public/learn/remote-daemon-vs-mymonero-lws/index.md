# Remote Monero Daemon vs MyMonero / LWS: Keys Local vs Sharing a View Key

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero relation to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the npm package `mnr`.

When newcomer Monero users ask why their wallet takes several minutes to synchronize, they frequently run into two completely different architectural models:

1. **Daemon RPC** (used by Monero GUI, Feather, Cake Wallet, Monerujo, the CLI, and mnr).
2. **Light Wallet Server / LWS** (used historically by MyMonero, Edge, and self-hosted `monero-lws` backends).

Both models allow you to transact without downloading the entire 200+ GB Monero blockchain to your personal device. Because both are colloquially referred to as "remote services" or "light wallets," users routinely conflate them.

They are fundamentally different.

The divide comes down to a single question: **Does your private view key leave your device?**

In the Daemon RPC model, your private view key never leaves your machine; your wallet downloads block data and performs scanning calculations locally. In the Light Wallet Server model, you hand your private view key to an external server so *it* can scan the blockchain on your behalf.

This guide explains how both models work, what each server learns about your finances, and where a verified RPC relay like mnr fits into this threat landscape.

---

## Two ways wallets talk to the network

Because Monero uses stealth addresses and confidential amounts (RingCT), transactions on the public ledger do not disclose their recipient. There is no public index of which outputs belong to your address.

To discover your balance and incoming payments, every transaction on the blockchain must be checked against your wallet's private view key:

$$\text{Stealth Public Key } P = H_s(rA)G + B$$

Testing this equation requires taking the transaction's one-time public key ($rG$), multiplying it by your private view key ($a$), hashing the result, and checking if the output matches an unspent output on-chain.

Someone has to perform those mathematical operations. The difference between Daemon RPC and LWS is **who** does the math.

```
Model 1: Daemon RPC (Feather, Cake, GUI, CLI, mnr)
┌───────────────────────────┐         Raw Blocks / Blobs          ┌───────────────────────────┐
│     Client Device         │ ◄───────────────────────────────────┤       Remote Daemon       │
│                           │                                     │                           │
│ • Holds Spend Key         │          send_raw_transaction       │ • Holds LMDB Blockchain   │
│ • Holds Private View Key  ├────────────────────────────────────►│ • Relays P2P Packets      │
│ • Scans Outputs Locally   │                                     │ • NEVER sees View Key     │
└───────────────────────────┘                                     └───────────────────────────┘

Model 2: Light Wallet Server (MyMonero / LWS)
┌───────────────────────────┐         Private View Key + Address  ┌───────────────────────────┐
│     Client Device         │ ───────────────────────────────────►│    Light Wallet Server    │
│                           │                                     │                           │
│ • Holds Spend Key         │          Scanned Output List        │ • Holds Private View Key  │
│ • Exports View Key        │ ◄───────────────────────────────────┤ • Scans Every Tx for You  │
│ • Receives Pre-Filtered Tx│                                     │ • SEES ALL INCOMING TXS   │
└───────────────────────────┘                                     └───────────────────────────┘
```

---

## Daemon RPC: keys stay strictly local

In the Daemon RPC model, the remote server acts strictly as a raw data pipe.

When you open Feather, Monero GUI, or Cake Wallet pointed at a remote daemon (including `rpc.mnr.network`), the wallet asks the daemon for block headers and raw block blobs (`/get_blocks.bin`) starting from your wallet's restore height.

### Key security properties:
- **Private View Key Stays Local**: The mathematical calculations required to identify incoming stealth addresses are executed exclusively on your CPU.
- **Private Spend Key Stays Local**: When sending Monero, the ring signature and transaction proof are assembled and signed on your device. The daemon receives only the finished, opaque cryptographic blob (`send_raw_transaction`).
- **The Server Is Blind to Your Balance**: The remote daemon has no knowledge of how much Monero you hold, which stealth addresses belong to you, or whether any transaction in a downloaded block was addressed to you.

### What a remote daemon can still learn
While a remote daemon cannot see your balances or transactions, it is not invisible. Over clearnet, a remote daemon learns:
1. **Your IP Address**: The server's network socket logs your public IP address (unless you route traffic through Tor or I2P).
2. **Your Restore Height**: When your wallet begins synchronization, it requests blocks starting from a specific block height. The operator can infer when your wallet was originally created.
3. **Decoy Query Association**: When your wallet calls `get_outs` to fetch ring decoys, it requests public keys. While the real output is hidden among decoys, an operator analyzing repeated queries over time can attempt statistical clustering.

---

## LWS / MyMonero-style: server scans with your view key

The Light Wallet Server (LWS) protocol—pioneered by MyMonero and formalized in the open-source [`monero-lws`](https://github.com/vtnerd/monero-lws) daemon—was created to solve mobile battery and bandwidth constraints.

Scanning thousands of blocks on an older smartphone can drain the battery and consume hundreds of megabytes of mobile data. LWS eliminates this friction by shifting the scanning computation to a remote cloud server.

### How LWS works:
1. When you create or import a wallet into an LWS client, your wallet transmits your **public address** and your **private view key** to the server.
2. The server stores your view key in its database.
3. As new blocks arrive from the Monero network, the server's background workers scan every transaction using your view key.
4. When you open your mobile app, the client does not download raw blocks. It simply asks the server: *"Give me my transactions."* The server immediately returns a compact JSON list of your incoming transfers. Sync is instantaneous.

### The massive privacy tradeoff
Giving a third party your private view key completely strips away your incoming privacy:

- **Complete Incoming Transaction Visibility**: The server operator sees every incoming payment: the exact amount, the exact timestamp, the transaction ID, and the stealth output index.
- **Permanent Financial Audit Trail**: If the LWS provider is compromised, hacked, or legally compelled to hand over records, attackers obtain a permanent, unalterable log of your incoming financial history.
- **Address Linkage**: If you use your wallet across multiple devices, the LWS operator links those sessions directly to your public Monero address.

> **What the server still cannot do**: Even with your private view key, an LWS server **cannot spend your funds**. Monero requires your **private spend key** to sign ring signatures. Your spend key never leaves your device in standard LWS implementations. However, a malicious server could theoretically withhold transaction notifications or feed you manipulated data.

---

## Self-hosted LWS: the third path

It is vital to distinguish between a **third-party commercial LWS provider** and **self-hosting `monero-lws`**.

If you own a Linux home server or private cloud VPS, you can run both `monerod` and `monero-lws` yourself:
- Your private view key is stored only on your own physical hardware or private server.
- Your mobile phone connects to your personal LWS instance over WireGuard or Tor.
- You achieve instant mobile wallet synchronization without leaking financial metadata to any third-party company.

For technically adept users who require fast mobile sync without commercial surveillance, self-hosted LWS is an excellent architecture.

---

## Where mnr sits: verified daemon RPC

mnr operates **strictly in the Daemon RPC camp**.

mnr is an open-source, trust-minimized RPC relay designed to sit between standard Monero wallets and upstream nodes.

### The mnr architecture guarantees:
1. **Zero View-Key Exposure**: mnr speaks standard Monero daemon JSON-RPC and binary protocols. It **never requests, accepts, or stores private view keys, spend keys, or seed phrases**. If any service claiming to be mnr ever asks for a view key or mnemonic seed, it is a malicious phishing attempt.
2. **Client-Side Scanning**: Your wallet continues to scan blocks locally using your own hardware.
3. **Hash Recomputation**: Unlike an unverified public remote node, mnr recomputes block and transaction hashes directly to ensure upstream servers have not altered block data.
4. **Quorum Consensus**: Transient consensus states (`get_info`, block height) are verified across an independent multi-node quorum ($\ge 3$ nodes) before being returned to your wallet.
5. **No Request Logs**: Clearnet requests are processed entirely in memory without persistent IP or query logging (see [/docs/privacy/](/docs/privacy/)). For complete IP decoupling, mnr provides dedicated Tor and I2P endpoints.

```
┌──────────────────────────────────────────────────────────┐
│                      mnr Network                         │
│                                                          │
│  • Does it ask for your seed?         ► NO               │
│  • Does it ask for your view key?     ► NO               │
│  • Does it scan your transactions?    ► NO               │
│  • Does it verify blockchain answers? ► YES (Hashes/Tip) │
│  • Does it have an uptime SLA?        ► NO (Free/Pro)    │
└──────────────────────────────────────────────────────────┘
```

---

## Choosing by threat model

Use this criteria to decide which architecture fits your operational needs:

| Requirement / Threat Profile | Recommended Architecture | Why |
|---|---|---|
| **Absolute Sovereign Validation** | **Run your own `monerod`** | Recomputes all ring signatures locally; zero metadata exposure; complete independence. |
| **High Privacy, Low Storage / Fast Setup** | **mnr (Verified Daemon RPC)** | Zero local storage required; view keys stay local; answers cryptographically verified across multi-node quorum. |
| **Instant Mobile Sync, High Tech Skills** | **Self-Hosted `monero-lws`** | Zero mobile battery drain; view key remains on your own home server. |
| **Instant Mobile Sync, Zero Tech Skills** | **Commercial LWS** | Convenient, but you must accept that the operator sees your entire incoming transaction history. |
| **Unverified Public Node (monero.fail)** | **Not Recommended** | Exposes IP and metadata to a single stranger with zero consensus or hash verification. |

---

## Frequently Asked Questions

### Does mnr need my Monero view key?
**No.** mnr speaks standard daemon RPC. Your wallet retains your spend key and view key and performs all scanning operations locally on your machine. mnr must never ask for a seed, a private spend key, or a private view key.

### How is mnr different from MyMonero or LWS?
MyMonero and LWS require you to upload your private view key to a server so the server can scan blocks for you. mnr does not scan blocks for you; it acts as a verified relay pipe that serves raw, cryptographically checked blocks to your wallet for local client-side scanning.

### If mnr doesn't have my view key, is daemon RPC completely risk-free?
**No.** A remote daemon or relay still sees your network IP address (unless you connect via Tor or I2P) and knows which block heights your wallet requested. mnr verifies answers against mathematical hashes and independent quorum agreement, but running your own local node remains the ultimate standard of privacy.

### Can an LWS server steal my Monero?
**No.** An LWS server holds only your private view key, not your private spend key. The server can see how much money you receive, but it cannot create signatures or spend your coins. However, your incoming privacy is permanently compromised.

---

## Next Steps

- **Connect Your Wallet**: Point Feather, Cake, Monero GUI, or CLI at mnr using our step-by-step guides at [/docs/connect-wallets/](/docs/connect-wallets/).
- **Acquire a Token**: Generate a Zero-KYC bearer token at [/get-token/](/get-token/).
- **Review Method Verification**: See how mnr handles daemon RPC methods at [/docs/method-policy/](/docs/method-policy/).
- **Read Privacy Architecture**: Understand how mnr minimizes metadata exposure at [/docs/privacy/](/docs/privacy/).
