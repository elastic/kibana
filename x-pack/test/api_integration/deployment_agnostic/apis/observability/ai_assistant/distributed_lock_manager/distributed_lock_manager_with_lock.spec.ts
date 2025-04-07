/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withLock } from '@kbn/observability-ai-assistant-plugin/server/service/distributed_lock_manager/lock_manager_client';
import expect from '@kbn/expect';
import {
  ensureTemplatesAndIndexCreated,
  LockManager,
} from '@kbn/observability-ai-assistant-plugin/server/service/distributed_lock_manager/lock_manager_client';
import pRetry from 'p-retry';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { getLoggerMock } from '../utils/logger';
import { dateAsTimestamp, sleep } from '../utils/time';
import { clearAllLocks, getLockById } from './distributed_lock_manager.spec';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const logger = getLoggerMock(log);

  describe('LockManager - withLock', function () {
    this.tags(['failsOnMKI']);
    before(async () => {
      await clearAllLocks(es);
      await ensureTemplatesAndIndexCreated(es);
    });

    const LOCK_ID = 'my_lock_with_lock';

    describe('Successful execution and concurrent calls', () => {
      let executions: number;
      let runWithLock: () => Promise<string | undefined>;
      let results: Array<PromiseSettledResult<string | undefined>>;

      before(async () => {
        executions = 0;
        runWithLock = async () => {
          return withLock({ esClient: es, lockId: LOCK_ID, logger }, async () => {
            executions++;
            await sleep(100);
            return 'was called';
          });
        };
        results = await Promise.allSettled([runWithLock(), runWithLock(), runWithLock()]);
      });

      it('executes the callback only once', async () => {
        expect(executions).to.be(1);
      });

      it('returns the callback result for the successful call', async () => {
        const fulfilled = results.filter((r) => r.status === 'fulfilled') as Array<
          PromiseFulfilledResult<string>
        >;
        expect(fulfilled).to.have.length(1);
        expect(fulfilled[0].value).to.be('was called');
      });

      it('releases the lock after execution', async () => {
        const lock = await getLockById(es, LOCK_ID);
        expect(lock).to.be(undefined);
      });
    });

    describe('Error handling in withLock', () => {
      it('should release the lock even if the callback throws an error', async () => {
        let error: Error | undefined;
        try {
          await withLock({ lockId: LOCK_ID, esClient: es, logger }, async () => {
            throw new Error('Simulated callback failure');
          });
          throw new Error('withLock did not throw an error');
        } catch (err) {
          error = err;
        }
        expect(error?.message).to.be('Simulated callback failure');

        // Verify that the lock is released even after a callback error.
        const lock = await getLockById(es, LOCK_ID);
        expect(lock).to.be(undefined);
      });

      it('should throw a LockAcquisitionError if the lock cannot be acquired', async () => {
        // Pre-acquire the lock so that withLock cannot acquire it.
        const preAcquirer = new LockManager(LOCK_ID, es, logger);
        const acquired = await preAcquirer.acquire();
        expect(acquired).to.be(true);

        let error: Error | undefined;
        try {
          await withLock(
            { lockId: LOCK_ID, esClient: es, logger },
            async () => 'should not execute'
          );
        } catch (err) {
          error = err;
        }

        expect(error?.name).to.be('LockAcquisitionError');
        expect(error?.message).to.contain(`Lock "${LOCK_ID}" not acquired`);

        await preAcquirer.release();
      });
    });

    describe('Extending TTL', () => {
      let lockExpiryBefore: string | undefined;
      let lockExpiryAfter: string | undefined;
      let result: string | undefined;

      before(async () => {
        // Use a very short TTL (1 second) so that without extension the lock would expire.
        // The withLock helper extends the TTL periodically.
        result = await withLock({ lockId: LOCK_ID, esClient: es, logger, ttl: 500 }, async () => {
          lockExpiryBefore = (await getLockById(es, LOCK_ID))?.expiresAt;
          await sleep(600); // Simulate a long-running operation
          lockExpiryAfter = (await getLockById(es, LOCK_ID))?.expiresAt;
          return 'done';
        });
      });

      it('should return the result of the callback', () => {
        expect(result).to.be('done');
      });

      it('should extend the ttl', () => {
        expect(lockExpiryBefore).not.to.be(undefined);
        expect(lockExpiryAfter).not.to.be(undefined);

        // Verify that the new expiration is later than before.
        expect(dateAsTimestamp(lockExpiryAfter!)).to.be.greaterThan(
          dateAsTimestamp(lockExpiryBefore!)
        );
      });

      // Even though the initial TTL was short, the periodic extension should have kept the lock active.
      // After the withLock call completes, the lock should be released.
      it('should release the lock after the callback', async () => {
        const lock = await getLockById(es, LOCK_ID);
        expect(lock).to.be(undefined);
      });
    });

    describe('when waiting for lock to be available using pRetry and it times out', () => {
      const RETRY_LOCK_ID = 'my_lock_with_retry';
      let retries = 0;
      let error: Error | undefined;
      let lm: LockManager;

      before(async () => {
        lm = new LockManager(RETRY_LOCK_ID, es, logger);
        const acquired = await lm.acquire();
        expect(acquired).to.be(true);

        try {
          await pRetry(
            async () => {
              retries++;
              await withLock(
                { lockId: RETRY_LOCK_ID, esClient: es, logger },
                async () => 'should not execute'
              );
            },
            { minTimeout: 50, maxTimeout: 50, retries: 2 }
          );
        } catch (err) {
          error = err;
        }
      });

      after(async () => {
        await lm.release();
      });

      it('invokes withLock 3 times', async () => {
        expect(retries).to.be(3);
      });

      it('throws a LockAcquisitionError', () => {
        expect(error?.name).to.be('LockAcquisitionError');
      });

      it('throws a LockAcquisitionError with a message', () => {
        expect(error?.message).to.contain(`Lock "${RETRY_LOCK_ID}" not acquired`);
      });
    });

    describe('when waiting for lock to be available using pRetry and does not time out', () => {
      const RETRY_LOCK_ID = 'my_lock_with_retry';
      let retries = 0;
      let res: string | undefined;

      before(async () => {
        const lm = new LockManager(RETRY_LOCK_ID, es, logger);
        const acquired = await lm.acquire();
        expect(acquired).to.be(true);

        setTimeout(() => lm.release(), 100);

        await pRetry(
          async () => {
            retries++;
            res = await withLock(
              { lockId: RETRY_LOCK_ID, esClient: es, logger },
              async () => 'should execute'
            );
          },
          { minTimeout: 50, maxTimeout: 50, retries: 5 }
        );
      });

      it('retries calling withLock multiple times', async () => {
        expect(retries).to.be.greaterThan(1);
      });

      it('returns the result', () => {
        expect(res).to.be('should execute');
      });

      it('releases the lock', async () => {
        const lock = await getLockById(es, RETRY_LOCK_ID);
        expect(lock).to.be(undefined);
      });
    });
  });
}
