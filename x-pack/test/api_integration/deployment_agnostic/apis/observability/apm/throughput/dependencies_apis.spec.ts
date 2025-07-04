/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { DependencyNode, ServiceNode } from '@kbn/apm-plugin/common/connections';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { roundNumber } from '../utils/common';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');
  const synthtrace = getService('synthtrace');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function getThroughputValues(overrides?: {
    serviceName?: string;
    dependencyName?: string;
  }) {
    const commonQuery = {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      environment: 'ENVIRONMENT_ALL',
    };
    const [
      topDependenciesAPIResponse,
      dependencyThroughputChartAPIResponse,
      upstreamServicesApiResponse,
    ] = await Promise.all([
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/dependencies/top_dependencies`,
        params: {
          query: {
            ...commonQuery,
            numBuckets: 20,
            kuery: '',
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/dependencies/charts/throughput`,
        params: {
          query: {
            ...commonQuery,
            dependencyName: overrides?.dependencyName || 'elasticsearch',
            spanName: '',
            searchServiceDestinationMetrics: false,
            kuery: '',
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/dependencies/upstream_services`,
        params: {
          query: {
            ...commonQuery,
            dependencyName: overrides?.dependencyName || 'elasticsearch',
            numBuckets: 20,
            offset: '1d',
            kuery: '',
          },
        },
      }),
    ]);
    const dependencyThroughputChartMean = roundNumber(
      meanBy(dependencyThroughputChartAPIResponse.body.currentTimeseries, 'y')
    );

    const upstreamServicesThroughput = upstreamServicesApiResponse.body.services.map(
      (upstreamService) => {
        return {
          serviceName: (upstreamService.location as ServiceNode).serviceName,
          throughput: upstreamService.currentStats.throughput.value,
        };
      }
    );

    return {
      topDependencies: topDependenciesAPIResponse.body.dependencies.map((item) => [
        (item.location as DependencyNode).dependencyName,
        roundNumber(item.currentStats.throughput.value),
      ]),
      dependencyThroughputChartMean,
      upstreamServicesThroughput,
    };
  }

  let throughputValues: Awaited<ReturnType<typeof getThroughputValues>>;

  describe('Dependencies throughput value', () => {
    describe('when data is loaded', () => {
      const GO_PROD_RATE = 75;
      const JAVA_PROD_RATE = 25;
      let apmSynthtraceEsClient: ApmSynthtraceEsClient;

      before(async () => {
        const serviceGoProdInstance = apm
          .service({ name: 'synth-go', environment: 'production', agentName: 'go' })
          .instance('instance-a');
        const serviceJavaInstance = apm
          .service({ name: 'synth-java', environment: 'development', agentName: 'java' })
          .instance('instance-c');
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await apmSynthtraceEsClient.index([
          timerange(start, end)
            .interval('1m')
            .rate(GO_PROD_RATE)
            .generator((timestamp) =>
              serviceGoProdInstance
                .transaction({ transactionName: 'GET /api/product/list' })
                .duration(1000)
                .timestamp(timestamp)
                .children(
                  serviceGoProdInstance
                    .span({
                      spanName: 'GET apm-*/_search',
                      spanType: 'db',
                      spanSubtype: 'elasticsearch',
                    })
                    .duration(1000)
                    .success()
                    .destination('elasticsearch')
                    .timestamp(timestamp),
                  serviceGoProdInstance
                    .span({ spanName: 'custom_operation', spanType: 'app' })
                    .duration(550)
                    .children(
                      serviceGoProdInstance
                        .span({
                          spanName: 'SELECT FROM products',
                          spanType: 'db',
                          spanSubtype: 'postgresql',
                        })
                        .duration(500)
                        .success()
                        .destination('postgresql')
                        .timestamp(timestamp)
                    )
                    .success()
                    .timestamp(timestamp)
                )
            ),
          timerange(start, end)
            .interval('1m')
            .rate(JAVA_PROD_RATE)
            .generator((timestamp) =>
              serviceJavaInstance
                .transaction({ transactionName: 'POST /api/product/buy' })
                .duration(1000)
                .timestamp(timestamp)
                .children(
                  serviceJavaInstance
                    .span({
                      spanName: 'GET apm-*/_search',
                      spanType: 'db',
                      spanSubtype: 'elasticsearch',
                    })
                    .duration(1000)
                    .success()
                    .destination('elasticsearch')
                    .timestamp(timestamp),
                  serviceJavaInstance
                    .span({ spanName: 'custom_operation', spanType: 'app' })
                    .duration(50)
                    .success()
                    .timestamp(timestamp)
                )
            ),
        ]);
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('verify top dependencies', () => {
        before(async () => {
          throughputValues = await getThroughputValues();
        });

        it('returns elasticsearch and postgresql as dependencies', () => {
          const { topDependencies } = throughputValues;
          const topDependenciesAsObj = Object.fromEntries(topDependencies);
          expect(topDependenciesAsObj.elasticsearch).to.equal(
            roundNumber(JAVA_PROD_RATE + GO_PROD_RATE)
          );
          expect(topDependenciesAsObj.postgresql).to.equal(roundNumber(GO_PROD_RATE));
        });
      });

      describe('compare throughput value between top backends, backend throughput chart and upstream services apis', () => {
        describe('elasticsearch dependency', () => {
          before(async () => {
            throughputValues = await getThroughputValues({ dependencyName: 'elasticsearch' });
          });

          it('matches throughput values between throughput chart and top dependency', () => {
            const { topDependencies, dependencyThroughputChartMean } = throughputValues;
            const topDependenciesAsObj = Object.fromEntries(topDependencies);
            const elasticsearchDependency = topDependenciesAsObj.elasticsearch;
            [elasticsearchDependency, dependencyThroughputChartMean].forEach((value) =>
              expect(value).to.be.equal(roundNumber(JAVA_PROD_RATE + GO_PROD_RATE))
            );
          });

          it('matches throughput values between upstream services and top dependency', () => {
            const { topDependencies, upstreamServicesThroughput } = throughputValues;
            const topDependenciesAsObj = Object.fromEntries(topDependencies);
            const elasticsearchDependency = topDependenciesAsObj.elasticsearch;
            const upstreamServiceThroughputSum = roundNumber(
              sumBy(upstreamServicesThroughput, 'throughput')
            );
            [elasticsearchDependency, upstreamServiceThroughputSum].forEach((value) =>
              expect(value).to.be.equal(roundNumber(JAVA_PROD_RATE + GO_PROD_RATE))
            );
          });
        });
        describe('postgresql dependency', () => {
          before(async () => {
            throughputValues = await getThroughputValues({ dependencyName: 'postgresql' });
          });

          it('matches throughput values between throughput chart and top dependency', () => {
            const { topDependencies, dependencyThroughputChartMean } = throughputValues;
            const topDependenciesAsObj = Object.fromEntries(topDependencies);
            const postgresqlDependency = topDependenciesAsObj.postgresql;
            [postgresqlDependency, dependencyThroughputChartMean].forEach((value) =>
              expect(value).to.be.equal(roundNumber(GO_PROD_RATE))
            );
          });

          it('matches throughput values between upstream services and top dependency', () => {
            const { topDependencies, upstreamServicesThroughput } = throughputValues;
            const topDependenciesAsObj = Object.fromEntries(topDependencies);
            const postgresqlDependency = topDependenciesAsObj.postgresql;
            const upstreamServiceThroughputSum = roundNumber(
              sumBy(upstreamServicesThroughput, 'throughput')
            );
            [postgresqlDependency, upstreamServiceThroughputSum].forEach((value) =>
              expect(value).to.be.equal(roundNumber(GO_PROD_RATE))
            );
          });
        });
      });
    });
  });
}
