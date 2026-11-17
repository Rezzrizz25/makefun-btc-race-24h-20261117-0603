// Dip-buy mean-reversion bot for make.fun btc-race-24h-20261117-0603.
//
// Trades Coinbase Wrapped BTC (CBBTC) vs USDC, minute by minute, on the
// agent-fun/bars-replay/v1 protocol: the harness sends hello once, then one
// batch per minute (the bar that just closed, the fills of the orders sent
// on the previous batch, and the account), and this bot answers every batch
// with exactly one reply echoing its seq, carrying its orders.
//
// Strategy (long only, one position, full size), tuned on the frozen dev
// window (2026-11-16 06:03 UTC -> 2026-11-17 06:03 UTC): a flat, choppy
// 24 hours in which BTC ended +0.05% inside a 2.5% peak-to-trough range,
// with 141 flat bars. Sharp 15-minute surges REVERTED on this window
// (after a +0.7% 15-bar surge the next 30 bars averaged -0.69%), so
// momentum breakouts lose here; dips bounce instead. This bot buys the dip:
//   - Entry: the close has fallen at least 0.8% over the last 20 bars AND
//     sits below its 120-bar simple moving average (a dip under the 2-hour
//     trend, not a slow drift). Buy with all cash.
//   - Exit: take profit at +1.2% over the position's cost, stop loss at
//     -0.5% (a 2.4:1 reward-to-risk). A position that has hit neither within
//     240 bars is sold, and no new entry is taken for 10 bars after any
//     exit, so one falling dip cannot be re-bought bar after bar.
//   - Every order caps slippage at 150 bps past the close it was decided on.
//
// A full round trip costs about 26 bps in fees, slippage and pool impact,
// so the +1.2% take-profit clears that bar with margin; the -0.5% stop
// keeps any single dip that keeps falling cheap. No randomness, no wall
// clock, no network: every comparison is bigint arithmetic on the bars'
// own closes, so two runs on the same data produce identical orders.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Entry: 20-bar return <= -80 bps  <=>  close * 10000 <= close_20_ago * 9920. */
const DIP_NUM = 9920n;
const DIP_DEN = 10000n;
const DIP_BARS = 20;
/** Trend filter: close below its 120-bar SMA  <=>  close * 120 < sum(last 120 closes). */
const SMA_BARS = 120;
/** Take profit +120 bps over cost  <=>  value * 10000 >= cost * 10120. */
const TP_NUM = 10120n;
const TP_DEN = 10000n;
/** Stop loss -50 bps under cost  <=>  value * 10000 <= cost * 9950. */
const SL_NUM = 9950n;
const SL_DEN = 10000n;
/** Slippage cap on every order, in bps past the close it was decided on. */
const MAX_SLIPPAGE_BPS = 150;
/** Stale-position exit: sell if a position has not hit TP or SL within 240 bars. */
const STALE_BARS = 240;
/** Cooldown after any exit before a new entry may be taken. */
const COOLDOWN_BARS = 10;

/** Closes seen so far for the symbol, as bigints at the symbol's price_scale. */
const closes: bigint[] = [];
/** Index into closes at which the current position was entered (-1 when flat). */
let entryBar = -1;
/** Index into closes of the most recent exit (-1 when none yet). */
let lastExitBar = -1;

/** The order that sells the whole held position at the slippage cap. */
function sellAll(held: { qty: bigint }): OrderInput[] {
  return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
}

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(BigInt(bar.c));
    }
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      const value = state.value(SYMBOL, held.qty);
      if (value * TP_DEN >= held.cost * TP_NUM || value * SL_DEN <= held.cost * SL_NUM) {
        lastExitBar = closes.length;
        entryBar = -1;
        return sellAll(held);
      }
      if (entryBar >= 0 && closes.length - entryBar >= STALE_BARS) {
        lastExitBar = closes.length;
        entryBar = -1;
        return sellAll(held);
      }
      return [];
    }

    if (closes.length <= Math.max(DIP_BARS, SMA_BARS)) return [];
    if (lastExitBar >= 0 && closes.length - lastExitBar < COOLDOWN_BARS) return [];
    const close = closes[closes.length - 1]!;
    if (close * DIP_DEN > closes[closes.length - 1 - DIP_BARS]! * DIP_NUM) return [];
    let smaSum = 0n;
    for (let i = closes.length - SMA_BARS; i < closes.length; i++) smaSum += closes[i]!;
    if (close * BigInt(SMA_BARS) >= smaSum) return [];
    if (state.cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    entryBar = closes.length;
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});
