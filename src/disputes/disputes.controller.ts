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
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { CreateDisputeDto } from './dto/create-dispute.dto';
import type { AddDisputeMessageDto } from './dto/add-message.dto';

@Controller('disputes')
@UseGuards(JwtAuthGuard) // Amankan semua endpoint
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  /**
   * [User] Membuka sengketa untuk sebuah order
   * POST /api/disputes/order/:orderId
   */
  @Post('order/:orderId')
  @HttpCode(HttpStatus.CREATED)
  async openDispute(
    @GetUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body() dto: CreateDisputeDto,
  ) {
    const dispute = await this.disputesService.openDispute(userId, orderId, dto);
    return {
      success: true,
      message: 'Sengketa berhasil dibuka. Admin akan segera meninjau.',
      data: dispute,
    };
  }

  /**
   * [User] Mendapatkan detail dan pesan sengketa
   * GET /api/disputes/:disputeId
   */
  @Get(':disputeId')
  async getDisputeDetails(
    @GetUser('id') userId: string,
    @Param('disputeId') disputeId: string,
  ) {
    const dispute = await this.disputesService.getDisputeDetails(
      userId,
      disputeId,
    );
    return {
      success: true,
      data: dispute,
    };
  }

  /**
   * [User] Menambahkan pesan ke sengketa
   * POST /api/disputes/:disputeId/message
   */
  @Post(':disputeId/message')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @GetUser('id') userId: string,
    @Param('disputeId') disputeId: string,
    @Body() dto: AddDisputeMessageDto,
  ) {
    const message = await this.disputesService.addMessage(userId, disputeId, dto);
    return {
      success: true,
      message: 'Pesan terkirim',
      data: message,
    };
  }
}