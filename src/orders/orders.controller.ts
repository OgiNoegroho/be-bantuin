import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type {
  CreateOrderDto,
  DeliverOrderDto,
  OrderFilterDto,
  CancelOrderDto,
  RequestRevisionDto,
  AddProgressDto,
} from './dto/order.dto';
import { Order } from '@prisma/client';
import { LogService } from 'src/common/log.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly logService: LogService,
  ) {}

  /**
   * Buat order baru
   * POST /api/orders
   *
   * Buyer membuat order untuk sebuah service
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser('id') buyerId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const order: Order = await this.ordersService.create(
      buyerId,
      createOrderDto,
    );

    // LOG PEMBUATAN ORDER
    await this.logService.userActivityLog({
      userId: buyerId,
      action: 'create_order',
      status: 'success',
      details: `Created order for service ID: ${createOrderDto.serviceId} || Order ID: ${order.id}`,
    });

    return {
      success: true,
      message:
        'Order berhasil dibuat. Silakan konfirmasi untuk melanjutkan pembayaran.',
      data: order,
    };
  }

  /**
   * Konfirmasi order dan generate payment link
   * POST /api/orders/:id/confirm
   *
   * Buyer mengonfirmasi order yang masih draft
   * Status berubah dari DRAFT -> WAITING_PAYMENT
   */
  @Post(':id/confirm')
  async confirmOrder(
    @Param('id') orderId: string,
    @GetUser('id') buyerId: string,
  ) {
    const result = await this.ordersService.confirmOrder(orderId, buyerId);

    // Log Konfirmasi Orderan
    await this.logService.userActivityLog({
      userId: buyerId,
      action: 'confirm_order',
      status: 'success',
      details: `Confirmed order ID: ${orderId}, Waiting For Payment.`,
    });

    return {
      success: true,
      message: result.message,
      data: result.order,
      paymentToken: result.paymentToken, // Kirim Snap Token ke frontend
      paymentRedirectUrl: result.paymentRedirectUrl, // Kirim redirect URL ke frontend
    };
  }

  /**
   * Seller memulai pengerjaan
   * POST /api/orders/:id/start
   *
   * Mengubah status dari PAID_ESCROW -> IN_PROGRESS
   */
  @Post(':id/start')
  async startWork(
    @Param('id') orderId: string,
    @GetUser('id') sellerId: string,
  ) {
    const order = await this.ordersService.startWork(orderId, sellerId);

    // Log Mulai Pengerjaan
    await this.logService.userActivityLog({
      userId: sellerId,
      action: 'start_work',
      status: 'success',
      details: `Started work on order ID: ${orderId}.`,
    });

    return {
      success: true,
      message: 'Pengerjaan dimulai. Semangat!',
      data: order,
    };
  }

  /**
   * Seller mengirimkan hasil kerja
   * POST /api/orders/:id/deliver
   *
   * Mengubah status dari IN_PROGRESS atau REVISION -> DELIVERED
   */
  @Post(':id/deliver')
  async deliverWork(
    @Param('id') orderId: string,
    @GetUser('id') sellerId: string,
    @Body() deliverDto: DeliverOrderDto,
  ) {
    const order = await this.ordersService.deliverWork(
      orderId,
      sellerId,
      deliverDto,
    );

    // Log Pengiriman Hasil Kerja
    await this.logService.userActivityLog({
      userId: sellerId,
      action: 'deliver_work',
      status: 'success',
      details: `Delivered work for order ID: ${orderId}.`,
    });

    return {
      success: true,
      message: 'Hasil kerja berhasil dikirim. Menunggu persetujuan buyer.',
      data: order,
    };
  }

  /**
   * Buyer meminta revisi
   * POST /api/orders/:id/revision
   *
   * Mengubah status dari DELIVERED -> REVISION
   */
  @Post(':id/revision')
  async requestRevision(
    @Param('id') orderId: string,
    @GetUser('id') buyerId: string,
    @Body() dto: RequestRevisionDto,
  ) {
    const order = await this.ordersService.requestRevision(
      orderId,
      buyerId,
      dto,
    );

    // Log Permintaan Revisi
    await this.logService.userActivityLog({
      userId: buyerId,
      action: 'request_revision',
      status: 'success',
      details: `Requested revision for order ID: ${orderId}.`,
    });

    return {
      success: true,
      message: 'Permintaan revisi berhasil dikirim.',
      data: order,
    };
  }

  /**
   * Buyer menyetujui hasil kerja
   * POST /api/orders/:id/approve
   *
   * Ini adalah endpoint paling kritis:
   * - Mengubah status menjadi COMPLETED
   * - Melepas escrow ke seller
   * - Memungkinkan review
   */
  @Post(':id/approve')
  async approveWork(
    @Param('id') orderId: string,
    @GetUser('id') buyerId: string,
  ) {
    const order = await this.ordersService.approveWork(orderId, buyerId);

    // Log Persetujuan Hasil Kerja
    await this.logService.userActivityLog({
      userId: buyerId,
      action: 'approve_work',
      status: 'success',
      details: `Approved work for order ID: ${orderId}`,
    });

    return {
      success: true,
      message:
        'Pesanan selesai! Dana telah diteruskan ke penyedia jasa. Jangan lupa berikan review.',
      data: order,
    };
  }

  /**
   * Buyer membatalkan order
   * POST /api/orders/:id/cancel/buyer
   *
   * Buyer bisa cancel jika status masih DRAFT atau WAITING_PAYMENT
   */
  @Post(':id/cancel/buyer')
  async cancelByBuyer(
    @Param('id') orderId: string,
    @GetUser('id') buyerId: string,
    @Body() cancelDto: CancelOrderDto,
  ) {
    const result: Order & { refunded: boolean } =
      await this.ordersService.cancelOrder(
        orderId,
        buyerId,
        'buyer',
        cancelDto,
      );

    // Log Pembatalan Orderan oleh Buyer
    await this.logService.userActivityLog({
      userId: buyerId,
      action: 'cancel_order',
      status: 'success',
      details: `Cancelled order ID: ${orderId} as buyer${result.refunded ? ' (refunded)' : ''}`,
    });

    return {
      success: true,
      message: result.refunded
        ? 'Order dibatalkan dan dana akan dikembalikan'
        : 'Order dibatalkan',
      data: result,
    };
  }

  /**
   * Seller membatalkan order
   * POST /api/orders/:id/cancel/seller
   *
   * Seller bisa cancel dengan alasan valid
   */
  @Post(':id/cancel/seller')
  async cancelBySeller(
    @Param('id') orderId: string,
    @GetUser('id') sellerId: string,
    @Body() cancelDto: CancelOrderDto,
  ) {
    const result: Order & { refunded: boolean } =
      await this.ordersService.cancelOrder(
        orderId,
        sellerId,
        'seller',
        cancelDto,
      );

    // Log Pembatalan Orderan oleh Seller
    await this.logService.userActivityLog({
      userId: sellerId,
      action: 'cancel_order',
      status: 'success',
      details: `Cancelled order ID: ${orderId} as seller ${result.refunded ? ' (refunded)' : ''}`,
    });

    return {
      success: true,
      message: 'Order dibatalkan dan dana akan dikembalikan ke buyer',
      data: result,
    };
  }

  /**
   * Get all orders
   * GET /api/orders
   *
   * Support filtering by role (buyer/worker), status, search, dll
   */
  @Get()
  async findAll(
    @GetUser('id') userId: string,
    @Query() filters: OrderFilterDto,
  ) {
    const result = await this.ordersService.findAll(userId, filters);

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  /**
   * Get order detail
   * GET /api/orders/:id
   *
   * Hanya buyer atau seller yang terkait yang bisa akses
   */
  @Get(':id')
  async findOne(@Param('id') orderId: string, @GetUser('id') userId: string) {
    const order: Order = await this.ordersService.findOne(orderId, userId);

    return {
      success: true,
      data: order,
    };
  }

  @Post(':id/progress')
  async addProgress(
    @Param('id') orderId: string,
    @GetUser('id') sellerId: string,
    @Body() dto: AddProgressDto,
  ) {
    const progress = await this.ordersService.addProgress(
      orderId,
      sellerId,
      dto,
    );
    return {
      success: true,
      message: 'Progress berhasil diupdate',
      data: progress,
    };
  }
}
