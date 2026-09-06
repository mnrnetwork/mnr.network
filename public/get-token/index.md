# Get a Free Monero RPC Token — Instant, Anonymous, No KYC

Generate an anonymous bearer token for mnr's verified Monero RPC proxy. Instant free tier (500k WU/mo) with zero signup, no email, and no KYC.

## Free Tier
- **Price**: $0
- **Capacity**: 500,000 requests per month
- **Burst Limit**: 5 requests / sec
- **Wallet Sync Streams**: 1 stream
- **Verification**: Single-node check with PoW & hash verification
- **Account**: No signup, no email, no password, no cookies, no KYC

### How to Get a Token
You can generate a token directly in your browser at [mnr.network/get-token/](https://mnr.network/get-token/) or via cURL:
```bash
curl -X POST https://rpc.mnr.network/v1/tokens/free
```
The token is a 32-character hexadecimal string. Store it safely in your password manager or wallet configuration.

## Pro Tier
- **Price**: $9 / month (payable in XMR)
- **Capacity**: 10,000,000 requests per month
- **Burst Limit**: 25 requests / sec
- **Wallet Sync Streams**: 3 concurrent streams (our dedicated node first)
- **Consensus**: Dual-node `get_outs` agreement required

Paid via an ephemeral Monero subaddress invoice. Once 10 network confirmations are detected, the token is automatically activated.

## Using Your Token in Wallets
- **Feather Wallet**: `<token>:x@rpc.mnr.network:443`
- **Cake Wallet**: `rpc.mnr.network:443` (Use SSL: On, Login: `<token>`, Password: `x`)
- **Monero GUI**: `rpc.mnr.network:443` (Daemon username: `<token>`, Daemon password: `x`, SSL: Checked)
- **Monerujo**: `rpc.mnr.network:443` (Username: `<token>`, Password: `x`)
- **Ripley Terminal**: Settings → Uplink_Protocols → Clearnet → `https://rpc.mnr.network/v1/<token>`
- **monero-wallet-cli**: `--daemon-address rpc.mnr.network:443 --daemon-login <token>:x --daemon-ssl enabled`
- **Tor Onion**: `<token>:x@mnrrpcvbopaykx7um32r4iyamontteidypjd33fhzvuy2hwfu5c4ifad.onion:80`

For step-by-step setup guides, see [Connect a wallet](/docs/connect-wallets/).
