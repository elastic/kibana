/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import ccrFixture from './fixtures/ccr';
// import indexDetailAdvancedFixture from './fixtures/index_detail_advanced';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('ccr', () => {
    const archive = 'monitoring/ccr';

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should return all followers and a grouping of stats by follower index', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/YCxj-RAgSZCP6GuOQ8M1EQ/elasticsearch/ccr')
        .set('kbn-xsrf', 'xxx')
        .send({
        })
        .expect(200);

      expect(body).to.eql(ccrFixture);
    });
  });
}
