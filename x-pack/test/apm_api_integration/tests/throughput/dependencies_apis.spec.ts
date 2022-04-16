/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@elastic/apm-synthtrace';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { BackendNode, ServiceNode } from '@kbn/apm-plugin/common/connections';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

  async function getThroughputValues(overrides?: { serviceName?: string; backendName?: string }) {
    const commonQuery = {
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      environment: 'ENVIRONMENT_ALL',
    };
    const [topBackendsAPIResponse, backendThroughputChartAPIResponse, upstreamServicesApiResponse] =
      await Promise.all([
        apmApiClient.readUser({
          endpoint: `GET /internal/apm/backends/top_backends`,
          params: {
            query: {
              ...commonQuery,
              numBuckets: 20,
              kuery: '',
            },
          },
        }),
        apmApiClient.readUser({
          endpoint: `GET /internal/apm/backends/charts/throughput`,
          params: {
            query: {
              ...commonQuery,
              backendName: overrides?.backendName || 'elasticsearch',
              kuery: '',
            },
          },
        }),
        apmApiClient.readUser({
          endpoint: `GET /internal/apm/backends/upstream_services`,
          params: {
            query: {
              ...commonQuery,
              backendName: overrides?.backendName || 'elasticsearch',
              numBuckets: 20,
              offset: '1d',
              kuery: '',
            },
          },
        }),
      ]);
    const backendThroughputChartMean = roundNumber(
      meanBy(backendThroughputChartAPIResponse.body.currentTimeseries, 'y')
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
      topBackends: topBackendsAPIResponse.body.backends.map((item) => [
        (item.location as BackendNode).backendName,
        roundNumber(item.currentStats.throughput.value),
      ]),
      backendThroughputChartMean,
      upstreamServicesThroughput,
    };
  }

  let throughputValues: Awaited<ReturnType<typeof getThroughputValues>>;

  registry.when(
    'Dependencies throughput value',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('when data is loaded', () => {
        const GO_PROD_RATE = 75;
        const JAVA_PROD_RATE = 25;
        before(async () => {
          const serviceGoProdInstance = apm
            .service('synth-go', 'production', 'go')
            .instance('instance-a');
          const serviceJavaInstance = apm
            .service('synth-java', 'development', 'java')
            .instance('instance-c');

          await synthtraceEsClient.index([
            timerange(start, end)
              .interval('1m')
              .rate(GO_PROD_RATE)
              .generator((timestamp) =>
                serviceGoProdInstance
                  .transaction('GET /api/product/list')
                  .duration(1000)
                  .timestamp(timestamp)
                  .children(
                    serviceGoProdInstance
                      .span('GET apm-*/_search', 'db', 'elasticsearch')
                      .duration(1000)
                      .success()
                      .destination('elasticsearch')
                      .timestamp(timestamp),
                    serviceGoProdInstance
                      .span('custom_operation', 'app')
                      .duration(550)
                      .children(
                        serviceGoProdInstance
                          .span('SELECT FROM products', 'db', 'postgresql')
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
                  .transaction('POST /api/product/buy')
                  .duration(1000)
                  .timestamp(timestamp)
                  .children(
                    serviceJavaInstance
                      .span('GET apm-*/_search', 'db', 'elasticsearch')
                      .duration(1000)
                      .success()
                      .destination('elasticsearch')
                      .timestamp(timestamp),
                    serviceJavaInstance
                      .span('custom_operation', 'app')
                      .duration(50)
                      .success()
                      .timestamp(timestamp)
                  )
              ),
          ]);
        });

        after(() => synthtraceEsClient.clean());

        describe('verify top dependencies', () => {
          before(async () => {
            throughputValues = await getThroughputValues();
          });

          it('returns elasticsearch and postgresql as dependencies', () => {
            const { topBackends } = throughputValues;
            const topBackendsAsObj = Object.fromEntries(topBackends);
            expect(topBackendsAsObj.elasticsearch).to.equal(
              roundNumber(JAVA_PROD_RATE + GO_PROD_RATE)
            );
            expect(topBackendsAsObj.postgresql).to.equal(roundNumber(GO_PROD_RATE));
          });
        });

        describe('compare throughput value between top backends, backend throughput chart and upstream services apis', () => {
          describe('elasticsearch dependency', () => {
            before(async () => {
              throughputValues = await getThroughputValues({ backendName: 'elasticsearch' });
            });

            it('matches throughput values between throughput chart and top dependency', () => {
              const { topBackends, backendThroughputChartMean } = throughputValues;
              const topBackendsAsObj = Object.fromEntries(topBackends);
              const elasticsearchDependency = topBackendsAsObj.elasticsearch;
              [elasticsearchDependency, backendThroughputChartMean].forEach((value) =>
                expect(value).to.be.equal(roundNumber(JAVA_PROD_RATE + GO_PROD_RATE))
              );
            });

            it('matches throughput values between upstream services and top dependency', () => {
              const { topBackends, upstreamServicesThroughput } = throughputValues;
              const topBackendsAsObj = Object.fromEntries(topBackends);
              const elasticsearchDependency = topBackendsAsObj.elasticsearch;
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
              throughputValues = await getThroughputValues({ backendName: 'postgresql' });
            });

            it('matches throughput values between throughput chart and top dependency', () => {
              const { topBackends, backendThroughputChartMean } = throughputValues;
              const topBackendsAsObj = Object.fromEntries(topBackends);
              const postgresqlDependency = topBackendsAsObj.postgresql;
              [postgresqlDependency, backendThroughputChartMean].forEach((value) =>
                expect(value).to.be.equal(roundNumber(GO_PROD_RATE))
              );
            });

            it('matches throughput values between upstream services and top dependency', () => {
              const { topBackends, upstreamServicesThroughput } = throughputValues;
              const topBackendsAsObj = Object.fromEntries(topBackends);
              const postgresqlDependency = topBackendsAsObj.postgresql;
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
    }
  );
}
