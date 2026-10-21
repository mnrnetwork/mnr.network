# Measured Uptime — rpc.mnr.network

Uptime of the mnr relay (`rpc.mnr.network`), measured from Cloudflare every minute. Live numbers: [/status.json](https://mnr.network/status.json). Beta, no uptime promise: these are measurements, not a guarantee.

- **Up**: the relay answered `get_height` with a valid height.
- **Degraded**: it answered, but `/healthz` did not answer 200 (usually a degraded node pool).
- **Stale**: it answered, but the height had not moved for 60 minutes.
- **Down**: no valid answer twice in a row, 5 seconds apart.

Availability = (up + degraded + stale) / all measured minutes. Minutes where our own monitor token was refused are not counted. Minutes with no measurement are left out of the percentage, and each window reports its coverage (measured / expected minutes). The onion and I2P addresses are not measured. Node-by-node health: [/upstreams/](https://mnr.network/upstreams/).
