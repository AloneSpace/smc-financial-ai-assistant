import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'email must be an email' })
  email!: string;

  @IsString()
  password!: string;
}
