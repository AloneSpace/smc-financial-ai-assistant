import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects routes requiring a valid JWT. Applied via `@UseGuards()`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
