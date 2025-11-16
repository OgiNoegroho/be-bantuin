import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
// PrismaModule sudah Global

@Global() // <-- Jadikan Global
@Module({
  controllers: [NotificationsController], // Daftarkan Controller
  providers: [NotificationService], // Daftarkan Service
  exports: [NotificationService], // Ekspor Service
})
export class NotificationsModule {}
