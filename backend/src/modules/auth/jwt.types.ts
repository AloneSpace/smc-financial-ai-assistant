/** Shape of the signed JWT payload. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * The authenticated principal attached to `req.user` by JwtStrategy.
 * Kept minimal — controllers map to a DTO before responding.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
