/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { withDownloadLock } from './agent_downloads_service';

const log = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
  debug: jest.fn(),
} as unknown as ToolingLog;

const DEAD_PID = '2147483646';

describe('withDownloadLock', () => {
  let directory: string;
  let lockPath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'agent-download-lock-'));
    lockPath = join(directory, 'download.lock');
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('steals a lock left by a dead pid and releases it', async () => {
    writeFileSync(lockPath, DEAD_PID);

    let seenPid = '';
    await withDownloadLock(
      log,
      lockPath,
      async () => {
        seenPid = readFileSync(lockPath, 'utf8');
      },
      { waitMs: 2_000, pollMs: 10 }
    );

    expect(seenPid).toBe(String(process.pid));
    expect(existsSync(lockPath)).toBe(false);
  });

  it('waits while the lock file is empty, then takes it once the file is gone', async () => {
    writeFileSync(lockPath, '');

    let ran = false;
    const pending = withDownloadLock(
      log,
      lockPath,
      async () => {
        ran = true;
      },
      { waitMs: 5_000, pollMs: 20 }
    );

    await wait(80);
    expect(ran).toBe(false);
    expect(existsSync(lockPath)).toBe(true);

    unlinkSync(lockPath);
    await pending;

    expect(ran).toBe(true);
    expect(existsSync(lockPath)).toBe(false);
  });

  it('retries when a live lock disappears before it can be read', async () => {
    writeFileSync(lockPath, String(process.pid));

    let ran = false;
    const pending = withDownloadLock(
      log,
      lockPath,
      async () => {
        ran = true;
      },
      { waitMs: 5_000, pollMs: 20 }
    );

    await wait(40);
    expect(ran).toBe(false);
    unlinkSync(lockPath);
    await pending;

    expect(ran).toBe(true);
  });

  it('times out while a live lock is held and leaves that lock in place', async () => {
    writeFileSync(lockPath, String(process.pid));

    await expect(
      withDownloadLock(log, lockPath, async () => undefined, { waitMs: 0, pollMs: 10 })
    ).rejects.toThrow(/Timed out waiting for agent download lock/);

    expect(readFileSync(lockPath, 'utf8')).toBe(String(process.pid));
  });

  it('reclaims a lock whose live pid stopped refreshing it', async () => {
    // Own pid, so only the unrefreshed mtime can mark this lock abandoned.
    writeFileSync(lockPath, String(process.pid));
    const longAgo = new Date(Date.now() - 60_000);
    utimesSync(lockPath, longAgo, longAgo);

    let seenPid = '';
    await withDownloadLock(
      log,
      lockPath,
      async () => {
        seenPid = readFileSync(lockPath, 'utf8');
      },
      { waitMs: 2_000, pollMs: 10, staleMs: 5_000 }
    );

    expect(seenPid).toBe(String(process.pid));
    expect(existsSync(lockPath)).toBe(false);
  });

  it('refreshes the lock it holds so waiters do not reclaim it', async () => {
    let finishRun = () => {};
    const running = new Promise<void>((resolve) => {
      finishRun = resolve;
    });

    const holder = withDownloadLock(log, lockPath, () => running, {
      waitMs: 2_000,
      pollMs: 10,
      heartbeatMs: 10,
      staleMs: 150,
    });

    // Longer than `staleMs`, so only a working heartbeat keeps the lock out of reach.
    await wait(290);

    await expect(
      withDownloadLock(log, lockPath, async () => undefined, {
        waitMs: 0,
        pollMs: 10,
        staleMs: 150,
      })
    ).rejects.toThrow(/Timed out waiting for agent download lock/);

    finishRun();
    await holder;

    expect(existsSync(lockPath)).toBe(false);
  });

  it('does not remove the lock in finally when another pid replaced it', async () => {
    const replacement = '999999';

    await withDownloadLock(
      log,
      lockPath,
      async () => {
        writeFileSync(lockPath, replacement);
      },
      { waitMs: 1_000, pollMs: 10 }
    );

    expect(readFileSync(lockPath, 'utf8')).toBe(replacement);
  });
});
