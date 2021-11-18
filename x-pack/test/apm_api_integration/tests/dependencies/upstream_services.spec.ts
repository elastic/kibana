/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ServiceNode } from '../../../../plugins/apm/common/connections';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const registry = getService('registry');
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const backendName = 'elasticsearch';

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/backends/upstream_services',
      params: {
        query: {
          backendName,
          environment: 'production',
          kuery: '',
          numBuckets: 20,
          offset: '1d',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  registry.when(
    'Dependency upstream services when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.services).to.empty();
      });
    }
  );

  registry.when(
    'Dependency upstream services',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('when data is loaded', () => {
        before(async () => {
          await generateData({ synthtraceEsClient, start, end });
        });
        after(() => synthtraceEsClient.clean());

        it('returns a list of upstream services for the dependency', async () => {
          const { status, body } = await callApi();

          expect(status).to.be(200);
          expect(body.services.map(({ location }) => (location as ServiceNode).serviceName)).to.eql(
            ['synth-go']
          );

          const currentStatsLatencyValues = body.services[0].currentStats.latency.timeseries;
          expect(currentStatsLatencyValues.every(({ y }) => y === 1000000)).to.be(true);
        });
      });
    }
  );
}
