/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ingestPipelines = getService('ingestPipelines');
  const url = `/api/ingest_pipelines/geoip_database`;
  const databaseName = 'GeoIP2-Anonymous-IP';
  const normalizedDatabaseName = 'geoip2-anonymous-ip';

  describe('GeoIP databases', function () {
    after(async () => {
      await ingestPipelines.api.deleteGeoipDatabases();
    });

    describe('Create', () => {
      it('creates a geoip database when using a correct database name', async () => {
        const database = { maxmind: '123456', databaseName };
        const { body } = await supertest
          .post(url)
          .set('kbn-xsrf', 'xxx')
          .send(database)
          .expect(200);

        expect(body).to.eql({
          name: databaseName,
          id: normalizedDatabaseName,
        });
      });

      it('creates a geoip database when using an incorrect database name', async () => {
        const database = { maxmind: '123456', databaseName: 'Test' };
        await supertest.post(url).set('kbn-xsrf', 'xxx').send(database).expect(400);
      });
    });

    describe('List', () => {
      it('returns existing databases', async () => {
        const { body } = await supertest.get(url).set('kbn-xsrf', 'xxx').expect(200);
        expect(body).to.eql([
          {
            id: normalizedDatabaseName,
            name: databaseName,
            type: 'maxmind',
          },
        ]);
      });
    });

    describe('Delete', async () => {
      it('deletes a geoip database', async () => {
        await supertest
          .delete(`${url}/${normalizedDatabaseName}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
      });
    });
  });
}
