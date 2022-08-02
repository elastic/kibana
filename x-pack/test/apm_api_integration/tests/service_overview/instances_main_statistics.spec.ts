/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick, sortBy } from 'lodash';
import moment from 'moment';
import { apm, timerange } from '@elastic/apm-synthtrace';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { isFiniteNumber } from '@kbn/apm-plugin/common/utils/is_finite_number';

import { LatencyAggregationType } from '@kbn/apm-plugin/common/latency_aggregation_types';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { SERVICE_NODE_NAME_MISSING } from '@kbn/apm-plugin/common/service_nodes';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Service overview instances main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                transactionType: 'request',
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                offset: '15m',
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });
          expect(response.status).to.be(200);
          expect(response.body.currentPeriod).to.eql([]);
          expect(response.body.previousPeriod).to.eql([]);
        });
      });
    }
  );

  registry.when(
    'Service overview instances main statistics when data is loaded without comparison',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('fetching java data', () => {
        let response: {
          body: APIReturnType<`GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                start,
                end,
                transactionType: 'request',
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });
        });

        it('returns a service node item', () => {
          expect(response.body.currentPeriod.length).to.be.greaterThan(0);
        });

        it('returns statistics for each service node', () => {
          const item = response.body.currentPeriod[0];

          expect(isFiniteNumber(item.cpuUsage)).to.be(true);
          expect(isFiniteNumber(item.memoryUsage)).to.be(true);
          expect(isFiniteNumber(item.errorRate)).to.be(true);
          expect(isFiniteNumber(item.throughput)).to.be(true);
          expect(isFiniteNumber(item.latency)).to.be(true);
        });

        it('returns the right data', () => {
          const items = sortBy(response.body.currentPeriod, 'serviceNodeName');

          const serviceNodeNames = items.map((item) => item.serviceNodeName);

          expectSnapshot(items.length).toMatchInline(`1`);

          expectSnapshot(serviceNodeNames).toMatchInline(`
            Array [
              "31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad",
            ]
          `);

          const item = items[0];

          const values = pick(item, [
            'cpuUsage',
            'memoryUsage',
            'errorRate',
            'throughput',
            'latency',
          ]);

          expectSnapshot(values).toMatchInline(`
            Object {
              "cpuUsage": 0.002,
              "errorRate": 0.0848214285714286,
              "latency": 411589.785714286,
              "memoryUsage": 0.786029688517253,
              "throughput": 7.46666666666667,
            }
          `);
        });
      });

      describe('fetching non-java data', () => {
        let response: {
          body: APIReturnType<`GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`,
            params: {
              path: { serviceName: 'opbeans-ruby' },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                start,
                end,
                transactionType: 'request',
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });
        });

        it('returns statistics for each service node', () => {
          const item = response.body.currentPeriod[0];

          expect(isFiniteNumber(item.cpuUsage)).to.be(true);
          expect(isFiniteNumber(item.memoryUsage)).to.be(true);
          expect(isFiniteNumber(item.errorRate)).to.be(true);
          expect(isFiniteNumber(item.throughput)).to.be(true);
          expect(isFiniteNumber(item.latency)).to.be(true);
        });

        it('returns the right data', () => {
          const items = sortBy(response.body.currentPeriod, 'serviceNodeName');

          const serviceNodeNames = items.map((item) => item.serviceNodeName);

          expectSnapshot(items.length).toMatchInline(`1`);

          expectSnapshot(serviceNodeNames).toMatchInline(`
            Array [
              "b4c600993a0b233120cd333b8c4a7e35e73ee8f18f95b5854b8d7f6442531466",
            ]
          `);

          const item = items[0];

          const values = pick(item, 'cpuUsage', 'errorRate', 'throughput', 'latency');

          expectSnapshot(values).toMatchInline(`
            Object {
              "cpuUsage": 0.001,
              "errorRate": 0.00341296928327645,
              "latency": 40989.5802047782,
              "throughput": 9.76666666666667,
            }
          `);

          expectSnapshot(values);
        });
      });
    }
  );

  registry.when(
    'Service overview instances main statistics when data is loaded with comparison',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('fetching java data', () => {
        let response: {
          body: APIReturnType<`GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                transactionType: 'request',
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                offset: '15m',
                environment: 'ENVIRONMENT_ALL',
                kuery: '',
              },
            },
          });
        });

        it('returns a service node item', () => {
          expect(response.body.currentPeriod.length).to.be.greaterThan(0);
          expect(response.body.previousPeriod.length).to.be.greaterThan(0);
        });

        it('returns statistics for each service node', () => {
          const currentItem = response.body.currentPeriod[0];

          expect(isFiniteNumber(currentItem.cpuUsage)).to.be(true);
          expect(isFiniteNumber(currentItem.memoryUsage)).to.be(true);
          expect(isFiniteNumber(currentItem.errorRate)).to.be(true);
          expect(isFiniteNumber(currentItem.throughput)).to.be(true);
          expect(isFiniteNumber(currentItem.latency)).to.be(true);

          const previousItem = response.body.previousPeriod[0];

          expect(isFiniteNumber(previousItem.cpuUsage)).to.be(true);
          expect(isFiniteNumber(previousItem.memoryUsage)).to.be(true);
          expect(isFiniteNumber(previousItem.errorRate)).to.be(true);
          expect(isFiniteNumber(previousItem.throughput)).to.be(true);
          expect(isFiniteNumber(previousItem.latency)).to.be(true);
        });

        it('returns the right data', () => {
          const items = sortBy(response.body.previousPeriod, 'serviceNodeName');

          const serviceNodeNames = items.map((item) => item.serviceNodeName);

          expectSnapshot(items.length).toMatchInline(`1`);

          expectSnapshot(serviceNodeNames).toMatchInline(`
            Array [
              "31651f3c624b81c55dd4633df0b5b9f9ab06b151121b0404ae796632cd1f87ad",
            ]
          `);

          const item = items[0];

          const values = pick(item, [
            'cpuUsage',
            'memoryUsage',
            'errorRate',
            'throughput',
            'latency',
          ]);

          expectSnapshot(values).toMatchInline(`
            Object {
              "cpuUsage": 0.00223333333333333,
              "errorRate": 0.0894308943089431,
              "latency": 739013.634146341,
              "memoryUsage": 0.783296203613281,
              "throughput": 8.2,
            }
          `);
        });
      });
    }
  );

  registry.when(
    'Service overview instances main statistics when data is generated',
    { config: 'basic', archives: ['apm_mappings_only_8.0.0'] },
    () => {
      describe('for two go instances and one java instance', () => {
        const GO_A_INSTANCE_RATE_SUCCESS = 10;
        const GO_A_INSTANCE_RATE_FAILURE = 5;
        const GO_B_INSTANCE_RATE_SUCCESS = 15;

        const JAVA_INSTANCE_RATE = 20;

        const rangeStart = new Date('2021-01-01T12:00:00.000Z').getTime();
        const rangeEnd = new Date('2021-01-01T12:15:00.000Z').getTime() - 1;

        before(async () => {
          const goService = apm.service('opbeans-go', 'production', 'go');
          const javaService = apm.service('opbeans-java', 'production', 'java');

          const goInstanceA = goService.instance('go-instance-a');
          const goInstanceB = goService.instance('go-instance-b');
          const javaInstance = javaService.instance('java-instance');

          const interval = timerange(rangeStart, rangeEnd).interval('1m');

          // include exit spans to generate span_destination metrics
          // that should not be included
          function withSpans(timestamp: number) {
            return new Array(3).fill(undefined).map(() =>
              goInstanceA
                .span('GET apm-*/_search', 'db', 'elasticsearch')
                .timestamp(timestamp + 100)
                .duration(300)
                .destination('elasticsearch')
                .success()
            );
          }

          return synthtraceEsClient.index([
            interval.rate(GO_A_INSTANCE_RATE_SUCCESS).generator((timestamp) =>
              goInstanceA
                .transaction('GET /api/product/list')
                .success()
                .duration(500)
                .timestamp(timestamp)
                .children(...withSpans(timestamp))
            ),
            interval.rate(GO_A_INSTANCE_RATE_FAILURE).generator((timestamp) =>
              goInstanceA
                .transaction('GET /api/product/list')
                .failure()
                .duration(500)
                .timestamp(timestamp)
                .children(...withSpans(timestamp))
            ),
            interval.rate(GO_B_INSTANCE_RATE_SUCCESS).generator((timestamp) =>
              goInstanceB
                .transaction('GET /api/product/list')
                .success()
                .duration(500)
                .timestamp(timestamp)
                .children(...withSpans(timestamp))
            ),
            interval.rate(JAVA_INSTANCE_RATE).generator((timestamp) =>
              javaInstance
                .transaction('GET /api/product/list')
                .success()
                .duration(500)
                .timestamp(timestamp)
                .children(...withSpans(timestamp))
            ),
          ]);
        });

        after(async () => {
          return synthtraceEsClient.clean();
        });

        describe('for the go service', () => {
          let body: APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;

          before(async () => {
            body = (
              await apmApiClient.readUser({
                endpoint:
                  'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics',
                params: {
                  path: {
                    serviceName: 'opbeans-go',
                  },
                  query: {
                    start: new Date(rangeStart).toISOString(),
                    end: new Date(rangeEnd + 1).toISOString(),
                    environment: ENVIRONMENT_ALL.value,
                    kuery: '',
                    latencyAggregationType: LatencyAggregationType.avg,
                    transactionType: 'request',
                  },
                },
              })
            ).body;
          });

          it('returns statistics for the go instances', () => {
            const goAStats = body.currentPeriod.find(
              (stat) => stat.serviceNodeName === 'go-instance-a'
            );
            const goBStats = body.currentPeriod.find(
              (stat) => stat.serviceNodeName === 'go-instance-b'
            );

            expect(goAStats?.throughput).to.eql(
              GO_A_INSTANCE_RATE_SUCCESS + GO_A_INSTANCE_RATE_FAILURE
            );

            expect(goBStats?.throughput).to.eql(GO_B_INSTANCE_RATE_SUCCESS);
          });

          it('does not return data for the java service', () => {
            const javaStats = body.currentPeriod.find(
              (stat) => stat.serviceNodeName === 'java-instance'
            );

            expect(javaStats).to.be(undefined);
          });

          it('does not return data for missing service node name', () => {
            const missingNameStats = body.currentPeriod.find(
              (stat) => stat.serviceNodeName === SERVICE_NODE_NAME_MISSING
            );

            expect(missingNameStats).to.be(undefined);
          });
        });
      });
    }
  );
}
