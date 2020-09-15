/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import archives_metadata from '../../../common/archives_metadata';
import { expectSnapshot } from '../../../common/match_snapshot';
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

        expectSnapshot(response.body.serviceCount).toMatchInline(`7`);

        expectSnapshot(response.body.transactionCoordinates.length).toMatchInline(`60`);

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
              "x": "2020-09-10T06:00:00.000Z",
              "y": 1.2166666666666666,
            },
            Object {
              "x": "2020-09-10T06:01:00.000Z",
              "y": 0.5,
            },
            Object {
              "x": "2020-09-10T06:02:00.000Z",
              "y": 1.0333333333333334,
            },
            Object {
              "x": "2020-09-10T06:03:00.000Z",
              "y": 0.55,
            },
            Object {
              "x": "2020-09-10T06:04:00.000Z",
              "y": 1.15,
            },
          ]
        `);
      });
    });
  });
}
