# Connect Cake Wallet to mnr

Cake Wallet is the most widely used open-source mobile Monero wallet for iOS and Android. Configuring Cake Wallet to use mnr routes your mobile sync traffic through cryptographic multi-node verification, shielding your phone from poisoned public nodes while consuming zero mobile logging and zero telemetry.

---

## Quick configuration

In Cake Wallet, go to **Settings → Connection and sync → Add node**:

```
Node address:     rpc.mnr.network
Port:             443
Login (username): <token>
Password:         x
Use SSL:          On (enabled)
```

> **Note**: Place your token in the **Login** field. Cake Wallet uses HTTP Digest authentication. Because mnr stores tokens strictly hashed and does not store plaintext secrets, the token is extracted from the login username and the password is bypassed.

---

## Step-by-step setup

1. **Obtain your token**: Get a free token at [mnr.network/get-token/](/get-token/) or use your Pro token.
2. **Open Node Settings**: In Cake Wallet, tap the **Settings** gear icon (bottom right or side drawer).
3. **Select Connection & Sync**: Tap **Connection and sync** → **Nodes** → **Add node** (+ icon).
4. **Fill In Node Details**:
   - **Node Address**: `rpc.mnr.network`
   - **Node Port**: `443`
   - **Use SSL**: Toggle to **On**
   - **Login**: Paste your `<token>`
   - **Password**: Enter `x`
5. **Save and Activate**: Tap **Save** (or **Test Connection**). Tap on `rpc.mnr.network:443` in your node list to switch active sync to it. The status indicator will turn green once authenticated.

---

## Mobile Tor Routing (Android & iOS)

Cake Wallet supports onion routing on both platforms:

```
Node address:     mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion
Port:             80
Login:            <token>
Password:         x
Use SSL:          Off (disabled)
```

1. **Enable Tor in Cake Wallet**: Go to **Settings → Security and privacy → Tor** (or **Connection settings**) and toggle **Enable Tor**.
2. **Add Onion Node**:
   - Address: `mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion`
   - Port: `80`
   - Toggle **Use SSL** off.
3. Save and select the onion node. All communication remains fully anonymous and end-to-end encrypted within the Tor v3 circuit.

---

## Performance & Background Sync

- **Sync Streams**: Monero block scanning generates batch queries for outputs (`/get_outs.bin`) and block blobs (`/get_blocks.bin`). Free tier accounts support 1 sync stream; Pro tier accounts unlock up to 3 concurrent streams for faster initial sync.
- **Battery Optimization**: On mobile devices, keep Cake Wallet in the foreground during an initial full wallet restoration from block 0 or your restore date to avoid OS background throttling.
- **Quota Tracking**: Normal daily transactions consume negligible Work Units (WU). 500k monthly requests on Free is more than enough for routine mobile wallet operations.

---

## Troubleshooting

- **Connection refused / Cannot connect**: Ensure **Use SSL** is switched ON for port 443. Clearnet connections without SSL will be rejected.
- **Authentication failed**: Double check that the token is in the **Login** field and password contains `x`.
- **429 Rate limited**: If Cake Wallet is syncing rapidly on Free tier, it may briefly hit the 5 req/s burst limit. Cake will automatically retry with exponential backoff.
- **Slow scan over Tor**: Tor routing introduces higher latency (typically 400–900 ms RTT). For faster catch-up, sync recent blocks on clearnet HTTPS first, then switch to the `.onion` endpoint for daily transaction broadcast.
