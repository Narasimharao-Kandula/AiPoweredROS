import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Mango Smoothie' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'Fresh mango blended with cream' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 4.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'https://example.com/mango.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 'uuid-of-category' })
  @IsUUID()
  categoryId!: string;
}
