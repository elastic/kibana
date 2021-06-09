/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents, getEsClientForAPIKey } from '../agents/services';
import { skipIfNoDockerRegistry } from '../../helpers';

const ENROLLMENT_KEY_ID = 'ed22ca17-e178-4cfe-8b02-54ea29fbd6d0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const supertest = getService('supertest');

  describe('fleet_enrollment_api_keys_crud', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    describe('GET /fleet/enrollment-api-keys', async () => {
      it('should list existing api keys', async () => {
        const { body: apiResponse } = await supertest
          .get(`/api/fleet/enrollment-api-keys`)
          .expect(200);

        expect(apiResponse.total).to.be(3);
        expect(apiResponse.list[0]).to.have.keys('id', 'api_key_id', 'name');
      });
    });

    describe('GET /fleet/enrollment-api-keys/{id}', async () => {
      it('should allow to retrieve existing api keys', async () => {
        const { body: apiResponse } = await supertest
          .get(`/api/fleet/enrollment-api-keys/${ENROLLMENT_KEY_ID}`)
          .expect(200);

        expect(apiResponse.item).to.have.keys('id', 'api_key_id', 'name');
      });
    });

    describe('DELETE /fleet/enrollment-api-keys/{id}', async () => {
      let keyId: string;
      let esApiKeyId: string;
      before(async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
          })
          .expect(200);
        keyId = apiResponse.item.id;
        esApiKeyId = apiResponse.item.api_key_id;
      });

      it('should invalide an existing api keys', async () => {
        await supertest
          .delete(`/api/fleet/enrollment-api-keys/${keyId}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const {
          body: { api_keys: apiKeys },
        } = await es.security.getApiKey({ id: esApiKeyId });

        expect(apiKeys).length(1);
        expect(apiKeys[0].invalidated).eql(true);
      });
    });

    describe('POST /fleet/enrollment-api-keys', () => {
      it('should not accept bad parameters', async () => {
        await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            raoul: 'raoul',
          })
          .expect(400);
      });

      it('should return a 400 if the fleet admin user is modifed outside of Fleet', async () => {
        await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            raoul: 'raoul',
          })
          .expect(400);
      });

      it('should allow to create an enrollment api key with only an agent policy', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
          })
          .expect(200);

        expect(apiResponse.item).to.have.keys('id', 'api_key', 'api_key_id', 'name', 'policy_id');
      });

      it('should allow to create an enrollment api key with agent policy and unique name', async () => {
        const { body: noSpacesRes } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
            name: 'something',
          });
        expect(noSpacesRes.item).to.have.keys('id', 'api_key', 'api_key_id', 'name', 'policy_id');

        const { body: hasSpacesRes } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
            name: 'something else',
          });
        expect(hasSpacesRes.item).to.have.keys('id', 'api_key', 'api_key_id', 'name', 'policy_id');

        const { body: noSpacesDupe } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
            name: 'something',
          })
          .expect(400);

        expect(noSpacesDupe).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message: 'An enrollment key named something already exists for agent policy policy1',
        });

        const { body: hasSpacesDupe } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
            name: 'something else',
          })
          .expect(400);
        expect(hasSpacesDupe).to.eql({
          statusCode: 400,
          error: 'Bad Request',
          message: 'An enrollment key named something else already exists for agent policy policy1',
        });
      });

      it('should create an ES ApiKey with metadata', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
          })
          .expect(200);

        const { body: apiKeyRes } = await es.security.getApiKey({
          id: apiResponse.item.api_key_id,
        });

        expect(apiKeyRes.api_keys[0].metadata).eql({
          policy_id: 'policy1',
          managed_by: 'fleet',
          managed: true,
          type: 'enroll',
        });
      });

      it('should create an ES ApiKey with limited privileges', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
          })
          .expect(200);

        const { body: privileges } = await getEsClientForAPIKey(
          providerContext,
          apiResponse.item.api_key
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
  });
}
