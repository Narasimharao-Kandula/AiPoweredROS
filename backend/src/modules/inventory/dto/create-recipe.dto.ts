import { IsNumber, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecipeDto {
  @ApiProperty()
  @IsUUID()
  menuItemId!: string;

  @ApiProperty()
  @IsUUID()
  inventoryId!: string;

  @ApiProperty({ example: 0.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;
}
