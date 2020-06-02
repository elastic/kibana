/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

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
  });
}
