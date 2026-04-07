import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BinanceStreamService, KlineWsPayload } from '../modules/binance/binance-stream.service';

type SubscribeChartPayload = {
  symbol: string;
  interval: string;
  testnet?: boolean;
};

@WebSocketGateway({
  cors: { origin: true },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);
  private readonly socketUnsubs = new Map<string, () => void>();

  @WebSocketServer()
  server!: Server;

  constructor(private readonly binanceStream: BinanceStreamService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const unsub = this.socketUnsubs.get(client.id);
    if (unsub) {
      unsub();
      this.socketUnsubs.delete(client.id);
    }
  }

  @SubscribeMessage('subscribeChart')
  handleSubscribeChart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeChartPayload,
  ): { ok: boolean; error?: string } {
    const prev = this.socketUnsubs.get(client.id);
    if (prev) {
      prev();
    }
    if (!payload?.symbol || !payload?.interval) {
      return { ok: false, error: 'symbol and interval required' };
    }
    const unsub = this.binanceStream.subscribeKline(
      payload.symbol,
      payload.interval,
      (msg: KlineWsPayload) => {
        client.emit('kline', msg);
      },
      payload.testnet === true,
    );
    this.socketUnsubs.set(client.id, unsub);
    return { ok: true };
  }

  @SubscribeMessage('unsubscribeChart')
  handleUnsubscribe(@ConnectedSocket() client: Socket): { ok: boolean } {
    const unsub = this.socketUnsubs.get(client.id);
    if (unsub) {
      unsub();
      this.socketUnsubs.delete(client.id);
    }
    return { ok: true };
  }

  emitSignal(payload: Record<string, unknown>): void {
    this.server.emit('signal', payload);
  }
}
