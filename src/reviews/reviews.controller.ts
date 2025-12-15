import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { RespondReviewDto } from './dto/respond-review.dto';
import { LogService } from 'src/common/log.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly logService: LogService,
  ) {}
  /**
   * [Buyer] Membuat review baru untuk order yang selesai
   * POST /api/reviews/order/:orderId
   */
  @Post('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @GetUser('id') buyerId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreateReviewDto,
  ) {
    const review = await this.reviewsService.createReview(
      buyerId,
      orderId,
      dto,
    );

    // LOG REVIEW DIBUAT
    await this.logService.userActivityLog({
      userId: buyerId,
      action: 'create_review',
      status: 'success',
      details: `Created review with ID: ${review.id} for order ID: ${orderId}`,
    });

    return {
      success: true,
      message: 'Review berhasil ditambahkan',
      data: review,
    };
  }

  /**
   * [Seller] Menanggapi sebuah review
   * POST /api/reviews/:reviewId/respond
   */
  @Post(':reviewId/respond')
  @UseGuards(JwtAuthGuard)
  async respondToReview(
    @GetUser('id') sellerId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: RespondReviewDto,
  ) {
    const response = await this.reviewsService.respondToReview(
      sellerId,
      reviewId,
      dto,
    );

    // LOG REVIEW DITANGGAPI
    await this.logService.userActivityLog({
      userId: sellerId,
      action: 'respond_review',
      status: 'success',
      details: `Responded to review with ID: ${reviewId}`,
    });

    return {
      success: true,
      message: 'Tanggapan berhasil dikirim',
      data: response,
    };
  }

  /**
   * [Public] Mendapatkan semua review untuk sebuah service
   * GET /api/reviews/service/:serviceId
   */
  @Public()
  @Get('service/:serviceId')
  async getServiceReviews(@Param('serviceId') serviceId: string) {
    const reviews = await this.reviewsService.getServiceReviews(serviceId);
    return {
      success: true,
      data: reviews,
    };
  }
}
