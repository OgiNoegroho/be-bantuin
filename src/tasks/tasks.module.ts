import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [OrdersModule, NotificationsModule],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
