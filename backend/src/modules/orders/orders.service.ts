import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { OrdersGateway } from './orders.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateOrderDto, userId?: string) {
    const menuItemIds = dto.items.map(i => i.menuItemId);

    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('One or more menu items are invalid or unavailable');
    }

    const itemMap = new Map(menuItems.map(i => [i.id, i]));

    let totalAmount = 0;
    const orderItemsData = dto.items.map(item => {
      const menuItem = itemMap.get(item.menuItemId)!;
      const unitPrice = Number(menuItem.price);
      totalAmount += unitPrice * item.quantity;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
      };
    });

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId: userId || null,
        tableNumber: dto.tableNumber || null,
        totalAmount,
        orderItems: { create: orderItemsData },
      },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
    });

    this.gateway.emitOrderCreated(order);

    this.notifications.create({
      userId: order.userId || undefined,
      title: 'Order Placed',
      message: `Order ${order.orderNumber} has been placed successfully.`,
      type: 'ORDER_CONFIRMED',
    });
    if (order.tableNumber) {
      this.notifications.create({
        title: 'New Order',
        message: `New order ${order.orderNumber} for Table ${order.tableNumber}.`,
        type: 'ORDER_CONFIRMED',
      });
    }

    return order;
  }

  async findWaiterOrders() {
    return this.prisma.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'PENDING'] },
        tableNumber: { not: null },
      },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findCashierOrders() {
    return this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
      },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async payOrder(id: string, dto: PayOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Order must be in DELIVERED status to process payment');
    }

    const paid = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentMethod: dto.paymentMethod,
        paidAt: new Date(),
      },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
    });

    this.gateway.emitOrderPaid(paid);
    return paid;
  }

  async findKitchenOrders() {
    return this.prisma.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PREPARING', 'READY'] },
      },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async updateStatus(id: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: {
        orderItems: {
          include: { menuItem: true },
        },
      },
    });

    this.gateway.emitOrderStatusUpdated(updated);

    if (status === 'READY') {
      this.notifications.create({
        userId: updated.userId || undefined,
        title: 'Order Ready',
        message: `Order ${updated.orderNumber} is ready to serve.`,
        type: 'ORDER_READY',
      });
      if (updated.tableNumber) {
        this.notifications.create({
          title: 'Order Ready',
          message: `Order ${updated.orderNumber} for Table ${updated.tableNumber} is ready.`,
          type: 'ORDER_READY',
        });
      }
    }

    return updated;
  }

  private async generateOrderNumber(): Promise<string> {
    const count = await this.prisma.order.count();
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const seq = (count + 1).toString().padStart(4, '0');
    return `ORD-${day}${month}-${seq}`;
  }
}
