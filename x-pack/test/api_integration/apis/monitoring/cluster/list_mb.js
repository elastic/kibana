/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import multiclusterFixture from './fixtures/multicluster.json';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('list mb', function () {
    // Archive contains non-cgroup data which collides with the in-cgroup services present by default on cloud deployments
    this.tags(['skipCloud']);

    describe('with trial license clusters', () => {
      const archive = 'x-pack/test/functional/es_archives/monitoring/multicluster_mb';
      const timeRange = {
        min: '2017-08-15T21:00:00Z',
        max: '2017-08-16T00:00:00Z',
      };
      const codePaths = ['all'];

      before('load clusters archive', () => {
        return setup(archive);
      });

      after('unload clusters archive', () => {
        return tearDown();
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
