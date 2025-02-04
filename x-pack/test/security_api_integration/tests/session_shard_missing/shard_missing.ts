/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';

import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esSupertest = getService('esSupertest');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const retry = getService('retry');
  const log = getService('log');

  const { username: basicUsername, password: basicPassword } = adminTestUser;

  async function getNumberOfSessionDocuments() {
    await es.indices.refresh({ index: '.kibana_security_session*' });
    return (
      // @ts-expect-error doesn't handle total as number
      (await es.search({ index: '.kibana_security_session*' })).hits.total.value as number
    );
  }

  async function runCleanupTaskSoon() {
    // In most cases, an error would mean the task is currently running so let's run it again
    await retry.tryForTime(30000, async () => {
      await supertest
        .post('/session/_run_cleanup')
        .set('kbn-xsrf', 'xxx')
        .auth(adminTestUser.username, adminTestUser.password)
        .send()
        .expect(200);
    });
  }

  async function addESDebugLoggingSettings() {
    const addLogging = {
      persistent: {
        'logger.org.elasticsearch.xpack.security.authc': 'debug',
      },
    };
    await esSupertest.put('/_cluster/settings').send(addLogging).expect(200);
  }

  describe('Session index shard missing', () => {
    beforeEach(async () => {
      await es.cluster.health({ index: '.kibana_security_session*', wait_for_status: 'green' });
      await addESDebugLoggingSettings();
      await esDeleteAllIndices('.kibana_security_session*');
    });

    it('quietly fails if shards are unavailable', async function () {
      this.timeout(100000);

      await supertest
        .post('/simulate_point_in_time')
        .send({ simulateOpenPointInTime: true })
        .expect(200);

      log.debug(`Log in as ${basicUsername} using ${basicPassword} password.`);
      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: basicUsername, password: basicPassword },
        })
        .expect(200);

      await runCleanupTaskSoon();

      log.debug('Waiting for cleanup job to run...');

      await setTimeoutAsync(40000);
      await retry.tryForTime(20000, async () => {
        // Session does not clean up but the cleanup task has not failed either
        expect(await getNumberOfSessionDocuments()).to.be(1);
      });

      await supertest
        .post('/simulate_point_in_time')
        .send({ simulateOpenPointInTime: false })
        .expect(200);
    });

    it('fails if shards are unavailable more than 10 times', async function () {
      this.timeout(600000);

      await supertest
        .post('/simulate_point_in_time')
        .send({ simulateOpenPointInTime: false })
        .expect(200);
      log.debug('Resetting cleanup task state to 0');
      await runCleanupTaskSoon();
      let shardMissingCounter = -1;
      while (shardMissingCounter !== 0) {
        await setTimeoutAsync(5000);

        const response = await supertest.get('/cleanup_task_status').expect(200);
        const { state } = response.body;
        log.debug(`Task status: ${JSON.stringify(state)}`);
        shardMissingCounter = state.shardMissingCounter ?? 0;
      }
      log.debug('Cleanup task reset');

      await supertest
        .post('/simulate_point_in_time')
        .send({ simulateOpenPointInTime: true })
        .expect(200);

      await supertest
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic1',
          currentURL: '/',
          params: { username: basicUsername, password: basicPassword },
        })
        .expect(200);

      shardMissingCounter = 0;
      while (shardMissingCounter < 9) {
        log.debug('Waiting for cleanup job to run...');
        const currentCounter = shardMissingCounter;
        await runCleanupTaskSoon();

        while (shardMissingCounter <= currentCounter) {
          log.debug(
            `current counter: ${currentCounter}, shard missing counter: ${shardMissingCounter}`
          );
          await setTimeoutAsync(5000);
          log.debug('Attempting to get task status');
          const response = await supertest.get('/cleanup_task_status').expect(200);
          const { state } = response.body;
          log.debug(`Task status: ${JSON.stringify(state)}`);
          shardMissingCounter = state.shardMissingCounter ?? 0;
        }
      }
      if (shardMissingCounter === 9) {
        log.debug('Shard missing counter reached 10, attempting next failure and expecting reset');
        await runCleanupTaskSoon();
        await setTimeoutAsync(5000);

        log.debug('Attempting to get task status');
        const response = await supertest.get('/cleanup_task_status').expect(200);
        const { state } = response.body;
        expect(state.shardMissingCounter).to.be(0);
      }

      await supertest
        .post('/simulate_point_in_time')
        .send({ simulateOpenPointInTime: false })
        .expect(200);
    });
  });
}
