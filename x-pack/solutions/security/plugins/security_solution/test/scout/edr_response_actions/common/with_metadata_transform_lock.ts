/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { open, readFile, stat, unlink, utimes } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const LOCK_PATH = join(tmpdir(), 'edr-response-actions-metadata-transform.lock');
const HEARTBEAT_INTERVAL_MS = 30_000;
const STALE_AFTER_MS = 2 * 60_000;
const RETRY_INTERVAL_MS = 1_000;

/**
 * Serializes this suite's metadata seeding, and the isolation writes and waits that need the shared
 * metadata transform running, so one worker cannot force-stop that transform, or write metadata,
 * while another seeds or waits on it.
 * Not reentrant: `fn` must not take the lock again. With `acquireTimeoutMs`, waiting for the lock
 * fails after that long instead of waiting indefinitely.
 * Remove this only when both are true: current-time seeds no longer call stopMetadataTransforms,
 * and the endpoint package's `metadata_current` transform no longer skips metadata docs that
 * become searchable late (https://github.com/elastic/kibana/issues/306353).
 */
export const withMetadataTransformLock = async <T>(
  fn: () => Promise<T>,
  { acquireTimeoutMs }: { acquireTimeoutMs?: number } = {}
): Promise<T> => {
  const token = await acquireLock(acquireTimeoutMs);
  const heartbeat = startHeartbeat(token);

  try {
    return await fn();
  } finally {
    clearInterval(heartbeat);
    await releaseLock(token);
  }
};

const acquireLock = async (timeoutMs = Number.POSITIVE_INFINITY): Promise<string> => {
  const token = `${process.pid}:${Date.now()}:${randomUUID()}`;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    try {
      await createLock(token);
      return token;
    } catch (error) {
      if (!isSystemError(error, 'EEXIST')) {
        throw error;
      }
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out after ${Math.round(timeoutMs / 1_000)}s waiting for the metadata-transform lock`
      );
    }

    const removed = await stealIfStale();
    if (!removed) {
      await sleep(RETRY_INTERVAL_MS);
    }
  }
};

const createLock = async (token: string): Promise<void> => {
  const handle = await open(LOCK_PATH, 'wx');
  let written = false;

  try {
    await handle.writeFile(token);
    written = true;
  } finally {
    await handle.close();
    if (!written) {
      await unlink(LOCK_PATH).catch((error: unknown) => {
        if (!isSystemError(error, 'ENOENT')) {
          throw error;
        }
      });
    }
  }
};

const startHeartbeat = (token: string): ReturnType<typeof setInterval> => {
  const timer = setInterval(() => {
    void touchLock(token);
  }, HEARTBEAT_INTERVAL_MS);
  timer.unref();
  return timer;
};

const touchLock = async (token: string): Promise<void> => {
  try {
    const contents = await readFile(LOCK_PATH, 'utf8');
    if (contents !== token) {
      return;
    }
    await utimes(LOCK_PATH, new Date(), new Date());
  } catch {
    // A missed heartbeat must not fail the seed. Two minutes without one lets the other worker take the lock.
  }
};

const stealIfStale = async (): Promise<boolean> => {
  const first = await readLockStat();
  if (!first || Date.now() - first.mtimeMs < STALE_AFTER_MS) {
    return false;
  }

  const second = await readLockStat();
  if (
    !second ||
    second.ino !== first.ino ||
    second.mtimeMs !== first.mtimeMs ||
    Date.now() - second.mtimeMs < STALE_AFTER_MS
  ) {
    return false;
  }

  try {
    await unlink(LOCK_PATH);
    return true;
  } catch (error) {
    if (isSystemError(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
};

const readLockStat = async (): Promise<{ ino: number; mtimeMs: number } | undefined> => {
  try {
    const info = await stat(LOCK_PATH);
    return { ino: info.ino, mtimeMs: info.mtimeMs };
  } catch (error) {
    if (isSystemError(error, 'ENOENT')) {
      return undefined;
    }
    throw error;
  }
};

const releaseLock = async (token: string): Promise<void> => {
  try {
    const contents = await readFile(LOCK_PATH, 'utf8');
    if (contents !== token) {
      return;
    }
  } catch (error) {
    if (isSystemError(error, 'ENOENT')) {
      return;
    }
    throw error;
  }

  try {
    await unlink(LOCK_PATH);
  } catch (error) {
    if (isSystemError(error, 'ENOENT')) {
      return;
    }
    throw error;
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isSystemError = (error: unknown, code: string): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return error.code === code;
};
