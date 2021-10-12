/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { service, timerange } from '@elastic/apm-generator';
import expect from '@kbn/expect';
import { meanBy, sumBy } from 'lodash';
import { BackendNode, ServiceNode } from '../../../../plugins/apm/common/connections';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const traceData = getService('traceData');

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
          endpoint: `GET /internal/apm/backends/{backendName}/charts/throughput`,
          params: {
            path: { backendName: overrides?.backendName || 'elasticsearch' },
            query: {
              ...commonQuery,
              kuery: '',
            },
          },
        }),
        apmApiClient.readUser({
          endpoint: `GET /internal/apm/backends/{backendName}/upstream_services`,
          params: {
            path: { backendName: overrides?.backendName || 'elasticsearch' },
            query: {
              ...commonQuery,
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

  let throughputValues: PromiseReturnType<typeof getThroughputValues>;

  registry.when(
    'Dependencies throughput value',
    { config: 'basic', archives: ['apm_8.0.0_empty'] },
    () => {
      describe('when data is loaded', () => {
        before(async () => {
          const GO_PROD_RATE = 10;
          const JAVA_PROD_RATE = 20;

          const serviceGoProdInstance = service('synth-go', 'production', 'go').instance(
            'instance-a'
          );

          const serviceJavaInstance = service('synth-java', 'development', 'java').instance(
            'instance-c'
          );

          await traceData.index([
            ...timerange(start, end)
              .interval('1s')
              .rate(GO_PROD_RATE)
              .flatMap((timestamp) =>
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
                  .serialize()
              ),
            ...timerange(start, end)
              .interval('1s')
              .rate(JAVA_PROD_RATE)
              .flatMap((timestamp) =>
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
                  .serialize()
              ),
          ]);
        });

        after(() => traceData.clean());

        describe('verify top dependencies', () => {
          before(async () => {
            throughputValues = await getThroughputValues();
          });

          it('returns elasticsearch and postgresql as dependencies', () => {
            const { topBackends } = throughputValues;
            const topBackendsAsObj = Object.fromEntries(topBackends);
            expect(topBackendsAsObj.elasticsearch).to.equal('1800');
            expect(topBackendsAsObj.postgresql).to.equal('600.0');
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
              expect(elasticsearchDependency).to.equal(backendThroughputChartMean);
            });

            it('matches throughput values between upstream services and top dependency', () => {
              const { topBackends, upstreamServicesThroughput } = throughputValues;
              const topBackendsAsObj = Object.fromEntries(topBackends);
              const elasticsearchDependency = topBackendsAsObj.elasticsearch;
              const upstreamServiceThroughputSum = roundNumber(
                sumBy(upstreamServicesThroughput, 'throughput')
              );
              expect(elasticsearchDependency).to.be.equal(upstreamServiceThroughputSum);
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
              expect(postgresqlDependency).to.equal(backendThroughputChartMean);
            });

            it('matches throughput values between upstream services and top dependency', () => {
              const { topBackends, upstreamServicesThroughput } = throughputValues;
              const topBackendsAsObj = Object.fromEntries(topBackends);
              const postgresqlDependency = topBackendsAsObj.postgresql;
              const upstreamServiceThroughputSum = roundNumber(
                sumBy(upstreamServicesThroughput, 'throughput')
              );
              expect(postgresqlDependency).to.be.equal(upstreamServiceThroughputSum);
            });
          });
        });
      });
    }
  );
}
