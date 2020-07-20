/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { getSupertestWithoutAuth, setupIngest, getEsClientForAPIKey } from './services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const esArchiver = getService('esArchiver');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');

  const supertest = getSupertestWithoutAuth(providerContext);
  let apiKey: { id: string; api_key: string };
  let kibanaVersion: string;

  // Flaky: https://github.com/elastic/kibana/issues/60865
  describe.skip('fleet_agents_enroll', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');

      const { body: apiKeyBody } = await esClient.security.createApiKey<typeof apiKey>({
        body: {
          name: `test access api key: ${uuid.v4()}`,
        },
      });
      apiKey = apiKeyBody;
      const {
        body: { _source: enrollmentApiKeyDoc },
      } = await esClient.get({
        index: '.kibana',
        id: 'fleet-enrollment-api-keys:ed22ca17-e178-4cfe-8b02-54ea29fbd6d0',
      });
      // @ts-ignore
      enrollmentApiKeyDoc['fleet-enrollment-api-keys'].api_key_id = apiKey.id;
      await esClient.update({
        index: '.kibana',
        id: 'fleet-enrollment-api-keys:ed22ca17-e178-4cfe-8b02-54ea29fbd6d0',
        refresh: 'true',
        body: {
          doc: enrollmentApiKeyDoc,
        },
      });
      const kibanaVersionAccessor = kibanaServer.version;
      kibanaVersion = await kibanaVersionAccessor.get();
    });
    setupIngest(providerContext);
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should not allow to enroll an agent with a invalid enrollment', async () => {
      await supertest
        .post(`/api/ingest_manager/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', 'ApiKey NOTAVALIDKEY')
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {
              elastic: { agent: { version: kibanaVersion } },
            },
            user_provided: {},
          },
        })
        .expect(401);
    });

    it('should not allow to enroll an agent with a shared id if it already exists ', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set(
          'authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          shared_id: 'agent2_filebeat',
          type: 'PERMANENT',
          metadata: {
            local: {
              elastic: { agent: { version: kibanaVersion } },
            },
            user_provided: {},
          },
        })
        .expect(400);
      expect(apiResponse.message).to.match(/Impossible to enroll an already active agent/);
    });

    it('should not allow to enroll an agent with a version > kibana', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set(
          'authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          shared_id: 'agent2_filebeat',
          type: 'PERMANENT',
          metadata: {
            local: {
              elastic: { agent: { version: '999.0.0' } },
            },
            user_provided: {},
          },
        })
        .expect(400);
      expect(apiResponse.message).to.match(/Agent version is not compatible with kibana/);
    });

    it('should allow to enroll an agent with a valid enrollment token', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {
              elastic: { agent: { version: kibanaVersion } },
            },
            user_provided: {},
          },
        })
        .expect(200);
      expect(apiResponse.success).to.eql(true);
      expect(apiResponse.item).to.have.keys('id', 'active', 'access_api_key', 'type', 'config_id');
    });

    it('when enrolling an agent it should generate an access api key with limited privileges', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/ingest_manager/fleet/agents/enroll`)
        .set('kbn-xsrf', 'xxx')
        .set(
          'Authorization',
          `ApiKey ${Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64')}`
        )
        .send({
          type: 'PERMANENT',
          metadata: {
            local: {
              elastic: { agent: { version: kibanaVersion } },
            },
            user_provided: {},
          },
        })
        .expect(200);
      expect(apiResponse.success).to.eql(true);
      const { body: privileges } = await getEsClientForAPIKey(
        providerContext,
        apiResponse.item.access_api_key
      ).security.hasPrivileges({
        body: {
          cluster: ['all', 'monitor', 'manage_api_key'],
          index: [
            {
              names: ['log-*', 'metrics-*', 'events-*', '*'],
              privileges: ['write', 'create_index'],
            },
          ],
        },
      });
      expect(privileges.cluster).to.eql({
        all: false,
        monitor: false,
        manage_api_key: false,
      });
      expect(privileges.index).to.eql({
        '*': {
          create_index: false,
          write: false,
        },
        'events-*': {
          create_index: false,
          write: false,
        },
        'log-*': {
          create_index: false,
          write: false,
        },
        'metrics-*': {
          create_index: false,
          write: false,
        },
      });
    });
  });
}
