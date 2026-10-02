import crypto from 'crypto';

/**
 * Generates a cryptographically secure 16-digit numeric verification code.
 * Example: "4829173056148273"
 * Uses crypto.randomBytes to avoid predictable timestamps or PRNGs.
 */
export function generateSecure16DigitCode(): string {
  const digits: string[] = [];
  // Generate 16 secure random digits
  const bytes = crypto.randomBytes(16);
  for (let i = 0; i < 16; i++) {
    // Byte modulo 10 gives digit 0-9
    const digit = bytes[i] % 10;
    digits.push(digit.toString());
  }
  return digits.join('');
}

/**
 * Computes a secure SHA-256 hash of the verification code for database storage.
 */
export function hashVerificationCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * Verifies a 16-digit code against its stored SHA-256 hash in constant time.
 */
export function verifyCodeHash(code: string, storedHash: string): boolean {
  const computedHash = hashVerificationCode(code);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  } catch {
    return false;
  }
}
