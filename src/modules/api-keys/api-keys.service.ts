import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKey } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/crypto.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async create(dto: CreateApiKeyDto): Promise<ApiKey> {
    return this.prisma.apiKey.create({
      data: {
        label: dto.label,
        apiKey: this.crypto.encrypt(dto.apiKey),
        apiSecret: this.crypto.encrypt(dto.apiSecret),
        isTestnet: dto.isTestnet ?? true,
      },
    });
  }

  async findAll(): Promise<Pick<ApiKey, 'id' | 'label' | 'isTestnet' | 'isActive' | 'createdAt'>[]> {
    return this.prisma.apiKey.findMany({
      select: {
        id: true,
        label: true,
        isTestnet: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string): Promise<ApiKey> {
    const row = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('API key not found');
    }
    return row;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.apiKey.delete({ where: { id } });
  }
}
