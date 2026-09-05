# Privacy and public nodes

mnr is a verified proxy over public Monero nodes plus one full node we run ourselves. This page is the honest version of what that means for your privacy: what mnr changes, what it does not change, and where no proxy can help you.

It exists because running a wallet against a public node is a real privacy trade, and the community has said so plainly — monero.fail's [malicious-node advisory](https://monero.fail/), the Monero Research Lab's [spy-node findings](https://github.com/monero-project/meta/issues/1124), and years of discussion of the [public remote node problem](https://github.com/monero-project/meta/issues/1079). The advice from all of them is the same: **run your own node if you can.** If you cannot, at least know what the node you use can see, and choose one you have reason to trust.

## What a remote node can see

Any Monero node your wallet talks to can record three things:

1. **Your IP address** — unless you connect over Tor, I2P or a VPN.
2. **Your connection pattern** — when you connect, your restore height, how you sync.
3. **The specific outputs, transactions and key images your wallet asks about** — in particular the decoy sets it pulls from `/get_outs` while building a ring.

The first two are network facts. The third is the subtle one: a node that logs which outputs you examine can, over time, make a strong statistical guess about which outputs are yours. This is exactly what chain-analysis operators are suspected of running spy nodes to collect.

## What mnr does not change

mnr does not make you anonymous, and it does not replace your own node.

- Your connection to mnr terminates on our relay, so the relay sees your IP. We keep **no request log** — no paths, no tokens, no client addresses — and the only thing keyed to your address is an in-memory hash used to throttle token issuance, which dies with the process. But if your threat model includes us, connect over our `.onion` or I2P address instead ([how to](/docs/how-it-works/)), or run your own node.
- mnr forwards to public nodes run by other people. It cannot make those nodes trustworthy; it can only decide which of them sees what.
- Spy nodes on the Monero P2P network, Dandelion++ weaknesses, tainted-UTXO poisoning — none of these are things a proxy can fix.

## What mnr does change

Two things, both enforced in code:

**The most revealing queries stay on our own node.** The methods whose content says what a wallet is looking at — `/get_outs(.bin)`, `get_output_distribution`, `get_output_histogram`, `/get_o_indexes.bin`, `/get_transactions` and `/is_key_image_spent` — are routed to the node we run, first and always. While our node is up, no third-party node ever sees which outputs, transactions or key images your wallet asks about. If our node is down, they fall back to public nodes, ranked as usual.

- **Free:** a single upstream — our own node.
- **Pro:** our own node plus one public node, compared. Ring data is exactly the kind of answer where a wrong value makes things worse, so Pro cross-checks it against two nodes. The second node sees the query, but never learns who asked: rule 6 means nothing but the RPC body reaches an upstream, and it is the relay's IP, not yours, that appears in that node's logs.

**Your answers are checked.** Blocks and transactions are re-hashed, headers are matched against a header chain, consensus state is taken from a majority of nodes. What mnr tells you is closer to the truth than what any single public node tells you. That is the whole promise — not anonymity, but correctness.

## What you should do

The advisory's advice stands unchanged:

- **If you can, run your own full node.** It is the only node that sees nothing.
- **If you cannot, connect over Tor.** Use our `.onion` address so the relay sees a Tor exit rather than your home IP — and remember the relay still sees the queries themselves, just not where they came from.
- **mnr is a middle ground, not a guarantee.** It is for people who accept that a relay they can inspect, with no logs and a public rule set, is a better place to point a wallet than a random node — and who want the answers they get to be checked. It is not a claim that nobody can observe you.

The rules that make our use of other people's nodes defensible — caps, identification, opt-out, no client identity forwarded — are on the [upstreams page](/upstreams/). The per-method behaviour is in the [method policy](/docs/method-policy/).