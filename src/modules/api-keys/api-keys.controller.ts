import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(@Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.create(dto);
  }

  @Get()
  findAll() {
    return this.apiKeysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.apiKeysService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.apiKeysService.remove(id);
  }
}
