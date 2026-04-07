import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateRobotDto {
  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused'])
  status?: 'active' | 'paused';
}
