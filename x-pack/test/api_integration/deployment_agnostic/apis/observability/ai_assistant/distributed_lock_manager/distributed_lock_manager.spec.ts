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
      // await lockManager.release();
    });

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

    describe('LockManager with custom lockId', () => {
      let customLockManager: LockManager;
      before(async () => {
        customLockManager = new LockManager('customLockId' as LockId, es, fakeLogger);
        await customLockManager.release();
      });

      it('separate locks should not interfere', async () => {
        expect(await customLockManager.acquire()).to.be(true);
        expect(await lockManager.acquire()).to.be(true);
      });
    });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
