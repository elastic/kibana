/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { warnAndSkipTest } from '../../helpers';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const dockerServers = getService('dockerServers');

  const server = dockerServers.get('registry');
  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('Package Config - update', async function () {
    let agentConfigId: string;
    let packageConfigId: string;
    let packageConfigId2: string;

    before(async function () {
      const { body: agentConfigResponse } = await supertest
        .post(`/api/ingest_manager/agent_configs`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test config',
          namespace: 'default',
        });
      agentConfigId = agentConfigResponse.item.id;

      const { body: packageConfigResponse } = await supertest
        .post(`/api/ingest_manager/package_configs`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-1',
          description: '',
          namespace: 'default',
          config_id: agentConfigId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });
      packageConfigId = packageConfigResponse.item.id;

      const { body: packageConfigResponse2 } = await supertest
        .post(`/api/ingest_manager/package_configs`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'filetest-2',
          description: '',
          namespace: 'default',
          config_id: agentConfigId,
          enabled: true,
          output_id: '',
          inputs: [],
          package: {
            name: 'filetest',
            title: 'For File Tests',
            version: '0.1.0',
          },
        });
      packageConfigId2 = packageConfigResponse2.item.id;
    });

    it('should work with valid values', async function () {
      if (server.enabled) {
        const { body: apiResponse } = await supertest
          .put(`/api/ingest_manager/package_configs/${packageConfigId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'filetest-1',
            description: '',
            namespace: 'updated_namespace',
            config_id: agentConfigId,
            enabled: true,
            output_id: '',
            inputs: [],
            package: {
              name: 'filetest',
              title: 'For File Tests',
              version: '0.1.0',
            },
          })
          .expect(200);

        expect(apiResponse.success).to.be(true);
      } else {
        warnAndSkipTest(this, log);
      }
    });

    it('should return a 500 if there is another package config with the same name', async function () {
      if (server.enabled) {
        await supertest
          .put(`/api/ingest_manager/package_configs/${packageConfigId2}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'filetest-1',
            description: '',
            namespace: 'updated_namespace',
            config_id: agentConfigId,
            enabled: true,
            output_id: '',
            inputs: [],
            package: {
              name: 'filetest',
              title: 'For File Tests',
              version: '0.1.0',
            },
          })
          .expect(500);
      } else {
        warnAndSkipTest(this, log);
      }
    });
  });
}
