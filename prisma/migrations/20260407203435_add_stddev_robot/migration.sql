-- CreateTable
CREATE TABLE "StddevRobot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "openPositionSide" TEXT NOT NULL DEFAULT 'FLAT',
    "entryPrice" TEXT,
    "stopLoss" TEXT,
    "target" TEXT,
    "positionQuantity" TEXT,
    "quoteOrderQty" TEXT NOT NULL DEFAULT '15',
    "apiKeyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StddevRobot_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RobotTrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "robotId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RobotTrade_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "StddevRobot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
