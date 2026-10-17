import crypto from 'crypto';
import { env } from '../config/env';

export interface AuthTokenPayload {
  id: string;
  email: string;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function generateAuthToken(
  user: { id: string; email: string },
  expiresInSeconds: number = 7 * 24 * 60 * 60
): string {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = JSON.stringify({ id: user.id, email: user.email, exp });

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', env.AUTH_SECRET)
    .update(dataToSign)
    .digest('base64url');

  return `${dataToSign}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', env.AUTH_SECRET)
    .update(dataToSign)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedSigBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return null;
  }

  try {
    const decodedPayload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (!decodedPayload.exp || decodedPayload.exp < now) {
      return null;
    }

    if (!decodedPayload.id || !decodedPayload.email) {
      return null;
    }

    return decodedPayload;
  } catch {
    return null;
  }
}
