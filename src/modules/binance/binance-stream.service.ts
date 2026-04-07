import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
/** CJS export — `import default` vira `.default` no build e quebra em runtime. */
import WebSocket = require('ws');

const MAIN_WS = 'wss://stream.binance.com:9443';
const TESTNET_WS = 'wss://stream.testnet.binance.vision';

export type KlineWsPayload = {
  stream?: string;
  data?: {
    e: string;
    E: number;
    s: string;
    k: {
      t: number;
      T: number;
      s: string;
      i: string;
      o: string;
      c: string;
      h: string;
      l: string;
      v: string;
      x: boolean;
    };
  };
};

@Injectable()
export class BinanceStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(BinanceStreamService.name);
  private socket: WebSocket | null = null;
  private readonly subscribers = new Map<string, Set<(payload: KlineWsPayload) => void>>();
  private streamKeySet = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isTestnet = false;

  onModuleDestroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.disconnect();
  }

  setTestnet(value: boolean): void {
    if (this.isTestnet !== value) {
      this.isTestnet = value;
      this.reconnect();
    }
  }

  subscribeKline(
    symbol: string,
    interval: string,
    handler: (payload: KlineWsPayload) => void,
    isTestnet = false,
  ): () => void {
    const key = streamName(symbol, interval);
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(handler);
    this.streamKeySet.add(key);
    if (isTestnet !== this.isTestnet) {
      this.isTestnet = isTestnet;
    }
    this.reconnect();
    return () => {
      const set = this.subscribers.get(key);
      if (!set) {
        return;
      }
      set.delete(handler);
      if (set.size === 0) {
        this.subscribers.delete(key);
        this.streamKeySet.delete(key);
        this.reconnect();
      }
    };
  }

  private disconnect(): void {
    if (!this.socket) {
      return;
    }
    const ws = this.socket;
    this.socket = null;
    ws.on('error', () => undefined);
    try {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
      } else if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else {
        ws.terminate();
      }
    } catch (e) {
      this.logger.warn(`WS disconnect: ${e}`);
    }
  }

  private reconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => this.connect(), 200);
  }

  private connect(): void {
    this.disconnect();
    const keys = [...this.streamKeySet];
    if (keys.length === 0) {
      return;
    }
    const base = this.isTestnet ? TESTNET_WS : MAIN_WS;
    const streams = keys.join('/');
    const url = `${base}/stream?streams=${streams}`;
    this.logger.log(`WS connect: ${url}`);
    this.socket = new WebSocket(url);
    this.socket.on('message', (data: WebSocket.RawData) => {
      try {
        const text = typeof data === 'string' ? data : data.toString();
        const parsed = JSON.parse(text) as KlineWsPayload;
        const stream = parsed.stream;
        if (!stream) {
          return;
        }
        const handlers = this.subscribers.get(stream);
        if (!handlers) {
          return;
        }
        for (const h of handlers) {
          h(parsed);
        }
      } catch (e) {
        this.logger.warn(`WS parse error: ${e}`);
      }
    });
    this.socket.on('error', (err) => this.logger.error(`WS error: ${err.message}`));
    this.socket.on('close', () => this.logger.warn('WS closed'));
  }
}

const streamName = (symbol: string, interval: string): string =>
  `${symbol.toLowerCase()}@kline_${interval}`;
