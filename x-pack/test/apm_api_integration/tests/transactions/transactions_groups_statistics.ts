/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
        expectSnapshot(removeEmptyCoordinates(item.latency)[0]).toMatchInline(`
        Object {
          "x": 1607435880000,
          "y": 69429,
        }
        `);
        expect(item.throughput.length).to.be.greaterThan(0);
        expectSnapshot(removeEmptyCoordinates(item.throughput)[0]).toMatchInline(`
        Object {
          "x": 1607435820000,
          "y": 0,
        }
        `);
        expect(item.errorRate.length).to.be.greaterThan(0);
        expectSnapshot(removeEmptyCoordinates(item.errorRate).pop()).toMatchInline(`
          Object {
            "x": 1607437200000,
            "y": 0.5,
          }
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
