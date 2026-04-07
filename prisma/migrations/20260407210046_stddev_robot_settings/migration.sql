-- CreateTable
CREATE TABLE "StddevRobotSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "stddevPeriod" INTEGER NOT NULL DEFAULT 20,
    "smaPeriod" INTEGER NOT NULL DEFAULT 9,
    "smaDisplacement" INTEGER NOT NULL DEFAULT 1,
    "maxConcurrentPositions" INTEGER NOT NULL DEFAULT 3,
    "useRiskPerTradeSizing" BOOLEAN NOT NULL DEFAULT false,
    "riskUsdPerTrade" TEXT,
    "quoteFallbackUsdt" TEXT NOT NULL DEFAULT '15',
    "updatedAt" DATETIME NOT NULL
);
