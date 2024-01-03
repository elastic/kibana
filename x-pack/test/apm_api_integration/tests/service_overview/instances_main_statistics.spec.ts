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
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { InstancesSortField } from '@kbn/apm-plugin/common/instances';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { roundNumber } from '../../utils';

type ServiceOverviewInstancesMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtrace = getService('synthtraceEsClient');

  const start = new Date('2021-01-01T00:00:00.000Z').getTime();
  const end = new Date('2021-01-01T00:15:00.000Z').getTime() - 1;

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

  registry.when(
    'Instances main statistics when data is loaded',
    { config: 'basic', archives: [] },
    () => {
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
              field: 'errorRate',
              direction: 'asc',
              expectedServiceNodeNames: ['instance-3', 'instance-2', 'instance-1'],
              expectedValues: [0.1429, 0.2, 0.3333],
            },
            {
              field: 'errorRate',
              direction: 'desc',
              expectedServiceNodeNames: ['instance-1', 'instance-2', 'instance-3'],
              expectedValues: [0.3333, 0.2, 0.1429],
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
    }
  );
}
