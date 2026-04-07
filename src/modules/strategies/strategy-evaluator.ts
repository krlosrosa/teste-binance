import { Condition, StrategyConfig } from '../../types/strategy-config';
import { OhlcvBar, SeriesMap } from '../indicators/indicators.service';

const crossUp = (fast: number[], slow: number[], i: number): boolean => {
  if (i < 1) {
    return false;
  }
  const f0 = fast[i - 1];
  const f1 = fast[i];
  const s0 = slow[i - 1];
  const s1 = slow[i];
  if ([f0, f1, s0, s1].some((v) => Number.isNaN(v))) {
    return false;
  }
  return f0 <= s0 && f1 > s1;
};

const crossDown = (fast: number[], slow: number[], i: number): boolean => {
  if (i < 1) {
    return false;
  }
  const f0 = fast[i - 1];
  const f1 = fast[i];
  const s0 = slow[i - 1];
  const s1 = slow[i];
  if ([f0, f1, s0, s1].some((v) => Number.isNaN(v))) {
    return false;
  }
  return f0 >= s0 && f1 < s1;
};

const evalCondition = (
  c: Condition,
  ohlcv: OhlcvBar[],
  series: SeriesMap,
  i: number,
): boolean => {
  if (c.op === 'cross_up') {
    const fast = series[c.fast];
    const slow = series[c.slow];
    if (!fast || !slow) {
      return false;
    }
    return crossUp(fast, slow, i);
  }
  if (c.op === 'cross_down') {
    const fast = series[c.fast];
    const slow = series[c.slow];
    if (!fast || !slow) {
      return false;
    }
    return crossDown(fast, slow, i);
  }
  if (c.op === 'rsi_below') {
    const rsi = series[c.ref];
    if (!rsi) {
      return false;
    }
    const v = rsi[i];
    return !Number.isNaN(v) && v < c.value;
  }
  if (c.op === 'rsi_above') {
    const rsi = series[c.ref];
    if (!rsi) {
      return false;
    }
    const v = rsi[i];
    return !Number.isNaN(v) && v > c.value;
  }
  if (c.op === 'price_below_bb_lower') {
    const lower = series[`${c.ref}_lower`];
    if (!lower) {
      return false;
    }
    const price = ohlcv[i].close;
    const l = lower[i];
    return !Number.isNaN(l) && price < l;
  }
  if (c.op === 'price_above_bb_upper') {
    const upper = series[`${c.ref}_upper`];
    if (!upper) {
      return false;
    }
    const price = ohlcv[i].close;
    const u = upper[i];
    return !Number.isNaN(u) && price > u;
  }
  return false;
};

export const evaluateRuleSet = (
  config: StrategyConfig,
  ohlcv: OhlcvBar[],
  series: SeriesMap,
  i: number,
  kind: 'entry' | 'exit',
): boolean => {
  const rule = config[kind];
  if (!rule.conditions.length) {
    return false;
  }
  const results = rule.conditions.map((c) => evalCondition(c, ohlcv, series, i));
  if (rule.logic === 'and') {
    return results.every(Boolean);
  }
  return results.some(Boolean);
};
