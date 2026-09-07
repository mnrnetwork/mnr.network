# Monero Node Pool & Live Status — Upstream Telemetry

Live status, tip height, latency, request caps, verified answers, fault logs, and operator opt-out rules for all Monero upstreams relayed by mnr (**Monero Network Relay**).

## Live Telemetry Status
- **Relay Version**: `relay v0.1.17` (commit `0d679add7b7a`, self-reported)
- **Pool State**: Operational (`15 of 15 nodes healthy in rotation`)
- **Quorum Consensus**: 15 nodes agreeing on tip height
- **Tip Height**: `3,757,137` (top block hash: `3dfd8d2c455082710ae8ab2ba5f8f0a98e82be106882390ff19d59884e86f61d`)
- **Our Request Rate**: ~1.41 req/s aggregate across pool
- **JSON Telemetry API**: `https://rpc.mnr.network/upstreams.json`

---

## Active Upstream Node Rotation

| Node Host | Type | Transport | Status | Height | Latency | Up 24h | Our Rate | Our Cap | Verified | Faults |
|---|---|---|---|---|---|---|---|---|---|---|
| `own-1` | ours | http | **on tip** | 3,757,137 | 663 ms | 99.4% | 0.54/s | 500/s · 32 streams | 4,412 | 1 |
| `stackwallet` | public | http | **on tip** | 3,757,137 | 65 ms | 99.9% | 0.42/s | 5/s · 2 streams | 22,844 | 1 |
| `xmr-support` | public | http | **on tip** | 3,757,137 | 35 ms | 99.7% | 0.44/s | 5/s · 2 streams | 17,696 | 1 |
| `cakewallet` | public | https | **on tip** | 3,757,137 | 57 ms | 98.8% | 0.38/s | 5/s · 2 streams | 11,337 | 0 |
| `sethforprivacy` | public | http | **on tip** | 3,757,137 | 150 ms | 98.6% | 0.05/s | 5/s · 2 streams | 10,342 | 0 |
| `xmr-tw-1` | public | http | **on tip** | 3,757,137 | 148 ms | 99.8% | 0.00/s | 5/s · 2 streams | 4,677 | 0 |
| `privacyx` | public | https | **on tip** | 3,757,137 | 184 ms | 99.7% | 0.00/s | 5/s · 2 streams | 1,765 | 0 |
| `monerodevs-2` | public | http | **on tip** | 3,757,137 | 183 ms | 99.4% | 0.00/s | 5/s · 2 streams | 1,903 | 0 |
| `boldsuck-de` | public | http | **on tip** | 3,757,137 | 162 ms | 100.0% | 0.00/s | 5/s · 2 streams | 993 | 0 |
| `stormycloud` | public | http | **on tip** | 3,757,137 | 1110 ms | 85.7% | 0.00/s | 5/s · 2 streams | 1,571 | 0 |
| `monerujo` | public | http | **on tip** | 3,757,137 | 330 ms | 99.4% | 0.00/s | 5/s · 2 streams | 1,557 | 0 |
| `hashvault` | public | http | **on tip** | 3,757,137 | 208 ms | 99.9% | 0.00/s | 5/s · 2 streams | 850 | 0 |
| `boldsuck-berlin` | public | http | **on tip** | 3,757,137 | 169 ms | 99.8% | 0.00/s | 5/s · 2 streams | 528 | 0 |
| `monerodevs-3` | public | http | **on tip** | 3,757,137 | 166 ms | 99.9% | 0.00/s | 5/s · 2 streams | 19 | 0 |
| `cryptostorm` | public | https | **on tip** | 3,757,137 | 575 ms | 61.7% | 0.00/s | 5/s · 2 streams | 1,483 | 0 |

---

## Ethical Upstream Rules
1. **Request Caps**: At most 5 requests per second and 2 wallet sync streams per public node. Excess traffic is routed to our own infrastructure (`own-1`).
2. **Identification**: User-Agent identifies our relay on every request:
   `mnr-relay/0.x (+https://mnr.network/upstreams)`
3. **Opt-Out**: Node operators can opt out at any time via a `/.well-known/mnr-optout` file or contact. Removal occurs within 24 hours and is noted in the public log.
4. **Dedicated Node**: We maintain our own full Monero node (`node.kyc.rip`) that absorbs peak traffic, verifies consensus, and answers heavy scan requests.

## Quorum & Consensus Model
- **Chain Tip Agreement**: Nodes must agree on block height and top block hash. Nodes lagging behind or on forks are temporarily sidelined.
- **Hash Verification**: Every block header, transaction hash, and output key image is mathematically checked against the cryptographic spec before delivery to client wallets.
- **Fault Detection & Ejection**: Nodes that return corrupted headers, falsified transaction lists, or invalid proof-of-work hashes are automatically ejected from the pool for 24 hours and recorded in the public fault log.

For detailed method verification rules and caching policies, see [RPC Method Policy](/docs/method-policy/).
For the weekly transparency log of caught errors and ejections, see [Independent Verification & Transparency Log](/verified/).
