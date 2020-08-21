/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('ingest_manager_agent_policies', () => {
    describe('POST /api/ingest_manager/agent_policies', () => {
      it('should work with valid values', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/ingest_manager/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'default',
          })
          .expect(200);

        expect(apiResponse.success).to.be(true);
      });

      it('should return a 400 with an empty namespace', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: '',
          })
          .expect(400);
      });

      it('should return a 400 with an invalid namespace', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'TEST',
            namespace: 'InvalidNamespace',
          })
          .expect(400);
      });
    });

    describe('POST /api/ingest_manager/agent_policies/{agentPolicyId}/copy', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('fleet/agents');
      });
      after(async () => {
        await esArchiver.unload('fleet/agents');
      });

      const TEST_POLICY_ID = 'policy1';

      it('should work with valid values', async () => {
        const {
          body: { success, item },
        } = await supertest
          .post(`/api/ingest_manager/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Copied policy',
            description: 'Test',
          })
          .expect(200);
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { id, updated_at, ...newPolicy } = item;

        expect(success).to.be(true);
        expect(newPolicy).to.eql({
          name: 'Copied policy',
          description: 'Test',
          namespace: 'default',
          monitoring_enabled: ['logs', 'metrics'],
          revision: 1,
          updated_by: 'elastic',
          package_policies: [],
        });
      });

      it('should return a 500 with invalid source policy', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_policies/INVALID_POLICY_ID/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Copied policy',
            description: '',
          })
          .expect(500);
      });

      it('should return a 400 with invalid payload', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({})
          .expect(400);
      });

      it('should return a 400 with invalid name', async () => {
        await supertest
          .post(`/api/ingest_manager/agent_policies/${TEST_POLICY_ID}/copy`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: '',
          })
          .expect(400);
      });
    });
  });
}
