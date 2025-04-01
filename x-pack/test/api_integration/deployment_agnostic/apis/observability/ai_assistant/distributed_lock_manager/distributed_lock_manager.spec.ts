/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuid } from 'uuid';
import {
  LockId,
  ensureTemplatesAndIndexCreated,
  LockManager,
  withLock,
  LockDocument,
  LOCKS_CONCRETE_INDEX_NAME,
} from '@kbn/observability-ai-assistant-plugin/server/service/distributed_lock_manager';
import { Client } from '@elastic/elasticsearch';
import { times } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { getLoggerMock } from '../utils/logger';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const logger = getLoggerMock(log);

  describe('LockManager', function () {
    before(async () => {
      await clearAllLocks(es);
      await ensureTemplatesAndIndexCreated(es);
    });

    describe('Basic lock operations', () => {
      let lockManager: LockManager;

      beforeEach(async () => {
        lockManager = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
      });

      afterEach(async () => {
        await lockManager.release();
      });

      it('acquires the lock when not held', async () => {
        const acquired = await lockManager.acquire();
        expect(acquired).to.be(true);

        const lock = await lockManager.get();
        expect(true).to.be(true);

        expect(lock).not.to.be(undefined);
      });

      it('stores and retrieves metadata', async () => {
        const metadata = { foo: 'bar' };
        await lockManager.acquire({ metadata });
        const lock = await lockManager.get();
        expect(lock?.metadata).to.eql(metadata);
      });

      it('releases the lock', async () => {
        const acquired = await lockManager.acquire();
        expect(acquired).to.be(true);

        await lockManager.release();

        const lock = await lockManager.get();
        expect(lock).to.be(undefined);
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
        await lockManager.acquire({ metadata: { detail: 'valid' }, ttlMs: 5000 });
        const lock = await lockManager.get();
        expect(lock).not.to.be(undefined);
        expect(lock!.metadata.detail).to.be('valid');
      });
    });

    describe('Two LockManagers with different lockId', () => {
      let manager1: LockManager;
      let manager2: LockManager;

      beforeEach(async () => {
        manager1 = new LockManager('customLockId' as LockId, es, logger);
        manager2 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
      });

      afterEach(async () => {
        await manager1.release();
        await manager2.release();
      });

      it('does not interfere between separate locks', async () => {
        const acquired1 = await manager1.acquire();
        const acquired2 = await manager2.acquire();
        expect(acquired1).to.be(true);
        expect(acquired2).to.be(true);
      });
    });

    describe('Two LockManagers with identical lockId', () => {
      let manager1: LockManager;
      let manager2: LockManager;

      beforeEach(async () => {
        manager1 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        manager2 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
      });

      afterEach(async () => {
        await manager1.release();
        await manager2.release();
      });

      it('does not acquire the lock if already held', async () => {
        const acquired1 = await manager1.acquire({ metadata: { attempt: 'one' } });
        expect(acquired1).to.be(true);

        const acquired2 = await manager2.acquire({ metadata: { attempt: 'two' } });
        expect(acquired2).to.be(false);

        const lock = await getLockById(es, LockId.KnowledgeBaseReindex);
        expect(lock?.metadata).to.eql({ attempt: 'one' });
      });

      it('allows reacquisition after expiration', async () => {
        // Acquire with a very short TTL.
        const acquired = await manager1.acquire({ ttlMs: 1000, metadata: { attempt: 'one' } });
        expect(acquired).to.be(true);

        await sleep(1500); // wait for lock to expire

        const reacquired = await manager2.acquire({ metadata: { attempt: 'two' } });
        expect(reacquired).to.be(true);
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

      before(async () => {
        executions = 0;
        runWithLock = async () => {
          return withLock(
            { esClient: es, lockId: LockId.KnowledgeBaseReindex, logger },
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
        const lock = await getLockById(es, LockId.KnowledgeBaseReindex);
        expect(lock).to.be(undefined);
      });
    });

    describe('TTL extension', () => {
      let lockManager: LockManager;

      beforeEach(async () => {
        lockManager = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
      });

      describe('when the lock is manually handled', () => {
        afterEach(async () => {
          await lockManager.release();
        });

        it('should extend the TTL when `extendTtl` is called', async () => {
          // Acquire the lock with a very short TTL (e.g. 1 second).
          const acquired = await lockManager.acquire({ ttlMs: 1000 });
          expect(acquired).to.be(true);

          const lockExpiryBefore = (await getLockById(es, LockId.KnowledgeBaseReindex))!.expiresAt;

          // Extend the TTL
          const extended = await lockManager.extendTtl();
          expect(extended).to.be(true);

          const lockExpiryAfter = (await getLockById(es, LockId.KnowledgeBaseReindex))!.expiresAt;

          // Verify that the new expiration is later than before.
          expect(new Date(lockExpiryAfter).getTime()).to.be.greaterThan(
            new Date(lockExpiryBefore).getTime()
          );
        });
      });

      describe('withLock', () => {
        let lockExpiryBefore: string | undefined;
        let lockExpiryAfter: string | undefined;
        let result: string | undefined;

        before(async () => {
          // Use a very short TTL (1 second) so that without extension the lock would expire.
          // The withLock helper extends the TTL periodically.
          result = await withLock(
            { lockId: LockId.KnowledgeBaseReindex, esClient: es, logger, ttlMs: 100 },
            async () => {
              lockExpiryBefore = (await getLockById(es, LockId.KnowledgeBaseReindex))?.expiresAt;
              await sleep(500); // Simulate a long-running operation
              lockExpiryAfter = (await getLockById(es, LockId.KnowledgeBaseReindex))?.expiresAt;
              return 'done';
            }
          );
        });

        it('should return the result of the callback', () => {
          expect(result).to.be('done');
        });

        it('should extend the ttl', () => {
          expect(lockExpiryBefore).not.to.be(undefined);
          expect(lockExpiryAfter).not.to.be(undefined);

          // Verify that the new expiration is later than before.
          expect(new Date(lockExpiryAfter!).getTime()).to.be.greaterThan(
            new Date(lockExpiryBefore!).getTime()
          );
        });

        // Even though the initial TTL was short, the periodic extension should have kept the lock active.
        // After the withLock call completes, the lock should be released.
        it('should release the lock after the callback', async () => {
          const lock = await getLockById(es, LockId.KnowledgeBaseReindex);
          expect(lock).to.be(undefined);
        });
      });

      describe('withLock - error handling', () => {
        it('should release the lock even if the callback throws an error', async () => {
          try {
            await withLock(
              { lockId: LockId.KnowledgeBaseReindex, esClient: es, logger, ttlMs: 300000 },
              async () => {
                throw new Error('Simulated callback failure');
              }
            );
            throw new Error('withLock did not throw an error');
          } catch (err) {
            expect(err.message).to.be('Simulated callback failure');
          }

          const lock = await getLockById(es, LockId.KnowledgeBaseReindex);
          expect(lock).to.be(undefined);
        });
      });
    });

    describe.only('Concurrency and race conditions', () => {
      it('should allow only one lock acquisition among many concurrent attempts', async () => {
        const results = await Promise.all(
          times(50).map(async () => {
            const lm = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
            const hasLock = await lm.acquire();
            if (hasLock) {
              await lm.release();
            }
            return hasLock;
          })
        );

        expect(results.filter((v) => v === true)).to.have.length(1);
        expect(results.filter((v) => v === false)).to.have.length(results.length - 1);
      });

      it('should handle concurrent release and acquisition without race conditions', async () => {
        const initialManager = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        const acquired = await initialManager.acquire({ ttlMs: 3000 });
        expect(acquired).to.be(true);

        // Then launch multiple concurrent operations:
        // Some attempts will try to release the lock while others try to acquire it.

        const releaseAttemptsPromise = times(20).map(() => {
          const manager1 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
          return manager1.release();
        });

        const acquireAttemptsPromise = times(20).map(() => {
          const manager2 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
          return manager2.acquire();
        });

        const releaseAttempts = await Promise.all(releaseAttemptsPromise);
        const acquireAttempts = await Promise.all(acquireAttemptsPromise);

        // only one acquire attempt should succeed
        expect(acquireAttempts.filter((r) => r === true)).to.have.length(0);
        expect(releaseAttempts.filter((r) => r === true)).to.have.length(0);

        // Finally, confirm that the lock still exists
        const lock = await getLockById(es, LockId.KnowledgeBaseReindex);
        expect(lock).not.to.be(undefined);

        // cleanup
        await initialManager.release();
      });
    });

    describe('Token fencing', () => {
      let manager1: LockManager;
      let manager2: LockManager;

      beforeEach(async () => {
        manager1 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
        manager2 = new LockManager(LockId.KnowledgeBaseReindex, es, logger);
      });

      afterEach(async () => {
        await manager1.release();
        await manager2.release();
      });

      it('should not release the lock if the token does not match', async () => {
        const acquired = await manager1.acquire({ ttlMs: 5000 });
        expect(acquired).to.be(true);

        // Simulate an interfering update that changes the token.
        // (We do this by issuing an update directly to Elasticsearch.)
        const newToken = uuid();
        await es.update({
          index: LOCKS_CONCRETE_INDEX_NAME,
          id: LockId.KnowledgeBaseReindex,
          doc: { token: newToken },
          refresh: true,
        });
        log.debug(`Updated lock token to: ${newToken}`);

        // Now manager1 still holds its old token.
        // Its call to release() should find no document with its token and return false.
        const releaseResult = await manager1.release();
        expect(releaseResult).to.be(false);

        // Verify that the lock still exists and now carries the interfering token.
        const lock = await getLockById(es, LockId.KnowledgeBaseReindex);
        expect(lock).not.to.be(undefined);
        expect(lock!.token).to.be(newToken);

        // cleanup
        await clearAllLocks(es);
      });

      it('should use a fresh token on subsequent acquisitions', async () => {
        const acquired1 = await manager1.acquire();
        expect(acquired1).to.be(true);

        // Get the current token.
        const firstLock = await getLockById(es, LockId.KnowledgeBaseReindex);

        // Release the lock.
        const released = await manager1.release();
        expect(released).to.be(true);

        // Re-acquire the lock.
        const acquired2 = await manager2.acquire();
        expect(acquired2).to.be(true);

        const secondLock = await getLockById(es, LockId.KnowledgeBaseReindex);
        expect(secondLock!.token).not.to.be(firstLock!.token);
      });
    });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearAllLocks(es: Client) {
  return es.deleteByQuery(
    {
      index: LOCKS_CONCRETE_INDEX_NAME,
      query: { match_all: {} },
      refresh: true,
    },
    { ignore: [404] }
  );
}

async function getLocks(es: Client) {
  const res = await es.search<LockDocument>({
    index: LOCKS_CONCRETE_INDEX_NAME,
    query: { match_all: {} },
  });

  return res.hits.hits;
}

/* eslint-disable no-console */
// @ts-ignore
async function outputLocks(es: Client, name?: string) {
  const locks = await getLocks(es);

  console.log(`${name ?? ''}: ${locks.length} locks found`);

  for (const lock of locks) {
    const { _id, _source } = lock;
    const { token, expiresAt, metadata } = _source!;
    console.log(`Lock ID: ${_id}`);
    console.log(`Token: ${token}`);
    console.log(`Expires At: ${expiresAt}`);
    console.log(`Metadata: ${JSON.stringify(metadata)}`);
    console.log('--------------------------');
  }
}
/* eslint-enable no-console */

async function getLockById(esClient: Client, lockId: LockId): Promise<LockDocument | undefined> {
  const res = await esClient.search<LockDocument>(
    {
      index: LOCKS_CONCRETE_INDEX_NAME,
      query: {
        bool: { filter: [{ term: { _id: lockId } }] },
      },
    },
    { ignore: [404] }
  );

  return res.hits.hits[0]?._source;
}
