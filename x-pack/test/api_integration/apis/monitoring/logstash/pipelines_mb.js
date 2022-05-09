/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import pipelinesFixture from './fixtures/pipelines.json';
import { getLifecycleMethods } from '../data_stream';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const { setup, tearDown } = getLifecycleMethods(getService);

  describe('pipelines mb', () => {
    const archive = 'x-pack/test/functional/es_archives/monitoring/logstash/changing_pipelines_mb';
    const timeRange = {
      min: '2019-11-04T15:40:44.855Z',
      max: '2019-11-04T15:50:38.667Z',
    };
    const pagination = {
      size: 10,
      index: 0,
    };
    const sort = {
      field: 'id',
      direction: 'asc',
    };

    before('load archive', () => {
      return setup(archive);
    });

    after('unload archive', () => {
      return tearDown();
    });

    it('should return paginated pipelines', async () => {
      const { body } = await supertest
        .post('/api/monitoring/v1/clusters/TUjQLdHNTh2SB9Wy0gOtWg/logstash/pipelines')
        .set('kbn-xsrf', 'xxx')
        .send({ timeRange, pagination, sort })
        .expect(200);

      expect(body).to.eql(pipelinesFixture);
    });

    it('should get one of each after enough pagination', async () => {
      async function getIds(page) {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/TUjQLdHNTh2SB9Wy0gOtWg/logstash/pipelines')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange, pagination: { ...pagination, index: page }, sort })
          .expect(200);

        return body.pipelines.map((pipeline) => pipeline.id);
      }

      const ids = [...(await getIds(0)), ...(await getIds(1)), ...(await getIds(2))];
      expect(ids.length).to.be(26);
    });

    it('should not error out if there is missing data for part of the time series', async () => {
      const customTimeRange = {
        ...timeRange,
        max: '2019-11-04T15:59:38.667Z',
      };

      const customSort = {
        ...sort,
        field: 'logstash_cluster_pipeline_throughput',
      };

      await supertest
        .post('/api/monitoring/v1/clusters/TUjQLdHNTh2SB9Wy0gOtWg/logstash/pipelines')
        .set('kbn-xsrf', 'xxx')
        .send({
          timeRange: customTimeRange,
          pagination: { ...pagination, index: 1 },
          sort: customSort,
        })
        .expect(200);
    });
  });
}
