/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { NodeType, BackendNode } from '@kbn/apm-plugin/common/connections';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { dataConfig, generateData } from './generate_data';
import { roundNumber } from '../../utils';

type TopDependencies = APIReturnType<'GET /internal/apm/backends/top_backends'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/backends/top_backends',
      params: {
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          numBuckets: 20,
          offset: '',
        },
      },
    });
  }

  registry.when(
    'Top dependencies when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);
        expect(body.backends).to.empty();
      });
    }
  );

  registry.when(
    'Top dependencies',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe.skip('when data is generated', () => {
        let topDependencies: TopDependencies;

        before(async () => {
          await generateData({ synthtraceEsClient, start, end });
          const response = await callApi();
          topDependencies = response.body;
        });

        after(() => synthtraceEsClient.clean());

        it('returns an array of dependencies', () => {
          expect(topDependencies).to.have.property('backends');
          expect(topDependencies.backends).to.have.length(1);
        });

        it('returns correct dependency information', () => {
          const location = topDependencies.backends[0].location as BackendNode;
          const { span } = dataConfig;

          expect(location.type).to.be(NodeType.backend);
          expect(location.backendName).to.be(span.destination);
          expect(location.spanType).to.be(span.type);
          expect(location.spanSubtype).to.be(span.subType);
          expect(location).to.have.property('id');
        });

        describe('returns the correct stats', () => {
          let backends: TopDependencies['backends'][number];

          before(() => {
            backends = topDependencies.backends[0];
          });

          it("doesn't have previous stats", () => {
            expect(backends.previousStats).to.be(null);
          });

          it('has an "impact" property', () => {
            expect(backends.currentStats).to.have.property('impact');
          });

          it('returns the correct latency', () => {
            const {
              currentStats: { latency },
            } = backends;

            const { transaction } = dataConfig;

            expect(latency.value).to.be(transaction.duration * 1000);
            expect(latency.timeseries.every(({ y }) => y === transaction.duration * 1000)).to.be(
              true
            );
          });

          it('returns the correct throughput', () => {
            const {
              currentStats: { throughput },
            } = backends;
            const { rate } = dataConfig;

            expect(roundNumber(throughput.value)).to.be(roundNumber(rate));
          });

          it('returns the correct total time', () => {
            const {
              currentStats: { totalTime },
            } = backends;
            const { rate, transaction } = dataConfig;

            expect(
              totalTime.timeseries.every(({ y }) => y === rate * transaction.duration * 1000)
            ).to.be(true);
          });

          it('returns the correct error rate', () => {
            const {
              currentStats: { errorRate },
            } = backends;
            expect(errorRate.value).to.be(0);
            expect(errorRate.timeseries.every(({ y }) => y === 0)).to.be(true);
          });
        });
      });
    }
  );
}
