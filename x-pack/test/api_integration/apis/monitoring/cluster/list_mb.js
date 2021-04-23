/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import multiclusterFixture from './fixtures/multicluster';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('list mb', () => {
    describe('with trial license clusters', () => {
      const archive = 'monitoring/multicluster_mb';
      const timeRange = {
        min: '2017-08-15T21:00:00Z',
        max: '2017-08-16T00:00:00Z',
      };
      const codePaths = ['all'];

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should load multiple clusters', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, codePaths })
          .expect(200);
        expect(body).to.eql(multiclusterFixture);
      });
    });
  });
}
