/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { NodeType, DependencyNode } from '@kbn/apm-plugin/common/connections';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { dataConfig, generateData } from './generate_data';
import { roundNumber } from '../utils/common';

type TopDependencies = APIReturnType<'GET /internal/apm/dependencies/top_dependencies'>;

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function callApi() {
    return await apmApiClient.readUser({
      endpoint: 'GET /internal/apm/dependencies/top_dependencies',
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

  describe('Top dependencies', () => {
    describe('when data is not loaded', () => {
      it('handles empty state', async () => {
        const { status, body } = await callApi();
        expect(status).to.be(200);
        expect(body.dependencies).to.empty();
      });
    });

    describe('when data is generated', () => {
      let topDependencies: TopDependencies;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateData({ apmSynthtraceEsClient, start, end });
        const response = await callApi();
        topDependencies = response.body;
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns an array of dependencies', () => {
        expect(topDependencies).to.have.property('dependencies');
        expect(topDependencies.dependencies).to.have.length(1);
      });

      it('returns correct dependency information', () => {
        const location = topDependencies.dependencies[0].location as DependencyNode;
        const { span } = dataConfig;

        expect(location.type).to.be(NodeType.dependency);
        expect(location.dependencyName).to.be(span.destination);
        expect(location.spanType).to.be(span.type);
        expect(location.spanSubtype).to.be(span.subType);
        expect(location).to.have.property('id');
      });

      describe('returns the correct stats', () => {
        let dependencies: TopDependencies['dependencies'][number];

        before(() => {
          dependencies = topDependencies.dependencies[0];
        });

        it("doesn't have previous stats", () => {
          expect(dependencies.previousStats).to.be(null);
        });

        it('has an "impact" property', () => {
          expect(dependencies.currentStats).to.have.property('impact');
        });

        it('returns the correct latency', () => {
          const {
            currentStats: { latency },
          } = dependencies;

          const { transaction } = dataConfig;

          expect(latency.value).to.be(transaction.duration * 1000);
          expect(latency.timeseries.every(({ y }) => y === transaction.duration * 1000)).to.be(
            true
          );
        });

        it('returns the correct throughput', () => {
          const {
            currentStats: { throughput },
          } = dependencies;
          const { rate } = dataConfig;

          expect(roundNumber(throughput.value)).to.be(roundNumber(rate));
        });

        it('returns the correct total time', () => {
          const {
            currentStats: { totalTime },
          } = dependencies;
          const { rate, transaction } = dataConfig;

          expect(
            totalTime.timeseries.every(({ y }) => y === rate * transaction.duration * 1000)
          ).to.be(true);
        });

        it('returns the correct error rate', () => {
          const {
            currentStats: { errorRate },
          } = dependencies;
          expect(errorRate.value).to.be(0);
          expect(errorRate.timeseries.every(({ y }) => y === 0)).to.be(true);
        });
      });
    });
  });
}
