/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');

  describe('fleet_service_tokens', async () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    describe('POST /api/fleet/service_tokens', () => {
      it('should create a valid service account token', async () => {
        const { body: apiResponse } = await supertest
          .post(`/api/fleet/service_tokens`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(apiResponse).have.property('name');
        expect(apiResponse).have.property('value');

        const { body: tokensResponse } = await esClient.transport.request<any>(
          {
            method: 'GET',
            path: `_security/service/elastic/fleet-server/credential`,
          },
          { meta: true }
        );

        expect(tokensResponse.tokens).have.property(apiResponse.name);
      });
    });

    it('should work with deprecated api', async () => {
      await supertest.post(`/api/fleet/service-tokens`).set('kbn-xsrf', 'xxxx').expect(200);
    });
  });
}
