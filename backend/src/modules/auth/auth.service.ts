import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from '@node-rs/argon2';
import { Repository } from 'typeorm';
import { AuthResponseDto, UserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { User } from './entities/user.entity';
import { JwtPayload } from './jwt.types';
import { toUserDto } from './user.mapper';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /** Create a new account and return a signed JWT. */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = this.userRepo.create({ email: dto.email, passwordHash });
    const saved = await this.userRepo.save(user);
    this.logger.log(`Registered user ${saved.id}`);

    return this.buildAuthResponse(saved);
  }

  /** Authenticate an existing account and return a signed JWT. */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.buildAuthResponse(user);
  }

  /**
   * Verify credentials. Returns the same `UnauthorizedException` whether the
   * email is unknown or the password is wrong — prevents user enumeration.
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  /** Fetch the current user's public profile for `GET /auth/me`. */
  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return toUserDto(user);
  }

  private buildAuthResponse(user: User): AuthResponseDto {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: toUserDto(user),
    };
  }
}
