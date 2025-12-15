import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ConfigModule } from '@nestjs/config';
import { LogService } from 'src/common/log.service';

@Module({
  imports: [ConfigModule], // Import ConfigModule untuk akses .env
  controllers: [PaymentsController],
  providers: [PaymentsService, LogService],
  exports: [PaymentsService], // Export agar bisa dipakai OrdersModule
})
export class PaymentsModule {}
