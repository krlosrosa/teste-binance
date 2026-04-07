import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { ApiKey, StddevRobot } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MIN_QUOTE_USDT = 5;
import { BinanceService } from '../binance/binance.service';
import { OrdersService } from '../orders/orders.service';
import { StddevStrategyService } from '../strategies/stddev-strategy.service';

type RobotWithKey = StddevRobot & { apiKey: ApiKey };

type CandleSnap = {
  open: string;
  high: string;
  low: string;
  close: string;
  openTime: Date;
};

const parseAvgFillPrice = (b: Record<string, unknown>): number => {
  const ex = Number(b.executedQty ?? 0);
  const cq = Number(b.cummulativeQuoteQty ?? 0);
  if (ex > 0 && cq > 0) {
    return cq / ex;
  }
  const ap = Number(b.avgPrice ?? 0);
  if (!Number.isNaN(ap) && ap > 0) {
    return ap;
  }
  return 0;
};

const parseExecutedBaseQty = (b: Record<string, unknown>): number => {
  const q = Number(b.executedQty ?? b.origQty ?? 0);
  return Number.isFinite(q) ? q : 0;
};

@Injectable()
export class StddevRobotMonitorService {
  private readonly logger = new Logger(StddevRobotMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stddev: StddevStrategyService,
    private readonly orders: OrdersService,
    private readonly binance: BinanceService,
  ) {}

  /** Candle atual (último kline) — mainnet público, alinhado à estratégia */
  private async snapshotCandle(symbol: string, timeframe: string): Promise<CandleSnap | null> {
    const k = await this.binance.getKlines(symbol.toUpperCase(), timeframe, { limit: 2 });
    if (!k.length) {
      return null;
    }
    const c = k[k.length - 1];
    return {
      open: String(c[1]),
      high: String(c[2]),
      low: String(c[3]),
      close: String(c[4]),
      openTime: new Date(Number(c[0])),
    };
  }

  /** Mínimo dos lows e máximo dos highs entre abertura da posição e agora */
  private async positionRange(
    symbol: string,
    timeframe: string,
    from: Date,
  ): Promise<{ min: string; max: string } | null> {
    const klines = await this.binance.getKlines(symbol.toUpperCase(), timeframe, {
      startTime: from.getTime(),
      endTime: Date.now(),
      limit: 1000,
    });
    if (!klines.length) {
      return null;
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const k of klines) {
      const hi = Number(k[2]);
      const lo = Number(k[3]);
      if (Number.isFinite(hi) && hi > max) {
        max = hi;
      }
      if (Number.isFinite(lo) && lo < min) {
        min = lo;
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return null;
    }
    return { min: String(min), max: String(max) };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async runAllRobots(): Promise<void> {
    const robots = await this.prisma.stddevRobot.findMany({
      where: { status: 'active' },
      include: { apiKey: true },
      orderBy: { symbol: 'asc' },
    });

    for (const robot of robots) {
      try {
        await this.tickRobot(robot);
      } catch (e) {
        this.logger.error(`Robot ${robot.id} ${robot.symbol}: ${e}`);
      }
    }
  }

  private async tickRobot(robot: RobotWithKey): Promise<void> {
    if (!robot.apiKey.isActive) {
      return;
    }

    if (robot.openPositionSide === 'FLAT') {
      const signal = await this.stddev.evaluateOne(robot.symbol, robot.timeframe);
      if (signal.error || !signal.hasSignal) {
        return;
      }

      const settings = await this.prisma.stddevRobotSettings.findUnique({ where: { id: 'default' } });
      const maxConc = settings?.maxConcurrentPositions ?? 3;
      const longCount = await this.prisma.stddevRobot.count({
        where: { openPositionSide: 'LONG' },
      });
      if (longCount >= maxConc) {
        return;
      }

      const fallback = Number(settings?.quoteFallbackUsdt ?? '15');
      let quoteOrderQty: number;
      if (settings?.useRiskPerTradeSizing && settings.riskUsdPerTrade) {
        const risk = Number(settings.riskUsdPerTrade);
        const dist = signal.entryPrice - signal.stopLoss;
        if (risk > 0 && dist > 0) {
          const qtyBase = risk / dist;
          quoteOrderQty = qtyBase * signal.entryPrice;
          if (!Number.isFinite(quoteOrderQty) || quoteOrderQty <= 0) {
            quoteOrderQty = Number(robot.quoteOrderQty ?? fallback) || fallback;
          } else if (quoteOrderQty < MIN_QUOTE_USDT) {
            quoteOrderQty = MIN_QUOTE_USDT;
          }
        } else {
          quoteOrderQty = Number(robot.quoteOrderQty ?? fallback) || fallback;
        }
      } else {
        const q = Number(robot.quoteOrderQty ?? fallback);
        quoteOrderQty = Number.isFinite(q) && q > 0 ? q : fallback;
      }

      const snap = await this.snapshotCandle(robot.symbol, robot.timeframe);

      const { binance } = await this.orders.placeOrder({
        apiKeyId: robot.apiKeyId,
        symbol: robot.symbol,
        side: 'BUY',
        type: 'MARKET',
        quoteOrderQty,
        isManual: false,
      });

      const raw = binance as Record<string, unknown>;
      const fillPrice = parseAvgFillPrice(raw) || signal.currentPrice;
      let baseQty = parseExecutedBaseQty(raw);
      if (baseQty <= 0 && fillPrice > 0) {
        baseQty = quoteOrderQty / fillPrice;
      }
      const priceStr = String(fillPrice);
      const qtyStr = baseQty > 0 ? String(baseQty) : String(quoteOrderQty / (fillPrice || signal.currentPrice || 1));

      const openedAt = snap?.openTime ?? new Date();

      await this.prisma.robotTrade.create({
        data: {
          robotId: robot.id,
          symbol: robot.symbol,
          side: 'BUY',
          quantity: qtyStr,
          price: priceStr,
          reason: 'entry',
          candleOpen: snap?.open,
          candleHigh: snap?.high,
          candleLow: snap?.low,
          candleClose: snap?.close,
          candleOpenAt: snap?.openTime,
        },
      });

      await this.prisma.stddevRobot.update({
        where: { id: robot.id },
        data: {
          openPositionSide: 'LONG',
          entryPrice: String(signal.entryPrice),
          stopLoss: String(signal.stopLoss),
          target: String(signal.target),
          positionQuantity: qtyStr,
          positionOpenedAt: openedAt,
        },
      });
      return;
    }

    if (robot.openPositionSide === 'LONG') {
      const signal = await this.stddev.evaluateOne(robot.symbol, robot.timeframe);
      const currentPrice = signal.currentPrice;
      const stop = Number(robot.stopLoss ?? '');
      const target = Number(robot.target ?? '');
      const baseQty = Number(robot.positionQuantity ?? '');

      if (!Number.isFinite(currentPrice) || !Number.isFinite(stop) || !Number.isFinite(target)) {
        this.logger.warn(`Robot ${robot.id}: invalid levels — skip exit check`);
        return;
      }

      let exitReason: 'stop' | 'target' | null = null;
      if (currentPrice <= stop) {
        exitReason = 'stop';
      } else if (currentPrice >= target) {
        exitReason = 'target';
      }

      if (!exitReason) {
        return;
      }

      const sellQty = Number.isFinite(baseQty) && baseQty > 0 ? baseQty : 0;
      if (sellQty <= 0) {
        this.logger.warn(`Robot ${robot.id}: no position quantity — skip SELL`);
        return;
      }

      const snap = await this.snapshotCandle(robot.symbol, robot.timeframe);

      let posMin: string | undefined;
      let posMax: string | undefined;
      if (robot.positionOpenedAt) {
        const range = await this.positionRange(robot.symbol, robot.timeframe, robot.positionOpenedAt);
        if (range) {
          posMin = range.min;
          posMax = range.max;
        }
      }

      const { binance } = await this.orders.placeOrder({
        apiKeyId: robot.apiKeyId,
        symbol: robot.symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity: sellQty,
        isManual: false,
      });

      const raw = binance as Record<string, unknown>;
      const fillPrice = parseAvgFillPrice(raw) || currentPrice;

      await this.prisma.robotTrade.create({
        data: {
          robotId: robot.id,
          symbol: robot.symbol,
          side: 'SELL',
          quantity: String(sellQty),
          price: String(fillPrice),
          reason: exitReason,
          candleOpen: snap?.open,
          candleHigh: snap?.high,
          candleLow: snap?.low,
          candleClose: snap?.close,
          candleOpenAt: snap?.openTime,
          positionMinPrice: posMin,
          positionMaxPrice: posMax,
        },
      });

      await this.prisma.stddevRobot.update({
        where: { id: robot.id },
        data: {
          openPositionSide: 'FLAT',
          entryPrice: null,
          stopLoss: null,
          target: null,
          positionQuantity: null,
          positionOpenedAt: null,
        },
      });
    }
  }
}
