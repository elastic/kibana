/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import expect from '@kbn/expect';
import ccrShardFixture from './fixtures/ccr_shard.json';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('ccr shard mb', () => {
    const archive = 'x-pack/test/functional/es_archives/monitoring/ccr_mb';
    const timeRange = {
      min: '2018-09-19T00:00:00.000Z',
      max: '2018-09-19T23:59:59.000Z',
    };

    before('load archive', () => {
      return setup(archive);
    });

    after('unload archive', () => {
      return tearDown();
    });

    it('should return specific shard details', async () => {
      const { body } = await supertest
        .post(
          '/api/monitoring/v1/clusters/YCxj-RAgSZCP6GuOQ8M1EQ/elasticsearch/ccr/follower/shard/0'
        )
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange,
        })
        .expect(200);

      // These will be inherently different, but they are only shown in JSON format in the UI so that's okay
      const keysToIgnore = ['stat', 'oldestStat'];
      expect(omit(body, keysToIgnore)).to.eql(omit(ccrShardFixture, keysToIgnore));
    });
  });
}
