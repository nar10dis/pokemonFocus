export const AUTH_COOKIE = 'access_token';
export const AUTH_TTL_SECONDS = 60 * 60 * 24 * 7;

/** anti force brute : tentatives de login / register par IP et par route */
export const AUTH_THROTTLE = { ttl: 60_000, limit: 10 };
