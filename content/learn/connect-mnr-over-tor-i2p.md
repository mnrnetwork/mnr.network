# Connect to mnr over Tor or I2P (Onion and b32 Endpoints)

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

When you connect your Monero wallet to `rpc.mnr.network:443` over clearnet, your transport is protected by TLS encryption, and your answers are verified across an independent multi-node quorum.

However, **clearnet routing means the mnr edge relay sees your public IP address**.

mnr operates under a strict anti-surveillance architecture: it writes no request log (no paths, no tokens, no client addresses) and strips client headers before forwarding queries to upstream daemons; the one thing keyed to your address is an in-memory hash used to throttle token issuance, which dies with the process (see our [Privacy Policy](/docs/privacy/)). But in cryptography and security engineering, a claim of "we do not log" requires social trust.

If your threat model demands mathematical decoupling between your physical location and the relay, you should connect to mnr over **Tor** (`.onion`) or **I2P** (`.i2p`).

Routing through an anonymity network ensures that the relay only sees an exit node or circuit rendezvous—not your home broadband or mobile IP address.

This guide provides the exact addresses, proxy recipes, and wallet configurations needed to reach mnr over Tor and I2P, while setting realistic expectations about latency, sync performance, and remaining metadata limits.

---

## The published onion and I2P endpoints

mnr serves verified Monero RPC across three official transports. The same Zero-KYC bearer token functions across all three:

| Transport | Address & Port | Protocol | Encryption Notes |
|---|---|---|---|
| **Clearnet (Default)** | `rpc.mnr.network:443` | HTTPS | TLS 1.3 encrypted; relay sees client IP. |
| **Tor Onion** | `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80` | HTTP | Native end-to-end Tor v3 onion encryption. No SSL/TLS cert required. |
| **I2P B32** | `misxlqjfq3wshjbn47fhzaqiagavaow2mgbfqrvxzdlybm7xtbvq.b32.i2p` (or `mnr.i2p`) | HTTP | End-to-end I2P garlic routing. |

> **Why Port 80 on Tor?**  
> Over Tor v3, connection encryption and authentication are handled cryptographically by the Tor protocol itself using public-key cryptography. Wrapping an onion service in an additional layer of commercial TLS (HTTPS) is redundant and requires trusting a certificate authority. Use `http://` or port `80` when connecting over `.onion`.

---

## Connecting via CLI and monero-wallet-rpc

The official `monero-wallet-cli` and `monero-wallet-rpc` binaries include built-in SOCKS5 proxy support via the `--proxy` command-line flag.

### Prerequisites:
Ensure your local Tor daemon is running. On Linux and macOS, Tor typically listens for SOCKS5 connections at `127.0.0.1:9050` (standalone daemon) or `127.0.0.1:9150` (if running Tor Browser).

### Monero CLI recipe over Tor:
```bash
monero-wallet-cli \
  --daemon-address mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80 \
  --daemon-login <your-token>:x \
  --proxy 127.0.0.1:9050 \
  --untrusted-daemon
```

### Critical CLI flags explained:
- `--daemon-address mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80`: Points the wallet at mnr's dedicated Tor onion service.
- `--daemon-login <token>:x`: Authenticates your connection using HTTP Digest authentication. Place your token in the username slot; it begins `sub_` and is about 47 characters. The password is ignored, so any placeholder such as `x` works.
- `--proxy 127.0.0.1:9050`: Forces the wallet's network socket through your local Tor SOCKS5 proxy.
- `--untrusted-daemon`: **Essential**. Enforces local cryptographic verification for all incoming blocks and outputs. (See [Never Tick 'Trusted Third-Party Node'](/learn/never-tick-trusted-third-party-node/)).
- **Notice**: We deliberately omit `--daemon-ssl enabled` when connecting to `.onion:80`.

---

## Wallet-by-wallet setup

Different desktop and mobile wallets handle Tor routing differently. Here is how to configure major clients:

### 1. Feather Wallet
[Feather](/docs/wallets/feather/) has the most mature Tor integration in the Monero ecosystem. It includes an embedded Tor client and can route all traffic through Tor automatically.

1. Open Feather and navigate to **Settings &rarr; Network**.
2. Under **Tor**, ensure **Use Tor** is set to **Always** or **Built-in**.
3. Go to **Settings &rarr; Node**.
4. In the node list, click **Add Node** and enter:
   ```text
   <token>:x@mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80
   ```
5. Leave the SSL checkbox **unchecked**.
6. Mark the node as active. Feather will establish a Tor circuit directly to the mnr onion service.

---

### 2. Cake Wallet (iOS & Android)
[Cake Wallet](/docs/wallets/cake-wallet/) supports Tor routing natively on Android and via Orbot on iOS.

1. In Cake Wallet, open the menu and select **Settings &rarr; Tor**.
2. Toggle **Tor** to **ON**.
3. Return to **Settings &rarr; Nodes**.
4. Tap **Add New Node**:
   - **Node Address**: `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion`
   - **Port**: `80`
   - **Login / Username**: `<your-token>`
   - **Password**: `x`
   - **Use SSL**: **OFF**
5. Save and tap the newly created node to connect.

---

### 3. Monero GUI
The official [Monero GUI](/docs/wallets/monero-gui/) supports Tor starting in Simple and Advanced modes.

1. Ensure a local Tor SOCKS proxy is active (`127.0.0.1:9050`).
2. Go to **Settings &rarr; Interface &rarr; Socks5 proxy**:
   - Enter `127.0.0.1:9050`.
3. Switch to **Settings &rarr; Node**:
   - Choose **Remote Node**.
   - **Address**: `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion`
   - **Port**: `80`
   - **Daemon Username**: `<your-token>`
   - **Daemon Password**: `x`
   - **Mark as Trusted Daemon**: **LEAVE UNCHECKED**.
4. Click **Connect**.

---

### 4. Monerujo (Android)
[Monerujo](/docs/wallets/monerujo/) pairs with **Orbot** (the Tor project's Android client).

1. Open Orbot and start the VPN or SOCKS proxy mode.
2. In Monerujo, tap the node icon and choose **Add Node**:
   - **Address**: `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80`
   - **Username**: `<your-token>`
   - **Password**: `x`
3. Connect through Orbot's proxy.

---

## Known limitation: Ripley Terminal

If you use [Ripley Terminal (RipleyOS)](/docs/wallets/ripley/), **use Clearnet mode at this time**.

Ripley Terminal operates an air-gapped, client-side scanning shell. While Ripley includes a native Tor toggle, its current internal network stack dials `host:port` directly over SOCKS and strips the URL path component. Because Ripley currently lacks dedicated HTTP Digest auth input fields (`<token>:x`), bearer tokens cannot travel in the URL path over Ripley's internal Tor proxy.

To use mnr with Ripley Terminal:
- Set **Uplink_Routing** to **Clearnet**.
- Set **Manual_Uplink_Address** to `https://rpc.mnr.network/v1/<token>`.
- The connection is fully encrypted via TLS 1.3 to `rpc.mnr.network`.

---

## What Tor fixes—and what it does not

Routing over Tor or I2P is a powerful privacy upgrade, but it is not a silver bullet. You must remain clear about what changes:

### What Tor solves:
- **IP Obfuscation**: The mnr edge proxy sees a Tor circuit rendezvous point. It cannot determine your physical geographic location, home IP, or internet service provider.
- **Local Network Censorship**: If your ISP, school, or national firewall blocks Monero RPC ports or `rpc.mnr.network`, onion routing bypasses the filter seamlessly.

### What Tor does not solve:
- **Query Metadata at the Relay**: Tor hides *who* is asking; it does not hide *what* is being asked. The mnr relay still sees the requested block ranges and decoy queries. (mnr does not log these queries, but running your own local node is the only way to keep queries off the wire entirely).
- **Network-Wide P2P Sniffing**: When your transaction is broadcast to the Monero mempool, rogue P2P spy nodes can still see the transaction enter the gossip network. (mnr broadcasts your transaction to every healthy upstream at once and reports how many accepted it, which makes a single node dropping it harmless, but does not alter Monero's P2P topology).
- **No Uptime SLA**: Tor circuits add latency and occasional packet drops. Neither mnr Free nor mnr Pro provides an uptime SLA.

---

## Sync performance over onion networks

Be prepared for realistic performance: **initial blockchain sync over Tor or I2P is noticeably slower than clearnet**.

Downloading raw blocks (`/get_blocks.bin`) involves streaming megabytes of cryptographic signatures through multiple encrypted hops. High latency and circuit congestion can cause sync speeds to drop.

### Practical tip:
If you are restoring an older wallet with years of history:
1. Consider doing the initial large block sync on a trusted local node or over high-speed clearnet using mnr with a restore height close to your first transaction date.
2. Once the wallet is caught up to the current tip, switch your daemon address to the mnr Tor onion for ongoing daily balance checks and transaction broadcasting.

---

## Troubleshooting Tor & I2P connections

| Issue | Likely Cause | Solution |
|---|---|---|
| **Connection Timed Out** | Local Tor daemon is not running. | Verify `systemctl status tor` or ensure Tor Browser / Orbot is running. |
| **HTTP 401 Unauthorized** | Token missing or formatted incorrectly. | Ensure the whole token, `sub_` prefix included, is in the username slot and a placeholder (like `x`) is in the password slot. |
| **SSL / TLS Handshake Error** | SSL enabled on port 80. | Turn **OFF** the SSL / HTTPS toggle in your wallet settings when using `.onion:80`. |
| **Slow Sync / Freezing** | Congested Tor circuit. | In your wallet, disconnect and reconnect to force Tor to establish a fresh circuit. |

---

## Frequently Asked Questions

### Does using mnr over Tor make me 100% anonymous?
**No.** Tor hides your IP address from mnr. However, the relay still receives your RPC queries (block ranges, decoy requests). While mnr recomputes hashes, verifies quorum, and enforces a zero-logging architecture, true cryptographic isolation is only possible by running your own local `monerod`.

### Do I need to buy a separate token for Tor?
**No.** The exact same Free or Pro bearer token works across clearnet (`rpc.mnr.network:443`), Tor (`.onion:80`), and I2P (`.b32.i2p`).

### Why does mnr use HTTP instead of HTTPS over Tor?
Tor v3 onion addresses are self-authenticating cryptographic keys. All traffic between your client and mnr's onion service is end-to-end encrypted and authenticated by the Tor protocol itself. Adding HTTPS is unnecessary and introduces centralized Certificate Authority dependencies.

---

## Next Steps

- **Acquire a Bearer Token**: Generate an instant access token at [/get-token/](/get-token/).
- **Step-by-Step Wallet Guides**: Detailed screenshots for Feather, Cake, Monero GUI, and Monerujo at [/docs/connect-wallets/](/docs/connect-wallets/).
- **Understand Privacy Guarantees**: Read our full architecture breakdown at [/docs/privacy/](/docs/privacy/).
- **Check Consensus Tip**: Verify current tip height on [/upstreams/](/upstreams/).
