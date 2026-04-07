-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "configJson" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "openPositionSide" TEXT NOT NULL DEFAULT 'FLAT',
    "quoteOrderQty" TEXT,
    "apiKeyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Strategy_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Strategy" ("apiKeyId", "configJson", "createdAt", "id", "name", "status", "symbol", "timeframe", "updatedAt") SELECT "apiKeyId", "configJson", "createdAt", "id", "name", "status", "symbol", "timeframe", "updatedAt" FROM "Strategy";
DROP TABLE "Strategy";
ALTER TABLE "new_Strategy" RENAME TO "Strategy";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
