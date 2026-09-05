# Connect Feather Wallet to mnr

Feather is a lightweight desktop Monero wallet designed for privacy, speed, and Tails/Tor compatibility. Connecting Feather to mnr gives you multi-node consensus verification on every block header and transaction while keeping Feather completely stateless with zero personal accounts and zero request logging.

---

## Quick configuration

In Feather, navigate to **Settings → Network → Node**:

```
Mode:             Custom node
Node address:     rpc.mnr.network:443
Daemon username:  <token>
Daemon password:  x
Use SSL:          Checked (enabled)
```

> **Important**: Put your token in the **username** field, not the password field. Stock Monero wallets authenticate using HTTP Digest auth, which cannot check passwords against a server that only stores secure hashes. The relay reads the token from the username and ignores the password.

---

## Step-by-step setup

1. **Obtain an mnr token**: Generate an instant access token on the [token page](/get-token/). Free tier requires no signup, no email, and no credit card.
2. **Open Network Settings**: In Feather, click **Settings** (gear icon) in the bottom-left or top menu, and switch to the **Network** tab.
3. **Select Custom Node**: Under the **Node** section, choose **Connect to a remote node** and select or add a **Custom node**.
4. **Enter Connection Parameters**:
   - **URL / Host**: `rpc.mnr.network:443` (or `rpc.mnr.network` with port `443`).
   - Tick the **Use SSL** checkbox.
   - Enter your token into the **Daemon username** field.
   - Enter `x` (or any single character) into the **Daemon password** field.
5. **Apply & Connect**: Click **Apply** or **Connect**. Feather will connect to `rpc.mnr.network`, authenticate via Digest with your token, and immediately begin syncing from your wallet's restore height.

---

## Connecting over Tor (.onion)

Feather has native, built-in Tor support and does not require a local Tor daemon if you use Feather's internal Tor routing.

```
Node address:     mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80
Daemon username:  <token>
Daemon password:  x
Use SSL:          Unchecked (disabled)
```

1. Go to **Settings → Network → Tor**.
2. Select **Enabled** (or **Use system Tor** if on Tails / Whonix).
3. Set the remote node address to `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80`.
4. Turn **Use SSL** off (Tor hidden services provide end-to-end onion encryption natively without clearnet TLS).

---

## Verification & Response Headers

When Feather syncs through mnr, the proxy transparently validates every response:
- Block headers and block hashing blobs are recomputed and verified against our header chain.
- Transaction blobs are hashed to verify their txids.
- Consensus heights and fees require agreement from a quorum of healthy upstream nodes.

You can inspect the verification status of your node connection in a terminal:

```bash
curl -si -X POST https://rpc.mnr.network/v1/<token>/get_info -d '{}' | grep -i ^mnr-
```

Expected output:
```http
mnr-verify: majority
mnr-agreeing: 5/5
mnr-cache: hit
mnr-tier: free
```

---

## Troubleshooting

- **Bad server response for authentication**: Make sure your token is entered into the **username** field, with a placeholder like `x` in the password field.
- **Certificate verify failed**: Ensure Feather's **Use SSL** is checked when connecting to port `443` on clearnet.
- **401 Unknown Token**: Verify there are no trailing spaces copied with your token. If your token was generated more than 24 hours ago and was never activated, create a new one.
- **429 Rate Limited**: Feather is sending requests faster than your tier's burst cap (5 req/s on Free, 25 req/s on Pro). Feather will automatically back off and retry.
