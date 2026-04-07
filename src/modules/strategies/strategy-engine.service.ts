import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Strategy } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { OrdersService } from '../orders/orders.service';
import { StrategiesService } from './strategies.service';
import { evaluateRuleSet } from './strategy-evaluator';
import { EventsGateway } from '../../gateway/events.gateway';

@Injectable()
export class StrategyEngineService {
  private readonly logger = new Logger(StrategyEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly strategies: StrategiesService,
    private readonly binance: BinanceService,
    private readonly indicators: IndicatorsService,
    private readonly orders: OrdersService,
    private readonly events: EventsGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runActiveStrategies(): Promise<void> {
    const list = await this.prisma.strategy.findMany({
      where: { status: 'active' },
      include: { apiKey: true },
    });
    for (const s of list) {
      try {
        await this.evaluateOne(s);
      } catch (e) {
        this.logger.error(`Strategy ${s.id}: ${e}`);
      }
    }
  }

  async evaluateOne(strategy: Strategy & { apiKey: { id: string; isTestnet: boolean } | null }): Promise<void> {
    if (!strategy.apiKeyId || !strategy.apiKey) {
      this.logger.warn(`Strategy ${strategy.id} has no API key — skip`);
      return;
    }
    const config = this.strategies.parseConfig(strategy.configJson);
    const getKlines = this.binance.pickKlinesClient(strategy.apiKey.isTestnet);
    const raw = await getKlines(strategy.symbol, strategy.timeframe, { limit: 500 });
    const ohlcv = this.indicators.buildOhlcvFromKlines(raw);
    if (ohlcv.length < 5) {
      return;
    }
    const seriesMap = this.indicators.computeSeries(ohlcv, config);
    const series = this.indicators.getAlignedSeries(seriesMap, ohlcv.length);
    const i = ohlcv.length - 2;
    const entry = evaluateRuleSet(config, ohlcv, series, i, 'entry');
    const exit = evaluateRuleSet(config, ohlcv, series, i, 'exit');
    const qty = strategy.quoteOrderQty ?? '15';

    if (strategy.openPositionSide === 'FLAT' && entry) {
      await this.orders.placeOrder({
        apiKeyId: strategy.apiKeyId,
        symbol: strategy.symbol,
        side: 'BUY',
        type: 'MARKET',
        quoteOrderQty: Number(qty),
        isManual: false,
        strategyId: strategy.id,
      });
      await this.prisma.strategy.update({
        where: { id: strategy.id },
        data: { openPositionSide: 'LONG' },
      });
      await this.prisma.trade.create({
        data: {
          strategyId: strategy.id,
          symbol: strategy.symbol,
          side: 'BUY',
          quantity: qty,
          price: String(ohlcv[i].close),
        },
      });
      this.events.emitSignal({ type: 'entry', strategyId: strategy.id, symbol: strategy.symbol });
      return;
    }

    if (strategy.openPositionSide === 'LONG' && exit) {
      const quote = Number(qty);
      const px = ohlcv[i].close;
      const baseQty = quote / px;
      await this.orders.placeOrder({
        apiKeyId: strategy.apiKeyId,
        symbol: strategy.symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity: baseQty,
        isManual: false,
        strategyId: strategy.id,
      });
      await this.prisma.strategy.update({
        where: { id: strategy.id },
        data: { openPositionSide: 'FLAT' },
      });
      await this.prisma.trade.create({
        data: {
          strategyId: strategy.id,
          symbol: strategy.symbol,
          side: 'SELL',
          quantity: qty,
          price: String(ohlcv[i].close),
        },
      });
      this.events.emitSignal({ type: 'exit', strategyId: strategy.id, symbol: strategy.symbol });
    }
  }
}
