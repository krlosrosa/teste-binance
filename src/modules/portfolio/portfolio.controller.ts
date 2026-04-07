import { Controller, Get, Query } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get('account')
  getAccount(@Query('apiKeyId') apiKeyId: string) {
    return this.portfolioService.getAccount(apiKeyId);
  }

  @Get('ticker')
  getTicker(@Query('symbol') symbol?: string) {
    const sym = (symbol?.trim() || 'BTCUSDT').toUpperCase();
    return this.portfolioService.getTicker24hPublic(sym);
  }

  @Get('symbols')
  getSymbols() {
    return this.portfolioService.getSymbols();
  }

  @Get('klines')
  getKlines(
    @Query('symbol') symbol?: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: string,
  ) {
    const sym = (symbol?.trim() || 'BTCUSDT').toUpperCase();
    const intv = interval?.trim() || '1m';
    let lim = 500;
    if (limit != null && limit.trim() !== '') {
      const n = Number(limit);
      if (!Number.isFinite(n)) {
        lim = 500;
      } else {
        lim = Math.min(1000, Math.max(1, Math.floor(n)));
      }
    }
    return this.portfolioService.getKlines(sym, intv, lim);
  }

  @Get('positions')
  listPositions() {
    return this.portfolioService.listStrategyPositions();
  }
}
