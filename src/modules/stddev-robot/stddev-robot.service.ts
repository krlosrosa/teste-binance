import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, StddevRobot } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchStartRobotDto } from './dto/batch-start-robot.dto';
import { UpdateRobotDto } from './dto/update-robot.dto';
import { UpdateStddevSettingsDto } from './dto/update-stddev-settings.dto';

export type RoundTripOut = {
  id: string;
  robotId: string;
  symbol: string;
  timeframe: string;
  entryPrice: string;
  exitPrice: string;
  quantity: string;
  pnlQuote: string;
  exitReason: string;
  openedAt: string;
  closedAt: string;
  entryCandle: { o: string | null; h: string | null; l: string | null; c: string | null };
  exitCandle: { o: string | null; h: string | null; l: string | null; c: string | null };
  minInPosition: string | null;
  maxInPosition: string | null;
};

export type FinanceSummaryOut = {
  totalPnlQuote: string;
  closedTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  bySymbol: {
    symbol: string;
    totalPnlQuote: string;
    closedTrades: number;
    wins: number;
    losses: number;
  }[];
};

type TradeWithRobot = Prisma.RobotTradeGetPayload<{
  include: { robot: { select: { id: true; symbol: true; timeframe: true } } };
}>;

@Injectable()
export class StddevRobotService {
  constructor(private readonly prisma: PrismaService) {}

  private static fmtQuote(n: number): string {
    if (!Number.isFinite(n)) {
      return '0';
    }
    const s = n.toFixed(8);
    return s.replace(/\.?0+$/, '') || '0';
  }

  async getSettings() {
    let row = await this.prisma.stddevRobotSettings.findUnique({ where: { id: 'default' } });
    if (!row) {
      row = await this.prisma.stddevRobotSettings.create({
        data: {
          id: 'default',
          stddevPeriod: 20,
          smaPeriod: 9,
          smaDisplacement: 1,
          maxConcurrentPositions: 3,
          useRiskPerTradeSizing: false,
          riskUsdPerTrade: null,
          quoteFallbackUsdt: '15',
        },
      });
    }
    return row;
  }

  async updateSettings(dto: UpdateStddevSettingsDto) {
    await this.getSettings();
    return this.prisma.stddevRobotSettings.update({
      where: { id: 'default' },
      data: {
        ...(dto.stddevPeriod !== undefined && { stddevPeriod: dto.stddevPeriod }),
        ...(dto.smaPeriod !== undefined && { smaPeriod: dto.smaPeriod }),
        ...(dto.smaDisplacement !== undefined && { smaDisplacement: dto.smaDisplacement }),
        ...(dto.maxConcurrentPositions !== undefined && { maxConcurrentPositions: dto.maxConcurrentPositions }),
        ...(dto.useRiskPerTradeSizing !== undefined && { useRiskPerTradeSizing: dto.useRiskPerTradeSizing }),
        ...(dto.riskUsdPerTrade !== undefined && {
          riskUsdPerTrade: dto.riskUsdPerTrade.trim() === '' ? null : dto.riskUsdPerTrade.trim(),
        }),
        ...(dto.quoteFallbackUsdt !== undefined && {
          quoteFallbackUsdt: dto.quoteFallbackUsdt.trim() || '15',
        }),
      },
    });
  }

  async batchStart(dto: BatchStartRobotDto) {
    const tf = dto.timeframe.trim();
    const quote = dto.quoteOrderQty?.trim() || '15';
    const symbols = [...new Set(dto.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
    const created: StddevRobot[] = [];
    const skipped: string[] = [];

    for (const symbol of symbols) {
      const existing = await this.prisma.stddevRobot.findFirst({
        where: {
          apiKeyId: dto.apiKeyId,
          symbol,
          timeframe: tf,
        },
      });
      if (existing) {
        skipped.push(symbol);
        continue;
      }
      const row = await this.prisma.stddevRobot.create({
        data: {
          symbol,
          timeframe: tf,
          apiKeyId: dto.apiKeyId,
          quoteOrderQty: quote,
          status: 'active',
        },
      });
      created.push(row);
    }

    return { created, skipped };
  }

  async findAll() {
    const robots = await this.prisma.stddevRobot.findMany({
      include: {
        apiKey: { select: { id: true, label: true, isTestnet: true } },
        robotTrades: {
          orderBy: { executedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return robots;
  }

  async update(id: string, dto: UpdateRobotDto) {
    await this.findOne(id);
    return this.prisma.stddevRobot.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.stddevRobot.delete({ where: { id } });
  }

  async listTrades() {
    return this.prisma.robotTrade.findMany({
      orderBy: { executedAt: 'desc' },
      take: 500,
      include: {
        robot: {
          select: { id: true, symbol: true, timeframe: true },
        },
      },
    });
  }

  async getOverview(): Promise<{
    trades: TradeWithRobot[];
    roundTrips: RoundTripOut[];
    summary: FinanceSummaryOut;
  }> {
    const trades = await this.prisma.robotTrade.findMany({
      orderBy: { executedAt: 'desc' },
      take: 1000,
      include: {
        robot: {
          select: { id: true, symbol: true, timeframe: true },
        },
      },
    });
    const { roundTrips, summary } = this.computeFinance(trades);
    return { trades, roundTrips, summary };
  }

  private computeFinance(trades: TradeWithRobot[]): {
    roundTrips: RoundTripOut[];
    summary: FinanceSummaryOut;
  } {
    const byRobot = new Map<string, TradeWithRobot[]>();
    for (const t of trades) {
      const list = byRobot.get(t.robotId) ?? [];
      list.push(t);
      byRobot.set(t.robotId, list);
    }

    const roundTrips: RoundTripOut[] = [];

    for (const list of byRobot.values()) {
      list.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
      let i = 0;
      while (i < list.length) {
        const buy = list[i];
        if (buy.side !== 'BUY') {
          i++;
          continue;
        }
        const sell = list[i + 1];
        if (!sell || sell.side !== 'SELL') {
          i++;
          continue;
        }
        const buyPx = Number(buy.price);
        const sellPx = Number(sell.price);
        const qty = Number(buy.quantity);
        const pnl = (sellPx - buyPx) * qty;
        roundTrips.push({
          id: sell.id,
          robotId: buy.robotId,
          symbol: buy.symbol,
          timeframe: buy.robot.timeframe,
          entryPrice: buy.price,
          exitPrice: sell.price,
          quantity: buy.quantity,
          pnlQuote: StddevRobotService.fmtQuote(pnl),
          exitReason: sell.reason,
          openedAt: buy.executedAt.toISOString(),
          closedAt: sell.executedAt.toISOString(),
          entryCandle: {
            o: buy.candleOpen,
            h: buy.candleHigh,
            l: buy.candleLow,
            c: buy.candleClose,
          },
          exitCandle: {
            o: sell.candleOpen,
            h: sell.candleHigh,
            l: sell.candleLow,
            c: sell.candleClose,
          },
          minInPosition: sell.positionMinPrice,
          maxInPosition: sell.positionMaxPrice,
        });
        i += 2;
      }
    }

    roundTrips.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());

    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    for (const r of roundTrips) {
      const p = Number(r.pnlQuote);
      totalPnl += p;
      if (p > 0) {
        wins++;
      } else if (p < 0) {
        losses++;
      } else {
        breakeven++;
      }
    }

    const bySymbolMap = new Map<string, { pnl: number; n: number; w: number; l: number }>();
    for (const r of roundTrips) {
      const p = Number(r.pnlQuote);
      const cur = bySymbolMap.get(r.symbol) ?? { pnl: 0, n: 0, w: 0, l: 0 };
      cur.pnl += p;
      cur.n++;
      if (p > 0) {
        cur.w++;
      } else if (p < 0) {
        cur.l++;
      }
      bySymbolMap.set(r.symbol, cur);
    }

    const bySymbol = [...bySymbolMap.entries()]
      .map(([symbol, v]) => ({
        symbol,
        totalPnlQuote: StddevRobotService.fmtQuote(v.pnl),
        closedTrades: v.n,
        wins: v.w,
        losses: v.l,
      }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    const summary: FinanceSummaryOut = {
      totalPnlQuote: StddevRobotService.fmtQuote(totalPnl),
      closedTrades: roundTrips.length,
      wins,
      losses,
      breakeven,
      bySymbol,
    };

    return { roundTrips, summary };
  }

  async findOne(id: string) {
    const r = await this.prisma.stddevRobot.findUnique({
      where: { id },
      include: { apiKey: true },
    });
    if (!r) {
      throw new NotFoundException('Robot not found');
    }
    return r;
  }
}
