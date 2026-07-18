/** Public representation of a user — never exposes the password hash. */
export interface UserDto {
  id: string;
  email: string;
  createdAt: string;
}

/** Response body for register and login. */
export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
}
