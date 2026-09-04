# Connect a wallet

Every Monero wallet that can use a remote node can use mnr. You need one thing: a token. Get one on the [token page](/get-token/), then point the wallet at the relay in one of two ways.

**Path token.** The token is part of the daemon address:

```
https://rpc.mnr.network/v1/<token>
```

**Daemon login.** The daemon address is plain and the token is the password:

```
address:  rpc.mnr.network:443   (SSL on)
username: mnr
password: <token>
```

Both forms carry the same token and get the same answers. Use the path form where a wallet accepts a URL with a path; use the login form where it only takes host and port. Never paste a token into a chat or a screenshot: it is the whole credential.

---

## monero-wallet-cli

```
monero-wallet-cli \
  --daemon-address rpc.mnr.network:443 \
  --daemon-login mnr:<token> \
  --daemon-ssl enabled \
  --trusted-daemon
```

Or, with the token in the address:

```
monero-wallet-cli --daemon-address https://rpc.mnr.network/v1/<token>
```

`--trusted-daemon` only changes what the wallet is willing to ask the node for; it does not send anything extra. Use it if you would use it with your own node.

## monero-wallet-gui

Settings → Node → **Remote node**.

- Address: `rpc.mnr.network`, Port: `443`
- Daemon username: `mnr`, Daemon password: `<token>`
- Tick **Use SSL** (the GUI calls it "Daemon SSL" in some versions)

Or put `https://rpc.mnr.network/v1/<token>` in the address field and leave the port empty, if your version accepts a URL there.

## Feather

Settings → Network → **Custom node**: `https://rpc.mnr.network/v1/<token>`.

Feather accepts a full URL, so the path token is the easiest form. Leave the login fields empty. If you prefer the login form, use `rpc.mnr.network:443` with username `mnr` and the token as password.

## Cake Wallet

Settings → Connection and sync → **Add node**.

- Node address: `rpc.mnr.network`, Port: `443`
- Login: `mnr`, Password: `<token>`
- Turn on **Use SSL**

Cake takes host and port separately, so use the login form.

## Monerujo

Settings → Node → add a node.

- Host: `rpc.mnr.network`, Port: `443`
- Username: `mnr`, Password: `<token>`

Monerujo talks to the node over SSL when the port is 443.

## monero-wallet-rpc and backends

```
monero-wallet-rpc \
  --daemon-address https://rpc.mnr.network/v1/<token> \
  --wallet-file … --rpc-bind-port 18082 --disable-rpc-login
```

Anything that speaks daemon JSON-RPC or the `.bin` endpoints works the same way: POST to `https://rpc.mnr.network/v1/<token>/json_rpc` or `/v1/<token>/get_height` and so on. The full list of methods, what is verified and what is cached is in the [method policy](/docs/method-policy/).

---

## What changes, and what does not

Nothing in the wallet's behaviour changes. Sync, sending, receiving and fee estimates go through exactly the daemon calls the wallet makes today. What changes is behind the address: blocks and transactions are re-hashed, headers are matched against the relay's own header chain, and consensus state comes from a majority of nodes rather than one. Every response says what was checked in an `Mnr-Verify` header; a wallet does not read it, but a script or a curious human can:

```
curl -si -X POST https://rpc.mnr.network/v1/<token>/get_height -d '{}' | grep -i ^mnr-
```

```
mnr-verify: majority
mnr-agreeing: 3/3
mnr-cache: hit
mnr-tier: free
```

The meaning of every value is in the spec: [headers](https://github.com/mnrnetwork/mnr/blob/main/spec/headers.md), [verification rules](https://github.com/mnrnetwork/mnr/blob/main/spec/verification.md).

## If something does not work

- **401 unknown token** — the token is mistyped, was rotated more than 24 hours ago, or is not a token. Get a new one.
- **403 subscription expired** — a Pro token past its month. Renew it on the [token page](/get-token/), the same token keeps working afterwards.
- **429 rate limited** — the tier's burst (5 requests per second on Free, 25 on Pro) or the monthly allowance. Wallets retry on their own.
- **502 / 503** — no upstream could answer, or none could be verified. The relay says which in the JSON body. Sync resumes on the next attempt.

Write to dev@mnr.network with the `Mnr-*` headers of a failing request if it keeps happening. Do not include the token.
