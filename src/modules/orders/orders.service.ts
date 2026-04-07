import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Order } from '@prisma/client';
import { unwrapAxiosData } from '../../common/binance-axios.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { PlaceOrderDto } from './dto/place-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly binance: BinanceService,
    private readonly apiKeys: ApiKeysService,
  ) {}

  async placeOrder(dto: PlaceOrderDto): Promise<{ binance: Record<string, unknown>; order: Order }> {
    const key = await this.apiKeys.findOne(dto.apiKeyId);
    if (!key.isActive) {
      throw new BadRequestException('API key is inactive');
    }
    const client = this.binance.createSpotClient(key);
    const opts: Record<string, unknown> = {};
    if (dto.type === 'LIMIT') {
      if (dto.price == null || dto.quantity == null) {
        throw new BadRequestException('LIMIT orders require price and quantity');
      }
      opts.price = dto.price;
      opts.quantity = dto.quantity;
      opts.timeInForce = 'GTC';
    } else {
      if (dto.quoteOrderQty != null) {
        opts.quoteOrderQty = dto.quoteOrderQty;
      } else if (dto.quantity != null) {
        opts.quantity = dto.quantity;
      } else {
        throw new BadRequestException('MARKET order requires quantity or quoteOrderQty');
      }
    }
    const res = unwrapAxiosData<Record<string, unknown>>(
      await client.newOrder(dto.symbol, dto.side, dto.type, opts),
    );
    const orderId = String(res.orderId ?? res.clientOrderId ?? '');
    const status = String(res.status ?? 'NEW');
    const row = await this.prisma.order.create({
      data: {
        binanceOrderId: orderId,
        clientOrderId: res.clientOrderId != null ? String(res.clientOrderId) : null,
        strategyId: dto.strategyId ?? null,
        symbol: dto.symbol.toUpperCase(),
        side: dto.side,
        type: dto.type,
        quantity: String(res.origQty ?? res.executedQty ?? dto.quantity ?? dto.quoteOrderQty ?? ''),
        price: res.price != null ? String(res.price) : dto.price != null ? String(dto.price) : null,
        status,
        isManual: dto.isManual ?? true,
      },
    });
    return { binance: res, order: row };
  }

  async cancelOrder(apiKeyId: string, symbol: string, orderId: string): Promise<Record<string, unknown>> {
    const key = await this.apiKeys.findOne(apiKeyId);
    const client = this.binance.createSpotClient(key);
    const res = unwrapAxiosData<Record<string, unknown>>(await client.cancelOrder(symbol, { orderId }));
    await this.prisma.order.updateMany({
      where: { binanceOrderId: String(orderId) },
      data: { status: 'CANCELED' },
    });
    return res;
  }

  async listOpenOrders(apiKeyId: string, symbol?: string): Promise<unknown> {
    const key = await this.apiKeys.findOne(apiKeyId);
    const client = this.binance.createSpotClient(key);
    const opts: Record<string, unknown> = {};
    if (symbol) {
      opts.symbol = symbol.toUpperCase();
    }
    const res = await client.openOrders(opts);
    return unwrapAxiosData(res);
  }

  async listDbOrders(params?: { symbol?: string }): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: params?.symbol ? { symbol: params.symbol.toUpperCase() } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findDbOrder(id: string): Promise<Order> {
    const o = await this.prisma.order.findUnique({ where: { id } });
    if (!o) {
      throw new NotFoundException('Order not found');
    }
    return o;
  }
}
