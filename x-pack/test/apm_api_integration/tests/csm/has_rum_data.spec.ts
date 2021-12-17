/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function rumHasDataApiTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const supertest = getService('legacySupertestAsApmReadUser');

  registry.when('has_rum_data without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const response = await supertest.get(
        '/api/apm/observability_overview/has_rum_data?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-14T20%3A35%3A54.654Z&uiFilters='
      );

      expect(response.status).to.be(200);
      expectSnapshot(response.body).toMatchInline(`
          Object {
            "hasData": false,
            "indices": "traces-apm*,apm-*",
          }
        `);
    });
  });

  registry.when(
    'has RUM data with data',
    { config: 'trial', archives: ['8.0.0', 'rum_8.0.0'] },
    () => {
      it('returns that it has data and service name with most traffic', async () => {
        const response = await supertest.get(
          '/api/apm/observability_overview/has_rum_data?start=2020-09-07T20%3A35%3A54.654Z&end=2020-09-16T20%3A35%3A54.654Z&uiFilters='
        );

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "hasData": true,
            "indices": "traces-apm*,apm-*",
            "serviceName": "client",
          }
        `);
      });
    }
  );
}
