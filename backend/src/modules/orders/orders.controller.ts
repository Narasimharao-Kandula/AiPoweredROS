import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: string) {
    return this.orders.create(dto, userId);
  }

  @Get('waiter')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WAITER, Role.MANAGER)
  @ApiBearerAuth()
  findWaiter() {
    return this.orders.findWaiterOrders();
  }

  @Get('cashier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CASHIER, Role.MANAGER)
  @ApiBearerAuth()
  findCashier() {
    return this.orders.findCashierOrders();
  }

  @Patch(':id/pay')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CASHIER, Role.MANAGER)
  @ApiBearerAuth()
  pay(@Param('id') id: string, @Body() dto: PayOrderDto) {
    return this.orders.payOrder(id, dto);
  }

  @Get('kitchen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CHEF, Role.MANAGER)
  @ApiBearerAuth()
  findKitchen() {
    return this.orders.findKitchenOrders();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findMine(@CurrentUser('id') userId: string) {
    return this.orders.findByUser(userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CHEF, Role.WAITER, Role.MANAGER)
  @ApiBearerAuth()
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }

  @Get(':orderNumber')
  findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.orders.findByOrderNumber(orderNumber);
  }
}
