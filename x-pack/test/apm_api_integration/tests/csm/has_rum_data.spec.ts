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
  const apmApiClient = getService('apmApiClient');

  registry.when('has_rum_data without data', { config: 'trial', archives: [] }, () => {
    it('returns empty list', async () => {
      const start = new Date('2020-09-07T00:00:00.000Z').getTime();
      const end = new Date('2020-09-14T00:00:00.000Z').getTime() - 1;

      const response = await apmApiClient.readUser({
        endpoint: 'GET /api/apm/observability_overview/has_rum_data',
        params: {
          query: {
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
          },
        },
      });

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
        const start = new Date('2020-09-07T00:00:00.000Z').getTime();
        const end = new Date('2020-09-16T00:00:00.000Z').getTime() - 1;

        const response = await apmApiClient.readUser({
          endpoint: 'GET /api/apm/observability_overview/has_rum_data',
          params: {
            query: {
              start: new Date(start).toISOString(),
              end: new Date(end).toISOString(),
            },
          },
        });

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
