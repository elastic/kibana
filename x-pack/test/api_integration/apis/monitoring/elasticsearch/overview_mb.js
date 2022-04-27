/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import overviewFixtureGreenPlatinum from './fixtures/overview_green_platinum.json';
import overviewFixtureRedPlatinum from './fixtures/overview_red_platinum.json';
import overviewFixtureShardsRelocating from './fixtures/overview_shards_relocating.json';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('overview mb', () => {
    describe('with green platinum cluster', () => {
      const archive =
        'x-pack/test/functional/es_archives/monitoring/singlecluster_green_platinum_mb';
      const timeRange = {
        min: '2018-02-13T17:04:50.000Z',
        max: '2018-02-13T17:51:55.000Z',
      };

      before('load clusters archive', () => {
        return setup(archive);
      });

      after('unload clusters archive', async () => {
        return tearDown();
      });

      it('should summarize elasticsearch with metrics', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/fHJwISmKTFO8bj57oFBLUQ/elasticsearch')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);
        expect(body).to.eql(overviewFixtureGreenPlatinum);
      });
    });

    describe('with red platinum cluster', () => {
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

      it('should summarize elasticsearch with metrics', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/1LYuyvCCQFS3FAO_h65PQw/elasticsearch')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);
        expect(body).to.eql(overviewFixtureRedPlatinum);
      });
    });

    describe('with shards relocating', () => {
      const archive =
        'x-pack/test/functional/es_archives/monitoring/singlecluster_three_nodes_shard_relocation';
      const timeRange = {
        min: '2017-10-05T20:31:17.081Z',
        max: '2017-10-05T20:35:39.428Z',
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should summarize elasticsearch with metrics', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/YCxj-RAgSZCP6GuOQ8M1EQ/elasticsearch')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);
        expect(body).to.eql(overviewFixtureShardsRelocating);
      });
    });
  });
}
