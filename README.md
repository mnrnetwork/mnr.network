# mnr.network

The static site for mnr — an RPC network for Monero. Front page today; the upstreams
page, opt-out page and wallet how-tos follow (Stage 0 plan §7, week 2–3).

- `public/` — what is served (Cloudflare Workers static assets)
- `design/` — Claude Design canvas artboards the page was built from; copy and tokens
  come from there
- `wrangler.jsonc` — deploy config; `mnr.network` and `www.mnr.network` are custom domains

## Deploy

```bash
wrangler deploy
```

Code lives in [`mnrnetwork/mnr`](https://github.com/mnrnetwork/mnr).
