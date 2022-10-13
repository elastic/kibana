/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import relocatingShardsFixture from './fixtures/indices_shards_relocating.json';
import relocationShardsAllFixture from './fixtures/indices_shards_relocating_all.json';
import indicesRedClusterFixture from './fixtures/indices_red_cluster.json';
import indicesRedClusterAllFixture from './fixtures/indices_red_cluster_all.json';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('indices mb', () => {
    describe('shard-relocation', () => {
      const archive =
        'x-pack/test/functional/es_archives/monitoring/singlecluster_three_nodes_shard_relocation_mb';
      const timeRange = {
        min: '2017-10-05T20:31:48.000Z',
        max: '2017-10-05T20:35:12.000Z',
      };

      before('load archive', () => {
        return setup(archive);
      });

      after('unload archive', () => {
        return tearDown();
      });

      it('should summarize the non-system indices with stats', async () => {
        const { body } = await supertest
          .post(
            '/api/monitoring/v1/clusters/YCxj-RAgSZCP6GuOQ8M1EQ/elasticsearch/indices?show_system_indices=false'
          )
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);
        expect(body).to.eql(relocatingShardsFixture);
      });

      it('should summarize all indices with stats', async () => {
        const { body } = await supertest
          .post(
            '/api/monitoring/v1/clusters/YCxj-RAgSZCP6GuOQ8M1EQ/elasticsearch/indices?show_system_indices=true'
          )
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);

        expect(body).to.eql(relocationShardsAllFixture);
      });
    });

    describe('health-red', () => {
      const archive = 'x-pack/test/functional/es_archives/monitoring/singlecluster_red_platinum';
      const timeRange = {
        min: '2017-10-06T19:53:06.000Z',
        max: '2017-10-06T20:15:30.000Z',
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should summarize the non-system indices with stats', async () => {
        const { body } = await supertest
          .post(
            '/api/monitoring/v1/clusters/1LYuyvCCQFS3FAO_h65PQw/elasticsearch/indices?show_system_indices=false'
          )
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);
        expect(body).to.eql(indicesRedClusterFixture);
      });

      it('should summarize all indices with stats', async () => {
        const { body } = await supertest
          .post(
            '/api/monitoring/v1/clusters/1LYuyvCCQFS3FAO_h65PQw/elasticsearch/indices?show_system_indices=true'
          )
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);

        expect(body).to.eql(indicesRedClusterAllFixture);
      });
    });
  });
}
