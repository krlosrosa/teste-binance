import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StrategyConfig } from '../../types/strategy-config';
import { BinanceService } from '../binance/binance.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { StrategiesService } from '../strategies/strategies.service';
import { evaluateRuleSet } from '../strategies/strategy-evaluator';

type SimState = {
  position: 'FLAT' | 'LONG';
  entryPrice: number;
  trades: { side: string; price: number; time: number }[];
  pnlSeries: number[];
};

@Injectable()
export class BacktestingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly strategies: StrategiesService,
    private readonly binance: BinanceService,
    private readonly indicators: IndicatorsService,
  ) {}

  async run(strategyId: string, startMs?: number, endMs?: number): Promise<unknown> {
    const strategy = await this.prisma.strategy.findUnique({ where: { id: strategyId } });
    if (!strategy) {
      throw new NotFoundException('Strategy not found');
    }
    const config = this.strategies.parseConfig(strategy.configJson) as StrategyConfig;
    const opts: { startTime?: number; endTime?: number; limit: number } = { limit: 1000 };
    if (startMs) {
      opts.startTime = startMs;
    }
    if (endMs) {
      opts.endTime = endMs;
    }
    const raw = await this.binance.getKlines(strategy.symbol, strategy.timeframe, opts);
    const ohlcv = this.indicators.buildOhlcvFromKlines(raw);
    if (ohlcv.length < 50) {
      return { error: 'Not enough candles' };
    }

    const seriesMap = this.indicators.computeSeries(ohlcv, config);
    const series = this.indicators.getAlignedSeries(seriesMap, ohlcv.length);

    const state: SimState = {
      position: 'FLAT',
      entryPrice: 0,
      trades: [],
      pnlSeries: [],
    };
    let equity = 0;

    for (let i = 2; i < ohlcv.length; i++) {
      const entry = evaluateRuleSet(config, ohlcv, series, i, 'entry');
      const exit = evaluateRuleSet(config, ohlcv, series, i, 'exit');
      const price = ohlcv[i].close;
      const t = ohlcv[i].time;

      if (state.position === 'FLAT' && entry) {
        state.position = 'LONG';
        state.entryPrice = price;
        state.trades.push({ side: 'BUY', price, time: t });
      } else if (state.position === 'LONG' && exit) {
        const pnl = price - state.entryPrice;
        equity += pnl;
        state.pnlSeries.push(equity);
        state.trades.push({ side: 'SELL', price, time: t });
        state.position = 'FLAT';
      }
    }

    const wins = state.pnlSeries.filter((v, idx, a) => idx > 0 && v > a[idx - 1]).length;
    const losses = state.pnlSeries.filter((v, idx, a) => idx > 0 && v < a[idx - 1]).length;
    const totalTrades = state.trades.length;
    const winRate = totalTrades > 0 ? wins / Math.max(1, wins + losses) : 0;
    let maxDd = 0;
    let peak = 0;
    for (const p of state.pnlSeries) {
      if (p > peak) {
        peak = p;
      }
      const dd = peak - p;
      if (dd > maxDd) {
        maxDd = dd;
      }
    }

    const result = await this.prisma.backtestResult.create({
      data: {
        strategyId: strategy.id,
        periodStart: new Date(ohlcv[0].time),
        periodEnd: new Date(ohlcv[ohlcv.length - 1].time),
        totalPnl: String(equity),
        winRate,
        maxDrawdown: maxDd,
        sharpe: null,
        totalTrades,
        metricsJson: JSON.stringify({ trades: state.trades, equityCurve: state.pnlSeries }),
      },
    });

    return {
      result,
      simulatedTrades: state.trades,
      equityCurve: state.pnlSeries,
    };
  }

  async listResults(strategyId?: string) {
    return this.prisma.backtestResult.findMany({
      where: strategyId ? { strategyId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
