import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('AI Insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER)
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Get('demand')
  demand() {
    return this.ai.getDemandPrediction();
  }

  @Get('peak-hours')
  peakHours() {
    return this.ai.getPeakHours();
  }

  @Get('revenue')
  revenue() {
    return this.ai.getRevenuePrediction();
  }

  @Get('popular')
  popular() {
    return this.ai.getPopularItems();
  }

  @Get('recommendations/:items')
  recommendations(@Param('items') items: string) {
    return this.ai.getRecommendationsForOrder(items.split(','));
  }
}
