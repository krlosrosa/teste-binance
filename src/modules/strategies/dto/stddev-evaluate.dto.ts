import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class StddevEvaluateDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  symbols!: string[];

  @IsString()
  timeframe!: string;
}
