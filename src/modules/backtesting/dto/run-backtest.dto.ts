import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RunBacktestDto {
  @IsString()
  @IsNotEmpty()
  strategyId!: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;
}
