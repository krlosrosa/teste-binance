export type IndicatorDef =
  | { id: string; type: 'SMA' | 'EMA'; period: number; field?: 'open' | 'high' | 'low' | 'close' }
  | { id: string; type: 'RSI'; period: number }
  | {
      id: string;
      type: 'MACD';
      fastPeriod: number;
      slowPeriod: number;
      signalPeriod: number;
    }
  | { id: string; type: 'BB'; period: number; stdDev: number };

export type Condition =
  | { op: 'cross_up'; fast: string; slow: string }
  | { op: 'cross_down'; fast: string; slow: string }
  | { op: 'rsi_below'; ref: string; value: number }
  | { op: 'rsi_above'; ref: string; value: number }
  | { op: 'price_below_bb_lower'; ref: string }
  | { op: 'price_above_bb_upper'; ref: string };

export type StrategyConfig = {
  indicators: IndicatorDef[];
  entry: { logic: 'and' | 'or'; conditions: Condition[] };
  exit: { logic: 'and' | 'or'; conditions: Condition[] };
};
