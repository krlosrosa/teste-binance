import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BinanceModule } from './modules/binance/binance.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { IndicatorsModule } from './modules/indicators/indicators.module';
import { OrdersModule } from './modules/orders/orders.module';
import { StrategiesModule } from './modules/strategies/strategies.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { BacktestingModule } from './modules/backtesting/backtesting.module';
import { GatewayModule } from './gateway/gateway.module';
import { StddevRobotModule } from './modules/stddev-robot/stddev-robot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    BinanceModule,
    ApiKeysModule,
    IndicatorsModule,
    OrdersModule,
    StrategiesModule,
    PortfolioModule,
    BacktestingModule,
    GatewayModule,
    StddevRobotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
