# Tokens and billing

A token is the whole relationship. There is no account, no email, no name. The relay stores a hash of the token and how many work units it used this month, and nothing else about you.

## Two tiers

| | Free | Pro |
|---|---|---|
| Price | $0 | $9 a month, paid in XMR at the rate when your invoice is created |
| Allowance | 500k work units per month | 10M work units per month |
| Burst | 5 requests per second | 25 requests per second |
| `get_outs` | one upstream | two upstreams must agree |
| Streams (`get_blocks.bin`) | 1 at a time | 3 at a time |
| Promise | none | none |

A **work unit** is one light request, or 20 per megabyte of a `get_blocks.bin` sync stream. A wallet that syncs from scratch spends a few thousand; a wallet that is kept open spends a few hundred a day. Cached answers cost the same as fresh ones.

Neither tier promises uptime. The promise is narrower and printed on every response: we tell you what we verified.

## Getting a Free token

One click on the [token page](/get-token/). The token appears once; copy it into your wallet. Three per hour per client, so make one and keep it.

## Buying a Pro token

On the [token page](/get-token/), choose how many months and you get an invoice: a Monero address that is yours alone for that invoice, an amount, and 24 hours to pay. The amount is $9 a month converted at the median of five public XMR/USD sources at that moment (the invoice names the rate and the sources), rounded up to the next 0.0001 XMR, and fixed for the 24 hours. Send the amount from any wallet. After ten confirmations the page shows your Pro token. Keep the invoice link until the token is in your wallet: the invoice id is the only way to see the token again.

Pay a little more and the difference is a tip. Pay less and the invoice waits for the rest until it expires.

## Renewing

Give the token page an existing Pro token and it makes a renewal invoice to the same address as before. Payment extends the token's validity from where it currently ends, so renewing early loses nothing. An expired Pro token keeps its identity: renew it and it works again.

## Rotating a token

If a token may have leaked, rotate it:

```
curl -X POST https://rpc.mnr.network/v1/<token>/rotate
```

The answer carries a new token. The old one keeps working for 24 hours so you can switch wallets without a gap. A rotated purchase token cannot be recovered from its invoice any more, so update the wallet first.

## What the relay knows

For a Free token: its hash, when it was made, its usage this month. For a Pro token: the same, plus the invoice that paid for it (an address of ours, an amount, when). Not your address on the internet: token issuance is throttled with a key that is a hash of it with a random key that exists only while the relay runs. Not your Monero address: the wallet that watches for payment is view-only and sees only what arrives at its own subaddresses. Not your requests: there is no request log, only aggregate counters.

The full rules are in the [storefront spec](https://github.com/mnrnetwork/mnr/blob/main/spec/storefront.md).
