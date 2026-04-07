import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PlaceOrderDto {
  @IsString()
  @IsNotEmpty()
  apiKeyId!: string;

  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsString()
  @IsNotEmpty()
  side!: 'BUY' | 'SELL';

  @IsString()
  @IsNotEmpty()
  type!: 'MARKET' | 'LIMIT';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quoteOrderQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  isManual?: boolean;

  @IsOptional()
  @IsString()
  strategyId?: string;
}
