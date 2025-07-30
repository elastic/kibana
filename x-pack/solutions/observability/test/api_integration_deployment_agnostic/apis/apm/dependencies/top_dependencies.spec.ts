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
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { dataConfig, generateData } from './generate_data';
import { roundNumber } from '../utils/common';

type TopDependencies = APIReturnType<'GET /internal/apm/dependencies/top_dependencies'>;
type TopDependenciesStatistics =
  APIReturnType<'POST /internal/apm/dependencies/top_dependencies/statistics'>;

const DEPENDENCY_NAMES = [
  dataConfig.span.destination,
  ...Array.from({ length: 25 }, (_, i) => `${dataConfig.span.destination}/${i + 1}`),
];
export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;
  const bucketSize = Math.round((end - start) / (60 * 1000));

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
        },
      },
    });
  }

  async function callStatisticsApi() {
    return await apmApiClient.readUser({
      endpoint: 'POST /internal/apm/dependencies/top_dependencies/statistics',
      params: {
        query: {
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment: 'ENVIRONMENT_ALL',
          kuery: '',
          numBuckets: 20,
        },
        body: {
          dependencyNames: JSON.stringify(DEPENDENCY_NAMES),
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
      let topDependenciesStats: TopDependenciesStatistics;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();
        await generateData({ apmSynthtraceEsClient, start, end });
        const [response, statisticsResponse] = await Promise.all([callApi(), callStatisticsApi()]);
        topDependencies = response.body;
        topDependenciesStats = statisticsResponse.body;
      });

      after(() => apmSynthtraceEsClient.clean());

      it('returns an array of dependencies', () => {
        expect(topDependencies).to.have.property('dependencies');
        expect(topDependencies.dependencies).to.have.length(51); // 50 dependencies + 1 dependency from the failed transaction
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
          dependencies =
            topDependencies.dependencies.find(
              (dep) => dep.location.dependencyName === dataConfig.span.destination
            ) ?? topDependencies.dependencies[0];
        });

        it("doesn't have previous stats", () => {
          expect(dependencies.previousStats).to.be(null);
        });

        it('has an "impact" property', () => {
          expect(dependencies.currentStats).to.have.property('impact');
        });

        it("doesn't have timeseries stats", () => {
          expect(dependencies.currentStats.latency).to.not.have.property('timeseries');
          expect(dependencies.currentStats.totalTime).to.not.have.property('timeseries');
          expect(dependencies.currentStats.throughput).to.not.have.property('timeseries');
          expect(dependencies.currentStats.errorRate).to.not.have.property('timeseries');
        });

        it('returns the correct number of statistics', () => {
          expect(Object.keys(topDependenciesStats.currentTimeseries).length).to.be(
            DEPENDENCY_NAMES.length
          );
        });

        it('returns the correct latency', () => {
          const {
            currentStats: { latency },
          } = dependencies;

          const { transaction } = dataConfig;

          const expectedValue = transaction.duration * 1000;
          expect(latency.value).to.be(expectedValue);
          expect(
            topDependenciesStats.currentTimeseries[dataConfig.span.destination].latency.every(
              ({ y }) => y === expectedValue
            )
          ).to.be(true);
        });

        it('returns the correct throughput', () => {
          const {
            currentStats: { throughput },
          } = dependencies;
          const { errorRate } = dataConfig;
          const totalRate = errorRate;
          expect(roundNumber(throughput.value)).to.be(roundNumber(totalRate));
          expect(
            topDependenciesStats.currentTimeseries[dataConfig.span.destination].throughput.every(
              ({ y }) => roundNumber(y) === roundNumber(totalRate)
            )
          ).to.be(true);
        });

        it('returns the correct total time', () => {
          const {
            currentStats: { totalTime },
          } = dependencies;
          const { transaction, errorRate } = dataConfig;

          const expectedValuePerBucket = errorRate * transaction.duration * 1000;
          expect(totalTime.value).to.be(expectedValuePerBucket * bucketSize);
        });

        it('returns the correct error rate', () => {
          const {
            currentStats: { errorRate },
          } = dependencies;
          const { errorRate: dataConfigErroRate } = dataConfig;
          const expectedValue = dataConfigErroRate / dataConfigErroRate;
          expect(errorRate.value).to.be(expectedValue);
          expect(
            topDependenciesStats.currentTimeseries[dataConfig.span.destination].errorRate.every(
              ({ y }) => y === expectedValue
            )
          ).to.be(true);
        });
      });
    });
  });
}
