import { Injectable, Logger } from '@nestjs/common';
import { SMA } from 'technicalindicators';
import { PrismaService } from '../../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';

export type StddevSignal = {
  symbol: string;
  open: number;
  currentPrice: number;
  stddev: number;
  entryPrice: number;
  stopLoss: number;
  target: number;
  mm9: number;
  filterPassed: boolean;
  hasSignal: boolean;
  error?: string;
};

export type StddevStrategyParams = {
  stddevPeriod: number;
  smaPeriod: number;
  smaDisplacement: number;
};

const DEFAULT_PARAMS: StddevStrategyParams = {
  stddevPeriod: 20,
  smaPeriod: 9,
  smaDisplacement: 1,
};

const sampleStdDev = (values: number[]): number => {
  const n = values.length;
  if (n < 2) {
    return 0;
  }
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
};

@Injectable()
export class StddevStrategyService {
  private readonly logger = new Logger(StddevStrategyService.name);

  constructor(
    private readonly binance: BinanceService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveParams(): Promise<StddevStrategyParams> {
    const row = await this.prisma.stddevRobotSettings.findUnique({ where: { id: 'default' } });
    if (!row) {
      return { ...DEFAULT_PARAMS };
    }
    return {
      stddevPeriod: row.stddevPeriod,
      smaPeriod: row.smaPeriod,
      smaDisplacement: row.smaDisplacement,
    };
  }

  private klinesLimit(p: StddevStrategyParams): number {
    return Math.max(50, p.stddevPeriod + p.smaPeriod + p.smaDisplacement + 20);
  }

  async evaluateMultiple(symbols: string[], timeframe: string): Promise<StddevSignal[]> {
    const tf = timeframe?.trim();
    if (!tf) {
      return [];
    }
    const params = await this.resolveParams();
    const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
    const results: StddevSignal[] = [];
    for (const symbol of unique) {
      try {
        results.push(await this.evaluateOneWithParams(symbol, tf, params));
      } catch (e) {
        this.logger.warn(`${symbol}: ${e}`);
        results.push({
          symbol,
          open: 0,
          currentPrice: 0,
          stddev: 0,
          entryPrice: 0,
          stopLoss: 0,
          target: 0,
          mm9: 0,
          filterPassed: false,
          hasSignal: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }
    return results;
  }

  async evaluateOne(symbol: string, timeframe: string): Promise<StddevSignal> {
    const params = await this.resolveParams();
    return this.evaluateOneWithParams(symbol, timeframe, params);
  }

  async evaluateOneWithParams(
    symbol: string,
    timeframe: string,
    params: StddevStrategyParams,
  ): Promise<StddevSignal> {
    const limit = this.klinesLimit(params);
    const klines = await this.binance.getKlines(symbol, timeframe, { limit });
    if (klines.length < 2) {
      return {
        symbol,
        open: 0,
        currentPrice: 0,
        stddev: 0,
        entryPrice: 0,
        stopLoss: 0,
        target: 0,
        mm9: 0,
        filterPassed: false,
        hasSignal: false,
        error: 'Dados insuficientes de klines',
      };
    }

    const closedKlines = klines.slice(0, -1);
    if (closedKlines.length < params.stddevPeriod) {
      return {
        symbol,
        open: 0,
        currentPrice: 0,
        stddev: 0,
        entryPrice: 0,
        stopLoss: 0,
        target: 0,
        mm9: 0,
        filterPassed: false,
        hasSignal: false,
        error: `Menos de ${params.stddevPeriod} candles fechados`,
      };
    }

    const lastCloses = closedKlines.slice(-params.stddevPeriod).map((k) => Number(k[4]));
    const stddev = sampleStdDev(lastCloses);

    const lastBar = klines[klines.length - 1];
    const openCurrent = Number(lastBar[1]);
    const currentPrice = Number(lastBar[4]);

    const entryPrice = openCurrent - stddev;
    const stopLoss = openCurrent - 2 * stddev;
    const target = openCurrent;

    const closes = closedKlines.map((k) => Number(k[4]));
    const sma = SMA.calculate({ period: params.smaPeriod, values: closes });

    if (sma.length <= params.smaDisplacement) {
      return {
        symbol,
        open: openCurrent,
        currentPrice,
        stddev,
        entryPrice,
        stopLoss,
        target,
        mm9: 0,
        filterPassed: false,
        hasSignal: false,
        error: 'SMA insuficiente para deslocamento',
      };
    }

    const mm9Displaced = sma[sma.length - 1 - params.smaDisplacement];
    const lastClose = closes[closes.length - 1];
    const filterPassed = lastClose > mm9Displaced;
    const hasSignal = filterPassed && currentPrice <= entryPrice;

    return {
      symbol,
      open: openCurrent,
      currentPrice,
      stddev,
      entryPrice,
      stopLoss,
      target,
      mm9: mm9Displaced,
      filterPassed,
      hasSignal,
    };
  }
}
