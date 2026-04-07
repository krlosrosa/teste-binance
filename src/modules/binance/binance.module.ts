import { Global, Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { BinanceStreamService } from './binance-stream.service';
import { CryptoService } from '../../common/crypto.service';

@Global()
@Module({
  providers: [CryptoService, BinanceService, BinanceStreamService],
  exports: [CryptoService, BinanceService, BinanceStreamService],
})
export class BinanceModule {}
