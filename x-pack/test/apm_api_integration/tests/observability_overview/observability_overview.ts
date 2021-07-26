/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);
  const bucketSize = '60s';

  registry.when(
    'Observability overview when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await supertest.get(
            `/api/apm/observability_overview?start=${start}&end=${end}&bucketSize=${bucketSize}`
          );
          expect(response.status).to.be(200);

          expect(response.body.serviceCount).to.be(0);
          expect(response.body.transactionPerMinute.timeseries.length).to.be(0);
        });
      });
    }
  );

  registry.when(
    'Observability overview when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the service count and transaction coordinates', async () => {
        const response = await supertest.get(
          `/api/apm/observability_overview?start=${start}&end=${end}&bucketSize=${bucketSize}`
        );
        expect(response.status).to.be(200);

        expect(response.body.serviceCount).to.be.greaterThan(0);
        expect(response.body.transactionPerMinute.timeseries.length).to.be.greaterThan(0);

        expectSnapshot(response.body.serviceCount).toMatchInline(`10`);

        expectSnapshot(response.body.transactionPerMinute.value).toMatchInline(`143.133333333333`);
        expectSnapshot(response.body.transactionPerMinute.timeseries.length).toMatchInline(`30`);

        expectSnapshot(
          response.body.transactionPerMinute.timeseries
            .slice(0, 5)
            .map(({ x, y }: { x: number; y: number }) => ({
              x: new Date(x).toISOString(),
              y,
            }))
        ).toMatchInline(`
          Array [
            Object {
              "x": "2021-07-26T17:47:00.000Z",
              "y": 108,
            },
            Object {
              "x": "2021-07-26T17:48:00.000Z",
              "y": 102,
            },
            Object {
              "x": "2021-07-26T17:49:00.000Z",
              "y": 93,
            },
            Object {
              "x": "2021-07-26T17:50:00.000Z",
              "y": 121,
            },
            Object {
              "x": "2021-07-26T17:51:00.000Z",
              "y": 98,
            },
          ]
        `);
      });
    }
  );
}
