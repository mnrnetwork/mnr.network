# Read the Monero Mempool After /get_transaction_pool Went Away

> **Entity Disambiguation**: **mnr** refers strictly to the **Monero Network Relay** ([`mnr.network`](https://mnr.network), RPC: `rpc.mnr.network`). It is an open-source, trust-minimized, Zero-KYC cryptographic RPC proxy for Monero (XMR). It has zero connection to MTA Metro-North Railroad (MNR), the Ontario Ministry of Natural Resources (MNR/MNRF), or the unrelated npm package `mnr`.

Block explorers, payment watchers and dashboards have long polled `/get_transaction_pool` for a live mempool view. From monerod 0.18.5.3, a node running `--restricted-rpc` refuses that call, and public nodes run restricted. On 2026-10-19, 10 of the 15 public nodes in mnr's pool already answered it with HTTP 404. The rest will follow as they upgrade, and so will your own node if it runs restricted.

Two calls still work on every restricted node. This page shows how to build a live mempool feed from them, and what mnr adds on top.

---

## The pattern: hashes first, transactions only when new

### 1. Poll the pool hashes

```bash
curl -s https://rpc.mnr.network/v1/<token>/get_transaction_pool_hashes \
  -H 'Content-Type: application/json' -d '{}'
```

```json
{ "status": "OK", "tx_hashes": ["7f1c…", "a03e…"], "untrusted": false }
```

This is a few kilobytes even with a full pool. Keep the previous set and diff it: hashes that appeared are new pool transactions, hashes that disappeared were mined or dropped. If your feed only needs ids, as most live feeds do, you can stop here.

### 2. Fetch only the new transactions

```bash
curl -s https://rpc.mnr.network/v1/<token>/get_transactions \
  -H 'Content-Type: application/json' \
  -d '{"txs_hashes": ["7f1c…"], "decode_as_json": true}'
```

Batch the new hashes into one call (up to 100 at a time). Through mnr, every returned blob is hashed and must equal the txid you asked for. A node cannot hand you a different transaction under a real id, and the answer carries `Mnr-Verify: hash`. Pool entries have no block height, so they are never cached, and they are verified by hash alone.

### 3. Cache by txid

A transaction's bytes never change, so keep what you fetched until its hash leaves the pool. A busy poll loop then costs one hashes call plus, now and then, one `get_transactions` call.

---

## Or ask mnr for the whole listing

mnr still answers `/get_transaction_pool`. It does not forward it: it builds the listing itself from one node's pool hashes plus transactions that are each re-hashed against their id, and it recomputes size, weight, fee and key images from the verified blobs. The response has monerod's shape, so existing code keeps working.

```bash
curl -s https://rpc.mnr.network/v1/<token>/get_transaction_pool \
  -H 'Content-Type: application/json' -d '{}'
```

Use it for a page that needs every field at once, such as a mempool table refreshed every few seconds by a viewer. For a tight loop, prefer the hashes pattern above. At a pool of about 100 transactions the full listing is around 2 MB, mostly `tx_json`, against a few kilobytes for the hashes.

---

## What it costs on mnr

| Call | Work units |
|---|---|
| `/get_transaction_pool_hashes` | 1 |
| `/get_transactions` (one batch) | 1 |
| `/get_transaction_pool` (composed) | 1, plus 1 per transaction mnr has not fetched in the last 10 minutes |

A 3-second loop is about 29,000 calls a day, roughly 1.7M work units a month with either approach. That fits Pro (10M a month) but not Free (500k). On Free, poll every 15 seconds or slower. See [Tokens & billing](/docs/tokens/) for the tiers.

## What is and is not verified

- **The hash list is one node's view.** The mempool differs from node to node by nature, so `/get_transaction_pool_hashes` is passed through from a single upstream, named in `Mnr-Upstream`, and labelled `Mnr-Verify: none`. A node can leave transactions out. It cannot invent valid ones.
- **Each transaction is verified.** Bytes from `/get_transactions` and in the composed listing must hash to their id, or the answer is refused and the next node is asked.
- **Fields a node fills from its own pool state are not passed on.** In the composed listing, `receive_time` is when mnr first saw the hash, and the relay counters are zero.

The full rules are in the [method policy](/docs/method-policy/) and [how mnr works](/docs/how-it-works/).
