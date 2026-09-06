# Connect Feather Wallet to mnr

Feather is a lightweight desktop Monero wallet designed for privacy, speed, and Tails/Tor compatibility. Connecting Feather to mnr gives you multi-node consensus verification on every block header and transaction while keeping Feather completely stateless with zero personal accounts and zero request logging.

Feather accepts custom nodes in a direct `user:password@host:port` format.

---

## Quick configuration

In Feather, open **Settings &rarr; Node** and click **Add node** (or right-click in the custom node list &rarr; **Add**). In the **Add custom node(s)** dialog, paste:

```
<token>:x@rpc.mnr.network:443
```

For Tor hidden service (.onion):
```
<token>:x@mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80
```

> **Syntax note**: Feather expects `user:password@host:port` (one node per line).
> Your bearer token goes in the `user` slot (`<token>`), and `x` (or any single character) goes in the `password` slot. mnr reads the token from the user slot and ignores the password.

---

## Step-by-step setup

1. **Obtain an mnr token**: Generate an instant access token on the [token page](/get-token/). Free tier requires no signup, no email, and no credit card.
2. **Open Node Settings**: In Feather, click **Settings** (gear icon) in the bottom-left or menu bar, and switch to the **Node** tab.
3. **Open the "Add custom node(s)" Dialog**: Under the **Custom nodes** section, click the **Add node** button (or right-click anywhere in the custom node table and choose **Add**).
4. **Enter Node URI**: In the dialog text box, paste your connection string:
   ```
   <token>:x@rpc.mnr.network:443
   ```
   Replace `<token>` with your actual token (e.g. `sub_...`). Port `443` automatically engages TLS encryption in Feather.
5. **Save & Connect**: Click **OK**. Feather will add the node to your custom node list. Select it or ensure it is checked, then click **Apply** / connect. Feather authenticates via HTTP Digest and immediately begins syncing from your wallet's restore height.

---

## Connecting over Tor (.onion)

Feather has native, built-in Tor support and does not require a local Tor daemon if you use Feather's internal Tor routing.

1. Go to **Settings &rarr; Network &rarr; Tor** and ensure Tor is **Enabled** (or **Use system Tor** if running Tails or Whonix).
2. Go to **Settings &rarr; Node** and click **Add node**.
3. Enter the mnr onion endpoint:
   ```
   <token>:x@mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80
   ```
4. Click **OK** and set the onion node as active. Tor hidden services provide end-to-end onion encryption natively without clearnet TLS certificates.

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

- **Malformed URI / Node not parsed**: Ensure the format is strictly `<token>:x@rpc.mnr.network:443` without spaces. The colon separates token from dummy password, and `@` separates credentials from host.
- **Bad server response for authentication**: Make sure your token is placed before `:x@`. If you place `:x` before the token, authentication will fail.
- **401 Unknown Token**: Verify there are no trailing spaces or quotes copied with your token. If your token was generated more than 24 hours ago and was never activated, create a new one.
- **429 Rate Limited**: Feather is sending requests faster than your tier's burst cap (5 req/s on Free, 25 req/s on Pro). Feather will automatically back off and retry.
