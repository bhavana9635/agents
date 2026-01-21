import crypto from 'crypto';
import { config } from '../config';

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32);
  const prefix = 'aic_';
  const key = randomBytes.toString('base64url');
  return `${prefix}${key}`;
}

export function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, hash);
}
