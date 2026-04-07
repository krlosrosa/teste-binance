import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { BinanceModule } from '../binance/binance.module';

@Module({
  imports: [BinanceModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
