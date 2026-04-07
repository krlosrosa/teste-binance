import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { BacktestingService } from './backtesting.service';
import { RunBacktestDto } from './dto/run-backtest.dto';

@Controller('backtesting')
export class BacktestingController {
  constructor(private readonly backtestingService: BacktestingService) {}

  @Post('run')
  run(@Body() dto: RunBacktestDto) {
    const start = dto.startTime ? Number(dto.startTime) : undefined;
    const end = dto.endTime ? Number(dto.endTime) : undefined;
    return this.backtestingService.run(dto.strategyId, start, end);
  }

  @Get('results')
  list(@Query('strategyId') strategyId?: string) {
    return this.backtestingService.listResults(strategyId);
  }
}
