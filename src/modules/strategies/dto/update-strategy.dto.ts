import { IsOptional, IsString } from 'class-validator';

export class UpdateStrategyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsOptional()
  timeframe?: string;

  @IsString()
  @IsOptional()
  configJson?: string;

  @IsString()
  @IsOptional()
  apiKeyId?: string | null;

  @IsString()
  @IsOptional()
  quoteOrderQty?: string | null;

  @IsString()
  @IsOptional()
  status?: 'active' | 'paused';
}
