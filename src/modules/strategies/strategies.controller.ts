import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
import { StddevStrategyService } from './stddev-strategy.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { StddevEvaluateDto } from './dto/stddev-evaluate.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@Controller('strategies')
export class StrategiesController {
  constructor(
    private readonly strategiesService: StrategiesService,
    private readonly stddevStrategyService: StddevStrategyService,
  ) {}

  @Post('stddev/evaluate')
  evaluateStddev(@Body() dto: StddevEvaluateDto) {
    return this.stddevStrategyService.evaluateMultiple(dto.symbols, dto.timeframe);
  }

  @Post()
  create(@Body() dto: CreateStrategyDto) {
    return this.strategiesService.create(dto);
  }

  @Get()
  findAll() {
    return this.strategiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.strategiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStrategyDto) {
    return this.strategiesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.strategiesService.remove(id);
  }
}
