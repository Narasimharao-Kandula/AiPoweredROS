import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER)
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Get('dashboard')
  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrdersToday,
      revenueToday,
      activeTables,
      totalUsers,
      totalMenuItems,
      ordersByStatus,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'PAID', paidAt: { gte: today } },
      }),
      this.prisma.order.findMany({
        where: {
          tableNumber: { not: null },
          status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] },
        },
        select: { tableNumber: true },
        distinct: ['tableNumber'],
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.menuItem.count({ where: { isAvailable: true } }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: { include: { menuItem: true } },
        },
      }),
    ]);

    return {
      totalOrdersToday,
      revenueToday: Number(revenueToday._sum.totalAmount || 0),
      activeTableCount: activeTables.length,
      totalUsers,
      totalMenuItems,
      ordersByStatus: ordersByStatus.map(s => ({ status: s.status, count: s._count.id })),
      recentOrders,
    };
  }
}
