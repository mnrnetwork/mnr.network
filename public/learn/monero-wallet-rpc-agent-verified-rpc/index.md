# Point monero-wallet-rpc or an Agent at a Verified Monero RPC

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

Building automated payment flows, merchant checkouts, tip bots, or autonomous AI agents on Monero presents a unique systems challenge.

Unlike Ethereum or Solana, where a bot simply calls a hosted JSON-RPC node with a signed payload, Monero's privacy features require a dedicated cryptographic service: **`monero-wallet-rpc`**.

The `monero-wallet-rpc` binary is the bridge between application logic and the blockchain. It holds your wallet files, decrypts incoming stealth addresses using your private view key, signs ring signatures with your spend key, and handles outgoing transfers. To do this, `monero-wallet-rpc` must connect to an upstream daemon (`monerod`) to download blocks and broadcast transactions.

If you point `monero-wallet-rpc` at a random public node, an upstream operator can feed your bot a stale tip, omit transaction confirmations, or drop broadcasts. Conversely, running a local full `monerod` instance on every cloud container or serverless agent is expensive and operations-heavy.

Pointing `monero-wallet-rpc` at **mnr** gives your automated agents the middle ground: verified cryptographic block and transaction hashes, multi-node quorum consensus, zero-KYC bearer token auth, and machine-readable verification headers.

This guide provides the minimal production flags, raw JSON-RPC path-form URLs, rate-limit policies, and error-handling patterns required to deploy bots and agents against mnr reliably.

---

## The two processes: wallet-rpc vs daemon RPC

Before running commands, ensure your software architecture correctly separates wallet management from blockchain consensus:

```
┌────────────────────────────────────────────────────────┐
│             Your Application / AI Agent                │
│    (Python, TypeScript, Rust, Go, or Payment Script)   │
└───────────────────────────┬────────────────────────────┘
                            │ JSON-RPC (:18082, local)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  monero-wallet-rpc                     │
│                                                        │
│  • Holds Keys (spend key & view key in memory/disk)   │
│  • Scans Outputs Client-Side                           │
│  • Signs Transactions Locally                          │
│  • Listens on 127.0.0.1:18082 (Restricted)            │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / Digest Auth (:443)
                            ▼
┌────────────────────────────────────────────────────────┐
│               mnr (rpc.mnr.network:443)                │
│                                                        │
│  • Cryptographic Hash Recomputation                    │
│  • Multi-Node Quorum Consensus                         │
│  • Sensitive Methods Routed to Owned Node              │
│  • Appends Mnr-Verify Proof Headers                    │
└────────────────────────────────────────────────────────┘
```

1. **`monero-wallet-rpc`**: Runs locally or in your private Docker container. It holds your wallet file and keys. It **never shares your keys** with the daemon.
2. **`mnr` (Daemon RPC)**: Acts as the verified gateway to the Monero network. It validates blocks, establishes consensus height, and broadcasts signed transactions.

---

## Minimal working flags for monero-wallet-rpc

To connect `monero-wallet-rpc` to mnr over clearnet with full verification and security hardening, launch the binary with these exact flags:

```bash
monero-wallet-rpc \
  --daemon-address rpc.mnr.network:443 \
  --daemon-login <your-token>:x \
  --daemon-ssl enabled \
  --daemon-ssl-allow-any-cert false \
  --daemon-ssl-cacerts /etc/ssl/certs/ca-certificates.crt \
  --untrusted-daemon \
  --rpc-bind-ip 127.0.0.1 \
  --rpc-bind-port 18082 \
  --rpc-login botadmin:StrongLocalPassword123 \
  --wallet-file /path/to/bot_wallet \
  --password-file /path/to/wallet_password \
  --disable-rpc-login false \
  --confirm-external-bind false
```

### Key parameters explained:
- `--daemon-address rpc.mnr.network:443`: Connects to mnr's secure edge proxy.
- `--daemon-login <token>:x`: Authenticates via HTTP Digest auth. Your token, which begins `sub_` and is about 47 characters, goes in the username field; the password is ignored, so any dummy string (such as `x`) works.
- `--daemon-ssl enabled`: Enforces TLS 1.3 encryption.
- `--daemon-ssl-cacerts`: Points to your operating system's standard CA root bundle (`/etc/ssl/certs/ca-certificates.crt` on Debian/Ubuntu; `/etc/ssl/cert.pem` on macOS).
- `--untrusted-daemon`: **Mandatory**. Instructs `monero-wallet-rpc` to re-verify block hashes, outputs, and key images locally, refusing to trust the remote endpoint blindly.
- `--rpc-bind-ip 127.0.0.1`: **Critical**. Ensures the wallet RPC interface binds strictly to localhost, preventing unauthorized remote access to your wallet.

---

## Raw HTTPS path-form for scripts and autonomous agents

If you are writing a custom bot, autonomous agent, or microservice that does not use `monero-wallet-rpc` but interacts with Monero daemon endpoints directly (e.g. querying blockchain height, checking fee estimates, or fetching raw block headers), you can query mnr directly using the **path-form URL**.

Instead of negotiating HTTP Digest authentication headers, pass your bearer token directly in the URL path:

```
https://rpc.mnr.network/v1/<token>/json_rpc
```

### Example: querying consensus tip from Python or cURL

```bash
curl -s -X POST "https://rpc.mnr.network/v1/$MNR_TOKEN/json_rpc" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"0","method":"get_info"}'
```

### Supported path-form routes:
- **JSON-RPC**: `https://rpc.mnr.network/v1/<token>/json_rpc`
- **Binary Blocks**: `https://rpc.mnr.network/v1/<token>/get_blocks.bin`
- **Output Distribution**: `https://rpc.mnr.network/v1/<token>/get_output_distribution.bin`
- **Height Probe**: `https://rpc.mnr.network/v1/<token>/get_height`

Every route adheres to the strict validation policies detailed in our [Method Policy](/docs/method-policy/).

---

## Machine-readable observability: reading `Mnr-Verify` headers

mnr does not silently pass data through. Every HTTP response returned to your application includes explicit cryptographic verification headers.

Your bot or agent logic should inspect these headers before finalizing high-value state:

```http
HTTP/2 200 OK
Content-Type: application/json
Mnr-Verify: majority
Mnr-Cache: miss
Mnr-Upstream: 7
```

### Header definitions:
- **`Mnr-Verify`**:
  - `chain`: confirmed against the relay's own header chain.
  - `hash`: the recomputed hash matched what the client asked for.
  - `majority`: consensus state agreed by a majority of upstreams.
  - `agreement`: identical answers from the number of upstreams your tier requires.
  - `partial`: some entries of a batch verified and some could not be.
  - `none`: not verifiable, annotated rather than trusted silently.
  - `failed`: every upstream's answer failed verification (error responses only).
- **`Mnr-Cache`**: whether the answer came from cache, and how.
- **`Mnr-Upstream`**: the id of the upstream that answered.
- **`Mnr-Relayed: k/n`**: on writes only, how many upstreams accepted the transaction.

> **Security Rule**: In your agent's logging framework, **always redact the URL path and daemon-login credentials**. Log the `Mnr-Verify` status, but never write your token to disk or cloud logging services.

---

## Production realism: rate limits, errors, and no-SLA architecture

When engineering automated payment bots or autonomous agents, build for reality, not marketing promises.

### 1. Rate limits and work units
Review our token capacity definitions at [/docs/tokens/](/docs/tokens/):
- **Free Tier**: 5 requests per second (rps) burst; 500,000 work units per month. Ideal for testing and low-frequency bots.
- **Pro Tier ($9/mo in XMR)**: 25 requests per second (rps) burst; 10,000,000 work units per month; 3 concurrent sync streams; `get_outs` must agree across two upstreams.

If your agent exceeds its rate cap, mnr returns **HTTP 429 Too Many Requests**.

### 2. Required retry and backoff logic
Neither mnr Free nor mnr Pro provides an uptime SLA. Because mnr aggregates independent community upstreams that it does not own, upstream nodes may reboot or partition.

Your bot must handle:
- **HTTP 429**: Exponential backoff with jitter (e.g. pause 1s, 2s, 4s).
- **HTTP 502 / 504**: Transient upstream failover. Retry the query after a brief delay.
- **Circuit Breakers**: If mnr returns persistent errors during transaction broadcast (`send_raw_transaction`), hold the payment queue in memory or database storage rather than failing noisily.

---

## Safety checklist for autonomous agents

Before deploying your Monero agent or payment daemon to production, confirm each invariant:

- [ ] **Untrusted Daemon Enabled**: The `--untrusted-daemon` flag is set on `monero-wallet-rpc`.
- [ ] **Loopback Bind**: `monero-wallet-rpc` binds strictly to `127.0.0.1`, protected by strong RPC credentials.
- [ ] **No View-Key Leakage**: Your code never transmits private view keys or mnemonic seeds over network sockets.
- [ ] **Credential Hygiene**: The token is stored as an environment variable (`MNR_TOKEN`), not committed to git.
- [ ] **Retry Logic Configured**: The bot handles HTTP 429 and 502 codes with exponential backoff.
- [ ] **Header Inspection**: Critical payment flows assert that `Mnr-Verify` is not falsified.

---

## Frequently Asked Questions

### Can an AI agent or automated script use mnr without monero-wallet-rpc?
**Yes**, for read-only queries. Scripts can query `https://rpc.mnr.network/v1/<token>/json_rpc` directly to check heights, fee estimates, and block headers. However, scanning incoming transactions and creating signed transfers requires private key calculations that only `monero-wallet-rpc` (or a client-side cryptographic library) can perform.

### Should production payment bots check the "Trusted" flag?
**Never.** Always run with `--untrusted-daemon` (or `trusted: false`). A third-party daemon should never be trusted to calculate balances or key images on behalf of an automated financial bot.

### What happens if mnr goes down while my bot is running?
Your bot's RPC requests will return HTTP 502 or connection timeouts. `monero-wallet-rpc` will pause synchronization until connectivity is restored. Your keys and balances remain safe on your server. Because mnr offers no uptime SLA on Free/Pro, production services should implement monitoring and alert hooks.

---

## Next Steps

- **Acquire a Token**: Get a Free or Pro bearer token at [/get-token/](/get-token/).
- **Review Rate Limits**: Detailed tier specifications on [/docs/tokens/](/docs/tokens/).
- **Inspect Method Verification**: Review verification levels for all RPC calls at [/docs/method-policy/](/docs/method-policy/).
- **Monitor Network Health**: Check live upstream consensus on [/upstreams/](/upstreams/).
