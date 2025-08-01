/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuid } from 'uuid';
import prettyMilliseconds from 'pretty-ms';
import nock from 'nock';
import { Client } from '@elastic/elasticsearch';
import { times } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import pRetry from 'p-retry';
import {
  LockId,
  LockManager,
  LockDocument,
  withLock,
  runSetupIndexAssetEveryTime,
} from '@kbn/lock-manager/src/lock_manager_client';
import {
  LOCKS_COMPONENT_TEMPLATE_NAME,
  LOCKS_CONCRETE_INDEX_NAME,
  LOCKS_INDEX_TEMPLATE_NAME,
  setupLockManagerIndex,
} from '@kbn/lock-manager/src/setup_lock_manager_index';

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getLoggerMock } from '../utils/kibana_mocks';
import { dateAsTimestamp, durationAsMs, sleep } from '../utils/time';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const logger = getLoggerMock(log);

  describe('LockManager', function () {
    // These tests should be moved to Jest Integration tests: https://github.com/elastic/kibana/issues/216690
    this.tags(['skipCloud']);
    before(async () => {
      // delete existing index mappings to ensure we start from a clean state
      await deleteLockIndexAssets(es, log);

      // ensure that the index and templates are created
      runSetupIndexAssetEveryTime();
    });

    after(async () => {
      await deleteLockIndexAssets(es, log);
    });

    describe('Manual locking API', function () {
      before(async () => {
        await clearAllLocks(es, log);
      });

      describe('Basic lock operations', () => {
        let lockManager: LockManager;
        const LOCK_ID = 'basic_lock_operations';

        beforeEach(async () => {
          lockManager = new LockManager(LOCK_ID, es, logger);
        });

        afterEach(async () => {
          await lockManager.release();
        });

        it('acquires the lock when not held', async () => {
          const acquired = await lockManager.acquire();
          expect(acquired).to.be(true);

          const lock = await getLockById(es, LOCK_ID);
          expect(true).to.be(true);

          expect(lock).not.to.be(undefined);
        });

        it('stores and retrieves metadata', async () => {
          const metadata = { foo: 'bar' };
          await lockManager.acquire({ metadata });
          const lock = await getLockById(es, LOCK_ID);
          expect(lock?.metadata).to.eql(metadata);
        });

        it('releases the lock', async () => {
          const acquired = await lockManager.acquire();
          expect(acquired).to.be(true);

          await lockManager.release();

          const lock = await getLockById(es, LOCK_ID);
          expect(lock).to.be(undefined);
        });

        it('it sets expiresAt according to the ttl', async () => {
          await lockManager.acquire({ ttl: durationAsMs(8, 'minutes') });
          const lock = await getLockById(es, LOCK_ID);
          const ttl = dateAsTimestamp(lock!.expiresAt) - dateAsTimestamp(lock!.createdAt);
          expect(prettyMilliseconds(ttl)).to.be('8m');
        });

        it('does not throw when releasing a non-existent lock', async () => {
          await lockManager.release();
          await lockManager.release();
          const lock = await getLockById(es, LOCK_ID);
          expect(lock).to.be(undefined);
        });
      });

      describe('when encountering network error the ES client retries the request', () => {
        let lockManager: LockManager;
        const LOCK_ID = 'es_client_retries_lock';
        let retryCounter = 0;

        beforeEach(async () => {
          retryCounter = 0;

          lockManager = new LockManager(LOCK_ID, es, logger);
        });

        afterEach(async () => {
          nock.cleanAll();
          await lockManager.release();
        });

        after(async () => {
          nock.restore();
        });

        function addElasticsearchMock({ numberOfMocks }: { numberOfMocks: number }) {
          nock(/localhost:9220/, { allowUnmocked: true })
            .filteringRequestBody(() => '*')
            .post(`/${LOCKS_CONCRETE_INDEX_NAME}/_update/${LOCK_ID}`)
            .times(numberOfMocks)
            .reply((uri, requestBody, cb) => {
              log.debug(`Returning mock error for ${uri}`);
              retryCounter++;
              setTimeout(() => {
                cb(null, [503, 'Service Unavailable']);
              }, 100);
            });
        }

        it('eventually succeeds', async () => {
          addElasticsearchMock({ numberOfMocks: 3 });

          const acquired = await lockManager.acquire();

          expect(acquired).to.be(true);
          expect(retryCounter).to.be(3);
        });

        it('eventually fails', async () => {
          addElasticsearchMock({ numberOfMocks: 4 });

          const acquired = await lockManager.acquire();

          expect(acquired).to.be(false);
          expect(retryCounter).to.be(4);
        });
      });

      describe('get', () => {
        let lockManager: LockManager;
        const LOCK_ID = 'my_lock_with_get';

        beforeEach(async () => {
          lockManager = new LockManager(LOCK_ID, es, logger);
        });

        afterEach(async () => {
          await lockManager.release();
        });

        it('does not return expired locks', async () => {
          await lockManager.acquire({ ttl: 500 });
          await sleep(1000);
          const lock = await lockManager.get();
          expect(lock).to.be(undefined);

          const lockRaw = await getLockById(es, LOCK_ID);
          expect(lockRaw).to.not.be(undefined);
        });
      });

      describe('Two LockManagers with different lockId', () => {
        let manager1: LockManager;
        let manager2: LockManager;

        beforeEach(async () => {
          manager1 = new LockManager('my_lock_id' as LockId, es, logger);
          manager2 = new LockManager('my_other_lock_id', es, logger);
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

        const LOCK_ID = 'my_lock';

        beforeEach(async () => {
          manager1 = new LockManager(LOCK_ID, es, logger);
          manager2 = new LockManager(LOCK_ID, es, logger);
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

          const lock = await getLockById(es, LOCK_ID);
          expect(lock?.metadata).to.eql({ attempt: 'one' });
        });

        describe('when a lock by "manager1" expires, and is attempted re-acquired by "manager2"', () => {
          let expiredLock: LockDocument | undefined;
          let reacquireResult: boolean;
          beforeEach(async () => {
            // Acquire with a very short TTL.
            const acquired = await manager1.acquire({ ttl: 500, metadata: { attempt: 'one' } });
            expect(acquired).to.be(true);
            await sleep(1000); // wait for lock to expire
            expiredLock = await getLockById(es, LOCK_ID);
            reacquireResult = await manager2.acquire({ metadata: { attempt: 'two' } });
          });

          it('can be re-acquired', async () => {
            expect(reacquireResult).to.be(true);
          });

          it('updates the token when re-acquired', async () => {
            const reacquiredLock = await getLockById(es, LOCK_ID);
            expect(expiredLock?.token).not.to.be(reacquiredLock?.token);
          });

          it('updates the metadata when re-acquired', async () => {
            const reacquiredLock = await getLockById(es, LOCK_ID);
            expect(reacquiredLock?.metadata).to.eql({ attempt: 'two' });
          });

          it('cannot be released by "manager1"', async () => {
            const res = await manager1.release();
            expect(res).to.be(false);
          });

          it('can be released by "manager2"', async () => {
            const res = await manager2.release();
            expect(res).to.be(true);
          });
        });
      });

      describe('when waiting for lock to be available using pRetry', () => {
        let blockingManager: LockManager;
        let waitingManager: LockManager;

        const RETRY_LOCK_ID = 'my_lock_with_retry';

        beforeEach(async () => {
          blockingManager = new LockManager(RETRY_LOCK_ID, es, logger);
          waitingManager = new LockManager(RETRY_LOCK_ID, es, logger);
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

          const waitPromise = pRetry(async () => {
            const hasLock = await waitingManager.acquire();
            if (!hasLock) {
              throw new Error(`Lock "${RETRY_LOCK_ID}" not available yet`);
            }
            return hasLock;
          });
          await sleep(100);
          await blockingManager.release();

          const waitResult = await waitPromise;
          expect(waitResult).to.be(true);
        });

        it('throws an error when the retry times out', async () => {
          await blockingManager.acquire();

          let error: Error | undefined;
          try {
            await pRetry(
              async () => {
                const hasLock = await waitingManager.acquire();
                if (!hasLock) {
                  throw new Error(`Lock "${RETRY_LOCK_ID}" not available yet`);
                }
                return hasLock;
              },
              { minTimeout: 100, maxTimeout: 100, retries: 2 }
            );
          } catch (err) {
            error = err;
          }
          expect(error?.message).to.contain('Lock "my_lock_with_retry" not available yet');
          await blockingManager.release();
        });
      });

      describe('extendTtl', () => {
        let lockManager: LockManager;
        const ttl = 1000;

        const LOCK_ID = 'my_lock_extend_ttl';

        beforeEach(async () => {
          lockManager = new LockManager(LOCK_ID, es, logger);
          await lockManager.acquire({ ttl });
        });

        afterEach(async () => {
          await lockManager.release();
        });

        it('has initial `expiresAt` value', async () => {
          const lock = (await getLockById(es, LOCK_ID))!;
          expect(dateAsTimestamp(lock.expiresAt)).to.be(dateAsTimestamp(lock.createdAt) + ttl);
        });

        it('update `expiresAt` to be greater than before', async () => {
          const lockBeforeExtending = (await getLockById(es, LOCK_ID))!;
          const res = await lockManager.extendTtl(2000);
          expect(res).to.be(true);

          const lockAfterExtension = (await getLockById(es, LOCK_ID))!;
          expect(dateAsTimestamp(lockAfterExtension.expiresAt)).to.be.greaterThan(
            dateAsTimestamp(lockBeforeExtending.expiresAt)
          );
        });

        it('does not extend lock if already released', async () => {
          await lockManager.release();
          const res = await lockManager.extendTtl(2000);
          expect(res).to.be(false);
        });
      });

      describe('Concurrency and race conditions', () => {
        const LOCK_ID = 'my_lock_with_concurrency';

        it('should allow only one lock acquisition among many concurrent attempts', async () => {
          const lockManagers = await Promise.all(
            times(20).map(() => new LockManager(LOCK_ID, es, logger))
          );

          const acquireAttempts = await Promise.all(lockManagers.map((lm) => lm.acquire()));
          const releaseAttempts = await Promise.all(lockManagers.map((lm) => lm.release()));

          expect(acquireAttempts.filter((v) => v === true)).to.have.length(1);
          expect(releaseAttempts.filter((v) => v === true)).to.have.length(1);
        });

        it('should handle concurrent release and acquisition without race conditions', async () => {
          const initialManager = new LockManager(LOCK_ID, es, logger);
          const acquired = await initialManager.acquire();
          expect(acquired).to.be(true);

          const attempts = await Promise.all(
            times(20).map(async () => {
              const releaseResult = new LockManager(LOCK_ID, es, logger).release();
              const acquireResult = new LockManager(LOCK_ID, es, logger).acquire();

              const [release, acquire] = await Promise.all([releaseResult, acquireResult]);
              return { release, acquire };
            })
          );

          expect(attempts.filter((r) => r.acquire === true)).to.have.length(0);
          expect(attempts.filter((r) => r.release === true)).to.have.length(0);

          // Finally, confirm that the lock still exists
          const lock = await getLockById(es, LOCK_ID);
          expect(lock).not.to.be(undefined);

          // cleanup
          await initialManager.release();
        });
      });

      describe('Token fencing', () => {
        let manager1: LockManager;
        let manager2: LockManager;

        const LOCK_ID = 'my_lock_with_token_fencing';

        beforeEach(async () => {
          manager1 = new LockManager(LOCK_ID, es, logger);
          manager2 = new LockManager(LOCK_ID, es, logger);
        });

        afterEach(async () => {
          await manager1.release();
          await manager2.release();
        });

        it('should not release the lock if the token does not match', async () => {
          const acquired = await manager1.acquire();
          expect(acquired).to.be(true);

          // Simulate an interfering update that changes the token.
          // (We do this by issuing an update directly to Elasticsearch.)
          const newToken = uuid();
          await es.update({
            index: LOCKS_CONCRETE_INDEX_NAME,
            id: LOCK_ID,
            doc: { token: newToken },
            refresh: true,
          });
          log.debug(`Updated lock token to: ${newToken}`);

          // Now manager1 still holds its old token.
          // Its call to release() should find no document with its token and return false.
          const releaseResult = await manager1.release();
          expect(releaseResult).to.be(false);

          // Verify that the lock still exists and now carries the interfering token.
          const lock = await getLockById(es, LOCK_ID);
          expect(lock).not.to.be(undefined);
          expect(lock!.token).to.be(newToken);

          // cleanup
          await clearAllLocks(es, log);
        });

        it('should use a fresh token on subsequent acquisitions', async () => {
          const acquired1 = await manager1.acquire();
          expect(acquired1).to.be(true);

          // Get the current token.
          const firstLock = await getLockById(es, LOCK_ID);

          // Release the lock.
          const released = await manager1.release();
          expect(released).to.be(true);

          // Re-acquire the lock.
          const acquired2 = await manager2.acquire();
          expect(acquired2).to.be(true);

          const secondLock = await getLockById(es, LOCK_ID);
          expect(secondLock!.token).not.to.be(firstLock!.token);
        });
      });
    });

    describe('withLock API', function () {
      before(async () => {
        await clearAllLocks(es, log);
      });

      const LOCK_ID = 'my_lock_with_lock';

      describe('Successful execution and concurrent calls', () => {
        let successfulLockAcquisitions: number;
        let failedLockAcquisitions: number;
        let runWithLock: () => Promise<string | undefined>;
        let results: Array<PromiseSettledResult<string | undefined>>;

        before(async () => {
          successfulLockAcquisitions = 0;
          failedLockAcquisitions = 0;
          runWithLock = async () => {
            try {
              return await withLock({ esClient: es, lockId: LOCK_ID, logger }, async () => {
                successfulLockAcquisitions++;
                await pRetry(() => {
                  if (failedLockAcquisitions < 2) {
                    throw new Error(
                      'Waiting for lock acquisition failures before releasing the lock'
                    );
                  }
                });
                return 'was called';
              });
            } catch (error) {
              failedLockAcquisitions++;
              throw error;
            }
          };
          results = await Promise.allSettled([runWithLock(), runWithLock(), runWithLock()]);
        });

        it('executes the callback only once', async () => {
          expect(successfulLockAcquisitions).to.be(1);
        });

        it('makes failed lock acquisition attempts', async () => {
          expect(failedLockAcquisitions).to.be(2);
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

    describe('index assets', () => {
      describe('when lock index is created with incorrect mappings', () => {
        before(async () => {
          await deleteLockIndexAssets(es, log);
          await es.index({
            refresh: true,
            index: LOCKS_CONCRETE_INDEX_NAME,
            id: 'my_lock_with_incorrect_mappings',
            document: {
              token: 'my token',
              expiresAt: new Date(Date.now() + 100000),
              createdAt: new Date(),
              metadata: { foo: 'bar' },
            },
          });
        });

        it('should delete the index and re-create it', async () => {
          const mappingsBefore = await getMappings(es);
          log.debug(`Mappings before: ${JSON.stringify(mappingsBefore)}`);
          expect(mappingsBefore.properties?.token.type).to.eql('text');

          // Simulate a scenario where the index mappings are incorrect and a lock is added
          // it should delete the index and re-create it with the correct mappings
          await withLock({ esClient: es, lockId: uuid(), logger }, async () => {});

          const mappingsAfter = await getMappings(es);
          log.debug(`Mappings after: ${JSON.stringify(mappingsAfter)}`);
          expect(mappingsAfter.properties?.token.type).to.be('keyword');
        });
      });

      describe('when lock index is created with correct mappings', () => {
        before(async () => {
          await withLock({ esClient: es, lockId: uuid(), logger }, async () => {});

          // wait for the index to be created
          await es.indices.refresh({ index: LOCKS_CONCRETE_INDEX_NAME });
        });

        it('should have the correct mappings for the lock index', async () => {
          const mappings = await getMappings(es);

          const expectedMapping = {
            dynamic: 'false',
            properties: {
              token: { type: 'keyword' },
              expiresAt: { type: 'date' },
              createdAt: { type: 'date' },
              metadata: { enabled: false, type: 'object' },
            },
          };

          expect(mappings).to.eql(expectedMapping);
        });

        it('has the right number_of_replicas', async () => {
          const settings = await getSettings(es);
          expect(settings?.index?.auto_expand_replicas).to.eql('0-1');
        });

        it('does not delete the index when adding a new lock', async () => {
          const settingsBefore = await getSettings(es);

          await withLock({ esClient: es, lockId: uuid(), logger }, async () => {});

          const settingsAfter = await getSettings(es);
          expect(settingsAfter?.uuid).to.be(settingsBefore?.uuid);
        });
      });

      describe('when setting up index assets', () => {
        beforeEach(async () => {
          await deleteLockIndexAssets(es, log);
        });

        it('can run in parallel', async () => {
          try {
            await Promise.all([
              setupLockManagerIndex(es, logger),
              setupLockManagerIndex(es, logger),
              setupLockManagerIndex(es, logger),
            ]);
          } catch (error) {
            expect().fail(`Parallel setup should not throw but got error: ${error.message}`);
          }

          const indexExists = await es.indices.exists({ index: LOCKS_CONCRETE_INDEX_NAME });
          expect(indexExists).to.be(true);
        });

        it('can run in sequence', async () => {
          try {
            await setupLockManagerIndex(es, logger);
            await setupLockManagerIndex(es, logger);
            await setupLockManagerIndex(es, logger);
          } catch (error) {
            expect().fail(`Sequential setup should not throw but got error: ${error.message}`);
          }

          const indexExists = await es.indices.exists({ index: LOCKS_CONCRETE_INDEX_NAME });
          expect(indexExists).to.be(true);
        });
      });
    });
  });
}

async function deleteLockIndexAssets(es: Client, log: ToolingLog) {
  log.debug(`Deleting index assets`);
  await es.indices.delete({ index: LOCKS_CONCRETE_INDEX_NAME }, { ignore: [404] });
  await es.indices.deleteIndexTemplate({ name: LOCKS_INDEX_TEMPLATE_NAME }, { ignore: [404] });
  await es.cluster.deleteComponentTemplate(
    { name: LOCKS_COMPONENT_TEMPLATE_NAME },
    { ignore: [404] }
  );
}

function clearAllLocks(es: Client, log: ToolingLog) {
  try {
    return es.deleteByQuery(
      {
        index: LOCKS_CONCRETE_INDEX_NAME,
        query: { match_all: {} },
        refresh: true,
        conflicts: 'proceed',
      },
      { ignore: [404] }
    );
  } catch (e) {
    log.error(`Failed to clear locks: ${e.message}`);
    log.debug(e);
  }
}

async function getLocks(es: Client) {
  const res = await es.search<LockDocument>({
    index: LOCKS_CONCRETE_INDEX_NAME,
    query: { match_all: {} },
  });

  return res.hits.hits;
}

// @ts-ignore
async function outputLocks(es: Client, log: ToolingLog, name?: string) {
  const locks = await getLocks(es);

  log.debug(`${name ?? ''}: ${locks.length} locks found`);

  for (const lock of locks) {
    const { _id, _source } = lock;
    const { token, expiresAt, metadata } = _source!;
    log.debug(`Lock ID: ${_id}`);
    log.debug(`Token: ${token}`);
    log.debug(`Expires At: ${expiresAt}`);
    log.debug(`Metadata: ${JSON.stringify(metadata)}`);
    log.debug('--------------------------');
  }
}

async function getLockById(esClient: Client, lockId: LockId): Promise<LockDocument | undefined> {
  const res = await esClient.get<LockDocument>(
    { index: LOCKS_CONCRETE_INDEX_NAME, id: lockId },
    { ignore: [404] }
  );

  return res._source;
}

async function getMappings(es: Client) {
  const res = await es.indices.getMapping({ index: LOCKS_CONCRETE_INDEX_NAME });
  const { mappings } = res[LOCKS_CONCRETE_INDEX_NAME];
  return mappings;
}

async function getSettings(es: Client) {
  const res = await es.indices.getSettings({ index: LOCKS_CONCRETE_INDEX_NAME });
  const { settings } = res[LOCKS_CONCRETE_INDEX_NAME];
  return settings;
}
