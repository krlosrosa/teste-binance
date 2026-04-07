-- AlterTable
ALTER TABLE "RobotTrade" ADD COLUMN "candleClose" TEXT;
ALTER TABLE "RobotTrade" ADD COLUMN "candleHigh" TEXT;
ALTER TABLE "RobotTrade" ADD COLUMN "candleLow" TEXT;
ALTER TABLE "RobotTrade" ADD COLUMN "candleOpen" TEXT;
ALTER TABLE "RobotTrade" ADD COLUMN "candleOpenAt" DATETIME;
ALTER TABLE "RobotTrade" ADD COLUMN "positionMaxPrice" TEXT;
ALTER TABLE "RobotTrade" ADD COLUMN "positionMinPrice" TEXT;

-- AlterTable
ALTER TABLE "StddevRobot" ADD COLUMN "positionOpenedAt" DATETIME;
