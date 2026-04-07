import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStrategyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsString()
  @IsNotEmpty()
  timeframe!: string;

  @IsString()
  @IsNotEmpty()
  configJson!: string;

  @IsString()
  @IsOptional()
  apiKeyId?: string;

  @IsString()
  @IsOptional()
  quoteOrderQty?: string;

  @IsString()
  @IsOptional()
  status?: 'active' | 'paused';
}
