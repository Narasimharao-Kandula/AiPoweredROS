import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async createItem(dto: CreateInventoryItemDto) {
    return this.prisma.inventoryItem.create({ data: dto });
  }

  async findAll() {
    const items = await this.prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    });
    return items.map(item => ({
      ...item,
      quantity: Number(item.quantity),
      minStock: Number(item.minStock),
      isLowStock: Number(item.quantity) <= Number(item.minStock),
    }));
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Inventory item not found');
    return { ...item, quantity: Number(item.quantity), minStock: Number(item.minStock) };
  }

  async update(id: string, dto: UpdateInventoryItemDto) {
    await this.findOne(id);
    return this.prisma.inventoryItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.inventoryItem.delete({ where: { id } });
  }

  async addRecipe(dto: CreateRecipeDto) {
    return this.prisma.recipeIngredient.create({ data: dto });
  }

  async getRecipes(menuItemId: string) {
    return this.prisma.recipeIngredient.findMany({
      where: { menuItemId },
      include: { inventory: true },
    });
  }

  async removeRecipe(id: string) {
    return this.prisma.recipeIngredient.delete({ where: { id } });
  }

  async deductStock(menuItemId: string, quantity: number) {
    const recipes = await this.prisma.recipeIngredient.findMany({
      where: { menuItemId },
    });

    for (const recipe of recipes) {
      const deductAmount = Number(recipe.quantity) * quantity;
      await this.prisma.inventoryItem.update({
        where: { id: recipe.inventoryId },
        data: { quantity: { decrement: deductAmount } },
      });
    }
  }
}
