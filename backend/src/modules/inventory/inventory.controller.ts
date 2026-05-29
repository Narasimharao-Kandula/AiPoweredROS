import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER)
@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Post()
  create(@Body() dto: CreateInventoryItemDto) {
    return this.inventory.createItem(dto);
  }

  @Get()
  findAll() {
    return this.inventory.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventory.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.inventory.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inventory.remove(id);
  }

  @Post('recipes')
  addRecipe(@Body() dto: CreateRecipeDto) {
    return this.inventory.addRecipe(dto);
  }

  @Get('recipes/:menuItemId')
  getRecipes(@Param('menuItemId') menuItemId: string) {
    return this.inventory.getRecipes(menuItemId);
  }

  @Delete('recipes/:id')
  removeRecipe(@Param('id') id: string) {
    return this.inventory.removeRecipe(id);
  }
}
