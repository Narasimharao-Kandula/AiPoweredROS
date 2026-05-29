import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Jane Waiter' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'jane@restaurant.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: Role, example: Role.WAITER })
  @IsEnum(Role)
  role!: Role;
}
