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

  describe('ingest_manager_package_configs', () => {
    describe('POST /api/ingest_manager/package_configs', () => {
      before(async () => {
        await esArchiver.loadIfNeeded('fleet/agents');
      });
      after(async () => {
        await esArchiver.unload('fleet/agents');
      });

      it('should work with valid values', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/ingest_manager/package_configs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'log-1',
            description: '',
            namespace: 'default',
            config_id: 'config1',
            enabled: true,
            output_id: '',
            inputs: [],
            package: {
              name: 'log',
              title: 'Customs logs',
              version: '0.1.0',
            },
          })
          .expect(200);

        expect(apiResponse.success).to.be(true);
      });

      it('should return a 400 with an invalid namespace', async () => {
        await supertest
          .post(`/api/ingest_manager/package_configs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'log-1',
            description: '',
            namespace: '',
            config_id: 'config1',
            enabled: true,
            output_id: '',
            inputs: [],
            package: {
              name: 'log',
              title: 'Customs logs',
              version: '0.1.0',
            },
          })
          .expect(400);
      });

      it('should not allow multiple limited packages on the same agent config', async () => {
        await supertest
          .post(`/api/ingest_manager/package_configs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'endpoint-1',
            description: '',
            namespace: 'default',
            config_id: 'config1',
            enabled: true,
            output_id: '',
            inputs: [],
            package: {
              name: 'endpoint',
              title: 'Elastic Endpoint',
              version: '0.8.0',
            },
          })
          .expect(200);
        await supertest
          .post(`/api/ingest_manager/package_configs`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'endpoint-2',
            description: '',
            namespace: 'default',
            config_id: 'config1',
            enabled: true,
            output_id: '',
            inputs: [],
            package: {
              name: 'endpoint',
              title: 'Elastic Endpoint',
              version: '0.8.0',
            },
          })
          .expect(500);
      });
    });
  });
}
