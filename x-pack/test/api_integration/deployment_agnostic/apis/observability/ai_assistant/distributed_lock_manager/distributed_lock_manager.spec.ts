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
import { Client } from '@elastic/elasticsearch';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { getLoggerMock } from '../utils/logger';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const logger = getLoggerMock(log);

  describe('LockManager', function () {
    before(async () => {
      await ensureTemplatesAndIndexCreated(es);
    });

    after(async () => {
      await clearAllLocks(es);
    });

    describe('Basic lock operations', () => {
      let lockManager: LockManager;

      beforeEach(async () => {
        // Create a fresh instance for each test to ensure state isolation.
        lockManager = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        await lockManager.release();
      });

      afterEach(async () => {
        await lockManager.release();
      });

      it('acquires the lock when not held', async () => {
        const acquired = await lockManager.acquire();
        expect(acquired).to.be(true);

        const lock = await lockManager.get();
        expect(lock).not.to.be(undefined);
      });

      it('stores and retrieves metadata', async () => {
        const meta = { foo: 'bar' };
        await lockManager.acquire({ meta });
        const lock = await lockManager.get();
        expect(lock?.meta).to.eql(meta);
      });

      it('does not acquire the lock if already held', async () => {
        // Use two separate instances to simulate concurrent acquisition.
        const manager1 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        const manager2 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        await manager1.release();
        await manager2.release();

        const acquired1 = await manager1.acquire({ meta: { attempt: 'one' } });
        expect(acquired1).to.be(true);

        const acquired2 = await manager2.acquire({ meta: { attempt: 'two' } });
        expect(acquired2).to.be(false);

        const lock = await manager2.get();
        expect(lock?.meta).to.eql({ attempt: 'one' });
      });

      it('releases the lock', async () => {
        const acquired = await lockManager.acquire();
        expect(acquired).to.be(true);

        await lockManager.release();

        const lock = await lockManager.get();
        expect(lock).to.be(undefined);
      });

      it('allows reacquisition after expiration', async () => {
        // Acquire with a very short TTL.
        const acquired = await lockManager.acquire({ ttlMs: 1000, meta: { attempt: 'one' } });
        expect(acquired).to.be(true);

        await sleep(1500); // wait for lock to expire

        // Use a fresh instance to acquire.
        const newManager = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        const reacquired = await newManager.acquire({ meta: { attempt: 'two' } });
        expect(reacquired).to.be(true);
      });

      it('removes expired lock upon get()', async () => {
        await lockManager.acquire({ ttlMs: 500 });
        await sleep(1000);
        const lock = await lockManager.get();
        expect(lock).to.be(undefined);
      });

      it('does not throw when releasing a non-existent lock', async () => {
        await lockManager.release();
        await lockManager.release();
        const lock = await lockManager.get();
        expect(lock).to.be(undefined);
      });

      it('returns valid lock details when active', async () => {
        await lockManager.acquire({ meta: { detail: 'valid' }, ttlMs: 5000 });
        const lock = await lockManager.get();
        expect(lock).not.to.be(undefined);
        expect(lock!.meta.detail).to.be('valid');
      });
    });

    describe('Parallel lock acquisition', () => {
      let customLockManager: LockManager;
      let standardLockManager: LockManager;

      beforeEach(async () => {
        customLockManager = new LockManager('customLockId' as LockId, es, logger);
        standardLockManager = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        await customLockManager.release();
        await standardLockManager.release();
      });

      afterEach(async () => {
        await customLockManager.release();
        await standardLockManager.release();
      });

      it('allows only a single lock acquisition when multiple calls are made concurrently', async () => {
        let counter = 0;
        async function add() {
          const lm = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
          const hasLock = await lm.acquire();
          if (hasLock) {
            counter++;
            await lm.release();
          }
          return hasLock;
        }

        const results = await Promise.all([add(), add(), add(), add(), add(), add(), add()]);
        expect(counter).to.be(1);
        expect(results.filter((v) => v === true)).to.have.length(1);
        expect(results.filter((v) => v === false)).to.have.length(results.length - 1);
      });

      it('does not interfere between separate locks', async () => {
        const acquiredCustom = await customLockManager.acquire();
        const acquiredStandard = await standardLockManager.acquire();
        expect(acquiredCustom).to.be(true);
        expect(acquiredStandard).to.be(true);
      });
    });

    describe('waitForLock', () => {
      let blockingManager: LockManager;
      let waitingManager: LockManager;

      beforeEach(async () => {
        blockingManager = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        waitingManager = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        await blockingManager.release();
        await waitingManager.release();
      });

      afterEach(async () => {
        await blockingManager.release();
        await waitingManager.release();
      });

      it('eventually acquires the lock when it becomes available', async () => {
        const acquired = await blockingManager.acquire();
        expect(acquired).to.be(true);

        const waitPromise = waitingManager.waitForLock({ minTimeout: 50, maxTimeout: 50 });
        await sleep(100);
        await blockingManager.release();

        const waitResult = await waitPromise;
        expect(waitResult).to.be(true);
      });

      it('throws an Error when the wait times out', async () => {
        await blockingManager.acquire();

        let error: Error | undefined;
        try {
          await waitingManager.waitForLock({ minTimeout: 100, maxRetryTime: 100, retries: 2 });
        } catch (err) {
          error = err;
        }
        expect(error?.message).to.contain('Lock "knowledge_base_reindex" not available yet');
        await blockingManager.release();
      });
    });

    describe('withLock', () => {
      let executions: number;
      let runWithLock: () => Promise<string | undefined>;
      let results: Array<string | undefined>;

      beforeEach(async () => {
        executions = 0;
        runWithLock = async () => {
          return withLock(
            {
              esClient: es,
              lockId: LockId.KnowledgeBaseReindex,
              logger,
              meta: { test: 'withLock' },
            },
            async () => {
              executions++;
              return 'was called';
            }
          );
        };

        results = await Promise.all([runWithLock(), runWithLock(), runWithLock()]);
      });

      it('executes the callback only once', async () => {
        expect(executions).to.be(1);
      });

      it('returns the callback result for the successful call', async () => {
        expect(results.sort()).to.eql(['was called', undefined, undefined]);
      });

      it('releases the lock after execution', async () => {
        const lm = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        const lock = await lm.get();
        expect(lock).to.be(undefined);
      });
    });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearAllLocks(es: Client) {
  return es.deleteByQuery({
    index: '.kibana-distributed-lock-manager',
    query: { match_all: {} },
  });
}
