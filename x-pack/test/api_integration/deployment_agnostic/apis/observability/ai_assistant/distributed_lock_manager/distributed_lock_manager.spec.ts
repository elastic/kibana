/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Logger } from '@kbn/logging';
import {
  LockId,
  ensureTemplatesAndIndexCreated,
  LockManager,
  withLock,
} from '@kbn/observability-ai-assistant-plugin/server/service/distributed_lock_manager';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');

  describe('LockManager', function () {
    // Increase timeout since Elasticsearch operations and TTL waits might take a few seconds.
    this.timeout(15000);

    let lockManager: LockManager;
    const fakeLogger = {
      debug: () => {},
      error: () => {},
      info: () => {},
      warn: () => {},
      fatal: () => {},
      trace: () => {},
    } as unknown as Logger;

    before(async () => {
      await ensureTemplatesAndIndexCreated(es);
      lockManager = new LockManager(LockId.KnowledgeBaseReindex, es, fakeLogger);
    });

    beforeEach(async () => {
      await lockManager.release();
    });

    afterEach(async () => {
      await lockManager.release();
    });

    describe('LockManager', () => {
      it('should acquire the lock when it is not held', async () => {
        const acquired = await lockManager.acquire();
        expect(acquired).to.be(true);

        const lock = await lockManager.get();
        expect(lock).to.not.be(undefined);
      });

      it('should store metadata that can be retrieved', async () => {
        await lockManager.acquire({ meta: { foo: 'bar' } });

        const lock = await lockManager.get();
        expect(lock?.meta).to.eql({ foo: 'bar' });
      });

      it('should not acquire the lock if it is already held', async () => {
        const firstAcquired = await lockManager.acquire();
        expect(firstAcquired).to.be(true);

        // Try to acquire again; it should fail.
        const secondAcquired = await lockManager.acquire();
        expect(secondAcquired).to.be(false);
      });

      it('should release the lock', async () => {
        const acquired = await lockManager.acquire();
        expect(acquired).to.be(true);

        await lockManager.release();

        const lock = await lockManager.get();
        expect(lock).to.be(undefined);
      });

      it('should allow reacquiring the lock after expiration', async () => {
        // Acquire the lock with a very short TTL (1 second).
        const acquired = await lockManager.acquire({ ttlMs: 1000 });
        expect(acquired).to.be(true);

        // Wait for 1.5 seconds so that the lock expires.
        await sleep(1500);

        // get() should now return undefined (and remove the expired lock).
        const lockAfterExpiration = await lockManager.get();
        expect(lockAfterExpiration).to.be(undefined);

        // Try to acquire the lock again.
        const reacquired = await lockManager.acquire();
        expect(reacquired).to.be(true);
      });

      it('get should return undefined for an expired lock and remove it', async () => {
        // Acquire with a short TTL.
        const acquired = await lockManager.acquire({ ttlMs: 1000 });
        expect(acquired).to.be(true);

        // Wait for the lock to expire.
        await sleep(1500);
        const lock = await lockManager.get();
        expect(lock).to.be(undefined);

        // Subsequent get() calls still return undefined.
        const lockAgain = await lockManager.get();
        expect(lockAgain).to.be(undefined);
      });

      it('should not throw an error when releasing a non-existent lock', async () => {
        await lockManager.release();
        await lockManager.release();
        const lock = await lockManager.get();
        expect(lock).to.be(undefined);
      });

      it('should return valid lock details when the lock is not expired', async () => {
        await lockManager.acquire({ meta: { detail: 'valid' }, ttlMs: 5000 });
        const lock = await lockManager.get();
        expect(lock).to.not.be(undefined);
        expect(lock!.meta.detail).to.be('valid');
      });

      it('should only allow a single lock to be acquired when multiple calls are made in parallel', async () => {
        const values = await Promise.all([
          lockManager.acquire(),
          lockManager.acquire(),
          lockManager.acquire(),
          lockManager.acquire(),
          lockManager.acquire(),
          lockManager.acquire(),
          lockManager.acquire(),
          lockManager.acquire(),
          lockManager.acquire(),
        ]);

        expect(values.filter((v) => v === true)).to.have.length(1);
        expect(values.filter((v) => v === false)).to.have.length(8);
      });

      it('should increment the counter only once', async () => {
        let counter = 0;

        async function add() {
          const lock = await lockManager.acquire();
          if (lock) {
            await sleep(10);
            counter++;
            lockManager.release();
          }
        }

        await Promise.all([add(), add(), add(), add(), add(), add(), add()]);

        expect(counter).to.be(1);
      });
    });

    describe('Multiple LockManager instances', () => {
      let customLockManager: LockManager;
      before(async () => {
        customLockManager = new LockManager('customLockId' as LockId, es, fakeLogger);
        await customLockManager.release();
      });

      after(async () => {
        await customLockManager.release();
      });

      it('separate locks should not interfere with each other', async () => {
        expect(await customLockManager.acquire()).to.be(true);
        expect(await lockManager.acquire()).to.be(true);
      });
    });

    describe('waitForLock', () => {
      let blockingManager: LockManager;
      let waitingManager: LockManager;

      beforeEach(async () => {
        // Use two LockManager instances with the same lockId.
        blockingManager = new LockManager(LockId.KnowledgeBaseReindex, es, fakeLogger);
        waitingManager = new LockManager(LockId.KnowledgeBaseReindex, es, fakeLogger);
      });

      afterEach(async () => {
        await blockingManager.release();
        await waitingManager.release();
      });

      it('should eventually acquire the lock when it becomes available', async () => {
        // Acquire the lock with the blocking instance.
        const acquired = await blockingManager.acquire();
        expect(acquired).to.be(true);

        // Start waiting for the lock in parallel.
        const waitPromise = waitingManager.waitForLock({ minTimeout: 50, maxTimeout: 50 });

        // After a short delay, release the blocking lock so the waiting instance can acquire it.
        await sleep(100);
        await blockingManager.release();

        const waitResult = await waitPromise;
        expect(waitResult).to.be(true);
      });

      it('should throw an Error when the timeout is reached', async () => {
        // Acquire the lock so it remains held.
        await blockingManager.acquire();

        let error: Error | undefined;
        try {
          await waitingManager.waitForLock({ minTimeout: 100, maxRetryTime: 100, retries: 2 });
        } catch (err) {
          error = err;
        }
        expect(error?.message).to.contain('Lock "knowledge_base_reindex" not available yet');
      });
    });

    describe('withLock', () => {
      it('should execute the callback when the lock is acquired', async () => {
        let executed = false;
        const result = await withLock(
          {
            esClient: es,
            lockId: LockId.KnowledgeBaseReindex,
            logger: fakeLogger,
            meta: { test: 'withLock' },
          },
          async () => {
            executed = true;
            return 'success';
          }
        );
        expect(executed).to.be(true);
        expect(result).to.be('success');
      });

      it('should return undefined and not execute the callback when the lock is not acquired', async () => {
        // Acquire the lock so that the free function cannot acquire it.
        await lockManager.acquire();

        let executed = false;
        const result = await withLock(
          { esClient: es, lockId: LockId.KnowledgeBaseReindex, logger: fakeLogger },
          async () => {
            executed = true;
            return 'failure';
          }
        );
        expect(executed).to.be(false);
        expect(result).to.be(undefined);
      });
    });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
