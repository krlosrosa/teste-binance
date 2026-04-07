import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateStddevSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(500)
  stddevPeriod?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(200)
  smaPeriod?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  smaDisplacement?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxConcurrentPositions?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useRiskPerTradeSizing?: boolean;

  @IsOptional()
  @IsString()
  riskUsdPerTrade?: string;

  @IsOptional()
  @IsString()
  quoteFallbackUsdt?: string;
}
