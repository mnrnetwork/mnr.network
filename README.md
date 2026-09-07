# mnr.network

The static site for mnr — an RPC network for Monero. Front page today; the upstreams
page and wallet how-tos followed (Stage 0 plan §7, week 2–3); the operator opt-out section lives on the upstreams page (`/upstreams/#opt-out`), not on a page of its own.

- `public/` — what is served (Cloudflare Workers static assets)
- `design/` — Claude Design canvas artboards the page was built from; copy and tokens
  come from there
- `wrangler.jsonc` — deploy config; `mnr.network` and `www.mnr.network` are custom domains

## Deploy

```bash
wrangler deploy
```

Code lives in [`mnrnetwork/mnr`](https://github.com/mnrnetwork/mnr).
