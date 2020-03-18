/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { setupIngest, getEsClientForAPIKey } from '../agents/services';

const ENROLLMENT_KEY_ID = 'ed22ca17-e178-4cfe-8b02-54ea29fbd6d0';

export default function(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_enrollment_api_keys_crud', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    setupIngest({ getService } as FtrProviderContext);
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });
    describe('GET /fleet/enrollment-api-keys', async () => {
      it('should list existing api keys', async () => {
        const { body: apiResponse } = await supertest
          .get(`/api/ingest_manager/fleet/enrollment-api-keys`)
          .expect(200);

        expect(apiResponse.total).to.be(2);
        expect(apiResponse.list[0]).to.have.keys('id', 'api_key_id', 'name');
      });
    });

    describe('GET /fleet/enrollment-api-keys/{id}', async () => {
      it('should allow to retrieve existing api keys', async () => {
        const { body: apiResponse } = await supertest
          .get(`/api/ingest_manager/fleet/enrollment-api-keys/${ENROLLMENT_KEY_ID}`)
          .expect(200);

        expect(apiResponse.item).to.have.keys('id', 'api_key_id', 'name');
      });
    });

    describe('GET /fleet/enrollment-api-keys/{id}', async () => {
      it('should allow to retrieve existing api keys', async () => {
        const { body: apiResponse } = await supertest
          .delete(`/api/ingest_manager/fleet/enrollment-api-keys/${ENROLLMENT_KEY_ID}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(apiResponse.success).to.eql(true);
      });
    });

    describe('POST /fleet/enrollment-api-keys', () => {
      it('should not accept bad parameters', async () => {
        await supertest
          .post(`/api/ingest_manager/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            raoul: 'raoul',
          })
          .expect(400);
      });

      it('should allow to create an enrollment api key with a policy', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/ingest_manager/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            config_id: 'policy1',
          })
          .expect(200);

        expect(apiResponse.success).to.eql(true);
        expect(apiResponse.item).to.have.keys('id', 'api_key', 'api_key_id', 'name', 'config_id');
      });

      it('should create an ES ApiKey with limited privileges', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/ingest_manager/fleet/enrollment-api-keys`)
          .set('kbn-xsrf', 'xxx')
          .send({
            config_id: 'policy1',
          })
          .expect(200);
        expect(apiResponse.success).to.eql(true);
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
