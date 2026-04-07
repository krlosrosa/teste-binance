import { Module } from '@nestjs/common';
import { StddevRobotController } from './stddev-robot.controller';
import { StddevRobotService } from './stddev-robot.service';
import { StddevRobotMonitorService } from './stddev-robot-monitor.service';
import { StrategiesModule } from '../strategies/strategies.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [StrategiesModule, OrdersModule],
  controllers: [StddevRobotController],
  providers: [StddevRobotService, StddevRobotMonitorService],
})
export class StddevRobotModule {}
