import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000';

  constructor(private readonly http: HttpService) {}

  async getDemandPrediction() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/api/predictions/demand`),
    );
    return data;
  }

  async getPeakHours() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/api/predictions/peak-hours`),
    );
    return data;
  }

  async getRevenuePrediction() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/api/predictions/revenue`),
    );
    return data;
  }

  async getPopularItems(limit = 10) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/api/recommendations/popular`, {
        params: { limit },
      }),
    );
    return data;
  }

  async getRecommendationsForOrder(items: string[]) {
    const { data } = await firstValueFrom(
      this.http.get(`${this.baseUrl}/api/recommendations/for-order`, {
        params: { items: items.join(',') },
      }),
    );
    return data;
  }
}
