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
import { createApmApiSupertest } from '../../common/apm_api_supertest';
import { LatencyAggregationType } from '../../../../plugins/apm/common/latency_aggregation_types';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Service overview instances main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiSupertest({
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
          response = await apmApiSupertest({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                start,
                end,
                transactionType: 'request',
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
              "512388b65878b1ed410e7a85e793878bb4bd6a4e1943db6d12ca12dd4286623a",
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
              "cpuUsage": 0.00181666666666667,
              "errorRate": 0.0304806565064478,
              "latency": 47077.0231660232,
              "memoryUsage": 0.784222412109375,
              "throughput": 28.4333333333333,
            }
          `);
        });
      });

      describe('fetching non-java data', () => {
        let response: {
          body: APIReturnType<`GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiSupertest({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics`,
            params: {
              path: { serviceName: 'opbeans-ruby' },
              query: {
                latencyAggregationType: LatencyAggregationType.avg,
                start,
                end,
                transactionType: 'request',
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
              "7cadf0447f2393bbaa8ce98f0e0349d4457bf21f5e9ac67c3eea41dd9b576125",
            ]
          `);

          const item = items[0];

          const values = pick(item, 'cpuUsage', 'errorRate', 'throughput', 'latency');

          expectSnapshot(values).toMatchInline(`
            Object {
              "cpuUsage": 0.0011,
              "errorRate": 0.000707714083510262,
              "latency": 130610.2,
              "throughput": 47.1,
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
          response = await apmApiSupertest({
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
              "512388b65878b1ed410e7a85e793878bb4bd6a4e1943db6d12ca12dd4286623a",
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
              "cpuUsage": 0.0017,
              "errorRate": 0.0366748166259169,
              "latency": 15614.8,
              "memoryUsage": 0.781229909261068,
              "throughput": 27.2666666666667,
            }
          `);
        });
      });
    }
  );
}
