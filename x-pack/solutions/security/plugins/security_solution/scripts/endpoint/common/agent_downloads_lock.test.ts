/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs, {
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { withDownloadLock } from './agent_downloads_service';

/** Lock contents written by this version: `<pid>:<uuid>`. */
const OWN_LOCK = new RegExp(`^${process.pid}:[0-9a-f-]{36}$`);
const OTHER_ACQUISITION = `${process.pid}:11111111-1111-4111-8111-111111111111`;

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
    jest.restoreAllMocks();
    rmSync(directory, { recursive: true, force: true });
  });

  const setMtime = (path: string, msAgo: number) => {
    const at = new Date(Date.now() - msAgo);
    utimesSync(path, at, at);
  };

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

    expect(seenPid).toMatch(OWN_LOCK);
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
    writeFileSync(lockPath, OTHER_ACQUISITION);
    setMtime(lockPath, 60_000);

    let seenPid = '';
    await withDownloadLock(
      log,
      lockPath,
      async () => {
        seenPid = readFileSync(lockPath, 'utf8');
      },
      { waitMs: 2_000, pollMs: 10, staleMs: 5_000 }
    );

    expect(seenPid).toMatch(OWN_LOCK);
    expect(existsSync(lockPath)).toBe(false);
  });

  it('does not steal a bare-pid lock from older code just because it has no heartbeat', async () => {
    // Older code writes a bare pid and never refreshes the mtime.
    writeFileSync(lockPath, String(process.pid));
    setMtime(lockPath, 60_000);

    await expect(
      withDownloadLock(log, lockPath, async () => undefined, {
        waitMs: 100,
        pollMs: 10,
        staleMs: 5_000,
        legacyStaleMs: 120_000,
      })
    ).rejects.toThrow(/Timed out waiting for agent download lock/);

    expect(readFileSync(lockPath, 'utf8')).toBe(String(process.pid));
  });

  it('reclaims a bare-pid lock from older code once it is older than the legacy threshold', async () => {
    writeFileSync(lockPath, String(process.pid));
    setMtime(lockPath, 180_000);

    let seenPid = '';
    await withDownloadLock(
      log,
      lockPath,
      async () => {
        seenPid = readFileSync(lockPath, 'utf8');
      },
      { waitMs: 2_000, pollMs: 10, staleMs: 5_000, legacyStaleMs: 120_000 }
    );

    expect(seenPid).toMatch(OWN_LOCK);
  });

  it('keeps a lock that its holder refreshed between the stale check and the removal', async () => {
    writeFileSync(lockPath, OTHER_ACQUISITION);
    setMtime(lockPath, 60_000);

    const realRename = fs.renameSync;
    jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      // The holder's heartbeat lands just before the waiter moves the lock aside.
      if (from === lockPath) {
        setMtime(lockPath, 0);
      }
      return realRename(from, to);
    });

    await expect(
      withDownloadLock(log, lockPath, async () => undefined, {
        waitMs: 100,
        pollMs: 10,
        staleMs: 5_000,
      })
    ).rejects.toThrow(/Timed out waiting for agent download lock/);

    expect(readFileSync(lockPath, 'utf8')).toBe(OTHER_ACQUISITION);
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

  it('aborts the previous holder and leaves the replacement lock alone once its lock is reclaimed', async () => {
    const replacement = '999999';
    let abortedByHeartbeat = false;
    let assertHeld = () => {};

    const holder = withDownloadLock(
      log,
      lockPath,
      async (lock) => {
        assertHeld = lock.assertHeld;
        // Another worker reclaims the lock while this holder is stalled.
        unlinkSync(lockPath);
        writeFileSync(lockPath, replacement);
        setMtime(lockPath, 60_000);
        // Only the heartbeat runs while this holder waits, so it alone can abort the signal.
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 500);
          lock.signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timeout);
              resolve();
            },
            { once: true }
          );
        });
        abortedByHeartbeat = lock.signal.aborted;
        assertHeld();
      },
      { waitMs: 1_000, pollMs: 10, heartbeatMs: 10, staleMs: 5_000 }
    );

    await expect(holder).rejects.toThrow(/Lost ownership of agent download lock/);

    expect(abortedByHeartbeat).toBe(true);
    expect(() => assertHeld()).toThrow(/Lost ownership/);
    // Neither the heartbeat nor the release path touched the replacement lock.
    expect(readFileSync(lockPath, 'utf8')).toBe(replacement);
    expect(Date.now() - statSync(lockPath).mtimeMs).toBeGreaterThan(30_000);
  });

  it('does not report success when the lock was lost during run()', async () => {
    await expect(
      withDownloadLock(
        log,
        lockPath,
        async () => {
          unlinkSync(lockPath);
          writeFileSync(lockPath, '999999');
        },
        { waitMs: 1_000, pollMs: 10 }
      )
    ).rejects.toThrow(/Lost ownership/);
  });

  it('does not remove the lock in finally when another pid replaced it', async () => {
    const replacement = '999999';

    await expect(
      withDownloadLock(
        log,
        lockPath,
        async () => {
          writeFileSync(lockPath, replacement);
        },
        { waitMs: 1_000, pollMs: 10 }
      )
    ).rejects.toThrow(/Lost ownership/);

    expect(readFileSync(lockPath, 'utf8')).toBe(replacement);
  });

  it('tells two acquisitions in the same process apart', async () => {
    let secondLock = '';
    let releaseSecond = () => {};
    let second: Promise<void> | undefined;

    await expect(
      withDownloadLock(
        log,
        lockPath,
        async (first) => {
          // The first holder stalls long enough for a second call in this process to reclaim it.
          setMtime(lockPath, 60_000);
          const secondRunning = new Promise<void>((resolve) => {
            second = withDownloadLock(
              log,
              lockPath,
              async () => {
                secondLock = readFileSync(lockPath, 'utf8');
                resolve();
                await new Promise<void>((done) => {
                  releaseSecond = done;
                });
              },
              { waitMs: 1_000, pollMs: 10, heartbeatMs: 10_000, staleMs: 5_000 }
            );
          });
          await secondRunning;

          expect(first.isHeld()).toBe(false);
          first.assertHeld();
        },
        { waitMs: 1_000, pollMs: 10, heartbeatMs: 10_000, staleMs: 5_000 }
      )
    ).rejects.toThrow(/Lost ownership/);

    // The first holder's release left the second holder's lock in place.
    expect(secondLock).toMatch(OWN_LOCK);
    expect(readFileSync(lockPath, 'utf8')).toBe(secondLock);

    releaseSecond();
    await second;
    expect(existsSync(lockPath)).toBe(false);
  });

  it('does not abort the holder while a waiter has its lock moved aside for a moment', async () => {
    let aborted = true;

    await withDownloadLock(
      log,
      lockPath,
      async (lock) => {
        // What `removeStaleDownloadLock` does when the lock turns out to still be live.
        const aside = `${lockPath}.aside`;
        renameSync(lockPath, aside);
        await wait(50);
        expect(lock.isHeld()).toBe(true);
        fs.linkSync(aside, lockPath);
        unlinkSync(aside);
        await wait(30);
        aborted = lock.signal.aborted;
      },
      { waitMs: 1_000, pollMs: 10, heartbeatMs: 10, staleMs: 5_000 }
    );

    expect(aborted).toBe(false);
    expect(existsSync(lockPath)).toBe(false);
  });
});
