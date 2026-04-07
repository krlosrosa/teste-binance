import { Module } from '@nestjs/common';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { BinanceModule } from '../binance/binance.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [BinanceModule, ApiKeysModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
