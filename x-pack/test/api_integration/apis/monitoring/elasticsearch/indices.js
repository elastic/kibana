/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import relocatingShardsFixture from './fixtures/indices_shards_relocating';
import relocationShardsAllFixture from './fixtures/indices_shards_relocating_all';
import indicesRedClusterFixture from './fixtures/indices_red_cluster';
import indicesRedClusterAllFixture from './fixtures/indices_red_cluster_all';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('indices', () => {
    describe('shard-relocation', () => {
      const archive = 'monitoring/singlecluster-three-nodes-shard-relocation';
      const timeRange = {
        min: '2017-10-05T20:31:48.000Z',
        max: '2017-10-05T20:35:12.000Z',
      };

      before('load archive', () => {
        return esArchiver.load(archive);
      });

      after('unload archive', () => {
        return esArchiver.unload(archive);
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
      const archive = 'monitoring/singlecluster-red-platinum';
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
