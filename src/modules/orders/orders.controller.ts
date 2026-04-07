import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PlaceOrderDto } from './dto/place-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  place(@Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(dto);
  }

  @Delete('binance')
  cancel(
    @Query('apiKeyId') apiKeyId: string,
    @Query('symbol') symbol: string,
    @Query('orderId') orderId: string,
  ) {
    return this.ordersService.cancelOrder(apiKeyId, symbol, orderId);
  }

  @Get('binance/open')
  openFromBinance(@Query('apiKeyId') apiKeyId: string, @Query('symbol') symbol?: string) {
    return this.ordersService.listOpenOrders(apiKeyId, symbol);
  }

  @Get()
  listLocal(@Query('symbol') symbol?: string) {
    return this.ordersService.listDbOrders({ symbol });
  }
}
