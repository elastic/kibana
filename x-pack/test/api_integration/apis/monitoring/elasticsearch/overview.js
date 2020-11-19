/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import overviewFixtureGreenPlatinum from './fixtures/overview_green_platinum';
import overviewFixtureRedPlatinum from './fixtures/overview_red_platinum';
import overviewFixtureShardsRelocating from './fixtures/overview_shards_relocating';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('overview', () => {
    describe('with green platinum cluster', () => {
      const archive = 'monitoring/singlecluster-green-platinum';
      const timeRange = {
        min: '2018-02-13T17:04:50.000Z',
        max: '2018-02-13T17:51:55.000Z',
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
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
      const archive = 'monitoring/singlecluster-three-nodes-shard-relocation';
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
