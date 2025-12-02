import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private notificationService: NotificationsService,
  ) {}

  /**
   * CRON JOB 1: Auto-Complete Orders
   * Berjalan setiap jam.
   * Mencari order 'DELIVERED' yang sudah lebih dari 3 hari (72 jam) tanpa respon buyer.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleAutoCompleteOrders() {
    this.logger.debug('Running Auto-Complete Orders Task...');

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Cari order yang sudah dikirim seller lebih dari 3 hari lalu
    // dan statusnya masih DELIVERED (belum COMPLETED/REVISION)
    const stuckOrders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          lte: threeDaysAgo, // Less than or equal to (sebelum) 3 hari lalu
        },
      },
      include: {
        service: true,
      },
    });

    if (stuckOrders.length === 0) {
      this.logger.debug('No orders to auto-complete.');
      return;
    }

    this.logger.log(`Found ${stuckOrders.length} orders to auto-complete.`);

    for (const order of stuckOrders) {
      try {
        // Panggil logic completeOrder dari OrdersService
        // Ini akan melepas dana ke seller & update status
        await this.ordersService.completeOrder(
          order.id,
          order.service.sellerId,
        );

        // Notifikasi ke Buyer
        await this.notificationService.create({
          userId: order.buyerId,
          content: `Pesanan #${order.id.substring(0, 8)} otomatis diselesaikan karena telah melewati batas waktu konfirmasi 3 hari.`,
          link: `/orders/${order.id}`,
          type: 'ORDER',
        });

        // Notifikasi ke Seller
        await this.notificationService.create({
          userId: order.service.sellerId,
          content: `Pesanan #${order.id.substring(0, 8)} otomatis diselesaikan. Dana telah diteruskan ke dompet Anda.`,
          link: `/seller/orders/${order.id}`,
          type: 'WALLET',
        });

        this.logger.log(`Order ${order.id} auto-completed successfully.`);
      } catch (error) {
        this.logger.error(`Failed to auto-complete order ${order.id}:`, error);
      }
    }
  }

  /**
   * CRON JOB 2: Auto-Cancel Unpaid Orders
   * Berjalan setiap jam.
   * Mencari order 'WAITING_PAYMENT' yang sudah lebih dari 24 jam.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpireUnpaidOrders() {
    this.logger.debug('Running Auto-Expire Unpaid Orders Task...');

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: 'WAITING_PAYMENT',
        createdAt: {
          lte: oneDayAgo,
        },
      },
      include: {
        service: true, // perlu info sellerId
      },
    });

    if (expiredOrders.length === 0) {
      this.logger.debug('No unpaid orders to expire.');
      return;
    }

    this.logger.log(`Found ${expiredOrders.length} unpaid orders to expire.`);

    // Kita loop satu per satu agar bisa kirim notifikasi
    for (const order of expiredOrders) {
      try {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancellationReason:
              'Sistem: Dibatalkan otomatis karena tidak ada pembayaran dalam 24 jam.',
            cancelledAt: new Date(),
          },
        });

        // Notifikasi Buyer
        await this.notificationService.create({
          userId: order.buyerId,
          content: `Pesanan #${order.id.substring(0, 8)} dibatalkan otomatis karena batas waktu pembayaran habis.`,
          link: `/orders/${order.id}`,
          type: 'ORDER',
        });

        // Notifikasi Seller (opsional, agar tau dia kehilangan potensi order)
        await this.notificationService.create({
          userId: order.service.sellerId,
          content: `Pesanan masuk #${order.id.substring(0, 8)} dibatalkan sistem karena pembeli tidak membayar.`,
          link: `/seller/orders`,
          type: 'ORDER',
        });
      } catch (error) {
        this.logger.error(`Failed to expire order ${order.id}:`, error);
      }
    }
  }
}
