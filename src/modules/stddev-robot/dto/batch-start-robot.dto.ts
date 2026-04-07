import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BatchStartRobotDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  symbols!: string[];

  @IsString()
  @IsNotEmpty()
  timeframe!: string;

  @IsString()
  @IsNotEmpty()
  apiKeyId!: string;

  @IsOptional()
  @IsString()
  quoteOrderQty?: string;
}
