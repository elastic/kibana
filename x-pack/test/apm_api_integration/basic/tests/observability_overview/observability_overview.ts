/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import archives_metadata from '../../../common/archives_metadata';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const archiveName = 'apm_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = encodeURIComponent(metadata.start);
  const end = encodeURIComponent(metadata.end);
  const bucketSize = '60s';

  describe('Observability overview', () => {
    describe('when data is not loaded', () => {
      it('handles the empty state', async () => {
        const response = await supertest.get(
          `/api/apm/observability_overview?start=${start}&end=${end}&bucketSize=${bucketSize}`
        );
        expect(response.status).to.be(200);

        expect(response.body.serviceCount).to.be(0);
        expect(response.body.transactionCoordinates.length).to.be(0);
      });
    });
    describe('when data is loaded', () => {
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('returns the service count and transaction coordinates', async () => {
        const response = await supertest.get(
          `/api/apm/observability_overview?start=${start}&end=${end}&bucketSize=${bucketSize}`
        );
        expect(response.status).to.be(200);

        expect(response.body.serviceCount).to.be.greaterThan(0);
        expect(response.body.transactionCoordinates.length).to.be.greaterThan(0);

        expectSnapshot(response.body.serviceCount).toMatchInline(`8`);

        expectSnapshot(response.body.transactionCoordinates.length).toMatchInline(`30`);

        expectSnapshot(
          response.body.transactionCoordinates
            .slice(0, 5)
            .map(({ x, y }: { x: number; y: number }) => ({
              x: new Date(x).toISOString(),
              y,
            }))
        ).toMatchInline(`
          Array [
            Object {
              "x": "2020-09-29T14:30:00.000Z",
              "y": 2.26666666666667,
            },
            Object {
              "x": "2020-09-29T14:31:00.000Z",
              "y": 1.03333333333333,
            },
            Object {
              "x": "2020-09-29T14:32:00.000Z",
              "y": 1.9,
            },
            Object {
              "x": "2020-09-29T14:33:00.000Z",
              "y": 0.8,
            },
            Object {
              "x": "2020-09-29T14:34:00.000Z",
              "y": 1.9,
            },
          ]
        `);
      });
    });
  });
}
