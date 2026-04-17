// /utils/rate-limit.ts — In-memory IP rate limiter
// Uses a Map<ip, timestamp[]> with sliding window

const rateLimitMap = new Map<string, number[]>();

/**
 * Check if a request from the given IP is within the rate limit.
 * Returns true if the request is ALLOWED, false if rate limited.
 *
 * @param ip - Client IP address
 * @param maxRequests - Maximum requests allowed in the window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 60 * 1000 // 1 hour
): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Remove expired timestamps outside the window
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    // Update with cleaned timestamps
    rateLimitMap.set(ip, validTimestamps);
    return false; // Rate limited
  }

  // Record this request
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);

  return true; // Allowed
}
