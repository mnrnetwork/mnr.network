# Connect a wallet

Every Monero wallet that can use a remote node can use mnr. You need one thing: a token. Get one on the [token page](/get-token/), then give the wallet the relay as its node with the token as the **login username**:

```
address:  rpc.mnr.network:443   (SSL on)
username: <token>
password: x                      (anything; it is not checked)
```

The token goes in the username slot, not the password slot. Stock wallets authenticate with HTTP Digest, which cannot check a password against a server that stores only hashes, so mnr reads the token from the username and ignores the password. The token still travels only inside TLS. Never paste a token into a chat or a screenshot: it is the whole credential.

For scripts, `curl` and anything that accepts a URL there is also the path form: `https://rpc.mnr.network/v1/<token>/json_rpc`. Stock wallets keep only the host and port of a daemon address and drop the path, so do not use the path form in a wallet.

---

## Dedicated wallet guides

For step-by-step screenshots, mobile background sync settings, and OS-specific certificate instructions, consult the dedicated guide for your client:

- [**Feather Wallet Guide**](/docs/wallets/feather/) — Desktop lightweight wallet with native Tor hidden service routing.
- [**Cake Wallet Guide**](/docs/wallets/cake-wallet/) — Mobile iOS & Android setup, Tor toggling, and background sync pacing.
- [**Monero GUI Guide**](/docs/wallets/monero-gui/) — Reference desktop client in Simple and Advanced Remote Node modes.
- [**Monerujo Guide**](/docs/wallets/monerujo/) — Android client with NetCipher and Orbot proxy integration.
- [**Ripley Terminal Guide**](/docs/wallets/ripley/) — Sovereign terminal shell & light wallet with client-side view key scanning and path-token uplink.
- [**CLI & RPC Guide**](/docs/wallets/cli/) — `monero-wallet-cli` flags, CA cert bundles across Linux/macOS/Windows, and `monero-wallet-rpc` backend services.

---

## Quick configuration reference

### monero-wallet-cli

```
monero-wallet-cli \
  --daemon-address rpc.mnr.network:443 \
  --daemon-login <token>:x \
  --daemon-ssl enabled \
  --daemon-ssl-ca-certificates /etc/ssl/certs/ca-certificates.crt
```

The CA bundle path is Debian and Ubuntu's; on Fedora it is `/etc/pki/tls/certs/ca-bundle.crt`, on macOS with Homebrew `$(brew --prefix)/etc/ca-certificates/cert.pem`. See the [CLI & RPC Guide](/docs/wallets/cli/) for full options.

### monero-wallet-gui

Settings → Node → **Remote node**.
- Address: `rpc.mnr.network`, Port: `443`
- Daemon username: `<token>`, Daemon password: `x`
- Tick **Use SSL** (some versions call it "Daemon SSL")
- Detailed walkthrough: [Monero GUI Guide](/docs/wallets/monero-gui/)

### Feather

Settings → Node → click **Add node**:
```
<token>:x@rpc.mnr.network:443
```
Feather accepts nodes in `user:password@host:port` format. Over Tor: `<token>:x@mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80`. Detailed walkthrough: [Feather Wallet Guide](/docs/wallets/feather/)

### Cake Wallet

Settings → Connection and sync → **Add node**:
- Node address: `rpc.mnr.network`, Port: `443`
- Login: `<token>`, Password: `x`
- Turn on **Use SSL**
- Detailed walkthrough: [Cake Wallet Guide](/docs/wallets/cake-wallet/)

### Monerujo

Settings → Node → add a node:
- Host: `rpc.mnr.network`, Port: `443`
- Username: `<token>`, Password: `x`
- Monerujo uses SSL automatically when the port is 443. Detailed walkthrough: [Monerujo Guide](/docs/wallets/monerujo/)

### Ripley Terminal (RipleyOS)

Ripley Terminal is a Monero wallet + private OS shell. It scans the chain itself (a light wallet with its own view key), so it only needs a daemon RPC endpoint — your mnr token URL works as that endpoint.

1. Get a token above (free tier is enough: a wallet sync is a few hundred requests).
2. In Ripley open **Settings** and scroll to **Uplink_Protocols**.
3. Under **Uplink_Routing** pick **Clearnet**.
4. In **Manual_Uplink_Address** paste your endpoint:
   ```
   https://rpc.mnr.network/v1/<token>
   ```
   Keep the `https://` and the `/v1/<token>` path, no trailing `/json_rpc`.
5. Save. The log should show `🔗 Connecting to pinned node…` followed by `✅ Fastest node: custom (https://rpc.mnr.network)`, then `⚡ Fast sync ON — bulk get_blocks.bin, trusting custom`.

That's it — sync, decoy selection and broadcasting all go through mnr from then on.

**Tor / I2P:** not yet. Ripley's Tor and custom-SOCKS routing modes dial `host:port` only and drop the URL path, so the token can't travel in the URL there and Ripley has no daemon-login field. Until Ripley gains daemon-login (Basic auth) support, use Clearnet mode with mnr; the connection is still TLS to `rpc.mnr.network`, and Ripley's own Tor mode is the alternative if you'd rather not pin a node at all.

**Privacy notes.** Ripley never sends your view key or address to the node — it downloads blocks in bulk and scans locally. What mnr sees is what any node sees. Ripley redacts the token from its own logs (it logs `https://rpc.mnr.network`, never the path).

**Requirements.** A Ripley Terminal build newer than 2.1.0 (2.1.0 and earlier fail to connect to mnr — see the [Ripley Terminal Guide](/docs/wallets/ripley/)).

### monero-wallet-rpc and backends

```
monero-wallet-rpc \
  --daemon-address rpc.mnr.network:443 --daemon-login <token>:x \
  --daemon-ssl enabled --daemon-ssl-ca-certificates /etc/ssl/certs/ca-certificates.crt \
  --wallet-file … --rpc-bind-port 18082 --disable-rpc-login
```

Anything that speaks daemon JSON-RPC or the `.bin` endpoints directly can use the path form: POST to `https://rpc.mnr.network/v1/<token>/json_rpc` or `/v1/<token>/get_height` and so on. The full list of methods, what is verified and what is cached is in the [method policy](/docs/method-policy/).

## Over Tor or I2P

The same relay, without the clearnet or TLS. Plain HTTP is fine here: the network layer carries the encryption.

- Tor: `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80`
- I2P: `misxlqjfq3wshjbn47fhzaqiagavaow2mgbfqrvxzdlybm7xtbvq.b32.i2p` (also `mnr.i2p` in address books)

```
monero-wallet-cli \
  --daemon-address mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80 \
  --daemon-login <token>:x \
  --proxy 127.0.0.1:9050
```

For I2P, point `--proxy` at your I2P router's HTTP or SOCKS proxy. Feather has built-in Tor routing; Cake and Monerujo can use a Tor proxy from their network settings.

---

## What changes, and what does not

Nothing in the wallet's behaviour changes. Sync, sending, receiving and fee estimates go through exactly the daemon calls the wallet makes today. What changes is behind the address: blocks and transactions are re-hashed, headers are matched against the relay's own header chain, and consensus state comes from a majority of nodes rather than one. Every response says what was checked in an `Mnr-Verify` header; a wallet does not read it, but a script or a curious human can:

```
curl -si -X POST https://rpc.mnr.network/v1/<token>/get_height -d '{}' | grep -i ^mnr-
```

```
mnr-verify: majority
mnr-agreeing: 3/3
mnr-cache: hit
mnr-tier: free
```

The meaning of every value is in the spec: [headers](https://github.com/mnrnetwork/mnr/blob/main/spec/headers.md), [verification rules](https://github.com/mnrnetwork/mnr/blob/main/spec/verification.md).

## If something does not work

- **Bad server response for authentication** — the token is in the password slot. Put it in the username: `--daemon-login <token>:x`.
- **SSL: certificate verify failed / wants `--daemon-ssl-allow-any-cert`** — add `--daemon-ssl-ca-certificates` with your system bundle (paths above).
- **401 unknown token** — mistyped, rotated more than 24 hours ago, or not a token. Get a new one.
- **403 subscription expired** — a Pro token past its month. Renew it on the [token page](/get-token/); the same token keeps working afterwards.
- **429 rate limited** — the tier's burst (5 requests per second on Free, 25 on Pro) or the monthly allowance. Wallets retry on their own.
- **502 / 503** — no upstream could answer, or none could be verified. The relay says which in the JSON body. Sync resumes on the next attempt.

Write to dev@mnr.network with the `Mnr-*` headers of a failing request if it keeps happening. Do not include the token.
