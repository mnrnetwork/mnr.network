# Monero Node Pool & Live Status — Upstream Telemetry

Live status, tip height, latency, request caps, verified answers, fault logs, and operator opt-out rules for all Monero upstreams relayed by mnr.

## Ethical Upstream Rules
1. **Request Caps**: At most 5 requests per second and 2 wallet sync streams per public node. Excess traffic is routed to our own infrastructure.
2. **Identification**: User-Agent identifies our relay on every request:
   `mnr-relay/0.x (+https://mnr.network/upstreams)`
3. **Opt-Out**: Node operators can opt out at any time via a `/.well-known/mnr-optout` file or contact. Removal occurs within 24 hours and is noted in the public log.
4. **Own Node**: We maintain our own full Monero node that absorbs peak traffic, verifies consensus, and answers heavy scan requests.

## Quorum & Consensus Model
- **Chain Tip Agreement**: Nodes must agree on block height and top block hash. Nodes lagging behind or on forks are temporarily sidelined.
- **Hash Verification**: Every block header, transaction hash, and output key image is mathematically checked against the cryptographic spec before delivery to client wallets.
- **Fault Detection & Ejection**: Nodes that return corrupted headers, falsified transaction lists, or invalid proof-of-work hashes are automatically ejected from the pool for 24 hours and recorded in the public fault log.

## Live Upstream Status
The live telemetry feed is updated continuously and can be viewed in the browser at [mnr.network/upstreams/](https://mnr.network/upstreams/) or polled via JSON metrics.

For detailed method verification rules and caching policies, see [RPC Method Policy](/docs/method-policy/).
For the weekly transparency log of caught errors and ejections, see [Verified Log](/verified/).
