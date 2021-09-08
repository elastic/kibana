/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick, sortBy } from 'lodash';
import moment from 'moment';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';

import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Service overview instances main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiClient.readUser({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                transactionType: 'request',
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                comparisonStart: start,
                comparisonEnd: moment(start).add(15, 'minutes').toISOString(),
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
          body: APIReturnType<`GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`,
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
              "errorRate": 0.0252659574468085,
              "latency": 411589.785714286,
              "memoryUsage": 0.786029688517253,
              "throughput": 25.0666666666667,
            }
          `);
        });
      });

      describe('fetching non-java data', () => {
        let response: {
          body: APIReturnType<`GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`,
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
              "errorRate": 0.000907441016333938,
              "latency": 40989.5802047782,
              "throughput": 36.7333333333333,
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
          body: APIReturnType<`GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiClient.readUser({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                transactionType: 'request',
                start: moment(end).subtract(15, 'minutes').toISOString(),
                end,
                comparisonStart: start,
                comparisonEnd: moment(start).add(15, 'minutes').toISOString(),
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
              "errorRate": 0.0268292682926829,
              "latency": 739013.634146341,
              "memoryUsage": 0.783296203613281,
              "throughput": 27.3333333333333,
            }
          `);
        });
      });
    }
  );
}
