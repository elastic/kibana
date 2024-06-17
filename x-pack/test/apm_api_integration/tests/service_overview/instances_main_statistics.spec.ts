/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { apm, Instance, timerange } from '@kbn/apm-synthtrace-client';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { InstancesSortField } from '@kbn/apm-plugin/common/instances';
import { sum } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { roundNumber } from '../../utils';

type ServiceOverviewInstancesMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtrace = getService('apmSynthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:10:00.000Z').getTime();

  async function getServiceOverviewInstancesMainStatistics({
    serviceName,
    sortField = 'throughput',
    sortDirection = 'desc',
  }: {
    serviceName: string;
    sortField?: InstancesSortField;
    sortDirection?: 'asc' | 'desc';
  }) {
    const { body } = await apmApiClient.readUser({
      endpoint: `GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`,
      params: {
        path: { serviceName },
        query: {
          latencyAggregationType: LatencyAggregationType.avg,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          transactionType: 'request',
          environment: 'production',
          kuery: '',
          sortField,
          sortDirection,
        },
      },
    });

    return body.currentPeriod;
  }

  registry.when(
    'Instances main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles empty state', async () => {
          const response = await getServiceOverviewInstancesMainStatistics({ serviceName: 'foo' });
          expect(response).to.eql({});
        });
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177492
  registry.when(
    'Instances main statistics when data is loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('Return Top 100 instances', () => {
        const serviceName = 'synth-node-1';
        before(() => {
          const range = timerange(start, end);
          const transactionName = 'foo';

          const successfulTimestamps = range.interval('1m').rate(1);
          const failedTimestamps = range.interval('1m').rate(1);

          const instances = [...Array(200).keys()].map((index) =>
            apm
              .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
              .instance(`instance-${index}`)
          );

          const instanceSpans = (instance: Instance) => {
            const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
              instance
                .transaction({ transactionName })
                .timestamp(timestamp)
                .duration(1000)
                .success()
                .children(
                  instance
                    .span({
                      spanName: 'GET apm-*/_search',
                      spanType: 'db',
                      spanSubtype: 'elasticsearch',
                    })
                    .duration(1000)
                    .success()
                    .destination('elasticsearch')
                    .timestamp(timestamp),
                  instance
                    .span({ spanName: 'custom_operation', spanType: 'custom' })
                    .duration(100)
                    .success()
                    .timestamp(timestamp)
                )
            );

            const failedTraceEvents = failedTimestamps.generator((timestamp) =>
              instance
                .transaction({ transactionName })
                .timestamp(timestamp)
                .duration(1000)
                .failure()
                .errors(
                  instance
                    .error({ message: '[ResponseError] index_not_found_exception' })
                    .timestamp(timestamp + 50)
                )
            );

            const metricsets = range
              .interval('30s')
              .rate(1)
              .generator((timestamp) =>
                instance
                  .appMetrics({
                    'system.memory.actual.free': 800,
                    'system.memory.total': 1000,
                    'system.cpu.total.norm.pct': 0.6,
                    'system.process.cpu.total.norm.pct': 0.7,
                  })
                  .timestamp(timestamp)
              );

            return [successfulTraceEvents, failedTraceEvents, metricsets];
          };

          return synthtrace.index(instances.flatMap((instance) => instanceSpans(instance)));
        });

        after(() => {
          return synthtrace.clean();
        });
        describe('fetch instances', () => {
          let instancesMainStats: ServiceOverviewInstancesMainStatistics['currentPeriod'];
          before(async () => {
            instancesMainStats = await getServiceOverviewInstancesMainStatistics({
              serviceName,
            });
          });
          it('returns top 100 instances', () => {
            expect(instancesMainStats.length).to.be(100);
          });
        });
      });

      describe('Order by error rate', () => {
        const serviceName = 'synth-node-1';
        before(async () => {
          const range = timerange(start, end);
          const transactionName = 'foo';
          /**
           * Instance A
           * 90 transactions = Success
           * 10 transactions = Failure
           * Error rate: 10%
           */
          const instanceA = apm
            .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
            .instance('instance-A');
          const instanceASuccessfulTraceEvents = range
            .interval('1m')
            .rate(10)
            .generator((timestamp, index) =>
              index < 10
                ? instanceA
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(1000)
                    .failure()
                    .errors(
                      instanceA
                        .error({ message: '[ResponseError] index_not_found_exception' })
                        .timestamp(timestamp + 50)
                    )
                : instanceA
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(1000)
                    .success()
            );
          /**
           * Instance B
           * 1 transactions = Success
           * 9 transactions = Failure
           * Error rate: 90%
           */
          const instanceB = apm
            .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
            .instance('instance-B');
          const instanceBSuccessfulTraceEvents = range
            .interval('1m')
            .rate(1)
            .generator((timestamp, index) =>
              index === 0
                ? instanceB
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(1000)
                    .success()
                : instanceB
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(1000)
                    .failure()
                    .errors(
                      instanceB
                        .error({ message: '[ResponseError] index_not_found_exception' })
                        .timestamp(timestamp + 50)
                    )
            );
          /**
           * Instance C
           * 2 transactions = Success
           * 8 transactions = Failure
           * Error rate: 80%
           */
          const instanceC = apm
            .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
            .instance('instance-C');
          const instanceCSuccessfulTraceEvents = range
            .interval('1m')
            .rate(1)
            .generator((timestamp, index) =>
              index < 2
                ? instanceC
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(1000)
                    .success()
                : instanceC
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(1000)
                    .failure()
                    .errors(
                      instanceC
                        .error({ message: '[ResponseError] index_not_found_exception' })
                        .timestamp(timestamp + 50)
                    )
            );
          /**
           * Instance D
           * 0 transactions = Success
           * 10 transactions = Failure
           * Error rate: 100%
           */
          const instanceD = apm
            .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
            .instance('instance-D');
          const instanceDSuccessfulTraceEvents = range
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              instanceD
                .transaction({ transactionName })
                .timestamp(timestamp)
                .duration(1000)
                .failure()
                .errors(
                  instanceD
                    .error({ message: '[ResponseError] index_not_found_exception' })
                    .timestamp(timestamp + 50)
                )
            );
          /**
           * Instance E
           * 10 transactions = Success
           * 0 transactions = Failure
           * Error rate: 0%
           */
          const instanceE = apm
            .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
            .instance('instance-E');
          const instanceESuccessfulTraceEvents = range
            .interval('1m')
            .rate(1)
            .generator((timestamp) =>
              instanceE
                .transaction({ transactionName })
                .timestamp(timestamp)
                .duration(1000)
                .success()
            );
          return synthtrace.index([
            instanceASuccessfulTraceEvents,
            instanceBSuccessfulTraceEvents,
            instanceCSuccessfulTraceEvents,
            instanceDSuccessfulTraceEvents,
            instanceESuccessfulTraceEvents,
          ]);
        });

        after(() => {
          return synthtrace.clean();
        });
        describe('sort by error rate asc', () => {
          let instancesMainStats: ServiceOverviewInstancesMainStatistics['currentPeriod'];
          before(async () => {
            instancesMainStats = await getServiceOverviewInstancesMainStatistics({
              serviceName,
              sortField: 'errorRate',
              sortDirection: 'asc',
            });
          });
          it('returns instances sorted asc', () => {
            expect(instancesMainStats.map((item) => roundNumber(item.errorRate))).to.eql([
              0, 0.1, 0.8, 0.9, 1,
            ]);
          });
        });
        describe('sort by error rate desc', () => {
          let instancesMainStats: ServiceOverviewInstancesMainStatistics['currentPeriod'];
          before(async () => {
            instancesMainStats = await getServiceOverviewInstancesMainStatistics({
              serviceName,
              sortField: 'errorRate',
              sortDirection: 'desc',
            });
          });
          it('returns instances sorted desc', () => {
            expect(instancesMainStats.map((item) => roundNumber(item.errorRate))).to.eql([
              1, 0.9, 0.8, 0.1, 0,
            ]);
          });
        });
      });

      describe('with transactions and system metrics', () => {
        const serviceName = 'synth-node-1';
        before(async () => {
          const range = timerange(start, end);
          const transactionName = 'foo';
          const instances = Array(3)
            .fill(0)
            .map((_, idx) => {
              const index = idx + 1;
              return {
                instance: apm
                  .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
                  .instance(`instance-${index}`),
                duration: index * 1000,
                rate: index * 10,
                errorRate: 5,
              };
            });

          return synthtrace.index(
            instances.flatMap(({ instance, duration, rate, errorRate }) => {
              const successfulTraceEvents = range
                .interval('1m')
                .rate(rate)
                .generator((timestamp) =>
                  instance
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(duration)
                    .success()
                );
              const failedTraceEvents = range
                .interval('1m')
                .rate(errorRate)
                .generator((timestamp) =>
                  instance
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(duration)
                    .failure()
                    .errors(
                      instance
                        .error({ message: '[ResponseError] index_not_found_exception' })
                        .timestamp(timestamp + 50)
                    )
                );
              const metricsets = range
                .interval('30s')
                .rate(1)
                .generator((timestamp) =>
                  instance
                    .appMetrics({
                      'system.memory.actual.free': 800,
                      'system.memory.total': 1000,
                      'system.cpu.total.norm.pct': 0.6,
                      'system.process.cpu.total.norm.pct': 0.7,
                    })
                    .timestamp(timestamp)
                );
              return [successfulTraceEvents, failedTraceEvents, metricsets];
            })
          );
        });

        after(() => {
          return synthtrace.clean();
        });

        describe('test order of items', () => {
          (
            [
              {
                field: 'throughput',
                direction: 'asc',
                expectedServiceNodeNames: ['instance-1', 'instance-2', 'instance-3'],
                expectedValues: [15, 25, 35],
              },
              {
                field: 'throughput',
                direction: 'desc',
                expectedServiceNodeNames: ['instance-3', 'instance-2', 'instance-1'],
                expectedValues: [35, 25, 15],
              },
              {
                field: 'latency',
                direction: 'asc',
                expectedServiceNodeNames: ['instance-1', 'instance-2', 'instance-3'],
                expectedValues: [1000000, 2000000, 3000000],
              },
              {
                field: 'latency',
                direction: 'desc',
                expectedServiceNodeNames: ['instance-3', 'instance-2', 'instance-1'],
                expectedValues: [3000000, 2000000, 1000000],
              },
              {
                field: 'serviceNodeName',
                direction: 'asc',
                expectedServiceNodeNames: ['instance-1', 'instance-2', 'instance-3'],
              },
              {
                field: 'serviceNodeName',
                direction: 'desc',
                expectedServiceNodeNames: ['instance-3', 'instance-2', 'instance-1'],
              },
            ] as Array<{
              field: InstancesSortField;
              direction: 'asc' | 'desc';
              expectedServiceNodeNames: string[];
              expectedValues?: number[];
            }>
          ).map(({ field, direction, expectedServiceNodeNames, expectedValues }) =>
            describe(`fetch instances main statistics ordered by ${field} ${direction}`, () => {
              let instancesMainStats: ServiceOverviewInstancesMainStatistics['currentPeriod'];

              before(async () => {
                instancesMainStats = await getServiceOverviewInstancesMainStatistics({
                  serviceName,
                  sortField: field,
                  sortDirection: direction,
                });
              });

              it('returns ordered instance main stats', () => {
                expect(instancesMainStats.map((item) => item.serviceNodeName)).to.eql(
                  expectedServiceNodeNames
                );
                if (expectedValues) {
                  expect(
                    instancesMainStats.map((item) => {
                      const value = item[field];
                      if (typeof value === 'number') {
                        return roundNumber(value);
                      }
                      return value;
                    })
                  ).to.eql(expectedValues);
                }
              });

              it('returns system metrics', () => {
                expect(instancesMainStats.map((item) => roundNumber(item.cpuUsage))).to.eql([
                  0.7, 0.7, 0.7,
                ]);
                expect(instancesMainStats.map((item) => roundNumber(item.memoryUsage))).to.eql([
                  0.2, 0.2, 0.2,
                ]);
              });
            })
          );
        });
      });

      describe('with transactions only', () => {
        const serviceName = 'synth-node-1';
        before(async () => {
          const range = timerange(start, end);
          const transactionName = 'foo';
          const instances = Array(3)
            .fill(0)
            .map((_, idx) => {
              const index = idx + 1;
              return {
                instance: apm
                  .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
                  .instance(`instance-${index}`),
                duration: index * 1000,
                rate: index * 10,
                errorRate: 5,
              };
            });

          return synthtrace.index(
            instances.flatMap(({ instance, duration, rate, errorRate }) => {
              const successfulTraceEvents = range
                .interval('1m')
                .rate(rate)
                .generator((timestamp) =>
                  instance
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(duration)
                    .success()
                );
              const failedTraceEvents = range
                .interval('1m')
                .rate(errorRate)
                .generator((timestamp) =>
                  instance
                    .transaction({ transactionName })
                    .timestamp(timestamp)
                    .duration(duration)
                    .failure()
                    .errors(
                      instance
                        .error({ message: '[ResponseError] index_not_found_exception' })
                        .timestamp(timestamp + 50)
                    )
                );
              return [successfulTraceEvents, failedTraceEvents];
            })
          );
        });

        after(() => {
          return synthtrace.clean();
        });

        describe(`Fetch main statistics`, () => {
          let instancesMainStats: ServiceOverviewInstancesMainStatistics['currentPeriod'];

          before(async () => {
            instancesMainStats = await getServiceOverviewInstancesMainStatistics({
              serviceName,
            });
          });

          it('returns instances name', () => {
            expect(instancesMainStats.map((item) => item.serviceNodeName)).to.eql([
              'instance-3',
              'instance-2',
              'instance-1',
            ]);
          });

          it('returns throughput', () => {
            expect(sum(instancesMainStats.map((item) => item.throughput))).to.greaterThan(0);
          });

          it('returns latency', () => {
            expect(sum(instancesMainStats.map((item) => item.latency))).to.greaterThan(0);
          });

          it('returns errorRate', () => {
            expect(sum(instancesMainStats.map((item) => item.errorRate))).to.greaterThan(0);
          });

          it('does not return cpu usage', () => {
            expect(
              instancesMainStats.map((item) => item.cpuUsage).filter((value) => value !== undefined)
            ).to.eql([]);
          });

          it('does not return memory usage', () => {
            expect(
              instancesMainStats
                .map((item) => item.memoryUsage)
                .filter((value) => value !== undefined)
            ).to.eql([]);
          });
        });
      });

      describe('with system metrics only', () => {
        const serviceName = 'synth-node-1';
        before(async () => {
          const range = timerange(start, end);
          const instances = Array(3)
            .fill(0)
            .map((_, idx) =>
              apm
                .service({ name: serviceName, environment: 'production', agentName: 'nodejs' })
                .instance(`instance-${idx + 1}`)
            );

          return synthtrace.index(
            instances.map((instance) => {
              const metricsets = range
                .interval('30s')
                .rate(1)
                .generator((timestamp) =>
                  instance
                    .appMetrics({
                      'system.memory.actual.free': 800,
                      'system.memory.total': 1000,
                      'system.cpu.total.norm.pct': 0.6,
                      'system.process.cpu.total.norm.pct': 0.7,
                    })
                    .timestamp(timestamp)
                );
              return metricsets;
            })
          );
        });

        after(() => {
          return synthtrace.clean();
        });

        describe(`Fetch main statistics`, () => {
          let instancesMainStats: ServiceOverviewInstancesMainStatistics['currentPeriod'];

          before(async () => {
            instancesMainStats = await getServiceOverviewInstancesMainStatistics({
              serviceName,
            });
          });

          it('returns instances name', () => {
            expect(instancesMainStats.map((item) => item.serviceNodeName)).to.eql([
              'instance-1',
              'instance-2',
              'instance-3',
            ]);
          });

          it('does not return throughput', () => {
            expect(
              instancesMainStats
                .map((item) => item.throughput)
                .filter((value) => value !== undefined)
            ).to.eql([]);
          });

          it('does not return latency', () => {
            expect(
              instancesMainStats.map((item) => item.latency).filter((value) => value !== undefined)
            ).to.eql([]);
          });

          it('does not return errorRate', () => {
            expect(
              instancesMainStats
                .map((item) => item.errorRate)
                .filter((value) => value !== undefined)
            ).to.eql([]);
          });

          it('returns cpu usage', () => {
            expect(sum(instancesMainStats.map((item) => item.cpuUsage))).to.greaterThan(0);
          });

          it('returns memory usage', () => {
            expect(sum(instancesMainStats.map((item) => item.memoryUsage))).to.greaterThan(0);
          });
        });
      });
    }
  );
}
