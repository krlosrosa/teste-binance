import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BatchStartRobotDto } from './dto/batch-start-robot.dto';
import { UpdateRobotDto } from './dto/update-robot.dto';
import { UpdateStddevSettingsDto } from './dto/update-stddev-settings.dto';
import { StddevRobotService } from './stddev-robot.service';

@Controller('stddev-robots')
export class StddevRobotController {
  constructor(private readonly stddevRobotService: StddevRobotService) {}

  @Get('settings')
  getSettings() {
    return this.stddevRobotService.getSettings();
  }

  @Patch('settings')
  patchSettings(@Body() dto: UpdateStddevSettingsDto) {
    return this.stddevRobotService.updateSettings(dto);
  }

  @Post('batch')
  batchStart(@Body() dto: BatchStartRobotDto) {
    return this.stddevRobotService.batchStart(dto);
  }

  @Get('trades')
  listTrades() {
    return this.stddevRobotService.listTrades();
  }

  @Get('overview')
  getOverview() {
    return this.stddevRobotService.getOverview();
  }

  @Get()
  findAll() {
    return this.stddevRobotService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRobotDto) {
    return this.stddevRobotService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stddevRobotService.remove(id);
  }
}
