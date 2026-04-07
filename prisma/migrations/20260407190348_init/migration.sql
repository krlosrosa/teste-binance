-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "isTestnet" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "configJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Strategy_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "binanceOrderId" TEXT,
    "clientOrderId" TEXT,
    "strategyId" TEXT,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "price" TEXT,
    "status" TEXT NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "strategyId" TEXT,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "fee" TEXT,
    "isBacktest" BOOLEAN NOT NULL DEFAULT false,
    "backtestId" TEXT,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BacktestResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "strategyId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "totalPnl" TEXT NOT NULL,
    "winRate" REAL NOT NULL,
    "maxDrawdown" REAL NOT NULL,
    "sharpe" REAL,
    "totalTrades" INTEGER NOT NULL,
    "metricsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BacktestResult_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
