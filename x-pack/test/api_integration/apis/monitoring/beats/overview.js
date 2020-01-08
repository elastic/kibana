/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import beatsClusterFixture from './fixtures/cluster';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('overview', () => {
    const archive = 'monitoring/beats';
    const timeRange = {
      min: '2017-12-19T18:11:32.000Z',
      max: '2017-12-19T18:14:38.000Z',
    };

    before('load archive', () => {
      return esArchiver.load(archive);
    });

    after('unload archive', () => {
      return esArchiver.unload(archive);
    });

    it('should summarize beats cluster with metrics', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/FlV4ckTxQ0a78hmBkzzc9A/beats')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange })
        .expect(200);

      expect(body).to.eql(beatsClusterFixture);
    });
  });
}
