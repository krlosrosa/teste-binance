import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { BinanceModule } from '../modules/binance/binance.module';

@Module({
  imports: [BinanceModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
