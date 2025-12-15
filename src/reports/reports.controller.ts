import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { CreateReportDto } from './dto/create-report.dto';
import { LogService } from 'src/common/log.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly logService: LogService,
  ) {}

  @Post()
  async createReport(
    @GetUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    await this.reportsService.create(userId, dto);

    // LOG CREATE REPORT
    await this.logService.userActivityLog({
      userId: userId,
      action: 'create_report',
      status: 'success',
      details: 'User created a report',
    });

    return {
      success: true,
      message: 'Laporan berhasil dikirim. Kami akan segera meninjaunya.',
    };
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  async getAllReports() {
    const reports = await this.reportsService.findAll();
    return { success: true, data: reports };
  }

  @Patch('admin/:id')
  @UseGuards(AdminGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'RESOLVED' | 'DISMISSED'; notes?: string },
  ) {
    const report = await this.reportsService.updateStatus(
      id,
      body.status,
      body.notes,
    );
    return {
      success: true,
      message: 'Status laporan diperbarui',
      data: report,
    };
  }
}
