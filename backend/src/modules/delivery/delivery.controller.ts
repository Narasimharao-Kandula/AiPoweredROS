import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private delivery: DeliveryService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DELIVERY, Role.MANAGER)
  @ApiBearerAuth()
  findMine(@CurrentUser('id') userId: string) {
    return this.delivery.findDeliveryOrders(userId);
  }

  @Patch(':id/pickup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DELIVERY)
  @ApiBearerAuth()
  pickup(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.delivery.pickupOrder(id, userId);
  }

  @Patch(':id/deliver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DELIVERY)
  @ApiBearerAuth()
  deliver(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.delivery.deliverOrder(id, userId);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER)
  @ApiBearerAuth()
  assign(@Param('id') id: string, @Body('deliveryPersonId') deliveryPersonId: string) {
    return this.delivery.assignOrder(id, deliveryPersonId);
  }
}
