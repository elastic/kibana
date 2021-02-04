/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import url from 'url';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];
  const transactionNames = ['DispatcherServlet#doGet', 'APIRestController#customers'];

  registry.when(
    'Transaction groups agg results when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/statistics`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              latencyAggregationType: 'avg',
              transactionType: 'request',
              transactionNames: JSON.stringify(transactionNames),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.empty();
      });
    }
  );

  registry.when(
    'Transaction groups agg results when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the correct data', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/statistics`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              transactionType: 'request',
              latencyAggregationType: 'avg',
              transactionNames: JSON.stringify(transactionNames),
            },
          })
        );

        expect(response.status).to.be(200);

        expect(Object.keys(response.body).length).to.be(transactionNames.length);
        expectSnapshot(Object.keys(response.body)).toMatchInline(`
                  Array [
                    "DispatcherServlet#doGet",
                    "APIRestController#customers",
                  ]
              `);

        expect(Object.values(response.body).map((group: any) => group.impact).length).to.be(2);
        expectSnapshot(Object.values(response.body).map((group: any) => group.impact))
          .toMatchInline(`
          Array [
            93.9295870910491,
            1.35334507158962,
          ]
        `);

        const item = response.body[transactionNames[0]];

        function removeEmptyCoordinates(coordinates: Array<{ x: number; y?: number }>) {
          return coordinates.filter(({ y }) => y !== null && y !== undefined);
        }

        expect(item.latency.length).to.be.greaterThan(0);
        expectSnapshot(removeEmptyCoordinates(item.latency)).toMatchInline(`
          Array [
            Object {
              "x": 1607435880000,
              "y": 69429,
            },
            Object {
              "x": 1607435940000,
              "y": 8071285,
            },
            Object {
              "x": 1607436000000,
              "y": 31949,
            },
            Object {
              "x": 1607436120000,
              "y": 47755,
            },
            Object {
              "x": 1607436240000,
              "y": 35403,
            },
            Object {
              "x": 1607436480000,
              "y": 48137,
            },
            Object {
              "x": 1607436600000,
              "y": 35457,
            },
            Object {
              "x": 1607436960000,
              "y": 30501,
            },
            Object {
              "x": 1607437200000,
              "y": 46937.5,
            },
          ]
        `);
        expect(item.throughput.length).to.be.greaterThan(0);
        expectSnapshot(removeEmptyCoordinates(item.throughput)).toMatchInline(`
          Array [
            Object {
              "x": 1607435820000,
              "y": 0,
            },
            Object {
              "x": 1607435880000,
              "y": 0.01,
            },
            Object {
              "x": 1607435940000,
              "y": 0.02,
            },
            Object {
              "x": 1607436000000,
              "y": 0.01,
            },
            Object {
              "x": 1607436060000,
              "y": 0,
            },
            Object {
              "x": 1607436120000,
              "y": 0.01,
            },
            Object {
              "x": 1607436180000,
              "y": 0,
            },
            Object {
              "x": 1607436240000,
              "y": 0.04,
            },
            Object {
              "x": 1607436300000,
              "y": 0,
            },
            Object {
              "x": 1607436360000,
              "y": 0,
            },
            Object {
              "x": 1607436420000,
              "y": 0,
            },
            Object {
              "x": 1607436480000,
              "y": 0.02,
            },
            Object {
              "x": 1607436540000,
              "y": 0,
            },
            Object {
              "x": 1607436600000,
              "y": 0.01,
            },
            Object {
              "x": 1607436660000,
              "y": 0,
            },
            Object {
              "x": 1607436720000,
              "y": 0,
            },
            Object {
              "x": 1607436780000,
              "y": 0,
            },
            Object {
              "x": 1607436840000,
              "y": 0,
            },
            Object {
              "x": 1607436900000,
              "y": 0,
            },
            Object {
              "x": 1607436960000,
              "y": 0.02,
            },
            Object {
              "x": 1607437020000,
              "y": 0,
            },
            Object {
              "x": 1607437080000,
              "y": 0,
            },
            Object {
              "x": 1607437140000,
              "y": 0,
            },
            Object {
              "x": 1607437200000,
              "y": 0.02,
            },
            Object {
              "x": 1607437260000,
              "y": 0,
            },
            Object {
              "x": 1607437320000,
              "y": 0,
            },
            Object {
              "x": 1607437380000,
              "y": 0,
            },
            Object {
              "x": 1607437440000,
              "y": 0,
            },
            Object {
              "x": 1607437500000,
              "y": 0,
            },
            Object {
              "x": 1607437560000,
              "y": 0,
            },
            Object {
              "x": 1607437620000,
              "y": 0,
            },
          ]
        `);
        expect(item.errorRate.length).to.be.greaterThan(0);
        expectSnapshot(removeEmptyCoordinates(item.errorRate)).toMatchInline(`
          Array [
            Object {
              "x": 1607435880000,
              "y": 0,
            },
            Object {
              "x": 1607435940000,
              "y": 0,
            },
            Object {
              "x": 1607436000000,
              "y": 0,
            },
            Object {
              "x": 1607436120000,
              "y": 0,
            },
            Object {
              "x": 1607436240000,
              "y": 0,
            },
            Object {
              "x": 1607436480000,
              "y": 0,
            },
            Object {
              "x": 1607436600000,
              "y": 0,
            },
            Object {
              "x": 1607436960000,
              "y": 0,
            },
            Object {
              "x": 1607437200000,
              "y": 0.5,
            },
          ]
        `);
      });
      it('returns empty when transaction name is not found', async () => {
        const response = await supertest.get(
          url.format({
            pathname: `/api/apm/services/opbeans-java/transactions/groups/statistics`,
            query: {
              start,
              end,
              uiFilters: '{}',
              numBuckets: 20,
              transactionType: 'request',
              latencyAggregationType: 'avg',
              transactionNames: JSON.stringify(['foo']),
            },
          })
        );

        expect(response.status).to.be(200);
        expect(response.body).to.empty();
      });
    }
  );
}
