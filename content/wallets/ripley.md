# Connect Ripley Terminal (RipleyOS) to mnr

Ripley Terminal ([ripley.run/terminal](https://ripley.run/terminal)) is an air-gapped / hardened Monero wallet and sovereign private OS shell. It operates as a local light wallet with client-side view key scanning: it never sends your private view key or wallet address to any daemon. Instead, it pulls block data in bulk (`/get_blocks.bin`) and scans transactions locally on your machine.

Because Ripley Terminal only needs a daemon RPC endpoint, your mnr token URL functions directly as that verified endpoint.

---

## Quick configuration

In Ripley Terminal, navigate to **Settings &rarr; Uplink_Protocols**:

```
Uplink_Routing:         Clearnet
Manual_Uplink_Address:  https://rpc.mnr.network/v1/<token>
```

> **Important**: Keep the `https://` scheme and the `/v1/<token>` path exactly as shown. Do not append `/json_rpc`. Ripley posts each route as `<base>/<route>` (`json_rpc`, `get_blocks.bin`, `get_height`, etc.).

---

## Step-by-step setup

1. **Obtain an mnr token**: Generate an instant access token on the [token page](/get-token/). The Free tier (500,000 requests/month) is more than enough for regular wallet balance scanning and daily transactions without any signup, email, or KYC.
2. **Open Uplink Protocols Settings**: In Ripley Terminal, press `Esc` or open **Settings** and scroll down to **Uplink_Protocols**.
3. **Select Clearnet Routing**: Under **Uplink_Routing**, choose **Clearnet**.
4. **Enter Manual Uplink Address**: In the **Manual_Uplink_Address** field, paste your mnr token URL:
   ```
   https://rpc.mnr.network/v1/<token>
   ```
   Ensure there are no trailing spaces or `/json_rpc` appended to the path.
5. **Save & Connect**: Save your settings. The terminal log will confirm the connection:
   ```text
   🔗 Connecting to pinned node…
   ✅ Fastest node: custom (https://rpc.mnr.network)
   ⚡ Fast sync ON — bulk get_blocks.bin, trusting custom
   ```

From then on, blockchain synchronization, decoy selection, and transaction broadcasting are proxied and verified through mnr.

---

## Tor & I2P routing limitation

**Clearnet mode is required for mnr at this time.**

Ripley's native Tor and custom-SOCKS routing modes dial `host:port` directly and strip the URL path component. Because Ripley currently lacks a dedicated daemon-login field (HTTP Basic/Digest auth), the bearer token cannot travel in the URL path over Ripley's internal Tor proxy.

Until upstream Ripley adds daemon-login (`<token>:x`) support:
- Use **Clearnet** mode with mnr. The transport is fully TLS-encrypted to `rpc.mnr.network`.
- If you strictly prefer Tor onion routing and do not need to pin a specific mnr token, Ripley's native onion mode can be used to connect to random public onion nodes.

---

## Privacy & security guarantees

- **Client-side scanning**: Ripley never sends your private view key or Monero address to mnr or any daemon. It downloads blocks in bulk and tests outputs locally.
- **Log redaction**: Ripley automatically redacts bearer tokens from its local logs and session journals (it logs `https://rpc.mnr.network`, never the token path).
- **Daemon metadata**: What mnr sees is only what any remote daemon sees: requested block ranges, output distributions, and decoys when transmitting a transaction.
- **Consensus verification**: Every block header, transaction hash, and quorum height returned by mnr is verified across multiple independent upstream nodes.

---

## Technical specifications & facts

- **Configuration key**: Written to `customNodeAddress` in Ripley's `config.json`. A bare `host:port` is prefixed with `http://`; a full `https://…/v1/<token>` is preserved as-is.
- **Upstream routes used**: Every route Ripley uses is on mnr's allow-list:
  - `/get_height`
  - `json_rpc: get_info`
  - `json_rpc: get_fee_estimate`
  - `json_rpc: get_block`
  - `json_rpc: on_get_block_hash` (monero-oxide batch probe)
  - `/get_blocks.bin` (bulk sync)
  - `/get_output_distribution.bin`
  - `/get_outs.bin`
  - `/get_o_indexes.bin`
  - `/get_transactions`
  - `/is_key_image_spent`
  - `/send_raw_transaction`
  - Nothing from mnr's restricted deny-list (`get_transaction_pool`, `relay_tx`, `sync_info`, etc.) is ever called.
- **User-Agent handling**: Cloudflare protects `rpc.mnr.network` from generic automated scrapers (e.g. Python urllib is blocked with 403). Ripley's custom transport sends no User-Agent header, which passes cleanly through edge filtering.
- **Build requirement**: **Ripley Terminal build > 2.1.0 is required**. Earlier builds (2.1.0 and below) fail because monero-oxide's `MoneroDaemon::new` probes batch support by POSTing a JSON array `[]` to `/json_rpc`. While monerod returns HTTP 200 with a parse error, standard HTTP proxies return HTTP 400. Ripley builds after 2.1.0 inspect 4xx response bodies for JSON-RPC error envelopes and establish the uplink successfully.

---

## Response verification check

You can verify the connection status and multi-node consensus headers in any terminal:

```bash
curl -si -X POST https://rpc.mnr.network/v1/<token>/get_info -d '{}' | grep -i ^mnr-
```

Expected response headers:
```http
mnr-verify: majority
mnr-agreeing: 5/5
mnr-cache: hit
mnr-tier: free
```

---

## Troubleshooting

- **Connection fails immediately on startup**: Verify you are running Ripley Terminal build **> 2.1.0**. Builds 2.1.0 and earlier fail during monero-oxide's batch probe when receiving HTTP 400.
- **401 Unauthorized**: Ensure your token was copied accurately into `Manual_Uplink_Address`. Check for accidental whitespace or quotes.
- **Connection hangs when Tor is toggled**: Ripley's Tor mode drops the URL path token. Switch **Uplink_Routing** back to **Clearnet**.
- **Trailing /json_rpc error**: If you entered `https://rpc.mnr.network/v1/<token>/json_rpc`, Ripley will attempt to query `https://rpc.mnr.network/v1/<token>/json_rpc/get_blocks.bin` which fails. Remove `/json_rpc` from the address.
- **429 Rate Limited**: You have reached the burst rate cap (5 req/s on Free, 25 req/s on Pro). Ripley will back off and retry automatically.
