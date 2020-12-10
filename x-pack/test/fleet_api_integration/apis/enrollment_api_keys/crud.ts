/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      await esArchiver.loadIfNeeded('fleet/agents');
    });

    after(async () => {
      await esArchiver.unload('fleet/agents');
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

      it('should allow to create an enrollment api key with an agent policy', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            policy_id: 'policy1',
          })
          .expect(200);

        expect(apiResponse.item).to.have.keys('id', 'api_key', 'api_key_id', 'name', 'policy_id');
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

      describe('It should handle error when the Fleet user is invalid', () => {
        before(async () => {});
        after(async () => {
          await getService('supertest')
            .post(`/api/fleet/agents/setup`)
            .set('kbn-xsrf', 'xxx')
            .send({ forceRecreate: true });
        });

        it('should not allow to create an enrollment api key if the Fleet admin user is invalid', async () => {
          await es.security.changePassword({
            username: 'fleet_enroll',
            body: {
              password: Buffer.from((Math.random() * 10000000).toString()).toString('base64'),
            },
          });
          const res = await supertest
            .post(`/api/fleet/enrollment-api-keys`)
            .set('kbn-xsrf', 'xxx')
            .send({
              policy_id: 'policy1',
            })
            .expect(400);
          expect(res.body.message).match(/Fleet Admin user is invalid/);
        });
      });
    });
  });
}
