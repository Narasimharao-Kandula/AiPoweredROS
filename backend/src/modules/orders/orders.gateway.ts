import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class OrdersGateway {
  @WebSocketServer()
  server!: Server;

  emitOrderCreated(order: any) {
    this.server.emit('order.created', order);
  }

  emitOrderStatusUpdated(order: any) {
    this.server.emit('order.status.updated', order);
  }

  emitOrderPaid(order: any) {
    this.server.emit('order.paid', order);
  }
}
