import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CASHIER, Role.MANAGER)
  @ApiBearerAuth()
  createCheckoutSession(@Body('orderId') orderId: string) {
    if (!orderId) throw new BadRequestException('orderId required');
    return this.payments.createCheckoutSession(orderId);
  }

  @Get('success')
  async success(@Query('session_id') sessionId: string, @Query('order_id') orderId: string, @Res() res: any) {
    if (!sessionId || !orderId) throw new BadRequestException('Missing params');
    await this.payments.handleSuccess(sessionId, orderId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/cashier?paid=1`);
  }
}
