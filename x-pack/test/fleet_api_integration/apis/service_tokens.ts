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
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es');

  describe('fleet_service_tokens', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
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

    it('should create a valid remote service account token', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/service_tokens`)
        .set('kbn-xsrf', 'xxxx')
        .send({ remote: true })
        .expect(200);

      expect(apiResponse).have.property('name');
      expect(apiResponse).have.property('value');

      const { body: tokensResponse } = await esClient.transport.request<any>(
        {
          method: 'GET',
          path: `_security/service/elastic/fleet-server-remote/credential`,
        },
        { meta: true }
      );

      expect(tokensResponse.tokens).have.property(apiResponse.name);
    });
  });
}
