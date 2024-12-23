/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getEsClientForAPIKey } from '../agents/services';
import { skipIfNoDockerRegistry } from '../../helpers';

import { testUsers } from '../test_users';

const ENROLLMENT_KEY_ID = 'ed22ca17-e178-4cfe-8b02-54ea29fbd6d0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_enrollment_api_keys_crud', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/fleet/agents');
      await fleetAndAgents.setup();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    skipIfNoDockerRegistry(providerContext);

    describe('GET /fleet/enrollment_api_keys', () => {
      it('should list existing api keys', async () => {
        const { body: apiResponse } = await supertest
          .get(`/api/fleet/enrollment_api_keys`)
          .expect(200);

        expect(apiResponse.total).to.be(2);
        expect(apiResponse.items[0]).to.have.keys('id', 'api_key_id', 'name');
        // Deprecated property list
        expect(apiResponse.list[0]).to.have.keys('id', 'api_key_id', 'name');
        expect(apiResponse).to.have.keys('items');
      });

      it('should return 200 if the user has correct permissions', async () => {
        await supertestWithoutAuth
          .get(`/api/fleet/enrollment_api_keys`)
          .auth(testUsers.setup.username, testUsers.setup.password)
          .expect(200);
      });

      it('should return 200 if the passed kuery is correct', async () => {
        await supertest
          .get(`/api/fleet/enrollment_api_keys?kuery=fleet-enrollment-api-keys.policy_id:policy1`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('should return 200 if the passed kuery does not have prefix fleet-enrollment-api-keys', async () => {
        await supertest
          .get(`/api/fleet/enrollment_api_keys?kuery=policy_id:policy1`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });

      it('with enableStrictKQLValidation should return 400 if the passed kuery is not correct', async () => {
        await supertest
          .get(
            `/api/fleet/enrollment_api_keys?kuery=fleet-enrollment-api-keys.non_existent_parameter:test`
          )
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('with enableStrictKQLValidation should return 400 if the passed kuery is invalid', async () => {
        await supertest
          .get(`/api/fleet/enrollment_api_keys?kuery='test%3A'`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });
    });

    describe('GET /fleet/enrollment_api_keys/{id}', () => {
      it('should allow to retrieve existing api keys', async () => {
        const { body: apiResponse } = await supertest
          .get(`/api/fleet/enrollment_api_keys/${ENROLLMENT_KEY_ID}`)
          .expect(200);

        expect(apiResponse.item).to.have.keys('id', 'api_key_id', 'name');
      });

      it('should return 200 if the user has correct permissions', async () => {
        await supertestWithoutAuth
          .get(`/api/fleet/enrollment_api_keys/${ENROLLMENT_KEY_ID}`)
          .auth(testUsers.setup.username, testUsers.setup.password)
          .expect(200);
      });
    });

    describe('DELETE /fleet/enrollment_api_keys/{id}', () => {
      let keyId: string;
      let esApiKeyId: string;
      before(async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment_api_keys`)
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
          .delete(`/api/fleet/enrollment_api_keys/${keyId}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const { api_keys: apiKeys } = await es.security.getApiKey({ id: esApiKeyId });

        expect(apiKeys).length(1);
        expect(apiKeys[0].invalidated).eql(true);
      });
    });

    describe('POST /fleet/enrollment_api_keys', () => {
      it('should not accept bad parameters', async () => {
        await supertest
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            raoul: 'raoul',
          })
          .expect(400);
      });

      it('should return a 404 if the policy_id does not exist', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'idonotexists',
          })
          .expect(404);

        expect(apiResponse.message).to.be('Agent policy "idonotexists" not found');
      });

      it('should allow to create an enrollment api key with only an agent policy', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
          })
          .expect(200);

        expect(apiResponse.item).to.have.keys('id', 'api_key', 'api_key_id', 'name', 'policy_id');
      });

      it('should allow to create an enrollment api key with agent policy and unique name', async () => {
        const { body: noSpacesRes } = await supertest
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
            name: 'something',
          });
        expect(noSpacesRes.item).to.have.keys('id', 'api_key', 'api_key_id', 'name', 'policy_id');

        const { body: hasSpacesRes } = await supertest
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
            name: 'something else',
          });
        expect(hasSpacesRes.item).to.have.keys('id', 'api_key', 'api_key_id', 'name', 'policy_id');

        const { body: noSpacesDupe } = await supertest
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
            name: 'something',
          })
          .expect(409);

        expect(noSpacesDupe).to.eql({
          statusCode: 409,
          error: 'Conflict',
          message: 'An enrollment key named something already exists for agent policy policy1',
        });

        const { body: hasSpacesDupe } = await supertest
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
            name: 'something else',
          })
          .expect(409);
        expect(hasSpacesDupe).to.eql({
          statusCode: 409,
          error: 'Conflict',
          message: 'An enrollment key named something else already exists for agent policy policy1',
        });
      });

      it('should create an ES ApiKey with metadata', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
          })
          .expect(200);

        const apiKeyRes = await es.security.getApiKey({
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
          .post(`/api/fleet/enrollment_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
          })
          .expect(200);

        const { body: privileges } = await getEsClientForAPIKey(
          providerContext,
          apiResponse.item.api_key
        ).security.hasPrivileges(
          {
            body: {
              cluster: ['all', 'monitor', 'manage_api_key'],
              index: [
                {
                  names: ['log-*', 'metrics-*', 'events-*', '*'],
                  privileges: ['write', 'create_index'],
                },
              ],
            },
          },
          { meta: true }
        );
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
