import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('ENCRYPTION_KEY') ?? 'dev-only-change-me-32-chars-min!!';
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const data = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
