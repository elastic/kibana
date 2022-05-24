/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function rumServicesApiTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  registry.when('CSM url search api without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const response = await supertest.get('/internal/apm/ux/url-search').query({
        start: '2020-09-07T20:35:54.654Z',
        end: '2020-09-14T20:35:54.654Z',
        uiFilters: '{"serviceName":["elastic-co-rum-test"]}',
        percentile: 50,
      });

      expect(response.status).to.be(200);
      expectSnapshot(response.body).toMatchInline(`
            Object {
              "items": Array [],
              "total": 0,
            }
          `);
    });
  });
}
