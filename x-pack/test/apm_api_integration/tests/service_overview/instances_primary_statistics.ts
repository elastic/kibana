/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import { pick, sortBy } from 'lodash';
import { isFiniteNumber } from '../../../../plugins/apm/common/utils/is_finite_number';
import { APIReturnType } from '../../../../plugins/apm/public/services/rest/createCallApmApi';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  interface Response {
    status: number;
    body: APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics'>;
  }

  registry.when(
    'Service overview instances primary statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response: Response = await supertest.get(
            url.format({
              pathname: `/api/apm/services/opbeans-java/service_overview_instances/primary_statistics`,
              query: {
                latencyAggregationType: 'avg',
                start,
                end,
                transactionType: 'request',
              },
            })
          );

          expect(response.status).to.be(200);
          expect(response.body).to.eql([]);
        });
      });
    }
  );

  registry.when(
    'Service overview instances primary statistics when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('fetching java data', () => {
        let response: Response;

        beforeEach(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/api/apm/services/opbeans-java/service_overview_instances/primary_statistics`,
              query: {
                latencyAggregationType: 'avg',
                start,
                end,
                transactionType: 'request',
              },
            })
          );
        });

        it('returns a service node item', () => {
          expect(response.body.length).to.be.greaterThan(0);
        });

        it('returns statistics for each service node', () => {
          const item = response.body[0];

          expect(isFiniteNumber(item.cpuUsage)).to.be(true);
          expect(isFiniteNumber(item.memoryUsage)).to.be(true);
          expect(isFiniteNumber(item.errorRate)).to.be(true);
          expect(isFiniteNumber(item.throughput)).to.be(true);
          expect(isFiniteNumber(item.latency)).to.be(true);
        });

        it('returns the right data', () => {
          const items = sortBy(response.body, 'serviceNodeName');

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
        let response: Response;

        beforeEach(async () => {
          response = await supertest.get(
            url.format({
              pathname: `/api/apm/services/opbeans-ruby/service_overview_instances/primary_statistics`,
              query: {
                latencyAggregationType: 'avg',
                start,
                end,
                transactionType: 'request',
              },
            })
          );
        });

        it('returns statistics for each service node', () => {
          const item = response.body[0];

          expect(isFiniteNumber(item.cpuUsage)).to.be(true);
          expect(isFiniteNumber(item.memoryUsage)).to.be(true);
          expect(isFiniteNumber(item.errorRate)).to.be(true);
          expect(isFiniteNumber(item.throughput)).to.be(true);
          expect(isFiniteNumber(item.latency)).to.be(true);
        });

        it('returns the right data', () => {
          const items = sortBy(response.body, 'serviceNodeName');

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
