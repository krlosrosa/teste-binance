import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Strategy } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StrategyConfig } from '../../types/strategy-config';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

const DEFAULT_CONFIG: StrategyConfig = {
  indicators: [
    { id: 'ema_fast', type: 'EMA', period: 12 },
    { id: 'ema_slow', type: 'EMA', period: 26 },
  ],
  entry: {
    logic: 'and',
    conditions: [{ op: 'cross_up', fast: 'ema_fast', slow: 'ema_slow' }],
  },
  exit: {
    logic: 'and',
    conditions: [{ op: 'cross_down', fast: 'ema_fast', slow: 'ema_slow' }],
  },
};

@Injectable()
export class StrategiesService {
  constructor(private readonly prisma: PrismaService) {}

  parseConfig(json: string): StrategyConfig {
    try {
      const parsed = JSON.parse(json) as StrategyConfig;
      if (!parsed.indicators || !parsed.entry || !parsed.exit) {
        throw new Error('invalid');
      }
      return parsed;
    } catch {
      throw new BadRequestException('Invalid strategy config JSON');
    }
  }

  async create(dto: CreateStrategyDto): Promise<Strategy> {
    const configJson = dto.configJson?.trim() ? dto.configJson : JSON.stringify(DEFAULT_CONFIG);
    this.parseConfig(configJson);
    return this.prisma.strategy.create({
      data: {
        name: dto.name,
        symbol: dto.symbol.toUpperCase(),
        timeframe: dto.timeframe,
        configJson,
        status: dto.status ?? 'paused',
        apiKeyId: dto.apiKeyId ?? null,
        quoteOrderQty: dto.quoteOrderQty ?? '15',
      },
    });
  }

  async findAll(): Promise<Strategy[]> {
    return this.prisma.strategy.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async findOne(id: string): Promise<Strategy> {
    const s = await this.prisma.strategy.findUnique({ where: { id } });
    if (!s) {
      throw new NotFoundException('Strategy not found');
    }
    return s;
  }

  async update(id: string, dto: UpdateStrategyDto): Promise<Strategy> {
    await this.findOne(id);
    if (dto.configJson) {
      this.parseConfig(dto.configJson);
    }
    return this.prisma.strategy.update({
      where: { id },
      data: {
        name: dto.name,
        symbol: dto.symbol?.toUpperCase(),
        timeframe: dto.timeframe,
        configJson: dto.configJson,
        apiKeyId: dto.apiKeyId === undefined ? undefined : dto.apiKeyId,
        quoteOrderQty: dto.quoteOrderQty === undefined ? undefined : dto.quoteOrderQty,
        status: dto.status,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.strategy.delete({ where: { id } });
  }
}
