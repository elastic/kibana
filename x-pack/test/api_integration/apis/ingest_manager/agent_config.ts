/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('ingest_manager_agent_configs', () => {
    describe('POST /api/ingest_manager/agent_configs', () => {
      it('should work with valid values', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/ingest_manager/agent_configs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'default',
          })
          .expect(200);

        expect(apiResponse.success).to.be(true);
      });

      it('should return a 400 with an invalid namespace', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_configs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: '',
          })
          .expect(400);
      });
    });

    describe('POST /api/ingest_manager/agent_configs/{agentConfigId}/copy', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('fleet/agents');
      });
      after(async () => {
        await esArchiver.unload('fleet/agents');
      });

      const TEST_CONFIG_ID = 'config1';

      it('should work with valid values', async () => {
        const {
          body: { success, item },
        } = await supertest
          .post(`/api/ingest_manager/agent_configs/${TEST_CONFIG_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Copied config',
            description: 'Test',
          })
          .expect(200);
        const { id, updated_at, ...newConfig } = item;

        expect(success).to.be(true);
        expect(newConfig).to.eql({
          name: 'Copied config',
          description: 'Test',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          revision: 1,
          updated_by: 'elastic',
          package_configs: [],
        });
      });

      it('should return a 500 with invalid source config', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_configs/INVALID_CONFIG_ID/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Copied config',
            description: '',
          })
          .expect(500);
      });

      it('should return a 400 with invalid payload', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_configs/${TEST_CONFIG_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({})
          .expect(400);
      });

      it('should return a 400 with invalid name', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_configs/${TEST_CONFIG_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: '',
          })
          .expect(400);
      });
    });
  });
}
