import { Injectable } from '@nestjs/common';
import { unwrapAxiosData } from '../../common/binance-axios.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';
import { ApiKeysService } from '../api-keys/api-keys.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Spot } = require('@binance/connector') as {
  Spot: new (a?: string, b?: string, o?: Record<string, unknown>) => {
    ticker24hr: (symbol: string) => Promise<unknown>;
  };
};

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly binance: BinanceService,
    private readonly apiKeys: ApiKeysService,
  ) {}

  async getAccount(apiKeyId: string): Promise<unknown> {
    const key = await this.apiKeys.findOne(apiKeyId);
    const client = this.binance.createSpotClient(key);
    const res = await client.account();
    return unwrapAxiosData(res);
  }

  /** Rolling 24h stats — public REST */
  async getTicker24hPublic(symbol: string): Promise<unknown> {
    const c = new Spot('', '', { baseURL: 'https://api.binance.com' });
    const res = await c.ticker24hr(symbol);
    return unwrapAxiosData(res);
  }

  async getKlines(symbol: string, interval: string, limit: number): Promise<number[][]> {
    return this.binance.getKlines(symbol, interval, { limit });
  }

  async getSymbols(): Promise<string[]> {
    return this.binance.getExchangeSymbols();
  }

  async listStrategyPositions(): Promise<
    { strategyId: string; symbol: string; openPositionSide: string }[]
  > {
    const strategies = await this.prisma.strategy.findMany({
      select: { id: true, symbol: true, openPositionSide: true },
    });
    return strategies.map((s) => ({
      strategyId: s.id,
      symbol: s.symbol,
      openPositionSide: s.openPositionSide,
    }));
  }
}
