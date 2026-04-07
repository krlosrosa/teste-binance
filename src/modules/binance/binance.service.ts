import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ApiKey } from '@prisma/client';
import { unwrapAxiosData } from '../../common/binance-axios.util';
import { CryptoService } from '../../common/crypto.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Spot } = require('@binance/connector') as {
  Spot: new (apiKey?: string, apiSecret?: string, options?: Record<string, unknown>) => SpotClient;
};

type SpotClient = {
  klines: (
    symbol: string,
    interval: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  exchangeInfo: (options?: Record<string, unknown>) => Promise<unknown>;
  account: (options?: Record<string, unknown>) => Promise<unknown>;
  ticker24hr: (symbol?: string, options?: Record<string, unknown>) => Promise<unknown>;
  newOrder: (symbol: string, side: string, type: string, options?: Record<string, unknown>) => Promise<unknown>;
  cancelOrder: (symbol: string, options?: Record<string, unknown>) => Promise<unknown>;
  getOrder: (symbol: string, options?: Record<string, unknown>) => Promise<unknown>;
  openOrders: (options?: Record<string, unknown>) => Promise<unknown>;
  allOrders: (symbol: string, options?: Record<string, unknown>) => Promise<unknown>;
  avgPrice: (symbol: string, options?: Record<string, unknown>) => Promise<unknown>;
};

const MAIN_BASE = 'https://api.binance.com';
const TESTNET_BASE = 'https://testnet.binance.vision';

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);

  constructor(private readonly crypto: CryptoService) {}

  createSpotClient(record: ApiKey): SpotClient {
    const apiKey = this.crypto.decrypt(record.apiKey);
    const apiSecret = this.crypto.decrypt(record.apiSecret);
    const baseURL = record.isTestnet ? TESTNET_BASE : MAIN_BASE;
    return new Spot(apiKey, apiSecret, { baseURL }) as SpotClient;
  }

  /** Public klines — no API key required */
  async getKlines(
    symbol: string,
    interval: string,
    options?: { startTime?: number; endTime?: number; limit?: number },
  ): Promise<number[][]> {
    const sym = symbol?.trim();
    const intv = interval?.trim();
    if (!sym) {
      throw new BadRequestException('symbol is required');
    }
    if (!intv) {
      throw new BadRequestException('interval is required');
    }
    const client = new Spot('', '', { baseURL: MAIN_BASE }) as SpotClient;
    const raw = unwrapAxiosData<unknown>(await client.klines(sym.toUpperCase(), intv, options ?? {}));
    if (!Array.isArray(raw)) {
      this.logger.warn('Unexpected klines response');
      return [];
    }
    return raw as number[][];
  }

  async getKlinesTestnet(
    symbol: string,
    interval: string,
    options?: { startTime?: number; endTime?: number; limit?: number },
  ): Promise<number[][]> {
    const sym = symbol?.trim();
    const intv = interval?.trim();
    if (!sym || !intv) {
      return [];
    }
    const client = new Spot('', '', { baseURL: TESTNET_BASE }) as SpotClient;
    const raw = unwrapAxiosData<unknown>(await client.klines(sym.toUpperCase(), intv, options ?? {}));
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw as number[][];
  }

  pickKlinesClient(isTestnet: boolean): typeof this.getKlines {
    return isTestnet ? this.getKlinesTestnet.bind(this) : this.getKlines.bind(this);
  }

  /** USDT spot pairs that are trading — public REST */
  async getExchangeSymbols(): Promise<string[]> {
    const client = new Spot('', '', { baseURL: MAIN_BASE }) as SpotClient;
    const raw = unwrapAxiosData<unknown>(await client.exchangeInfo());
    if (
      raw === null ||
      typeof raw !== 'object' ||
      !('symbols' in raw) ||
      !Array.isArray((raw as { symbols: unknown }).symbols)
    ) {
      this.logger.warn('Unexpected exchangeInfo response');
      return [];
    }
    const symbols = (raw as { symbols: { symbol: string; status: string; quoteAsset: string }[] })
      .symbols;
    const out = symbols
      .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map((s) => s.symbol)
      .sort((a, b) => a.localeCompare(b));
    return out;
  }
}
