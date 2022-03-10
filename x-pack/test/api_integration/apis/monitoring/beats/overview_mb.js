/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import beatsClusterFixture from './fixtures/cluster';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('overview mb', () => {
    const { setup, tearDown } = getLifecycleMethods(getService);
    const archive = 'x-pack/test/functional/es_archives/monitoring/beats_mb';
    const timeRange = {
      min: '2017-12-19T18:11:32.000Z',
      max: '2017-12-19T18:14:38.000Z',
    };

    before('load archive', () => {
      return setup(archive);
    });

    after('unload archive', () => {
      return tearDown();
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
