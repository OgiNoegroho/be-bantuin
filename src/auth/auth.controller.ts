import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { GoogleUserDto } from './dto/google-auth.dto';
import { LogService } from '../common/log.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly logService: LogService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    try {
      const googleUser = req.user as GoogleUserDto;
      const result = await this.authService.googleLogin({
        email: googleUser.email,
        fullName: googleUser.fullName,
        picture: googleUser.picture,
        googleId: googleUser.googleId,
        nim: googleUser.nim,
        major: googleUser.major,
        batch: googleUser.batch,
      });

      // LOG LOGIN BERHASIL
      await this.logService.userActivityLog({
        userId: result.user.id,
        action: 'login',
        ip: req.ip,
        device: req.get('user-agent'),
        status: 'success',
        details: 'Logged in with Google OAuth',
      });

      let frontendUrl = this.configService.get<string>('FRONTEND_URL')!;
      if (req.query.state && typeof req.query.state === 'string') {
        try {
          const stateJson = JSON.parse(
            Buffer.from(req.query.state, 'base64').toString('utf-8'),
          ) as { returnUrl?: string };
          if (stateJson.returnUrl) {
            frontendUrl = stateJson.returnUrl;
            console.log('Dynamic redirect to:', frontendUrl);
          }
        } catch (error) {
          console.error('Failed to parse OAuth state:', error);
        }
      }
      frontendUrl = frontendUrl.replace(/\/$/, '');
      const redirectUrl = `${frontendUrl}/auth/callback?token=${result.access_token}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      // LOG LOGIN GAGAL
      await this.logService.userActivityLog({
        userId: 'unknown',
        action: 'login',
        ip: req.ip,
        device: req.get('user-agent'),
        status: 'failed',
        details: `Google login failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      return res.redirect(
        `${frontendUrl}/auth/error?message=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: User) {
    return {
      statusCode: 200,
      message: 'Profile retrieved successfully',
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        nim: user.nim,
        major: user.major,
        batch: user.batch,
        phoneNumber: user.phoneNumber,
        profilePicture: user.profilePicture,
        bio: user.bio,
        isSeller: user.isSeller,
        isVerified: user.isVerified,
        avgRating: user.avgRating,
        totalReviews: user.totalReviews,
        totalOrdersCompleted: user.totalOrdersCompleted,
        createdAt: user.createdAt,
      },
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    const userId = (req as Request & { user?: { id: string } }).user?.id || 'unknown';
    await this.logService.userActivityLog({
      userId,
      action: 'logout',
      ip: req.ip,
      device: req.get('user-agent'),
      status: 'success',
      details: 'Logged out successfully',
    });

    return {
      statusCode: 200,
      message: 'Logged out successfully',
    };
  }

  @Public()
  @Get('health')
  healthCheck() {
    return {
      statusCode: 200,
      message: 'Auth service is running',
      timestamp: new Date().toISOString(),
    };
  }
}
