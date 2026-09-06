# Connect monero-wallet-cli & monero-wallet-rpc to mnr

`monero-wallet-cli` and `monero-wallet-rpc` are the official command-line tools and backend daemon clients for Monero. They are used by terminal power users, merchants, automated payment gateways, and backend services. This guide covers connecting CLI and RPC services to mnr with SSL certificate verification, authentication, and Tor/I2P proxying.

---

## Quick command

Launch `monero-wallet-cli` with TLS and authentication:

```bash
monero-wallet-cli \
  --daemon-address rpc.mnr.network:443 \
  --daemon-login <token>:x \
  --daemon-ssl enabled \
  --daemon-ssl-ca-certificates /etc/ssl/certs/ca-certificates.crt
```

> **Important**: Put your token in the username part of `--daemon-login <token>:x`. Stock Monero CLI authenticates using HTTP Digest auth; mnr checks the token from the username and ignores the password.

---

## CA Certificate Bundles by Operating System

When `--daemon-ssl enabled` is passed, `monero-wallet-cli` strictly requires a CA bundle to authenticate the server's certificate. Point `--daemon-ssl-ca-certificates` to your system's certificate path:

| Operating System | CA Bundle Path |
|:---|:---|
| **Debian / Ubuntu / Raspberry Pi OS** | `/etc/ssl/certs/ca-certificates.crt` |
| **Arch Linux / Manjaro** | `/etc/ssl/certs/ca-certificates.crt` |
| **Fedora / RHEL / CentOS** | `/etc/pki/tls/certs/ca-bundle.crt` |
| **macOS (Homebrew)** | `$(brew --prefix)/etc/ca-certificates/cert.pem` |
| **macOS (System Keychain export)** | `/etc/ssl/cert.pem` |
| **Windows** | Export system root certs to a `.crt` file or pass `--daemon-ssl-allow-any-cert` |

> `--daemon-ssl-allow-any-cert` bypasses certificate validation. Use it only for temporary diagnostic testing if your local CA bundle is misconfigured.

---

## Connecting monero-wallet-rpc (Backends & Merchants)

For automated payment services, crypto payment processors, or multi-user backend daemons:

```bash
monero-wallet-rpc \
  --daemon-address rpc.mnr.network:443 \
  --daemon-login <token>:x \
  --daemon-ssl enabled \
  --daemon-ssl-ca-certificates /etc/ssl/certs/ca-certificates.crt \
  --wallet-file /var/monero/wallets/merchant.wallet \
  --password-file /var/monero/wallets/merchant.pass \
  --rpc-bind-port 18082 \
  --disable-rpc-login
```

### Path-form for direct JSON-RPC scripts:
If you are querying the Monero daemon directly from Python, Node.js, Go, or cURL without a wallet binary, use the direct path token endpoint:

```bash
curl -s -X POST https://rpc.mnr.network/v1/<token>/json_rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"0","method":"get_info"}'
```

---

## Tor & I2P Routing

To run completely isolated from clearnet and DNS leakage:

### Over Tor (.onion)
```bash
monero-wallet-cli \
  --daemon-address mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80 \
  --daemon-login <token>:x \
  --proxy 127.0.0.1:9050
```

### Over I2P
```bash
monero-wallet-cli \
  --daemon-address misxlqjfq3wshjbn47fhzaqiagavaow2mgbfqrvxzdlybm7xtbvq.b32.i2p \
  --daemon-login <token>:x \
  --proxy 127.0.0.1:4447
```

---

## What the `Mnr-*` Response Headers Mean

Every response from mnr includes verification metadata headers indicating how the data was checked:

```bash
curl -si -X POST https://rpc.mnr.network/v1/<token>/get_height -d '{}' | grep -i ^mnr-
```

- `Mnr-Verify: majority`: Consensus state verified against ≥3 independent upstream nodes.
- `Mnr-Verify: hash-match`: Block or transaction recomputed from raw bytes and verified against header chain / txid.
- `Mnr-Agreeing: 5/5`: Number of healthy nodes in consensus.
- `Mnr-Cache: hit | miss`: SWR cache status.
- `Mnr-Tier: free | pro`: Tier associated with the active token.

---

## Troubleshooting

- **Error: "SSL certificate verify failed"**: Verify that `--daemon-ssl-ca-certificates` points to a valid file on disk. Run `ls -l <path>` to check existence.
- **Error: "Bad server response for authentication"**: The token was passed in the password slot (`--daemon-login user:<token>`). Correct it to `--daemon-login <token>:x`.
- **Error: 401 Unauthorized**: The token is invalid, rotated, or expired. Obtain a new one at [mnr.network/get-token/](/get-token/).
- **Error: 429 Too Many Requests**: Request throughput exceeded burst rate limit (5 req/s on Free tier). Use a Pro token for 25 req/s or slow down wallet sync threads.
