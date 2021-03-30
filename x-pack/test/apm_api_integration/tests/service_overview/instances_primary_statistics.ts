/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { pick, sortBy } from 'lodash';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';
import { createApmApiSupertest } from '../../common/apm_api_supertest';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  registry.when(
    'Service overview instances primary statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiSupertest({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                latencyAggregationType: 'avg',
                start,
                end,
                transactionType: 'request',
              },
            },
          });

          expect(response.status).to.be(200);
          expect(response.body.serviceInstances).to.eql([]);
        });
      });
    }
  );

  registry.when(
    'Service overview instances primary statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('fetching java data', () => {
        let response: {
          body: APIReturnType<`GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiSupertest({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics`,
            params: {
              path: { serviceName: 'opbeans-java' },
              query: {
                latencyAggregationType: 'avg',
                start,
                end,
                transactionType: 'request',
              },
            },
          });
        });

        it('returns a service node item', () => {
          expect(response.body.serviceInstances.length).to.be.greaterThan(0);
        });

        it('returns statistics for each service node', () => {
          const item = response.body.serviceInstances[0];

          expect(isFiniteNumber(item.cpuUsage)).to.be(true);
          expect(isFiniteNumber(item.memoryUsage)).to.be(true);
          expect(isFiniteNumber(item.errorRate)).to.be(true);
          expect(isFiniteNumber(item.throughput)).to.be(true);
          expect(isFiniteNumber(item.latency)).to.be(true);
        });

        it('returns the right data', () => {
          const items = sortBy(response.body.serviceInstances, 'serviceNodeName');

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
          body: APIReturnType<`GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics`>;
        };

        beforeEach(async () => {
          response = await apmApiSupertest({
            endpoint: `GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics`,
            params: {
              path: { serviceName: 'opbeans-ruby' },
              query: {
                latencyAggregationType: 'avg',
                start,
                end,
                transactionType: 'request',
              },
            },
          });
        });

        it('returns statistics for each service node', () => {
          const item = response.body.serviceInstances[0];

          expect(isFiniteNumber(item.cpuUsage)).to.be(true);
          expect(isFiniteNumber(item.memoryUsage)).to.be(true);
          expect(isFiniteNumber(item.errorRate)).to.be(true);
          expect(isFiniteNumber(item.throughput)).to.be(true);
          expect(isFiniteNumber(item.latency)).to.be(true);
        });

        it('returns the right data', () => {
          const items = sortBy(response.body.serviceInstances, 'serviceNodeName');

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
}
