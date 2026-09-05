# Connect Monerujo (Android) to mnr

Monerujo is the veteran open-source Android wallet for Monero, supporting multi-wallets, QR code scanning, and decentralized exchange integrations (SideShift, ChangeNOW). Connecting Monerujo to mnr eliminates blind trust in untrusted third-party Android nodes and ensures all cryptographic data is vetted through consensus verification.

---

## Quick configuration

In Monerujo, open **Settings → Node → Add custom node**:

```
Host / Address:   rpc.mnr.network
Port:             443
Username:         <token>
Password:         x
```

> **Note**: Monerujo automatically enforces TLS/SSL encryption when connecting on port `443`. As with other stock Monero wallets, the token belongs in the **Username** field.

---

## Step-by-step setup

1. **Obtain an mnr token**: Generate your token at [mnr.network/get-token/](/get-token/).
2. **Open Node Manager**: Open Monerujo, tap the menu (three dots or gear icon), and tap **Nodes**.
3. **Add Custom Node**:
   - Tap the **+** (Add) button.
   - Set **Host**: `rpc.mnr.network`
   - Set **Port**: `443`
   - Set **Username**: `<token>`
   - Set **Password**: `x`
4. **Test & Save**: Tap **Test** to ensure Monerujo can reach the endpoint and authenticate. Once verified, tap **Save**.
5. **Select Active Node**: In the node list, select `rpc.mnr.network:443` as your active default node.

---

## Tor / Orbot / NetCipher Routing

Monerujo features built-in NetCipher integration designed to route directly through Orbot:

```
Host:             mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion
Port:             80
Username:         <token>
Password:         x
```

1. Install and start **Orbot** (Tor on Android) from F-Droid or Google Play.
2. In Monerujo, enable **Tor routing** under connection settings.
3. Add the `.onion` address on port `80`.
4. Monerujo routes all requests through Orbot's local SOCKS/HTTP proxy directly to mnr's onion hidden service.

---

## Mobile Battery & Sync Considerations

- **Sync Progress**: Monerujo displays a progress bar showing block height remaining. Initial scan from wallet creation height performs parallel calls to `/get_blocks.bin` and `/get_outs.bin`.
- **Do Not Sleep**: For initial sync or restore, keep your Android screen awake or plug in your device so the operating system does not throttle background network sockets.
- **Data Usage**: Syncing through mnr consumes identical data bandwidth to a direct node, but with zero tracking cookies, zero IP logging, and full hash verification.

---

## Troubleshooting

- **Connection timed out**: Confirm your mobile connection or WiFi is active and allows outbound connections on port 443.
- **Node responds with 401**: Re-copy your token from [mnr.network/get-token/](/get-token/) without any leading or trailing whitespace.
- **Node responds with 429**: Android sync loops can trigger brief burst limits if syncing multiple wallets simultaneously on the Free tier. Upgrade to Pro for 25 req/s burst or allow the wallet to pace itself.
