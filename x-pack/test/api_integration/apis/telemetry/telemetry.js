/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import multiClusterFixture from './fixtures/multicluster';
import basicClusterFixture from './fixtures/basiccluster';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('/api/telemetry/v2/clusters/_stats', () => {
    it('should load multiple trial-license clusters', async () => {
      const archive = 'monitoring/multicluster';
      const timeRange = {
        min: '2017-08-15T21:00:00Z',
        max: '2017-08-16T00:00:00Z'
      };

      await esArchiver.load(archive);

      const { body } = await supertest
        .post('/api/telemetry/v2/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, unencrypted: true })
        .expect(200);
      expect(body).to.eql(multiClusterFixture);

      await esArchiver.unload(archive);
    });

    describe('with basic cluster and reporting and canvas usage info', () => {
      it('should load non-expiring basic cluster', async () => {
        const archive = 'monitoring/basic_6.3.x';
        const timeRange = {
          min: '2018-07-23T22:07:00Z',
          max: '2018-07-23T22:13:00Z'
        };

        await esArchiver.load(archive);

        const { body } = await supertest
          .post('/api/telemetry/v2/clusters/_stats')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, unencrypted: true })
          .expect(200);
        expect(body).to.eql(basicClusterFixture);

        await esArchiver.unload(archive);
      });
    });
  });
}
