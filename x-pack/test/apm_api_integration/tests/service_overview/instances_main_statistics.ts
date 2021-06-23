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
              "02950c4c5fbb0fda1cc98c47bf4024b473a8a17629db6530d95dcee68bd54c6c",
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
              "cpuUsage": 0.0120166666666667,
              "errorRate": 0.16,
              "latency": 237339.813333333,
              "memoryUsage": 0.941324615478516,
              "throughput": 2.5,
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
              "_service_node_name_missing_",
            ]
          `);

          const item = items[0];

          const values = pick(item, 'cpuUsage', 'errorRate', 'throughput', 'latency');

          expectSnapshot(values).toMatchInline(`
            Object {
              "cpuUsage": 0.00111666666666667,
              "errorRate": 0.0373134328358209,
              "latency": 70518.9328358209,
              "throughput": 4.46666666666667,
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
              "02950c4c5fbb0fda1cc98c47bf4024b473a8a17629db6530d95dcee68bd54c6c",
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
              "cpuUsage": 0.0120666666666667,
              "errorRate": 0.111111111111111,
              "latency": 379742.555555556,
              "memoryUsage": 0.939879608154297,
              "throughput": 3,
            }
          `);
        });
      });
    }
  );
}
