import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsString()
  @IsNotEmpty()
  apiSecret!: string;

  @IsBoolean()
  @IsOptional()
  isTestnet?: boolean;
}
