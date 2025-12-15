import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { LogService } from 'src/common/log.service';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, LogService],
})
export class ReviewsModule {}
