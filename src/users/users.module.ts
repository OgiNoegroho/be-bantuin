import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { LogService } from 'src/common/log.service';

@Module({
  providers: [UsersService, LogService],
  controllers: [UsersController],
})
export class UsersModule {}
