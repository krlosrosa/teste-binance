import { Module } from '@nestjs/common';
import { BacktestingController } from './backtesting.controller';
import { BacktestingService } from './backtesting.service';
import { BinanceModule } from '../binance/binance.module';
import { IndicatorsModule } from '../indicators/indicators.module';
import { StrategiesModule } from '../strategies/strategies.module';

@Module({
  imports: [BinanceModule, IndicatorsModule, StrategiesModule],
  controllers: [BacktestingController],
  providers: [BacktestingService],
})
export class BacktestingModule {}
