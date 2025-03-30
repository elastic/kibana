/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  LockId,
  ensureTemplatesAndIndexCreated,
  LockManager,
  withLock,
} from '@kbn/observability-ai-assistant-plugin/server/service/distributed_lock_manager';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { getLoggerMock } from '../utils/logger';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');

  describe('LockManager', function () {
    let lockManager: LockManager;
    let lockManager2: LockManager;

    const loggerMock = getLoggerMock(log);

    before(async () => {
      await ensureTemplatesAndIndexCreated(es);
      lockManager = new LockManager(LockId.KnowledgeBaseReindex, es, loggerMock);
      lockManager2 = new LockManager(LockId.KnowledgeBaseReindex, es, loggerMock);
    });

    beforeEach(async () => {
      await lockManager.release();
      await lockManager2.release();
    });

    afterEach(async () => {
      await lockManager.release();
      await lockManager2.release();
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
        const firstAcquired = await lockManager.acquire({ meta: { attempt: 'one' } });
        expect(firstAcquired).to.be(true);

        // Try to acquire again; it should fail.
        const secondAcquired = await lockManager2.acquire({ meta: { attempt: 'two' } });
        expect(secondAcquired).to.be(false);
        const lock = await lockManager2.get();
        expect(lock?.meta).to.eql({ attempt: 'one' });
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
        const acquired = await lockManager.acquire({ ttlMs: 1000, meta: { attempt: 'one' } });
        expect(acquired).to.be(true);

        // Wait for 1.5 seconds so that the lock expires.
        await sleep(1500);

        // Try to acquire the lock again.
        const reacquired = await lockManager2.acquire({ meta: { attempt: 'two' } });
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
        function acquire() {
          const customLockManager = new LockManager(LockId.KnowledgeBaseReindex, es, loggerMock);
          return customLockManager.acquire();
        }

        const values = await Promise.all([
          acquire(),
          acquire(),
          acquire(),
          acquire(),
          acquire(),
          acquire(),
          acquire(),
          acquire(),
          acquire(),
        ]);

        expect(values.filter((v) => v === true)).to.have.length(1);
        expect(values.filter((v) => v === false)).to.have.length(8);
      });

      it('should increment the counter only once', async () => {
        let counter = 0;

        async function add() {
          const customLockManager = new LockManager(LockId.KnowledgeBaseReindex, es, loggerMock);
          const lock = await customLockManager.acquire();
          if (lock) {
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
        customLockManager = new LockManager('customLockId' as LockId, es, loggerMock);
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
        blockingManager = new LockManager(LockId.KnowledgeBaseReindex, es, loggerMock);
        waitingManager = new LockManager(LockId.KnowledgeBaseReindex, es, loggerMock);
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
      let executions: number;
      let runWithLock: () => Promise<string | undefined>;
      let results: Array<string | undefined>;

      before(async () => {
        executions = 0;
        runWithLock = () => {
          return withLock(
            { esClient: es, lockId: LockId.KnowledgeBaseReindex, logger: loggerMock },
            async () => {
              executions++;
              return 'was called';
            }
          );
        };

        results = await Promise.all([runWithLock(), runWithLock(), runWithLock()]);
      });

      it('should only execute the callback once', async () => {
        expect(executions).to.be(1);
      });

      it('should return the result of the callback', async () => {
        expect(results.sort()).to.eql(['was called', undefined, undefined]);
      });

      it('should release the lock', async () => {
        const lock = await new LockManager(LockId.KnowledgeBaseReindex, es, loggerMock).get();
        expect(lock).to.be(undefined);
      });
    });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
