import { UserDto } from './dto/auth-response.dto';
import { User } from './entities/user.entity';

/** Maps a User entity to its public DTO. Never leaks the password hash. */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
