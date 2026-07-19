import { ApiProperty } from '@nestjs/swagger';

/** Public representation of a user — never exposes the password hash. */
export class UserDto {
  @ApiProperty({ format: 'uuid', example: '3f1c9d2e-8b7a-4c6d-9e2f-1a2b3c4d5e6f' })
  id!: string;

  @ApiProperty({ format: 'email', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Jane Analyst' })
  name!: string | null;

  @ApiProperty({ format: 'date-time', description: 'ISO 8601 creation timestamp.' })
  createdAt!: string;
}

/** Response body for register and login. */
export class AuthResponseDto {
  @ApiProperty({ description: 'JWT (HS256) bearer token for the Authorization header.' })
  accessToken!: string;

  @ApiProperty({ type: UserDto })
  user!: UserDto;
}
