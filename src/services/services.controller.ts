import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceFilterDto,
} from './dto/service.dto';
import { LogService } from 'src/common/log.service';

@Controller('services')
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly logService: LogService,
  ) {}

  /**
   * Create a new service
   * POST /api/services
   * Requires authentication and seller status
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser('id') sellerId: string,
    @Body() createServiceDto: CreateServiceDto,
  ) {
    const service = await this.servicesService.create(
      sellerId,
      createServiceDto,
    );

    // LOG PENAMBAHAN JASA
    await this.logService.userActivityLog({
      userId: sellerId,
      action: 'create_service',
      status: 'success',
      details: `Created service : ${createServiceDto.title ?? 'Untitled'} || ID: ${service.id}`,
    });

    return {
      success: true,
      message: 'Jasa berhasil dibuat dan menunggu persetujuan administrator',
      data: service,
    };
  }

  /**
   * Get all services with filtering
   * GET /api/services
   * Public endpoint
   */
  @Public()
  @Get()
  async findAll(@Query() filters: ServiceFilterDto) {
    const result = await this.servicesService.findAll(filters);

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Public()
  @Get('featured')
  async getFeatured() {
    const services = await this.servicesService.getFeatured();
    return {
      success: true,
      data: services,
    };
  }

  /**
   * Get a single service by ID
   * GET /api/services/:id
   * Public endpoint
   */
  @Public()
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @GetUser('id') userId?: string,
    @GetUser('role') role?: string,
  ) {
    const service = await this.servicesService.findOne(id, userId, role);

    return {
      success: true,
      data: service,
    };
  }

  /**
   * Update a service
   * PATCH /api/services/:id
   * Requires authentication and ownership
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @GetUser('id') sellerId: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    const service = await this.servicesService.update(
      id,
      sellerId,
      updateServiceDto,
    );

    // Log Update Jasa
    await this.logService.userActivityLog({
      userId: sellerId,
      action: 'update_service',
      status: 'success',
      details: `Updated service : ${service.title} || ID: ${service.id}`,
    });

    return {
      success: true,
      message: 'Jasa berhasil diperbarui',
      data: service,
    };
  }

  /**
   * Toggle service active status
   * PATCH /api/services/:id/toggle
   * Requires authentication and ownership
   */
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleActive(@Param('id') id: string, @GetUser('id') sellerId: string) {
    const service = await this.servicesService.toggleActive(id, sellerId);

    await this.logService.userActivityLog({
      userId: sellerId,
      action: 'toggle_service_active',
      status: 'success',
      details: `${service.isActive ? 'Mengaktifkan' : 'Menonaktifkan'} jasa "${service.title ?? 'Tanpa Judul'}" (ID: ${id})`,
    });

    return {
      success: true,
      message: service.isActive
        ? 'Jasa berhasil diaktifkan'
        : 'Jasa berhasil dinonaktifkan',
      data: service,
    };
  }

  /**
   * Delete a service
   * DELETE /api/services/:id
   * Requires authentication and ownership
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @GetUser('id') sellerId: string) {
    const result = await this.servicesService.remove(id, sellerId);

    // Log Hapus Jasa
    await this.logService.userActivityLog({
      userId: sellerId,
      action: 'delete_service',
      status: 'success',
      details: `Deleted service ID: ${id}`,
    });

    return {
      success: true,
      message: result.message,
    };
  }

  /**
   * Get seller's services
   * GET /api/services/seller/my-services
   * Requires authentication
   */
  @Get('seller/my-services')
  @UseGuards(JwtAuthGuard)
  async getMyServices(@GetUser('id') sellerId: string) {
    const services = await this.servicesService.getSellerServices(sellerId);

    return {
      success: true,
      data: services,
    };
  }
}
