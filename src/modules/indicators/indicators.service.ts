import { Injectable } from '@nestjs/common';
import {
  BollingerBands,
  EMA,
  MACD,
  RSI,
  SMA,
} from 'technicalindicators';
import { StrategyConfig } from '../../types/strategy-config';

export type OhlcvBar = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
};

export type SeriesMap = Record<string, number[]>;

@Injectable()
export class IndicatorsService {
  buildOhlcvFromKlines(klines: number[][]): OhlcvBar[] {
    return klines.map((k) => ({
      time: k[0],
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));
  }

  computeSeries(ohlcv: OhlcvBar[], config: StrategyConfig): SeriesMap {
    const closes = ohlcv.map((b) => b.close);
    const opens = ohlcv.map((b) => b.open);
    const highs = ohlcv.map((b) => b.high);
    const lows = ohlcv.map((b) => b.low);
    const series: SeriesMap = {};

    for (const def of config.indicators) {
      if (def.type === 'SMA') {
        const field = def.field ?? 'close';
        const input = field === 'open' ? opens : field === 'high' ? highs : field === 'low' ? lows : closes;
        series[def.id] = SMA.calculate({ period: def.period, values: input });
      } else if (def.type === 'EMA') {
        const field = def.field ?? 'close';
        const input = field === 'open' ? opens : field === 'high' ? highs : field === 'low' ? lows : closes;
        series[def.id] = EMA.calculate({ period: def.period, values: input });
      } else if (def.type === 'RSI') {
        series[def.id] = RSI.calculate({ period: def.period, values: closes });
      } else if (def.type === 'MACD') {
        const macd = MACD.calculate({
          fastPeriod: def.fastPeriod,
          slowPeriod: def.slowPeriod,
          signalPeriod: def.signalPeriod,
          values: closes,
          SimpleMAOscillator: false,
          SimpleMASignal: false,
        });
        series[`${def.id}_macd`] = macd.map((m) => m.MACD ?? 0);
        series[`${def.id}_signal`] = macd.map((m) => m.signal ?? 0);
        series[`${def.id}_hist`] = macd.map((m) => m.histogram ?? 0);
      } else if (def.type === 'BB') {
        const bb = BollingerBands.calculate({
          period: def.period,
          stdDev: def.stdDev,
          values: closes,
        });
        series[`${def.id}_upper`] = bb.map((b) => b.upper);
        series[`${def.id}_middle`] = bb.map((b) => b.middle);
        series[`${def.id}_lower`] = bb.map((b) => b.lower);
      }
    }
    return series;
  }

  /** Align series length to ohlcv length (pad NaN at start) */
  alignToOhlcvLength(series: number[], ohlcvLen: number): number[] {
    const pad = ohlcvLen - series.length;
    if (pad <= 0) {
      return series;
    }
    return [...Array(pad).fill(Number.NaN), ...series];
  }

  getAlignedSeries(seriesMap: SeriesMap, ohlcvLen: number): SeriesMap {
    const out: SeriesMap = {};
    for (const [key, values] of Object.entries(seriesMap)) {
      out[key] = this.alignToOhlcvLength(values, ohlcvLen);
    }
    return out;
  }
}
