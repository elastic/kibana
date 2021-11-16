/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { BackendNode } from '../../../../plugins/apm/common/connections';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateData } from './generate_data';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');
  const registry = getService('registry');
  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const backendName = 'elasticsearch';
  const serviceName = 'synth-go';

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/services/{serviceName}/dependencies',
      params: {
        path: { serviceName },
        query: {
          environment: 'production',
          numBuckets: 20,
          offset: '1d',
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        },
      },
    });
  }

  registry.when(
    'Dependency for service when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.serviceDependencies).to.empty();
      });
    }
  );

  registry.when(
    'Dependency for services',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('when data is loaded', () => {
        before(async () => {
          await generateData({ synthtraceEsClient, start, end });
        });
        after(() => synthtraceEsClient.clean());

        it('returns a list of dependencies for a service', async () => {
          const { status, body } = await callApi();

          expect(status).to.be(200);
          expect(
            body.serviceDependencies.map(({ location }) => (location as BackendNode).backendName)
          ).to.eql([backendName]);

          const currentStatsLatencyValues =
            body.serviceDependencies[0].currentStats.latency.timeseries;
          expect(currentStatsLatencyValues.every(({ y }) => y === 1000000)).to.be(true);
        });
      });
    }
  );

  registry.when(
    'Dependency for service breakdown when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();

        expect(status).to.be(200);
        expect(body.serviceDependencies).to.empty();
      });
    }
  );

  registry.when(
    'Dependency for services breakdown',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('when data is loaded', () => {
        before(async () => {
          await generateData({ synthtraceEsClient, start, end });
        });
        after(() => synthtraceEsClient.clean());

        it('returns a list of dependencies for a service', async () => {
          const { status, body } = await callApi();

          expect(status).to.be(200);
          expect(
            body.serviceDependencies.map(({ location }) => (location as BackendNode).backendName)
          ).to.eql([backendName]);

          const currentStatsLatencyValues =
            body.serviceDependencies[0].currentStats.latency.timeseries;
          expect(currentStatsLatencyValues.every(({ y }) => y === 1000000)).to.be(true);
        });
      });
    }
  );
}
