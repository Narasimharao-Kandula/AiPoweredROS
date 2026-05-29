import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';

@Injectable()
export class PaymentsService {
  private stripe: any;

  constructor(
    private prisma: PrismaService,
    private gateway: OrdersGateway,
  ) {
    const key = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
    this.stripe = new Stripe(key, { apiVersion: '2025-03-31-basil' as any });
  }

  async createCheckoutSession(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { include: { menuItem: true } },
      },
    });

    if (!order) throw new BadRequestException('Order not found');
    if (order.status === 'PAID') throw new BadRequestException('Order already paid');

    const lineItems = order.orderItems.map(item => ({
      price_data: {
        currency: 'inr',
        product_data: { name: item.menuItem.name },
        unit_amount: Math.round(Number(item.unitPrice) * 100),
      },
      quantity: item.quantity,
    }));

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card', 'upi'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.BASE_URL || 'http://localhost:4000'}/api/v1/payments/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cashier`,
      metadata: { orderId },
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleSuccess(sessionId: string, orderId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        throw new BadRequestException('Payment not completed');
      }
    } catch {
      throw new BadRequestException('Invalid session');
    }

    const paid = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paymentMethod: 'CARD',
        paidAt: new Date(),
      },
      include: {
        orderItems: { include: { menuItem: true } },
      },
    });

    this.gateway.emitOrderPaid(paid);
    return paid;
  }
}
