import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private notifications: NotificationsService,
  ) {}

  async findDeliveryOrders(userId: string) {
    return this.prisma.order.findMany({
      where: {
        deliveryPersonId: userId,
        status: { in: ['READY', 'PICKED_UP'] },
      },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async pickupOrder(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryPersonId !== userId) {
      throw new ForbiddenException('This order is not assigned to you');
    }
    if (order.status !== 'READY') {
      throw new NotFoundException('Order must be READY to pick up');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: 'PICKED_UP' },
      include: {
        orderItems: { include: { menuItem: true } },
      },
    });

    this.gateway.emitOrderStatusUpdated(updated);
    this.notifications.create({
      userId: updated.userId || undefined,
      title: 'Order Picked Up',
      message: `Order ${updated.orderNumber} is out for delivery.`,
      type: 'ORDER_PICKED_UP',
    });

    return updated;
  }

  async deliverOrder(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.deliveryPersonId !== userId) {
      throw new ForbiddenException('This order is not assigned to you');
    }
    if (order.status !== 'PICKED_UP') {
      throw new NotFoundException('Order must be PICKED_UP to deliver');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: 'DELIVERED' },
      include: {
        orderItems: { include: { menuItem: true } },
      },
    });

    this.gateway.emitOrderStatusUpdated(updated);
    this.notifications.create({
      userId: updated.userId || undefined,
      title: 'Order Delivered',
      message: `Order ${updated.orderNumber} has been delivered.`,
      type: 'ORDER_DELIVERED',
    });

    return updated;
  }

  async assignOrder(id: string, deliveryPersonId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const deliveryPerson = await this.prisma.user.findUnique({
      where: { id: deliveryPersonId, role: 'DELIVERY' },
    });
    if (!deliveryPerson) {
      throw new NotFoundException('Delivery person not found');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { deliveryPersonId },
      include: {
        orderItems: { include: { menuItem: true } },
      },
    });

    this.notifications.create({
      userId: deliveryPersonId,
      title: 'New Delivery Assignment',
      message: `Order ${updated.orderNumber} has been assigned to you.`,
      type: 'DELIVERY_ASSIGNED',
    });

    return updated;
  }
}
