/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { getEsClientForAPIKey } from '../agents/services';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('fleet_output_logstash_api_keys', async function () {
    describe('POST /logstash_api_keys', () => {
      it('should allow to create an api key with the right permissions', async () => {
        const { body: apiKeyRes } = await supertest
          .post(`/api/fleet/logstash_api_keys`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(apiKeyRes).to.have.keys('api_key');

        const { body: privileges } = await getEsClientForAPIKey(
          providerContext,
          Buffer.from(apiKeyRes.api_key).toString('base64')
        ).security.hasPrivileges(
          {
            body: {
              cluster: ['monitor'],
              index: [
                {
                  names: [
                    'logs-*-*',
                    'metrics-*-*',
                    'traces-*-*',
                    'synthetics-*-*',
                    '.logs-endpoint.diagnostic.collection-*',
                    '.logs-endpoint.action.responses-*',
                  ],
                  privileges: ['auto_configure', 'create_doc'],
                },
              ],
            },
          },
          { meta: true }
        );

        expect(privileges.has_all_requested).to.be(true);
      });
    });

    it('should return a 400 with a user without the correct ES permissions', async () => {
      await supertestWithoutAuth
        .post(`/api/fleet/logstash_api_keys`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxx')
        .expect(400);
    });
  });
}
