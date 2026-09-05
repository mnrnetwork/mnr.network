# Connect Monero GUI Wallet to mnr

The official Monero GUI wallet (`monero-wallet-gui`) is the reference desktop interface maintained by the Monero Project. Connecting it to mnr allows you to run in "Simple mode" or "Advanced mode (Remote Node)" without downloading the 180+ GB blockchain, while maintaining cryptographic verification of blocks, transactions, and headers.

---

## Quick configuration

In Monero GUI, navigate to **Settings → Node → Remote node**:

```
Node address:     rpc.mnr.network
Port:             443
Daemon username:  <token>
Daemon password:  x
Use SSL:          Checked (enabled)
```

> **Important**: The token must be placed in **Daemon username**. The GUI uses standard HTTP Digest authentication; mnr authenticates the token from the username and bypasses the password.

---

## Step-by-step setup

1. **Obtain an mnr token**: Generate your token on [mnr.network/get-token/](/get-token/).
2. **Switch to Remote Node Mode**:
   - If opening a wallet for the first time: select **Simple mode** or **Advanced mode → Remote node**.
   - If inside an open wallet: click **Settings** on the left navigation bar, then click the **Node** tab.
3. **Configure the Remote Node**:
   - Select **Remote node**.
   - **Address**: `rpc.mnr.network`
   - **Port**: `443`
   - **Daemon username**: `<token>`
   - **Daemon password**: `x`
   - Check the **Use SSL** (or **Daemon SSL**) box.
4. **Connect**: Click **Connect** (or **Start / Connect Daemon**). The network status bar in the bottom-left will change from orange ("Connecting...") to a solid green icon ("Connected").

---

## Tor / SOCKS5 Proxy Configuration

If you run a local Tor daemon (e.g., standard Tor package or Tor Browser on port 9050 / 9150):

```
Node address:     mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion
Port:             80
Daemon username:  <token>
Daemon password:  x
Use SSL:          Unchecked (disabled)
SOCKS5 Proxy:     127.0.0.1:9050
```

1. In Monero GUI, go to **Settings → Interface → SOCKS5 proxy**.
2. Enable proxy and enter `127.0.0.1:9050` (or `9150` if using Tor Browser).
3. Switch back to **Settings → Node** and enter the `.onion` address on port `80`.
4. Uncheck **Use SSL** (onion circuits already encrypt traffic).

---

## What mnr verifies for your GUI wallet

- **Block headers**: Monero GUI requests recent block headers to track the sync progress. mnr verifies headers against its locally built header chain and confirms the height against a majority of healthy public upstreams.
- **Transaction submission**: When sending XMR via the GUI, your raw signed transaction is relayed in parallel to all active healthy nodes. The GUI receives confirmation as soon as any node accepts it.
- **Output selection (`get_outs`)**: Ensures decoys and ring members are verified across upstreams (dual-node agreement on Pro tier) to prevent ring poisoning.

---

## Troubleshooting

- **GUI says "Daemon failed to start"**: You may have selected "Local node" instead of "Remote node". Go to Settings → Node and choose **Remote node**.
- **SSL handshake error**: Verify port is `443` and **Use SSL** is checked. If you are on an older OS without modern Let's Encrypt / Cloudflare root certificates, update your operating system CA certificates.
- **Authentication loop / Password prompt**: Ensure your token is in the **Daemon username** field, and **Daemon password** is set to `x`.
- **Wallet height is stuck**: Click the reconnect button in the bottom left. If upstream nodes are experiencing a reorg, mnr automatically updates its consensus tip epoch and serves the verified chain tip.
