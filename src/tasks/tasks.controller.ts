import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard, AdminGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('trigger/auto-complete')
  @HttpCode(HttpStatus.OK)
  async triggerAutoComplete() {
    await this.tasksService.handleAutoCompleteOrders();
    return { message: 'Auto-complete task triggered manually' };
  }

  @Post('trigger/auto-expire')
  @HttpCode(HttpStatus.OK)
  async triggerAutoExpire() {
    await this.tasksService.handleExpireUnpaidOrders();
    return { message: 'Auto-expire task triggered manually' };
  }
}
