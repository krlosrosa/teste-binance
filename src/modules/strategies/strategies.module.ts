import { Module } from '@nestjs/common';
import { StrategiesController } from './strategies.controller';
import { StrategiesService } from './strategies.service';
import { StddevStrategyService } from './stddev-strategy.service';
import { StrategyEngineService } from './strategy-engine.service';
import { IndicatorsModule } from '../indicators/indicators.module';
import { OrdersModule } from '../orders/orders.module';
import { GatewayModule } from '../../gateway/gateway.module';

@Module({
  imports: [IndicatorsModule, OrdersModule, GatewayModule],
  controllers: [StrategiesController],
  providers: [StrategiesService, StddevStrategyService, StrategyEngineService],
  exports: [StrategiesService, StddevStrategyService],
})
export class StrategiesModule {}
