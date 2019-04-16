/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import nodeDetailFixture from './fixtures/node_detail';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('cluster', () => {
    const archive = 'monitoring/logs';
    const timeRange = {
      min: '2019-03-15T16:19:22.161Z',
      max: '2019-03-15T17:19:22.161Z'
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should get logs for the specific node', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/ZR3ZlJLUTV2V_GlplB83jQ/elasticsearch/nodes/-pH5RhfsRl6FDeTPwD5vEw')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, is_advanced: false })
        .expect(200);

      expect(body.logs).to.eql(nodeDetailFixture);
    });
  });
}
