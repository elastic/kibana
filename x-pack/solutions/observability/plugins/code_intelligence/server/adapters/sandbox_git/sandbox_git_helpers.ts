/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { isLeft } from 'fp-ts/Either';

import { containsControlCharacter, isSafeRevision } from '../../../common/repository_settings';
import { repositoryRelativePathRt } from '../../domain';

/** Limits records returned in one source page. */
export const SANDBOX_GIT_PAGE_SIZE = 200;
/** Limits one temporary spool file. */
export const SANDBOX_GIT_MAX_SPOOL_BYTES = 256 * 1024 * 1024;
/** Limits all temporary spool files owned by one reader. */
export const SANDBOX_GIT_MAX_TOTAL_SPOOL_BYTES = 1024 * 1024 * 1024;
/** Limits simultaneous Git scans that are creating spools. */
export const SANDBOX_GIT_MAX_SPOOL_CONCURRENCY = 2;
/** Limits retained completed spools. */
export const SANDBOX_GIT_MAX_ACTIVE_SPOOLS = 16;
/** Limits the lifetime of a continuation spool. */
export const SANDBOX_GIT_SPOOL_TTL_MS = 10 * 60_000;
/** Limits a repository-relative path carried in a server-generated continuation. */
const MAX_CURSOR_PATH_BYTES = 4_096;
/** Bounds the JSON fingerprint embedded in a server-generated continuation. */
const MAX_CURSOR_REQUEST_BYTES = 16_384;
/** Stops oversized untrusted continuations before token parsing or authentication work. */
const MAX_CURSOR_TOKEN_BYTES = 4 * (MAX_CURSOR_REQUEST_BYTES + MAX_CURSOR_PATH_BYTES + 512);

/** Finds the inclusive boundary of one complete operation-specific Git output record. */
export const findRecordEnd = (operation: 'grep' | 'tree', pending: Buffer): number => {
  if (operation === 'tree') return pending.indexOf(0);
  /** Finds the first field delimiter in grep output. */
  const first = pending.indexOf(0);
  /** Finds the line-number delimiter in grep output. */
  const second = first < 0 ? -1 : pending.indexOf(0, first + 1);
  return second < 0 ? -1 : pending.indexOf(10, second + 1);
};

/** Represents a sanitized operational failure. */
export interface GitCommandFailure {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly exitCode?: number | null;
  /** Retains private diagnostic text only for expected revision classification. */
  readonly diagnostic?: string;
}

/** Authenticated data carried by an opaque continuation. */
export interface SpoolCursor {
  readonly version: 2;
  readonly operation: 'grep' | 'tree';
  readonly repository: string;
  readonly commitSha: string;
  readonly request: string;
  readonly spoolId: string;
  readonly byteOffset: number;
  readonly expiresAt: number;
}

/** Returns a typed port failure. */
export const failure = (code: string, message: string, retryable: boolean) => ({
  status: 'failure' as const,
  error: { code, message, retryable },
});

/** Converts a Git failure to a port failure. */
export const commandFailure = (result: GitCommandFailure) =>
  failure(result.code, result.message, result.retryable);

export { isSafeRevision };

/** Validates a Git grep regular expression transport value. */
export const isSafePattern = (pattern: string): boolean =>
  pattern.length > 0 && pattern.length <= 2_048 && !containsControlCharacter(pattern);

/** Keeps server-generated continuation fingerprints within their declared bounded envelope. */
export const isCursorPath = (path: string | undefined): boolean =>
  path === undefined || Buffer.byteLength(path, 'utf8') <= MAX_CURSOR_PATH_BYTES;

/** Decodes and validates an untrusted Git path without lossy UTF-8 replacement. */
export const decodeRepositoryPath = (value: Buffer): string | undefined => {
  try {
    /** Rejects malformed UTF-8 instead of turning it into a replacement character. */
    const path = new TextDecoder('utf-8', { fatal: true }).decode(value);
    return isLeft(repositoryRelativePathRt.decode(path)) ? undefined : path;
  } catch (_error: unknown) {
    return undefined;
  }
};

/** Creates a stable query fingerprint for cursor binding. */
export const cursorRequest = (request: Record<string, unknown>): string => JSON.stringify(request);

/** Signs an opaque continuation cursor. */
export const encodeCursor = (secret: string, cursor: SpoolCursor): string => {
  /** Serializes cursor data before signing. */
  const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
  /** Authenticates the opaque payload with server-held material. */
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

/** Decodes a valid cursor or returns its typed rejection code. */
export const decodeCursor = (
  secret: string,
  token: string | undefined,
  operation: SpoolCursor['operation'],
  repository: string,
  commitSha: string,
  request: string
): SpoolCursor | 'initial' | 'invalid_continuation' | 'continuation_expired' => {
  if (token === undefined) return 'initial';
  // This is derived from the largest server fingerprint and cursor envelope, before hostile input work.
  if (Buffer.byteLength(token, 'utf8') > MAX_CURSOR_TOKEN_BYTES) return 'invalid_continuation';
  /** Splits the fixed signed token shape. */
  const parts = token.split('.');
  if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined)
    return 'invalid_continuation';
  /** Computes the expected MAC before trusting payload data. */
  const expected = Buffer.from(
    createHmac('sha256', secret).update(parts[0]).digest('base64url'),
    'base64url'
  );
  /** Decodes the submitted MAC for constant-time comparison. */
  const actual = Buffer.from(parts[1], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return 'invalid_continuation';
  try {
    /** Parses the authenticated but still schema-untrusted payload. */
    const parsed = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    ) as Partial<SpoolCursor>;
    if (
      parsed.version !== 2 ||
      parsed.operation !== operation ||
      parsed.repository !== repository ||
      parsed.commitSha !== commitSha ||
      parsed.request !== request ||
      typeof parsed.spoolId !== 'string' ||
      !Number.isSafeInteger(parsed.byteOffset) ||
      (parsed.byteOffset ?? -1) < 0 ||
      !Number.isSafeInteger(parsed.expiresAt)
    )
      return 'invalid_continuation';
    if ((parsed.expiresAt ?? 0) <= Date.now()) return 'continuation_expired';
    return parsed as SpoolCursor;
  } catch (_error: unknown) {
    return 'invalid_continuation';
  }
};
