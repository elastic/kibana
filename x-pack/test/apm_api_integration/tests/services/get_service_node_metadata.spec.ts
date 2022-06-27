/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@elastic/apm-synthtrace';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const serviceName = 'synth-go';
  const instanceName = 'instance-a';

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
      params: {
        path: { serviceName, serviceNodeName: instanceName },
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          kuery: '',
        },
      },
    });
  }

  registry.when(
    'Service node metadata when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await callApi();

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "containerId": "N/A",
            "host": "N/A",
          }
        `);
      });
    }
  );

  registry.when(
    'Service node metadata when data is loaded',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      before(async () => {
        const instance = apm.service(serviceName, 'production', 'go').instance(instanceName);
        await synthtraceEsClient.index(
          timerange(start, end)
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              instance
                .transaction('GET /api/product/list')
                .timestamp(timestamp)
                .duration(1000)
                .success()
            )
        );
      });
      after(() => synthtraceEsClient.clean());

      it('returns service node metadata', async () => {
        const response = await callApi();

        expect(response.status).to.be(200);

        expectSnapshot(response.body).toMatchInline(`
          Object {
            "containerId": "instance-a",
            "host": "instance-a",
          }
        `);
      });
    }
  );
}
