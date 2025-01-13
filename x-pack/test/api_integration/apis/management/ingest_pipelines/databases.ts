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
  const url = `/api/ingest_pipelines/databases`;
  const maxmindDatabaseName = 'GeoIP2-Anonymous-IP';
  const normalizedMaxmindDatabaseName = 'geoip2-anonymous-ip';
  const ipinfoDatabaseName = 'asn';
  const normalizedIpinfoDatabaseName = 'asn';

  describe('Manage databases', function () {
    after(async () => {
      await ingestPipelines.api.deleteGeoipDatabases();
    });

    describe('Create', () => {
      it('creates a maxmind geoip database when using a correct database name', async () => {
        const database = {
          databaseType: 'maxmind',
          databaseName: maxmindDatabaseName,
          maxmind: '123456',
        };
        const { body } = await supertest
          .post(url)
          .set('kbn-xsrf', 'xxx')
          .send(database)
          .expect(200);

        expect(body).to.eql({
          name: maxmindDatabaseName,
          id: normalizedMaxmindDatabaseName,
        });
      });

      it('creates an ipinfo geoip database when using a correct database name', async () => {
        const database = { databaseType: 'ipinfo', databaseName: ipinfoDatabaseName };
        const { body } = await supertest
          .post(url)
          .set('kbn-xsrf', 'xxx')
          .send(database)
          .expect(200);

        expect(body).to.eql({
          name: ipinfoDatabaseName,
          id: normalizedIpinfoDatabaseName,
        });
      });

      it('returns error when creating a geoip database with an incorrect database name', async () => {
        const database = { databaseType: 'maxmind', databaseName: 'Test', maxmind: '123456' };
        await supertest.post(url).set('kbn-xsrf', 'xxx').send(database).expect(400);
      });
    });

    describe('List', () => {
      it('returns existing databases', async () => {
        const { body } = await supertest.get(url).set('kbn-xsrf', 'xxx').expect(200);
        expect(body).to.eql([
          {
            id: normalizedMaxmindDatabaseName,
            name: maxmindDatabaseName,
            type: 'maxmind',
          },
          {
            id: normalizedIpinfoDatabaseName,
            name: ipinfoDatabaseName,
            type: 'ipinfo',
          },
        ]);
      });
    });

    describe('Delete', () => {
      it('deletes a geoip database', async () => {
        await supertest
          .delete(`${url}/${normalizedMaxmindDatabaseName}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        await supertest
          .delete(`${url}/${normalizedIpinfoDatabaseName}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);
      });
    });
  });
}
