/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import indicesFixture from './fixtures/indices';
import indicesAllFixture from './fixtures/indices_all';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('index listing', () => {
    const archive = 'monitoring/singlecluster-three-nodes-shard-relocation';
    const timeRange = {
      min: '2017-10-05T20:31:48.000Z',
      max: '2017-10-05T20:35:12.000Z'
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should summarize the non-system indices with stats', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/YCxj-RAgSZCP6GuOQ8M1EQ/elasticsearch/indices')
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange,
          showSystemIndices: false
        })
        .expect(200);

      expect(body).to.eql(indicesFixture);
    });

    it('should summarize all indices with stats', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/YCxj-RAgSZCP6GuOQ8M1EQ/elasticsearch/indices')
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange,
          showSystemIndices: true
        })
        .expect(200);

      expect(body).to.eql(indicesAllFixture);
    });
  });
}
