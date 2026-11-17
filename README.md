# makefun-btc-race-24h-20261117-0603

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/Rezzrizz25/makefun-btc-race-24h-20261117-0603/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/Rezzrizz25/makefun-btc-race-24h-20261117-0603/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

Entry for the [make.fun](https://make.fun/r/v4m1pbv2) bounty
**btc-race-24h-20261117-0603** — "Race a BTC trading bot live for 24 hours".
A dip-buy mean-reversion bot trading Coinbase Wrapped BTC (cbBTC) against
USDC, minute by minute, on replayed on-chain bars, starting with $1,000 of
paper money. On the flat, choppy dev window, sharp surges reverted and dips
bounced, so the bot buys a -0.8% 20-minute dip under the 2-hour trend and
exits at +1.2% / -0.5%.

## Run it

```sh
node main.ts
```

Node 22, standard library only. `vendor/makefun-bars.ts` is a byte-identical
copy of the kit's `sdk/makefun-bars.ts` and speaks the
`agent-fun/bars-replay/v1` protocol (newline-delimited JSON on stdin/stdout:
`hello`, then one `batch` per minute, then `done`). All decisions are bigint
arithmetic on the bars' own closes — no randomness, no wall clock, no
network — so two runs on the same data produce identical orders.

---

<sub>Entered on [make.fun](https://make.fun/?ref=v4m1pbv2&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
