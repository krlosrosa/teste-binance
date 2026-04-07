import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BinanceModule } from '../binance/binance.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [BinanceModule, ApiKeysModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
