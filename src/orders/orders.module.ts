import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaymentsModule } from '../payments/payments.module';
import { AdminModule } from '../admin/admin.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletsModule } from '../wallets/wallets.module';
import { LogService } from 'src/common/log.service';

@Module({
  imports: [
    PaymentsModule,
    forwardRef(() => AdminModule),
    NotificationsModule,
    WalletsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, LogService],
  exports: [OrdersService],
})
export class OrdersModule {}
