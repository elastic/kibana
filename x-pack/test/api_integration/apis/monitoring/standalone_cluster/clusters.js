/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import clustersFixture from './fixtures/clusters.json';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('clusters', function () {
    // TODO: https://github.com/elastic/stack-monitoring/issues/31
    this.tags(['skipCloud']);

    const archive = 'x-pack/test/functional/es_archives/monitoring/standalone_cluster';
    const timeRange = {
      min: '2019-02-04T16:52:11.741Z',
      max: '2019-02-04T17:52:11.741Z',
    };
    const codePaths = ['all'];

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should get the cluster listing', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, codePaths })
        .expect(200);
      expect(body).to.eql(clustersFixture);
    });
  });
}
