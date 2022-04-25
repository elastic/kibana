/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import clusterFixture from './fixtures/cluster.json';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('cluster', () => {
    const archive = 'x-pack/test/functional/es_archives/monitoring/logs';
    const timeRange = {
      min: '2019-03-15T16:19:22.161Z',
      max: '2019-03-15T17:19:22.161Z',
    };
    const codePaths = ['logs'];

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should get log types at the cluster level', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/ZR3ZlJLUTV2V_GlplB83jQ')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, codePaths })
        .expect(200);

      expect(body[0].elasticsearch.logs).to.eql(clusterFixture);
    });
  });
}
