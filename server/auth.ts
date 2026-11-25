import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import {
  readAdminCredential,
  readSettings,
  withStoreLock,
  writeAdminCredential,
} from './store.ts';

interface AdminSession {
  tokenHash: string;
  expiresAt: number;
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const activeSessions = new Map<string, AdminSession>();

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Compare against dummy buffer to keep constant-time behavior
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function hashPasswordScrypt(password: string, saltHex: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, Buffer.from(saltHex, 'hex'), 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

const ADMIN_USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

export function isValidAdminUsername(username: string): boolean {
  return ADMIN_USERNAME_REGEX.test(username.trim());
}

export function isAdminDebugBypassEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (process.env.ADMIN_PASSCODE?.trim()) {
    return false;
  }
  const settings = readSettings();
  return settings.adminOpenAccess === true;
}

export function getStoredAdminUsername(): string | null {
  const envUser = process.env.ADMIN_USERNAME?.trim();
  if (process.env.ADMIN_PASSCODE?.trim()) {
    return envUser || null;
  }
  const stored = readAdminCredential();
  return stored?.username?.trim() || null;
}

export function getAdminAuthStatus(): {
  needsSetup: boolean;
  setupCompleted: boolean;
  managedByEnv: boolean;
  debugOpenAccess: boolean;
  hasPasscode: boolean;
  hasUsername: boolean;
} {
  const settings = readSettings();
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const envUsername = process.env.ADMIN_USERNAME?.trim();
  if (envPasscode) {
    return {
      needsSetup: false,
      setupCompleted: Boolean(settings.setupCompleted),
      managedByEnv: true,
      debugOpenAccess: false,
      hasPasscode: true,
      hasUsername: Boolean(envUsername),
    };
  }
  const stored = readAdminCredential();
  return {
    needsSetup: !stored,
    setupCompleted: Boolean(settings.setupCompleted),
    managedByEnv: false,
    debugOpenAccess: isAdminDebugBypassEnabled(),
    hasPasscode: Boolean(stored),
    hasUsername: Boolean(stored?.username?.trim()),
  };
}

export async function bootstrapAdminCredentials(
  username: string,
  password: string
): Promise<string> {
  const cleanUsername = username.trim();
  if (!isValidAdminUsername(cleanUsername)) {
    throw new Error('INVALID_USERNAME');
  }

  const trimmedPassword = password.trim();
  if (trimmedPassword.length < 8 || trimmedPassword.length > 128) {
    throw new Error('PASSWORD_TOO_SHORT');
  }

  return withStoreLock(async () => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      throw new Error('MANAGED_BY_ENV');
    }

    const existing = readAdminCredential();
    if (existing) {
      throw new Error('ALREADY_CLAIMED');
    }

    const saltHex = crypto.randomBytes(16).toString('hex');
    const hashHex = await hashPasswordScrypt(trimmedPassword, saltHex);
    writeAdminCredential({
      username: cleanUsername,
      saltHex,
      hashHex,
      claimedAt: new Date().toISOString(),
    });

    return issueAdminSession();
  });
}

export async function setAdminCredentials(params: {
  username?: string;
  password?: string;
}): Promise<string | undefined> {
  const cleanUsername = typeof params.username === 'string' ? params.username.trim() : '';
  const trimmedPassword = typeof params.password === 'string' ? params.password.trim() : '';

  if (cleanUsername && !isValidAdminUsername(cleanUsername)) {
    throw new Error('INVALID_USERNAME');
  }
  if (trimmedPassword && (trimmedPassword.length < 8 || trimmedPassword.length > 128)) {
    throw new Error('PASSWORD_TOO_SHORT');
  }

  return withStoreLock(async () => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      throw new Error('MANAGED_BY_ENV');
    }

    const existing = readAdminCredential();
    if (!trimmedPassword && !existing) {
      throw new Error('PASSWORD_REQUIRED');
    }

    const nextUsername = cleanUsername || existing?.username || undefined;
    if (trimmedPassword) {
      const saltHex = crypto.randomBytes(16).toString('hex');
      const hashHex = await hashPasswordScrypt(trimmedPassword, saltHex);
      writeAdminCredential({
        username: nextUsername,
        saltHex,
        hashHex,
        claimedAt: new Date().toISOString(),
      });
      return issueAdminSession();
    }

    if (existing && nextUsername && nextUsername !== existing.username) {
      writeAdminCredential({
        ...existing,
        username: nextUsername,
      });
    }

    return undefined;
  });
}

export function createAdminSession(): string {
  return issueAdminSession();
}

export async function verifyAdminLogin(
  username: string | undefined,
  password: string
): Promise<string | null> {
  if (typeof password !== 'string' || password.length === 0) {
    return null;
  }

  const candidateUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    const envUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    const userMatches = envUsername
      ? timingSafeStringEqual(candidateUsername, envUsername)
      : true;
    const passMatches = timingSafeStringEqual(password, envPasscode);
    if (userMatches && passMatches) {
      return issueAdminSession();
    }
    return null;
  }

  const stored = readAdminCredential();
  if (!stored) {
    return null;
  }

  const expectedUsername = stored.username?.trim().toLowerCase() || '';
  const userMatches = expectedUsername
    ? timingSafeStringEqual(candidateUsername, expectedUsername)
    : true;

  const candidateHash = await hashPasswordScrypt(password, stored.saltHex);
  const expectedBuf = Buffer.from(stored.hashHex, 'hex');
  const actualBuf = Buffer.from(candidateHash, 'hex');
  const passMatches =
    expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

  if (!userMatches || !passMatches) {
    return null;
  }

  return issueAdminSession();
}

function issueAdminSession(): string {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) {
      activeSessions.delete(key);
    }
  }

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256Hex(rawToken);
  activeSessions.set(tokenHash, {
    tokenHash,
    expiresAt: now + SESSION_TTL_MS,
  });
  return rawToken;
}

export function revokeAdminSession(rawToken: string): void {
  if (!rawToken) return;
  activeSessions.delete(sha256Hex(rawToken));
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim() || null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (isAdminDebugBypassEnabled()) {
    next();
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }

  const tokenHash = sha256Hex(token);
  const session = activeSessions.get(tokenHash);
  if (!session || session.expiresAt <= Date.now()) {
    activeSessions.delete(tokenHash);
    res.status(401).json({ error: 'Admin session expired or invalid.' });
    return;
  }

  next();
}
